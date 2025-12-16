---
title: 内核参数：bridge-nf-call-iptables
published: 2025-12-11
description: ""
image: ""
tags: ["操作系统", "内核参数"]
category: "操作系统"
draft: false
lang: ""
---

`/proc/sys/net/bridge/bridge-nf-call-iptables` 是 Linux 系统中一个关键的 ​**​ 内核运行时参数 ​**​，专门控制 ​**​ 网桥（bridge）​**​ 设备上流量的处理方式，尤其是与 ​**​netfilter 防火墙框架（iptables/nftables）​**​ 的交互。

# 作用解释

这个参数决定了 ​**​ 通过 Linux 软件网桥传递的流量 ​**​ 是否会被 ​**​iptables（或后来的 nftables）防火墙规则 ​**​ 处理。

-   ​**​ 值为 `1`（默认值，推荐）​**​：

    -   ​**​ 开启 ​**​ 流量过滤。通过网桥的流量（即使是 ​**​ 同一个二层网络内部 ​**​ 的通信）会被送给 `iptables/nftables` 防火墙规则进行检查。
    -   `iptables` 的 `FORWARD` 链、`INPUT` 链（目标地址是本地但目的 MAC 是网桥时）、`OUTPUT` 链（本地生成但从网桥口发出）以及各种表（如 `filter`, `nat`, `mangle`）中的规则，都有机会过滤或修改这些桥接流量。
    -   ​**​ 目的 ​**​：提供对桥接流量的细粒度防火墙控制和安全隔离，尤其是在虚拟化环境（KVM, Docker 容器网络使用网桥时）或物理网络桥接场景中至关重要。

-   ​**​ 值为 `0`​**​：
    -   ​**​ 关闭 ​**​ 流量过滤。通过网桥的流量（同一二层网络内部通信）​**​ 不会 ​**​ 经过 `iptables/nftables` 防火墙规则。
    -   ​**​ 目的 ​**​：纯粹的二层转发，性能可能略高（因绕过防火墙检查）。但 ​**​ 存在重大安全隐患 ​**​：同一网桥上的主机或容器可以 ​**​ 不受 iptables 规则限制 ​**​ 地直接通信，即使你配置了阻止它们的规则也无效。这通常 ​**​ 不推荐 ​**​，除非你有特殊且充分理解其风险的需求。

# 核心问题

Linux 网桥传统上是工作在 ​**​ 数据链路层（L2）​**​ 的设备。标准的 `iptables/nftables` 规则主要作用于 ​**​ 网络层（L3）​**​。在没有 `bridge-nf-call-iptables = 1` 机制之前：

-   ​**​ 同一网段内部的机器（或容器）​**​ 通过网桥通信，是直接的 ​**​L2 转发 ​**​。源和目的 IP 都在同一个子网里，流量根本不会进入 L3 路由路径，也就不会被 `FORWARD` 链规则处理。
-   ​**​ 这会绕过所有基于 IP 地址/端口 ​**​ 配置的 `iptables/nftables` 防火墙规则（尤其是 `FORWARD` 链中的规则），造成安全隐患。

​**​`bridge-nf-call-iptables = 1` 将这个 L2 的桥接流量 “钩子”（hook）到 L3 的 netfilter 框架中，使得防火墙规则能够应用到同一网桥上的设备间的流量。​**​

# 为什么这个参数很重要（尤其虚拟化和容器化）

1. ​**​ 安全隔离：​**​ 在 Docker、Kubernetes (k8s)、KVM/QEMU 等环境中，经常使用 Linux 网桥连接虚拟机或容器（`docker0`, `cni0`, `virbr0` 等都是常见网桥）。默认开启 `bridge-nf-call-iptables=1` ​**​ 是保证这些环境网络隔离和安全策略生效的关键 ​**​。例如，Kubernetes 服务依赖此机制实现 Pod 间网络策略和 Service 的负载均衡。
2. ​**​ 防火墙策略生效：​**​ 确保你配置的 iptables/nftables 规则（如阻止某些 IP/端口访问）能应用到网桥上的所有流量，包括同一网段内部的通信。
3. ​**​ 网络地址转换（NAT）：​**​ 对于目的地址是外部或需要 SNAT/MASQUERADE 的流量，`bridge-nf-call-iptables=1` 也是 `nat` 表规则应用到桥接流量的前提。

# 补充说明：`bridge-nf-call-ip6tables` 和 `ebtables`

