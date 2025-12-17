---
title: dae测试
published: 2025-12-16 15:48:51
description: ''
image: ''
tags: ['网络', '代理']
category: '网络'
draft: false
lang: ''
---

# 1. 前提条件

linux kernel > 5.17

> [官方文档](https://github.com/daeuniverse/dae/blob/main/docs/en/README.md#linux-kernel-requirement)

---

## 2. 安装dae

安装脚本

```bash
wget https://github.com/daeuniverse/dae/releases/download/v1.0.0/dae-linux-x86_64.zip
unzip ae-linux-x86_64.zip -d dae-linux-x86_64
cd dae-linux-x86_64
chmod +x dae-linux-x86_64
cp ./dae-linux-x86_64 /usr/bin/dae
cp dae.service /etc/systemd/system/

mkdir -p /etc/dae /usr/local/share/dae/
cp example.dae /etc/dae/config.dae
cp geoip.dat  geosite.dat /usr/local/share/dae/

systemctl daemon-reload
systemctl start dae
systemctl status dae
```

---

## 3. 启动容器

创建网络。

```bash
nerdctl network create --subnet 10.0.1.0/24 bridge-1
```

启动容器。

```bash
nerdctl run -td --name test-1 --network bridge-1 --ip 10.0.1.100 rockylinux:9.3
```

---

## 4. 配置dae

```text
# 全局配置
global {
  # 监听容器网桥（如 Docker 默认网桥 docker0）和宿主机局域网接口
  # br-02710c42ee9a是bridge-1网络的网桥设备
  lan_interface: br-02710c42ee9a
  # 自动检测公网接口
  wan_interface: auto
  # tproxy 端口（内核层与用户态通信，无需手动修改）
  tproxy_port: 12345
  # 日志级别：error < warn < info < debug < trace
  log_level: debug
  # 自动配置内核参数（如 IP 转发、禁用重定向）
  auto_config_kernel_parameter: true
  # 代理节点拨号模式：基于域名解析（缓解 DNS 污染）
  dial_mode: domain
  # TLS 实现：使用 utls 模仿浏览器指纹
  tls_implementation: utls
  utls_imitate: chrome_auto
}

# 自定义节点（可选，用于本地节点补充）
node {
  # socks5代理
  socks5: "socks5://192.168.51.243:10809"
}

# 代理组配置（节点选择策略）
group {
  # 本地节点组：固定使用本地节点
  proxy_group {
    filter: name(socks5)
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
    googledns_doh: "https://dns.google/dns-query"
  }
  routing {
    request {
      # 广告域名直接拒绝
      qname(geosite:category-ads-all) -> reject
      # 国内域名用阿里 DNS
      qname(geosite:cn) -> alidns

      qtype(https) -> googledns_doh

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

  # 源端口
  sport(6001) -> direct
  sport(5555) -> direct
  sport(10080-30000) -> direct

  # 源ip地址为10.0.1.100走代理服务
  sip(10.0.1.100) -> proxy_group
}
``` 

重启dae。

```bash
systemctl restart dae
```

查看dae日志。

```bash
journalctl -u dae -f
```

---

## 5. 测试

访问`ipinfo.io`可以看到公网IP已经改变。

```bash
nerdctl exec -it test-1 curl ipinfo.io
{
  "ip": "18.139.159.232",
  "hostname": "ec2-18-139-159-232.ap-southeast-1.compute.amazonaws.com",
  "city": "Singapore",
  "region": "Singapore",
  "country": "SG",
  "loc": "1.2897,103.8501",
  "org": "AS16509 Amazon.com, Inc.",
  "postal": "018989",
  "timezone": "Asia/Singapore",
  "readme": "https://ipinfo.io/missingauth"
}
```
