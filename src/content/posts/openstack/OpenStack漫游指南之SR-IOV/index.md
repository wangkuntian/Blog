---
title: OpenStack漫游指南之SR-IOV
published: 2025-12-10
description: ""
image: ""
tags: ["OpenStack", "SR-IOV"]
category: "OpenStack"
draft: false
lang: ""
---

SR-IOV 全称 Single Root I/O Virtualization，是 Intel 在 2007 年提出的一种基于硬件的虚拟化解决方案。

在虚拟化场景中，CPU 与内存是最先解决的，但是 I/O 设备一直没有很好的解决办法，Intel 有 VT-d（Virtualization Technology for Directed I/O）可以将物理服务器的 PCIe 设备直接提供给虚拟机使用，也就是常说的“直通”（passthrough），但是直通面临一个问题是 PCIe 设备只能给一个虚拟机使用，这肯定是不行的，所以 SR-IOV 应运而生，一个物理设备可以虚拟出多个虚拟设备给虚拟机使用。

---

# 概述

SR-IOV 是一种规范，使得单根端口下的单个快速外围组件互连 (PCIe) 物理设备显示为管理程序或客户机操作系统的多个单独的物理设备，既有直通设备的性能优势，又可以支持多个虚拟机，一举两得。

## 基本概念

SR-IOV 使用 physical functions（PF）和 virtual functions（VF）为 SR-IOV 设备管理全局功能。

PF 包含 SR-IOV 功能的完整 PCIe 设备，PF 作为普通的 PCIe 设备被发现、管理和配置。PF 通过分配 VF 来配置和管理 SR-IOV 功能。禁用 SR-IOV 后，主机将在一个物理网卡上创建一个 PF。

VF 是轻量级 PCIe 功能（I/O 处理）的 PCIe 设备，每个 VF 都是通过 PF 来生成管理的，VF 的具体数量限制受限于 PCIe 设备自身配置及驱动程序的支持，启用 SR-IOV 后，主机将在一个物理 NIC 上创建单个 PF 和多个 VF。 VF 的数量取决于配置和驱动程序支持。

每个 SR-IOV 设备都可有一个 PF（Physical Functions），并且每个 PF 最多可有 64,000 个与其关联的 VF（Virtual Function）。PF 可以通过寄存器创建 VF，这些寄存器设计有专用于此目的的属性。一旦在 PF 中启用了 SR-IOV，就可以通过 PF 的总线、设备和功能编号（路由 ID）访问各个 VF 的 PCI 配置空间。

每个 VF 都具有一个 PCI 内存空间，用于映射其寄存器集。VF 设备驱动程序对寄存器集进行操作以启用其功能，并且显示为实际存在的 PCI 设备。创建 VF 后，可以直接将其指定给虚拟机或各个应用程序。此功能使得虚拟功能可以共享物理设备，并在没有 CPU 和虚拟机管理程序软件开销的情况下执行 I/O。

## 先决条件

PCIe Passthrough 的方式是直接把一个 PCIe 设备指派给 guest 虚拟机，这样 guest 虚拟机可以完全控制设备并提供接近于原生性能。但是，PCIe Passthrough 的实现是和 SR-IOV 冲突的，因为在 SR-IOV 实现中，虚拟机是直接分配一个 VF。这样多个虚拟机可以通过分配的 VF 来使用同一个 PCIe 设备。

设备指定分配需要 CPU 和 firmware 都支持 IOMMU（I/O Memory Management Unit）。IOMMU 负责 I/O 虚拟地址（I/O Virtual Address）和物理内存地址转换。这样虚拟机就能够使用 guest 物理地址来对设备编程，通过 IOMMU 转换成物理主机内存地址。

IOMMU groups 是一组和系统中其他设备隔离的设备集合。也就是说，IOMMU groups 代表了具有 IOMMU 粒度（也就是必须将整个 IOMMU group 分配给同一个虚拟机）和与系统中所有其他 IOMMU group 隔离。这种方式允许 IOMMU 和其他 IOMMU group 区别进行数据处理，即 IOMMU group 的内部和外部隔离。

