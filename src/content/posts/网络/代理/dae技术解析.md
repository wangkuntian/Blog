---
title: dae技术解析
published: 2025-12-16 13:23:37
description: ''
image: ''
tags: ['代理']
category: '网络'
draft: false
lang: ''
---

dae 完整配置文档与技术解析

# 1. dae 核心功能

dae 是一款基于 eBPF 技术的高性能透明代理解决方案，核心功能包括：  

1. **透明流量拦截**：无需客户端配置代理，自动拦截指定接口（如局域网、容器网桥）的流量。  
2. **智能流量分流**：基于域名、IP、端口、协议、进程名等多维度规则，将流量路由至代理节点或直连。  
3. **高性能转发**：通过 eBPF 在内核层处理流量，直连流量无需经过用户态代理，性能接近原生网络。  
4. **灵活代理管理**：支持订阅节点、分组策略（如最低延迟优先）、TLS 伪装等高级功能。  
5. **DNS 集成控制**：拦截并处理 DNS 请求，确保域名分流准确性，避免 DNS 泄露。  

---

# 2. dae 架构设计

dae 采用「内核层 + 用户态」协同架构，核心组件如下：  

| 层级       | 组件/技术                | 作用                                                                 |
|------------|--------------------------|----------------------------------------------------------------------|
| **内核层** | eBPF 程序 + tc 机制      | 在流量进入 TCP/IP 协议栈前拦截，基于规则快速分流（代理/直连），降低开销。 |
| **用户态** | 配置解析模块             | 解析 `global`、`routing`、`dns` 等配置，生成规则供 eBPF 调用。        |
| **用户态** | 代理节点管理模块         | 处理订阅节点、健康检查（TCP/UDP 连通性）、分组策略（如 `min_moving_avg`）。 |
| **用户态** | DNS 处理模块             | 管理 DNS 上游（如阿里云 DNS、谷歌 DNS），基于域名规则路由 DNS 请求。    |
| **用户态** | 日志与监控模块           | 输出流量处理日志（`log_level` 控制），支持调试与性能分析。             |

**架构特点**：  

- 内核层 eBPF 程序直接操作网络包，减少用户态与内核态切换开销。  
- 直连流量通过内核路由转发，避免用户态代理干预，性能损耗极低。  

---

# 3. 流量处理流程

1. **流量拦截**  
   - dae 在 `lan_interface`（如局域网网卡、容器网桥 `docker0`）和 `wan_interface`（公网接口）的 tc 挂载点加载 eBPF 程序。  
   - 入站/出站流量经过网卡时，被 eBPF 程序拦截（未进入 TCP/IP 协议栈前）。  

2. **规则匹配**  
   - eBPF 程序根据用户态配置的 `routing` 规则（如 `domain(geosite:cn) -> direct`）判断流量方向。  
   - 依赖 DNS 模块解析的域名-IP 映射，确保基于域名的规则生效（需 DNS 流量被 dae 拦截）。  

3. **分流处理**  
   - **代理流量**：被标记为需代理的流量（如访问国外域名）通过 tproxy 机制重定向至 dae 监听端口，由用户态程序转发至选定的代理节点（基于 `group` 策略）。  
   - **直连流量**：匹配直连规则的流量（如国内 IP、私有网段）直接由内核路由转发，不经过用户态代理。  

4. **反馈与日志**  
   - 处理结果（如代理节点选择、直连判定）通过日志输出，可通过 `log_level: debug` 开启详细调试信息。  

# 4. 完整配置示例

以下配置适用于「宿主机 + 容器网桥」场景，代理容器流量并实现国内外分流：  