-   ​**​`/proc/sys/net/bridge/bridge-nf-call-ip6tables`​**​： 与 `bridge-nf-call-iptables` 作用相同，但针对 ​**​IPv6​**​ 流量。它控制网桥上的 IPv6 流量是否经过 `ip6tables` 防火墙。
-   ​**​`ebtables`​**​： 这是一个专门设计用于处理 ​**​ 数据链路层（L2）以太网帧 ​**​ 过滤的独立防火墙工具（可看作 L2 版的 iptables）。它的处理与 `bridge-nf-call-iptables` 是 ​**​ 并行存在 ​**​ 的选项。`ebtables` 工作在更底层（MAC 地址、VLAN 等）。

# 如何查看和修改

-   ​**​ 查看当前值：​**​
    ```
    cat /proc/sys/net/bridge/bridge-nf-call-iptables
    ```
-   ​**​ 临时修改（重启后失效）​**​：
    ```
    echo 1 > /proc/sys/net/bridge/bridge-nf-call-iptables  # 开启（推荐）
    echo 0 > /proc/sys/net/bridge/bridge-nf-call-iptables  # 关闭（高风险）
    ```
-   ​**​ 永久修改（推荐方式）​**​：

    1. 编辑 `/etc/sysctl.conf` 文件：

        ```
        sudo nano /etc/sysctl.conf  # 或使用你喜欢的编辑器
        ```

    2. 添加或修改以下行：

        ```
        net.bridge.bridge-nf-call-iptables = 1  # 用于 IPv4
        net.bridge.bridge-nf-call-ip6tables = 1  # 用于 IPv6（如果用到IPv6）
        ```

    3. 保存文件后，使配置生效：

        ```
        sudo sysctl -p
        ```

# 总结

`/proc/sys/net/bridge/bridge-nf-call-iptables` 是一个控制 Linux 网桥流量是否经过 iptables/nftables 防火墙的开关。​**​ 默认值 `1` 是推荐且安全的设置 ​**​，它对于确保虚拟化（如 KVM）、容器化（如 Docker, Kubernetes）环境中网络隔离和防火墙策略正确生效 ​**​ 至关重要 ​**​。将其设置为 `0` 会禁用网桥上同一子网设备间的防火墙检查，带来安全风险，通常应避免。如果需要修改，通过 `sysctl.conf` 进行永久配置是最佳实践。

```bash
ip rule show table eth0
11000:  from all iif lo oif eth0 uidrange 0-0 lookup eth0
11000:  from all iif lo oif eth0 uidrange 0-0 lookup eth0
16000:  from all fwmark 0x10064/0x1ffff iif lo lookup eth0
16000:  from all fwmark 0x10065/0x1ffff iif lo lookup eth0
17000:  from all iif lo oif eth0 lookup eth0
17000:  from all iif lo oif eth0 lookup eth0
23000:  from all fwmark 0x64/0x1ffff iif lo lookup eth0
23000:  from all fwmark 0x65/0x1ffff iif lo lookup eth0
31000:  from all fwmark 0x0/0xffff iif lo lookup eth0
```