设备分配的关键是虚拟机和 PCIe 设备虚拟化功能(virtual functions, VFs)隔离数据处理。在 PCIe 和服务器标准定义的访问控制服务（Access Control Service, ACS）能力是保证 IOMMU groups 隔离的运行标准。如果没有原生的 ACS，或者不能确保硬件厂商提供该能力，则会破坏 IOMMU 的保护功能导致暴露点对点(peer-to-peer)DMA。

服务器的根端口（root port）也要提供原生的 ACS 支持，否则会导致安装设备被一股脑分组打包。有两种 root ports：基于处理器（北桥）root ports 和基于控制器 hub（南桥）root ports。

总结一下就是：

1. CPU 必须支持 IOMMU（例如 VT-d 或 AMD-Vi）。

2. Firmware 必须支持 IOMMU。

3. CPU root ports 必须支持 ACS 或等同 ACS 能力。

4. 所有位于 PCIe 设备和 root ports 之间的 PCIe switches 和 bridges 都应该支持 ACS。例如，如果 switch 不支持 ACS，则所有这个 Swtich 之后的设备都会共享一个相同的 IOMMU group，也就只能分配给一个虚拟机了。

# SR-IOV 的安装配置

为了启用 SR-IOV，需要执行以下步骤：

1. 计算节点上创建 VF。

2. 计算节点配置 nova-compute 的 PCI 设备。

3. 控制节点配置 neutron-server。

4. 控制节点配置 nova-scheduler。

5. 计算节点上启动 neutron-sriov-agent。

## 1. 计算节点上创建 VF

1. 确保 BIOS 中开启了 SR-IOV 和 IOMMU（arm 环境下叫 SMMU）。

2. 开启 linux 内核中的 IOMMU 功能。

编辑/etc/default/grub 文件

```bash
GRUB_CMDLINE_LINUX_DEFAULT="intel_iommu=on iommu=pt"
```

ARM 环境下为

```bash
GRUB_CMDLINE_LINUX_DEFAULT="iommu.passthrough=on iommu=pt"
```

生成新的内核启动文件。

```bash
grub2-mkconfig -o /boot/grub2/grub.cfg
```

在计算节点查看对应网卡的最大 VF 的个数。

```bash
cat /sys/class/net/enp49s0f1/device/sriov_totalvfs
7
```

-   其中 enp49s0f1 是网卡名称，可以看到最大支持 7 个 VF，之后配置的个数不能超过这个值。

设置网卡的 VF 个数。

```bash
echo '7' > /sys/class/net/enp49s0f1/device/sriov_numvfs
```

可以同 ip 命令查看网络设备如下。

```bash
ip a | grep enp49s0f1
3: enp49s0f1: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc mq state UP group default qlen 1000
34: enp49s0f1v0: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc fq_codel state UP group default qlen 1000
35: enp49s0f1v1: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc fq_codel state UP group default qlen 1000
36: enp49s0f1v2: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc fq_codel state UP group default qlen 1000
37: enp49s0f1v3: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc fq_codel state UP group default qlen 1000
38: enp49s0f1v4: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc fq_codel state UP group default qlen 1000
40: enp49s0f1v6: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc fq_codel state UP group default qlen 1000
45: enp49s0f1v5: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc fq_codel state UP group default qlen 1000
```

使用 lspci 查看网卡 pci 设备。

```bash
lspci -D | grep Ethernet
0000:31:00.0 Ethernet controller: Intel Corporation I350 Gigabit Network Connection (rev 01)
0000:31:00.1 Ethernet controller: Intel Corporation I350 Gigabit Network Connection (rev 01)
0000:31:10.1 Ethernet controller: Intel Corporation I350 Ethernet Controller Virtual Function (rev 01)
0000:31:10.5 Ethernet controller: Intel Corporation I350 Ethernet Controller Virtual Function (rev 01)
0000:31:11.1 Ethernet controller: Intel Corporation I350 Ethernet Controller Virtual Function (rev 01)
0000:31:11.5 Ethernet controller: Intel Corporation I350 Ethernet Controller Virtual Function (rev 01)
0000:31:12.1 Ethernet controller: Intel Corporation I350 Ethernet Controller Virtual Function (rev 01)
0000:31:12.5 Ethernet controller: Intel Corporation I350 Ethernet Controller Virtual Function (rev 01)
0000:31:13.1 Ethernet controller: Intel Corporation I350 Ethernet Controller Virtual Function (rev 01)
```