```python
# /etc/dae/config.dae

# 全局配置
global {
  # 监听容器网桥（如 Docker 默认网桥 docker0）和宿主机局域网接口
  lan_interface: docker0, eth0
  # 自动检测公网接口
  wan_interface: auto
  # tproxy 端口（内核层与用户态通信，无需手动修改）
  tproxy_port: 12345
  # 日志级别：error < warn < info < debug < trace
  log_level: info
  # 自动配置内核参数（如 IP 转发、禁用重定向）
  auto_config_kernel_parameter: true
  # 代理节点拨号模式：基于域名解析（缓解 DNS 污染）
  dial_mode: domain
  # TLS 实现：使用 utls 模仿浏览器指纹
  tls_implementation: utls
  utls_imitate: chrome_auto
}

# 代理节点订阅
subscription {
  # 订阅链接（支持多种协议：Shadowsocks、VLESS 等）
  my_sub: "https://example.com/subscription/link"
}

# 自定义节点（可选，用于本地节点补充）
node {
  local_ss: "ss://aes-128-gcm:password@192.168.1.1:8388"
}

# 代理组配置（节点选择策略）
group {
  # 国外代理组：从订阅中筛选香港/新加坡节点，优先最低移动平均延迟
  proxy_group {
    filter: subtag(my_sub) && name(keyword: "HK", keyword: "SG")
    policy: min_moving_avg
    # 覆盖全局健康检查地址
    tcp_check_url: "http://cp.cloudflare.com"
    check_interval: 60s
  }
  # 本地节点组：固定使用本地节点
  local_group {
    filter: name(local_ss)
    policy: fixed(0)
  }
}

# DNS 配置（确保域名分流生效）
dns {
  upstream {
    # 国内 DNS（解析国内域名）
    alidns: "udp://dns.alidns.com:53"
    # 国外 DNS（解析国外域名）
    googledns: "tcp+udp://dns.google:53"
  }
  routing {
    request {
      # 广告域名直接拒绝
      qname(geosite:category-ads-all) -> reject
      # 国内域名用阿里 DNS
      qname(geosite:cn) -> alidns
      # 其他域名用谷歌 DNS
      fallback: googledns
    }
    response {
      # 谷歌 DNS 返回的结果直接接受
      upstream(googledns) -> accept
      # 非国内域名但解析到私有 IP 时，用谷歌 DNS 重新解析
      !qname(geosite:cn) && ip(geoip:private) -> googledns
      fallback: accept
    }
  }
}

# 流量路由规则
routing {
  # 系统进程（如 NetworkManager）直连
  pname(NetworkManager) -> direct
  # 组播/广播地址直连
  dip(224.0.0.0/3, "ff00::/8") -> direct
  # 私有网段（如容器内网）直连
  dip(geoip:private) -> direct

  # 国内 IP/域名直连
  dip(geoip:cn) -> direct
  domain(geosite:cn) -> direct
  # 学术网站（国内）直连
  domain(geosite:category-scholar-cn) -> direct

  # OpenAI 相关域名走本地节点组
  domain(geosite:openai) -> local_group

  # 未匹配规则的流量走国外代理组
  fallback: proxy_group
}
```

# 5. 配置说明

1. **`global` 部分**：定义核心参数，如监听接口、日志级别、内核参数自动配置等。`lan_interface` 需包含容器网桥（如 `docker0`）以拦截容器流量。  
2. **`subscription` 与 `node`**：配置代理节点来源，支持订阅链接和本地节点，节点会被合并到全局节点池。  
3. **`group` 部分**：对节点分组并指定选择策略（如 `min_moving_avg` 优先低延迟节点），可覆盖全局健康检查参数。  
4. **`dns` 部分**：管理 DNS 上游与路由，确保国内/国外域名解析准确，避免 DNS 污染影响分流。  
5. **`routing` 部分**：核心流量规则，基于进程名、IP、域名等维度匹配流量，指定转发目标（`direct` 直连、组名或 `block` 拦截）。  

# 6. 运行与验证

1. **启动 dae**：  

   ```bash
   sudo dae run -c /etc/dae/config.dae
   ```  

   或作为系统服务运行（参考 [run-as-daemon](https://github.com/daeuniverse/dae/blob/main/docs/en/user-guide/run-as-daemon.md)）。  

2. **验证配置**：  
   - 查看日志：`journalctl -u dae -f` 确认接口绑定成功、节点加载正常。  
   - 容器测试：在容器内执行 `curl ipinfo.io` 验证是否通过代理；`curl baidu.com` 验证直连是否生效。  
   - 抓包分析：`tcpdump -i docker0` 确认容器流量经过网桥并被 dae 处理。  

更多细节可参考官方文档：  

- [工作原理](https://github.com/daeuniverse/dae/blob/main/docs/en/how-it-works.md)  
- [配置详解](https://github.com/daeuniverse/dae/tree/main/docs/en)