```go
func ClearTProxyRules(index int, addr []string) {
	name := fmt.Sprintf("CLASH_TPROXY%v", index)
	nameNat := fmt.Sprintf("CLASH_TPROXY%v_NAT", index)
	mark := index * 10
	addr4g := addr[0]
	addrWifi := addr[1]

	cmd := fmt.Sprintf("iptables -t mangle  -w 30  -C PREROUTING -s 192.168.17%v.0/24 -j %v", index, name)
	_, err := RunShellCmd2(cmd)
	if err != nil {
		return
	}

	cmdlist := []string{

		fmt.Sprintf("ip rule del fwmark %#x to %v lookup main priority 90", mark, addrWifi),
		fmt.Sprintf("ip rule del fwmark %#x to %v lookup main priority 90", mark, addr4g),
		fmt.Sprintf("ip rule del fwmark %#x lookup %v priority 100", mark, 200+index),
		fmt.Sprintf("ip route del local 0.0.0.0/0 dev lo table %v", 200+index),

		fmt.Sprintf("iptables -t mangle  -w 30  -F %v", name),                               //清除mangle表链
		fmt.Sprintf("iptables -t mangle  -w 30  -D PREROUTING -s %v -j %v", addrWifi, name), //清除mangle表链
		fmt.Sprintf("iptables -t mangle  -w 30  -D PREROUTING -s %v -j %v", addr4g, name),
		fmt.Sprintf("iptables -t mangle  -w 30  -X %v", name), //删除mangle表链

		fmt.Sprintf("iptables -t nat  -w 30  -F %v", nameNat),
		fmt.Sprintf("iptables -t nat  -w 30  -D PREROUTING -s %v -j %v", addrWifi, nameNat),
		fmt.Sprintf("iptables -t nat  -w 30  -D PREROUTING -s %v -j %v", addr4g, nameNat),
		fmt.Sprintf("iptables -t nat  -w 30  -X %v", nameNat),
	}

	for _, cmd := range cmdlist {
		RunShellCmd2(cmd)
	}

}

func SetTProxyRules(index int, addr []string) {
	// ClearTProxyRules(index)

	name := fmt.Sprintf("CLASH_TPROXY%v", index)
	nameNat := fmt.Sprintf("CLASH_TPROXY%v_NAT", index)
	mark := index * 10

	addr4g := addr[0]
	addrWifi := addr[1]
	// name2 := fmt.Sprintf("CLASH_TPROXY_O%v", index)
	cmdlist := []string{

		//nat table
		fmt.Sprintf("iptables -t nat  -w 30  -N %v", nameNat),
		fmt.Sprintf("iptables -t nat  -w 30  -A %v -p udp --dport 53 -j DNAT --to-destination 127.0.0.1:%v", nameNat, BASE_PORT+2*index),
		fmt.Sprintf("iptables -t nat  -w 30  -A %v -p tcp --dport 53 -j DNAT --to-destination 127.0.0.1:%v", nameNat, BASE_PORT+2*index),
		fmt.Sprintf("iptables -t nat  -w 30  -A PREROUTING -s %v -j %v", addrWifi, nameNat),
		fmt.Sprintf("iptables -t nat  -w 30  -A PREROUTING -s %v -j %v", addr4g, nameNat),

		fmt.Sprintf("iptables -t mangle  -w 30  -N %v", name), //创建mangle表链

		fmt.Sprintf("iptables -t mangle  -w 30  -A %v -m mark --mark %#x/%#x -j RETURN", name, mark, mark),

		//排除本地/局域网流量
		fmt.Sprintf("iptables -t mangle  -w 30  -A %v -d 0.0.0.0/8 -j RETURN", name),
		fmt.Sprintf("iptables -t mangle  -w 30  -A %v -d 10.0.0.0/8 -j RETURN", name),
		fmt.Sprintf("iptables -t mangle  -w 30  -A %v -d 127.0.0.0/8 -j RETURN", name),
		fmt.Sprintf("iptables -t mangle  -w 30  -A %v -d 169.254.0.0/16 -j RETURN", name),
		fmt.Sprintf("iptables -t mangle  -w 30  -A %v -d 172.16.0.0/12 -j RETURN", name),
		fmt.Sprintf("iptables -t mangle  -w 30  -A %v -d 192.168.0.0/16 -j RETURN", name),
		fmt.Sprintf("iptables -t mangle  -w 30  -A %v -d 224.0.0.0/4 -j RETURN", name),
		fmt.Sprintf("iptables -t mangle  -w 30  -A %v -d 240.0.0.0/4 -j RETURN", name),
		fmt.Sprintf("iptables -t mangle  -w 30  -A %v -p udp --sport 6001 -j RETURN", name),
		fmt.Sprintf("iptables -t mangle  -w 30  -A %v -p tcp --sport 5555 -j RETURN", name),
		//重定向其余流量到TPROXY端口
		fmt.Sprintf("iptables -t mangle  -w 30  -A %v -p tcp ! --dport 53 -j TPROXY --on-port %v --on-ip 127.0.0.1 --tproxy-mark %#x/%#x", name, BASE_PORT+2*index-1, mark, mark),
		fmt.Sprintf("iptables -t mangle  -w 30  -A %v -p udp ! --dport 53 -j TPROXY --on-port %v --on-ip 127.0.0.1 --tproxy-mark %#x/%#x", name, BASE_PORT+2*index-1, mark, mark),
		//应用规则到PREROUTING链
		fmt.Sprintf("iptables -t mangle  -w 30  -A PREROUTING -s %v -j %v", addrWifi, name),
		fmt.Sprintf("iptables -t mangle  -w 30  -A PREROUTING -s %v -j %v", addr4g, name),

		fmt.Sprintf("ip rule add fwmark %#x to %v lookup main priority 90", mark, addrWifi),
		fmt.Sprintf("ip rule add fwmark %#x to %v lookup main priority 90", mark, addr4g),
		fmt.Sprintf("ip rule add fwmark %#x lookup %v priority 100", mark, 200+index),
		fmt.Sprintf("ip route add local 0.0.0.0/0 dev lo table %v", 200+index),
	}

	for _, cmd := range cmdlist {
		RunShellCmd2(cmd)
	}
}
```