设置 VF 持久化。

```bash
echo "echo '7' > /sys/class/net/enp49s0f1/device/sriov_numvfs" >> /etc/rc.local
```

## 2. 计算节点配置 PCI 设备

编辑 nova-compute 服务的配置文件 nova.conf，一般为/etc/nova/nova.conf。

```ini
[pci]
passthrough_whitelist = { "address": "[[[[<domain>]:]<bus>]:][<slot>][.[<function>]]", "physical_network": "sriovnet1" }
```

根据上面 lspci 的结果可以配置如下的 pci 设备。

```ini
[pci]
passthrough_whitelist = [{"physical_network": "sriovnet1", "address": "*:31:12.*"}]
```

其中\*通配符匹配所有字符，所以地址为 0000:31:12.1 和 0000:31:12.5 的两个 pci 设备会被匹配。

## 3. 控制节点配置 neutron-server

编辑 neutron-server 的配置文件 ml2_conf.ini，一般为/etc/neutron/plugins/ml2/ml2_conf.ini。添加驱动 sriovnicswitch。

```ini
[ml2]
mechanism_drivers = openvswitch,sriovnicswitch
```

修改 vlan 范围。

```ini
[ml2_type_vlan]
network_vlan_ranges = sriovnet1
```

最后重启 neutron-server。

```bash
systemctl restart neutron-server
```

## 4. 控制节点配置 nova-scheduler

编辑 nova-sheduler 服务的配置文件 nova.conf，一般为/etc/nova/nova.conf。确保 available_filters 是全部的 filters，并且添加 PciPassthroughFilter 到 enabled_filters 中。

```ini
[filter_scheduler]
available_filters = nova.scheduler.filters.all_filters
enabled_filters = AvailabilityZoneFilter, ComputeFilter, ComputeCapabilitiesFilter, ImagePropertiesFilter, ServerGroupAntiAffinityFilter, ServerGroupAffinityFilter, PciPassthroughFilter
```

最后重启 nova-scheduler。

```bash
systemctl restart openstack-nova-scheduler
```

## 5. 计算节点上启动 neutron-sriov-agent

1. 安装 neutron-sriov-agent。

```bash
yum install -y openstack-neutron-sriov-nic-agent
```

1. 编辑 neutron-sriov-nic-agent 的配置文件，一般为/etc/neutron/plugins/ml2/sriov_agent.ini。

```ini
[sriov_nic]
physical_device_mappings = sriovnet1:enp49s0f1
exclude_devices =

[securitygroup]
firewall_driver = neutron.agent.firewall.NoopFirewallDriver
```

3.启动 neutron-sriov-agent。

```bash
systemctl enable neutron-sriov-nic-agent
systemctl start neutron-sriov-nic-agent
```

## 6. 打开 L2 FDB（可选）

FDB（Forwarding DataBase）是对 OVS agent 或 Linux agent 的 L2 层 agent 的扩展。它的目的是更新使用普通端口（Port）的现有实例的 FDB 表，这使 SR-IOV 实例与正常实例之间的沟通成为了可能。FDB 扩展的用例是：

1.直接端口（direct port）和普通端口（normal port）实例位于同一计算节点上。

2.使用浮动 IP 地址的直接端口（direct port）实例和网络节点位于同一宿主机上。

编辑计算节点上的 openvswitch_agent.ini 或者 linuxbridge_agent.ini。

```ini
[agent]
extensions = fdb

[FDB]
shared_physical_device_mappings = sriovnet1:enp49s0f1
```

重启 neutron-openvswitch-agent 或者 neutron-linuxbridge-agent 服务。

## 7. 验证

