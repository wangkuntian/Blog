---
title: NFS服务搭建
published: 2025-12-15 12:25:50
description: ''
image: ''
tags: ['存储', 'NFS']
category: '存储'
draft: false
lang: ''
---

在 Ubuntu 22.04 系统中搭建 NFS（Network File System）服务分为**服务端**（提供共享目录）和**客户端**（K8s 节点挂载 NFS 目录）两部分——NFS CSI 驱动依赖 NFS 服务端提供存储，同时 K8s 所有节点需安装 NFS 客户端工具才能正常挂载。以下是完整的部署和配置步骤：

---

# 1. NFS 服务端配置（Ubuntu 22.04）

## 步骤 1：安装 NFS 服务端软件

更新系统并安装 `nfs-kernel-server`（NFS 核心服务）：

```bash
# 更新软件源
sudo apt update && sudo apt upgrade -y

# 安装 NFS 服务端
sudo apt install -y nfs-kernel-server
```

## 步骤 2：创建 NFS 共享目录

根据之前 CSI 示例的路径（如静态 PV 的 `/data/nfs-share`、动态 PV 的 `/data/nfs-root`），创建目录并设置权限（确保 K8s 容器能读写）：

```bash
# 1. 静态 PV 用：创建固定共享目录
sudo mkdir -p /data/nfs-share
# 2. 动态 PV 用：创建 NFS 根目录（CSI 驱动自动在该目录下创建子目录）
sudo mkdir -p /data/nfs-root

# 设置目录权限（关键：避免容器挂载后权限不足）
sudo chmod -R 777 /data/nfs-share /data/nfs-root
sudo chown -R nobody:nogroup /data/nfs-share /data/nfs-root
```

## 步骤 3：配置 NFS 共享规则（/etc/exports）

编辑 `/etc/exports` 文件，定义允许访问的客户端（K8s 节点 IP/网段）和权限：

```bash
sudo vim /etc/exports
```

添加以下内容（根据实际场景选择）：

```ini
# 静态 PV 共享目录：允许 K8s 节点网段（如 192.168.1.0/24）访问
/data/nfs-share 192.168.33.0/24(rw,sync,no_root_squash,no_subtree_check)

# 动态 PV 根目录：同上
/data/nfs-root 192.168.33.0/24(rw,sync,no_root_squash,no_subtree_check)
```

参数说明（核心）：

- `192.168.33.0/24`：允许访问的 K8s 节点网段（替换为你的实际网段，也可写 `*` 允许所有，但生产不推荐）；
- `rw`：读写权限；
- `sync`：数据同步写入磁盘（保证数据不丢失）；
- `no_root_squash`：允许容器的 root 用户映射到 NFS 服务端的 root（避免权限不足）；
- `no_subtree_check`：关闭子目录检查，提升性能。

## 步骤 4：生效 NFS 配置并启动服务

```bash
# 重新加载 exports 配置
sudo exportfs -ra

# 启动 NFS 服务并设置开机自启
sudo systemctl start nfs-kernel-server
sudo systemctl enable nfs-kernel-server

# 验证服务状态（显示 active (running) 则正常）
sudo systemctl status nfs-kernel-server
```

## 步骤 5：开放防火墙（UFW）(可选)

Ubuntu 22.04 默认启用 UFW 防火墙，需开放 NFS 相关端口：

```bash
# 开放 NFS 端口（NFS 常用端口：111/tcp/udp、2049/tcp/udp）
sudo ufw allow 111/tcp
sudo ufw allow 111/udp
sudo ufw allow 2049/tcp
sudo ufw allow 2049/udp

# 重载防火墙规则
sudo ufw reload

# 验证开放的端口
sudo ufw status
```

## 步骤 6：验证 NFS 共享

在服务端检查已导出的共享目录：

```bash
sudo exportfs -v
```

输出示例（说明共享成功）：

```text
/data/nfs-share	192.168.33.0/24(rw,wdelay,root_squash,no_subtree_check,sec=sys,rw,root_squash,no_all_squash)
/data/nfs-root	192.168.33.0/24(rw,wdelay,root_squash,no_subtree_check,sec=sys,rw,root_squash,no_all_squash)
```

---

# 2. K8s 节点（NFS 客户端）配置

所有 K8s 节点（master/worker）需安装 NFS 客户端工具，否则 CSI 驱动无法挂载 NFS 目录：

```bash
# 在每个 k8s 节点执行
sudo apt update
sudo apt install -y nfs-common

# 验证客户端工具（无报错则正常）
showmount -V
```

## 测试客户端挂载（可选）

在任意节点测试挂载 NFS 共享目录，验证连通性：

```bash
# 创建临时挂载目录
sudo mkdir -p /tmp/test-nfs

# 挂载 NFS 共享（替换为你的 NFS 服务端 IP）
sudo mount -t nfs 192.168.33.245:/data/nfs-share /tmp/test-nfs

# 验证挂载（显示 NFS 目录则成功）
df -h /tmp/test-nfs

# 测试读写（创建文件）
sudo touch /tmp/test-nfs/test.txt
ls -l /tmp/test-nfs/test.txt

# 卸载临时目录（测试完成后）
sudo umount /tmp/test-nfs
```

---

# 3. 关键注意事项

1. **NFS 服务端 IP 固定**：确保 NFS 服务端的 IP 是静态的（如配置静态 IP 或绑定 hostname），避免 CSI 驱动因 IP 变化挂载失败。
2. **权限问题**：
   - 共享目录必须给 `nobody:nogroup` 权限（或 `root`），否则容器内写入会报“Permission denied”；
   - `no_root_squash` 参数必须加，否则容器的 root 用户会被映射为 `nfsnobody`，无法写入。
3. **NFS 版本兼容**：Ubuntu 22.04 的 NFS 服务默认是 v4，若 CSI 驱动需 v3，需手动指定（修改 `/etc/default/nfs-kernel-server` 添加 `RPCNFSDOPTS="--nfs-version 3,4 --debug"`）。
