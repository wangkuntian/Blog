---
title: dae原理
published: 2025-12-30 11:39:01
description: ''
image: ''
tags: ['网络', '代理']
category: '网络'
draft: false
lang: ''
---

`daeuniverse/dae` 是一个基于 Linux eBPF 技术的高性能透明代理工具。与传统的基于 TUN/TAP 设备（如 Clash, Sing-box 的 TUN 模式）的方案不同，`dae` 通过 **eBPF** 实现了流量的拦截与分流，并结合 **TProxy** 技术处理需要代理的流量。

这种架构的核心目的是**将流量分流（Routing/Splitting）的决策下沉到 Linux 内核层**，从而极大地减少用户空间（User Space）和内核空间（Kernel Space）之间的上下文切换和内存拷贝，显著提升性能。

以下是详细的技术实现解析：

# 1. eBPF 的核心作用：拦截与分流 (The Traffic Cop)

在 `dae` 中，eBPF 程序主要挂载在网络接口的 **TC (Traffic Control)** 挂载点上，它是整个系统的“交警”。

## A. 挂载与拦截 (TC Filters)

`dae` 会将编译好的 eBPF 字节码加载到物理网卡（如 `eth0`, `wlan0`）的 ingress（入站）和 egress（出站）路径上。

* 传统的代理通常创建一个虚拟网卡（tun0），所有流量都要先路由到 tun0，读取到用户空间，处理后再写回内核。
* `dae` **不创建 TUN 设备**。它直接在物理网卡的 TC 层面上截获数据包 (`sk_buff`)。

## B. 内核级分流 (Kernel-Space Split Routing)

这是 `dae` 最具创新性的部分。传统的代理需要在用户空间解析 DNS、匹配规则，然后决定走直连还是走代理。
`dae` 将分流逻辑放入了 **eBPF Maps**（一种内核与用户空间共享的高效键值存储）中：

* **eBPF Maps 内容**：包含 IP 规则、域名解析结果（DNS 缓存）、MAC 地址映射等。
* **处理流程**：当数据包经过 TC 挂载点时，eBPF 程序会立即查表：
* **直连流量 (Direct)**：如果目的 IP 在直连列表（如国内 IP），eBPF 程序直接放行（`TC_ACT_OK`），数据包就像没有经过代理一样直接由内核协议栈转发。**这部分流量完全不进入 `dae` 的用户空间进程，几乎零损耗。**
* **代理流量 (Proxy)**：如果匹配到需要代理的规则，eBPF 程序会将该数据包重定向（Redirect）到 `dae` 在用户空间监听的 TProxy 端口。

## C. 避免环路 (Loop Avoidance)

`dae` 利用 `cgroup` 标记（socket mark）来识别自身发出的流量。eBPF 程序会检查数据包的 `mark` 或 `skb->sk` 归属，确保 `dae` 发出的代理流量不会被再次拦截，从而避免死循环。

---

# 2. TProxy 的核心作用：接收与协议处理 (The Handler)

虽然 eBPF 非常强大，但它在内核中无法处理复杂的加密解密（如 VMess, Trojan, Hysteria 协议）和复杂的 TCP/UDP 状态机。这部分工作必须交给用户空间的 `dae` 进程。

## A. 监听与接收

`dae` 在用户空间启动一个监听端口（例如 12345），并设置 `IP_TRANSPARENT` 选项。这就是 TProxy（透明代理）的标准用法。

## B. eBPF 与 TProxy 的结合

当 eBPF 程序（在内核 TC 层）决定一个数据包需要“走代理”时：

1. 它修改数据包的目标路由，将其导向本地回环（Localhost）或本机协议栈。
2. 它利用 eBPF 的 helper function（如 `bpf_sk_assign` 或通过修改目标端口/IP），将数据包“硬塞”给 `dae` 监听的 TProxy socket。
3. **保留原始信息**：TProxy 的特性允许 socket 接收非本机 IP 的流量，并且用户空间的 `dae` 可以通过 `getsockopt(SO_ORIGINAL_DST)` 获取数据包**原本**想要去往的目标 IP 和端口。

## C. 代理转发

一旦 `dae` 用户进程接收到数据包：

1. 解析原始目标。
2. 进行 TLS 握手、封装代理协议（如 Shadowsocks, VLESS 等）。
3. 通过物理网卡将封装后的数据包发出（此时这些包会被标记，以免被 eBPF 再次拦截）。

---

# 3. 完整工作流总结

假设你正在访问 `google.com` (需要代理) 和 `baidu.com` (直连)。

## 场景一：访问 Baidu (直连)

1. **应用发起请求** -> 数据包到达网卡 egress。
2. **eBPF (TC) 拦截**：检查目的 IP。
3. **查表 (Map)**：发现是国内 IP / 直连规则。
4. **决策**：直接 `TC_ACT_OK` 放行。
5. **结果**：数据包直接由 Linux 内核发出。**`dae` 用户进程完全感知不到这个流量，CPU 占用极低。**

## 场景二：访问 Google (代理)

1. **应用发起请求** -> 数据包到达网卡 egress。
2. **eBPF (TC) 拦截**：检查目的 IP。
3. **查表 (Map)**：发现匹配代理规则。
4. **决策**：修改数据包流向，重定向到 `dae` 的 TProxy 监听端口。
5. **TProxy 接收**：Linux 网络栈将包交给 `dae` 进程。
6. **dae 处理**：读取原始目标，加密封装，重新发出。
7. **eBPF 再次拦截**：检测到这是 `dae` 进程发出的（通过 cgroup 或 mark），直接放行。

---

# 4. 为什么要这么做？(相比传统方案的优势)

## **性能极高 (Performance)**

* **直连流量**：完全绕过用户空间。传统 TUN 方案中，直连流量也要经历 `内核 -> TUN -> 用户空间程序(发现是直连) -> 写回内核 -> 网卡` 的过程，这带来了巨大的上下文切换开销。`dae` 将直连流量处理留在了内核。

* **代理流量**：路径更短，省去了 TUN 设备的读写开销。

## **真正的全局代理 (True Global)**

* 由于挂载在 TC 层，它可以拦截几乎所有类型的流量（包括 ICMP、Docker 容器流量、虚拟机流量），不需要复杂的路由表配置或 NAT 规则。

## **Socket 级控制**

* `dae` 还可以利用 eBPF 的 `cgroup` 钩子，直接在 Socket 创建阶段就介入，实现基于进程名、用户组的分流，而不仅仅是基于 IP。

# 5. 总结

`dae` 的魔法在于：**TProxy 提供了一个接收任意流量的“口袋”，而 eBPF 是一个在内核门口的高速“分拣员”**。分拣员直接把不需要代理的包裹扔上车（直连），把需要代理的包裹扔进 TProxy 的口袋里。这种架构代表了新一代 Linux 网络代理工具的发展方向。