### 1. 查看 neutron-sriov-nic-agent 服务的状态

```bash
openstack network agent list --agent-type nic
```

![network_agent_list](network_agent_list.png)

### 2. 创建 sriov 网络

```bash
openstack network create --provider-physical-network sriovnet1 \
--provider-network-type vlan --provider-segment 1000 sriov-net
```

![](network_create.png)

### 3. 创建 sriov 子网

```bash
openstack subnet create --network sriov-net \
--subnet-range 10.12.21.0/24 \
--allocation-pool start=10.12.21.131,end=10.12.21.132 \
sriov-subnet
```

![](subnet_create.png)

### 4. 创建 port

```bash
openstack port create --network sriov-net --vnic-type direct \
sriov-port
```

![](port_create.png)

### 5. 使用 port 创建实例。

```bash
port_id=$(openstack port show sriov-port -c id -f value)
openstack server create --flavor m1.large \
--image uniontechos-server-20-1060a-amd64-beta \
--nic port-id=$port_id \
test
```

或者添加到已有实例上。

```bash
openstack server add port test $port_id
```

### 6. 进入实例内部查看

![](ip_addr.png)

查看网卡设备的信息，可以看到 ens4 网卡的驱动为 igbvf，说明透传成功。

![](ethtool.png)

# 出现的问题

## 1. 创建实例或者添加 port 时 nova-compute 报错

```bash
attach device xml: <interface type="hostdev" managed="yes">
  <mac address="fa:16:3e:fe:47:d2"/>
  <source>
    <address type="pci" domain="0x0000" bus="0x0b" slot="0x10" function="0x5"/>
  </source>
  <vlan>
    <tag id="1000"/>
  </vlan>
</interface>
attach_device /usr/lib/python3.6/site-packages/nova/virt/libvirt/guest.py:304
attaching network adapter failed.: libvirt.libvirtError: 内部错误：无法执行 QEMU 命令 'device_add'：vfio 0000:0b:10.5: group 3 is not viable
```

这是因为 IOMMU 给内存创建隔离区的最小粒度不是 Device，而是 group。需要硬件设备支持 PCIe ACS，或者通过 Linux Patch 的方式获得 PCIe ACS 的能力。

## 2. 创建完实例后实例获取不到 IP 地址

因为创建 sriov-net 是基于物理网络设备的，所以需要物理网络中存在 DHCP 服务器，可以手动进行 IP 地址的配置。

## 3. 创建完实例后，IP 访问失败

创建的 sriov 网络类型是 vlan，流量从实例中流出的时候会打上对应的 vlan tag 导致 IP 访问失败。其中 vlan tag 的作用用于隔离 Provider 网络，这样可以在同一网络下连接无 sriov port 的实例和带有 sriov port 的实例。

# 总结

SR-IOV 的优缺点。

## 优点

1. 性能好，可以从虚拟机直接访问宿主机的硬件，同时提高包的转发率，低延迟，减少主机 CPU 消耗。

2. 比 PCI 直通的方式更加灵活，成本降低节省资本和运营开销。

3. 通过 IOMMU 实现隔离更安全。

## 缺点

1. 使用 SR-IOV 时，不支持防火墙，需要在 neutron 的配置文件中关闭。

2. 宿主机无法监控 VF 的状态。

3. SR-IOV 不支持 vxlan。

4. 需要硬件支持。

# 其他

1. Train 版本后支持了 SR-IOV 实例的热迁移。

2. indirect 模式（vnic-type: macvtap 或 virtio-forwarder）的 SR-IOV Port 可以透明地迁移到虚拟机，direct 模式（vnic-type: direct 或 direct-physical）下的 SR-IOV Port 在迁移前预先分离，迁移完成后再进行连接，这对用户来说是不透明的。为了避免在使用 direct 模式 SR-IOV 进行热迁移时失去网络连接，用户应在实例中创建故障转移 bond，例如 vnic 类型的 normal 或 indirect 模式的 SR-IOV 的 Port。

3. Victoria 版本之后支持向已有实例添加 SR-IOV 的 Port。
