---
title: Overlay网络
published: 2025-12-12
description: ""
image: ""
tags: ["网络", "虚拟网络"]
category: "网络"
draft: false
lang: ""
---

Overlay 网络是一种 ​**​ 构建在现有底层网络（称为 Underlay 网络）之上的虚拟网络 ​**​。它通过在底层网络提供的物理连接之上创建逻辑连接（通常是通过封装和隧道技术）来实现，从而提供与底层物理拓扑和限制无关的额外网络功能和服务。

# 核心思想 ​

1. ​**​ 抽象与解耦：​**​ Overlay 网络将其逻辑拓扑、寻址方案、策略和服务与底层物理网络分离开来。管理员可以在不改变物理网络的情况下，灵活地创建、修改和管理虚拟网络。
2. ​**​ 封装：​**​ Overlay 网络设备（如虚拟交换机、隧道端点）将原始数据包（属于 Overlay 网络）封装在另一个数据包（使用 Underlay 网络的地址）中。这个外层数据包通过底层网络传输到目标隧道端点。
3. ​**​ 解封装：​**​ 目标隧道端点收到封装的数据包后，剥离外层包头，恢复出原始的 Overlay 数据包，并将其转发到 Overlay 网络中的最终目的地。
4. ​**​ 逻辑网络：​**​ Overlay 网络中的设备使用自己的虚拟 IP 地址（可能完全独立于物理 IP）进行通信，感觉就像它们直接连接在一个专有的网络上。

# 为什么需要 Overlay 网络 ​

-   ​**​ 克服物理限制：​**​ 突破物理 VLAN 数量限制（4096 个）、跨越物理三层边界构建二层网络（大二层）、在 IP 网络上模拟非 IP 协议。
-   ​**​ 多租户隔离：​**​ 在共享的物理基础设施（如公有云、私有云）上为不同租户或应用创建完全隔离的、安全的虚拟网络（如 VPC）。
-   ​**​ 网络虚拟化：​**​ 提供敏捷、可编程的网络服务（如虚拟防火墙、负载均衡器、路由器），可按需创建和调整。
-   ​**​ 简化管理：​**​ 网络策略（安全、QoS、路由）在逻辑层面定义和自动化，与物理网络解耦，简化运维。
-   ​**​ 支持云原生和容器：​**​ 为动态的、高度可扩展的容器和微服务架构提供灵活、可移植的网络连接（如 Kubernetes CNI 插件）。
-   ​**​ 无缝迁移：​**​ 虚拟机或容器可以在不同的物理主机甚至数据中心之间迁移，而保持其 IP 地址和网络连接不变。

# 关键的 Overlay 网络技术 ​

Overlay 技术主要通过封装协议实现。以下是一些主流和重要的技术：

## 基于隧道的封装协议 (主要用于数据中心/云计算)​

-   ​**​VXLAN (Virtual Extensible LAN - RFC 7348):​**​ 当前最主流的 Overlay 技术。将原始以太网帧封装在 UDP 数据包中（外层 IP 头 + UDP 头 + VXLAN 头）。使用 24 位的 VNI 标识虚拟网络，解决了 VLAN ID 数量限制问题。需要底层 IP 网络支持组播或使用控制平面（如 EVPN）进行泛洪抑制。
-   ​**​NVGRE (Network Virtualization using Generic Routing Encapsulation - RFC 7637):​**​ 由 Microsoft 推动。将原始以太网帧封装在 GRE 数据包中。使用 24 位的 VSID 标识虚拟网络。依赖底层网络进行泛洪。
-   ​**​Geneve (Generic Network Virtualization Encapsulation - RFC 8926):​**​ 一种较新的、旨在统一和取代 VXLAN/NVGRE 的封装协议。核心思想是提供一个可扩展的、包含 TLV 选项的封装头，可以携带丰富的元数据（如策略信息），为 SDN 控制平面提供更大的灵活性。
-   ​**​GENEVE (Generic Network Virtualization Encapsulation):​**​ 与 Geneve 相同，是更常见的写法。
-   ​**​STT (Stateless Transport Tunneling):​**​ 由 Nicira (后被 VMware 收购) 提出。将原始帧封装在一个伪 TCP 数据包中，利用网卡硬件对 TCP 分段的卸载能力提升性能。但标准化程度不如 VXLAN/Geneve。
-   ​**​GRE (Generic Routing Encapsulation - RFC 2784, RFC 2890):​**​ 一种通用的隧道协议，可以将各种类型的网络层协议数据包封装在另一种网络层协议中（如 IP over IP）。它是许多其他 Overlay 技术（如 L2TPv3, IPSec VPN）的基础。配置相对简单，但缺乏 VXLAN/Geneve 那样的标准化虚拟网络标识和扩展性。
-   ​**​L2TPv3 (Layer 2 Tunneling Protocol Version 3 - RFC 3931):​**​ 主要用于在 IP 网络上提供点对点的二层连接（模拟专线）。常用于运营商网络或企业远程接入。

## ​ 对等网络 (P2P) Overlays​

这类 Overlay 直接在参与节点之间建立逻辑连接，通常用于构建去中心化应用。

-   ​**​BitTorrent, Bitcoin, Ethereum 等区块链网络：​**​ 节点形成 P2P Overlay 网络进行文件共享或分布式账本维护。

*   ​**​Skype (早期版本), BitTorrent Live：​**​ 用于媒体流传输的 P2P Overlays。

## ​​ 软件定义网络 (SDN) 驱动的 Overlays​

这些技术通常结合了上述封装协议（如 VXLAN, Geneve），但核心在于有一个集中的 SDN 控制器（如 VMware NSX, Cisco ACI, OpenStack Neutron + OVS, Nuage Networks）来动态地管理隧道端点、学习 MAC/IP 地址、分发策略、抑制泛洪流量等。

-   ​**​Open vSwitch (OVS)：​**​ 一个开源的、支持多种 Overlay 协议（VXLAN, GRE, Geneve, STT）的虚拟交换机，是许多 SDN 解决方案的基础组件。

# 主要应用场景 ​

-   ​**​ 云计算 (IaaS/PaaS)：​**​ 提供虚拟私有云、租户网络隔离。
-   ​**​ 数据中心网络虚拟化：​**​ 构建跨机架、跨数据中心的逻辑大二层网络，支持虚拟机动态迁移。
-   ​**​ 容器网络：​**​ 为 Docker, Kubernetes 等容器平台提供网络连接（Calico, Flannel, Weave Net, Cilium 等 CNI 插件都使用 Overlay 技术）。
-   ​**​ 软件定义广域网：​**​ 在公共互联网上构建安全、优化的企业广域网。
-   ​**​ 内容分发网络：​**​ 优化内容传输路径。
-   ​**​ 对等网络应用：​**​ 文件共享、区块链、去中心化通信。

# 总结 ​

Overlay 网络是现代网络架构（尤其是云计算、虚拟化、容器化和 SDN）的核心支柱。它通过在物理网络之上创建一个虚拟化的逻辑网络层，提供了前所未有的灵活性、可扩展性、多租户隔离能力和敏捷性。VXLAN 是目前数据中心领域的事实标准，而 Geneve 代表了未来更灵活、可扩展的方向。SDN 控制器则极大地简化了复杂 Overlay 网络的管理和控制。理解 Overlay 技术对于设计和运维现代 IT 基础设施至关重要。
