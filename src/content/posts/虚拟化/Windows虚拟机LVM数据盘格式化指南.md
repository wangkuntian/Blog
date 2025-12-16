---
title: Windows虚拟机LVM数据盘格式化指南
published: 2025-12-12
description: ""
image: ""
tags: ["虚拟化", "Windows"]
category: "虚拟化"
draft: false
lang: ""
---

# 概述

本指南介绍如何在 Linux 宿主机上格式化 LVM 磁盘设备，使其能够被 Windows 10 虚拟机直接使用作为数据盘，无需在虚拟机内部再次格式化。

# 前置条件

-   Linux 宿主机已安装 LVM2 工具
-   虚拟机管理软件（如 libvirt/qemu）
-   目标磁盘已创建为 LVM 逻辑卷

# 方案对比

## 文件系统选择

| 文件系统  | Windows 兼容性 | Linux 兼容性     | 推荐场景              |
| --------- | -------------- | ---------------- | --------------------- |
| **NTFS**  | 原生支持       | 需要 ntfs-3g     | 纯 Windows 环境       |
| **exFAT** | 原生支持       | 需要 exfat-utils | 跨平台共享            |
| **FAT32** | 原生支持       | 原生支持         | 小容量磁盘(<4GB 文件) |

**推荐：对于 Windows 10 数据盘，使用 NTFS 格式**

# 详细操作步骤

## 1. 准备 LVM 环境

```bash
# 1. 检查现有LVM配置
sudo vgs    # 查看卷组
sudo lvs    # 查看逻辑卷
sudo pvs    # 查看物理卷

# 2. 如果还没有创建LVM，先创建
# 创建物理卷（假设使用/dev/sdb）
sudo pvcreate /dev/sdb

# 创建卷组
sudo vgcreate data_vg /dev/sdb

# 创建逻辑卷作为数据盘（例如500GB）
sudo lvcreate -L 500G -n windows_data data_vg

# 或者使用剩余全部空间
sudo lvcreate -l 100%FREE -n windows_data data_vg
```

## 2. 安装必要工具

```bash
# Ubuntu/Debian系统
sudo apt-get update
sudo apt-get install ntfs-3g exfat-utils

# CentOS/RHEL系统
sudo yum install epel-release
sudo yum install ntfs-3g exfat-utils

# 验证安装
which mkfs.ntfs
which mkfs.exfat
```

## 3. 创建分区表和格式化为 NTFS（推荐）

**重要说明**：Windows 需要看到分区表，不能直接识别整个设备上的文件系统。

```bash
# 方法1：使用parted创建GPT分区表（推荐）
sudo parted /dev/data_vg/windows_data mklabel gpt
sudo parted /dev/data_vg/windows_data mkpart primary ntfs 0% 100%
sudo parted /dev/data_vg/windows_data set 1 msftdata on

# 格式化分区为NTFS（注意：是分区，不是整个设备）
sudo mkfs.ntfs -Q -L "WindowsData" /dev/data_vg/windows_data-part1

# 方法2：使用fdisk创建MBR分区表（适用于<2TB磁盘）
sudo fdisk /dev/data_vg/windows_data
# 在fdisk中执行以下命令：
# n (新建分区)
# p (主分区)
# 1 (分区号)
# 回车 (起始扇区，使用默认)
# 回车 (结束扇区，使用默认)
# t (修改分区类型)
# 7 (NTFS分区类型)
# w (写入并退出)

# 然后格式化分区
sudo mkfs.ntfs -Q -L "WindowsData" /dev/data_vg/windows_data1

# 验证结果
sudo blkid /dev/data_vg/windows_data*
# 应该看到类似输出：
# /dev/data_vg/windows_data1: LABEL="WindowsData" UUID="xxxx" TYPE="ntfs"

# 查看分区表
sudo parted /dev/data_vg/windows_data print
```

**自动化脚本版本：**

```bash
#!/bin/bash
# 自动创建Windows兼容的LVM数据盘

DEVICE="/dev/data_vg/windows_data"
LABEL="WindowsData"

echo "=== 创建Windows兼容的LVM数据盘 ==="
echo "设备: $DEVICE"
echo "标签: $LABEL"
echo ""

# 检查设备是否存在
if [ ! -b "$DEVICE" ]; then
    echo "❌ 设备 $DEVICE 不存在"
    exit 1
fi

# 显示当前设备信息
echo "当前设备信息："
sudo blkid $DEVICE || echo "设备未格式化"
echo ""

# 警告用户
echo "⚠️  警告：此操作将清除设备上的所有数据！"
echo "设备: $DEVICE"
read -p "确定要继续吗？(y/N): " confirm
if [ "$confirm" != "y" ] && [ "$confirm" != "Y" ]; then
    echo "操作已取消"
    exit 0
fi

echo ""
echo "开始创建分区..."

# 第1步：创建GPT分区表（静默执行，避免交互提示）
echo "1. 创建GPT分区表..."
sudo parted -s $DEVICE mklabel gpt

# 第2步：创建占满整个磁盘的NTFS分区
echo "2. 创建NTFS分区..."
sudo parted -s $DEVICE mkpart primary ntfs 0% 100%

# 第3步：设置分区标志
echo "3. 设置分区标志..."
sudo parted -s $DEVICE set 1 msftdata on

# 第4步：等待分区设备创建并确定分区设备名称
echo "4. 检测分区设备..."
sleep 2

PARTITION_DEVICE=""
# 检查可能的分区设备名称
for suffix in "-part1" "1" "p1"; do
    potential_device="${DEVICE}${suffix}"
    if [ -b "$potential_device" ]; then
        PARTITION_DEVICE="$potential_device"
        echo "✅ 找到分区设备: $PARTITION_DEVICE"
        break
    fi
done

if [ -z "$PARTITION_DEVICE" ]; then
    echo "❌ 无法找到分区设备"
    echo "可能的设备名称："
    echo "  ${DEVICE}-part1"
    echo "  ${DEVICE}1"
    echo "  ${DEVICE}p1"
    echo ""
    echo "请手动检查："
    sudo parted $DEVICE print
    exit 1
fi

# 第5步：格式化分区
echo "5. 格式化分区为NTFS..."
sudo mkfs.ntfs -Q -L "$LABEL" "$PARTITION_DEVICE"

# 第6步：验证结果
echo "6. 验证结果..."
echo ""
echo "分区表信息："
sudo parted $DEVICE print
echo ""
echo "文件系统信息："
sudo blkid "$PARTITION_DEVICE"

echo ""
echo "✅ 创建完成！"
echo "设备路径: $DEVICE"
echo "分区路径: $PARTITION_DEVICE"
echo "在虚拟机配置中使用设备路径: $DEVICE"
```

**分区设备名称说明：**

```bash
# LVM设备的分区命名规则：
# 原设备: /dev/vg_name/lv_name
# 分区可能是以下之一：
/dev/vg_name/lv_name-part1  # 最常见
/dev/vg_name/lv_name1       # 有时会是这个
/dev/vg_name/lv_namep1      # 较少见

# 检查实际创建的分区：
ls -la /dev/game-vg/game-base*
# 或者
sudo parted /dev/game-vg/game-base print
```

## 4. 配置虚拟机

### 方法 A：使用 libvirt/virt-manager

**命令行配置：**

```bash
# 编辑虚拟机配置
sudo virsh edit 您的虚拟机名称

# 在<devices>部分添加磁盘：
```

```xml
<disk type='block' device='disk'>
  <driver name='qemu' type='raw' cache='writeback'/>
  <source dev='/dev/data_vg/windows_data'/>
  <target dev='vdb' bus='virtio'/>
  <address type='pci' domain='0x0000' bus='0x00' slot='0x07' function='0x0'/>
</disk>
```

**virt-manager 图形界面：**

1. 打开 virt-manager
2. 右键点击虚拟机 → 打开 → 详情
3. 点击"添加硬件"
4. 选择"存储"
5. 选择"现有存储"
6. 浏览到`/dev/data_vg/windows_data`
7. 设备类型选择"VirtIO 磁盘"
8. 应用设置

### 方法 B：使用 QEMU 命令行

```bash
# 启动虚拟机时添加磁盘参数
qemu-system-x86_64 \
  -drive file=/dev/data_vg/windows_data,format=raw,if=virtio \
  # ... 其他参数
```

### 方法 C：使用 virt-install 创建虚拟机

**创建新的 Windows 虚拟机并附加数据盘：**

```bash
# 基本的virt-install命令，包含LVM数据盘
sudo virt-install \
  --name=windows10-vm \
  --vcpus=4 \
  --ram=8192 \
  --os-variant=win10 \
  --disk path=/path/to/windows10.iso,device=cdrom \
  --disk path=/var/lib/libvirt/images/windows10-system.qcow2,format=qcow2,size=60 \
  --disk path=/dev/data_vg/windows_data,format=raw,bus=virtio \
  --network network=default \
  --graphics vnc,listen=0.0.0.0 \
  --boot uefi \
  --install os=win10

# 更详细的配置示例
sudo virt-install \
  --connect=qemu:///system \
  --name=windows10-gaming \
  --vcpus=8 \
  --ram=16384 \
  --cpu host-passthrough \
  --os-variant=win10 \
  --disk path=/home/isos/windows10.iso,device=cdrom,readonly=on \
  --disk path=/var/lib/libvirt/images/win10-system.qcow2,format=qcow2,size=80,bus=virtio \
  --disk path=/dev/data_vg/windows_data,format=raw,bus=virtio,cache=writeback \
  --network type=direct,source=eth0,source_mode=bridge,model=virtio \
  --graphics vnc,port=5900,listen=0.0.0.0 \
  --video virtio \
  --boot uefi \
  --features kvm_hidden=on \
  --install os=win10
```

**为现有虚拟机添加数据盘：**

```bash
# 如果虚拟机已存在，使用virsh attach-disk添加
sudo virsh attach-disk 虚拟机名称 \
  /dev/data_vg/windows_data \
  vdb \
  --persistent \
  --driver qemu \
  --subdriver raw \
  --type block

# 或者编辑虚拟机配置后重启
sudo virsh edit 虚拟机名称
```

**参数说明：**

-   `--disk path=/dev/data_vg/windows_data,format=raw,bus=virtio`：指定 LVM 设备作为虚拟磁盘
-   `format=raw`：对于 LVM 块设备使用 raw 格式
-   `bus=virtio`：使用 VirtIO 总线获得更好性能
-   `cache=writeback`：写回缓存模式，提高性能（可选）

## 5. Windows 虚拟机内验证

启动 Windows 10 虚拟机后：

1. **自动识别**：磁盘应该自动被识别为已格式化的数据盘
2. **查看磁盘**：
    - 打开"此电脑"，应该看到新的数据盘
    - 或者打开"磁盘管理"查看详细信息
3. **直接使用**：无需格式化，可以直接创建文件夹和存储数据

# 高级配置选项

## 优化 NTFS 格式化参数

```bash
# 针对虚拟机优化的NTFS格式化
sudo mkfs.ntfs \
  -Q \                    # 快速格式化
  -L "WindowsData" \      # 卷标
  -c 4096 \              # 簇大小（4KB，适合一般用途）
  -s 512 \               # 扇区大小
  /dev/data_vg/windows_data

# 大文件场景优化（如视频存储）
sudo mkfs.ntfs \
  -Q \
  -L "VideoStorage" \
  -c 65536 \             # 64KB簇大小，适合大文件
  /dev/data_vg/windows_data
```

## 性能优化配置

**虚拟机磁盘配置优化：**

```xml
<disk type='block' device='disk'>
  <driver name='qemu' type='raw' cache='writeback' io='native'/>
  <source dev='/dev/data_vg/windows_data'/>
  <target dev='vdb' bus='virtio'/>
  <!-- 性能优化选项 -->
  <iotune>
    <read_iops_sec>1000</read_iops_sec>
    <write_iops_sec>1000</write_iops_sec>
  </iotune>
</disk>
```

**宿主机 LVM 优化：**

```bash
# 创建LVM时指定优化参数
sudo lvcreate \
  -L 500G \
  -n windows_data \
  --type linear \        # 线性分配，适合单盘
  --chunksize 64K \      # 适合虚拟机场景
  data_vg

# 或者使用条带化（多盘场景）
sudo lvcreate \
  -L 500G \
  -n windows_data \
  -i 2 \                 # 条带数量
  -I 64K \               # 条带大小
  data_vg
```

# 故障排查

常见问题及解决方案

## 问题 1：Windows 显示磁盘为"未初始化"状态（常见问题）

**症状**：

-   磁盘管理器中看到磁盘，但显示为"未初始化"
-   无法直接使用，需要手动初始化

**根本原因**：Windows 需要分区表，不能识别直接在整个设备上的文件系统

**解决方案**：

```bash
# 第一步：删除现有的文件系统（如果有）
sudo wipefs -a /dev/data_vg/windows_data

# 第二步：创建GPT分区表和分区
sudo parted -s /dev/data_vg/windows_data mklabel gpt
sudo parted -s /dev/data_vg/windows_data mkpart primary ntfs 0% 100%
sudo parted -s /dev/data_vg/windows_data set 1 msftdata on

# 第三步：等待分区创建
sleep 2

# 第四步：在分区上格式化NTFS
sudo mkfs.ntfs -Q -L "WindowsData" /dev/data_vg/windows_data-part1

# 第五步：验证分区表
sudo parted /dev/data_vg/windows_data print
```

**一键修复脚本**：

```bash
#!/bin/bash
# 文件名: fix_windows_disk.sh
# 用途: 修复Windows显示为"未初始化"的LVM磁盘

DEVICE="/dev/data_vg/windows_data"
LABEL="WindowsData"

echo "=== 修复Windows磁盘初始化问题 ==="
echo "设备: $DEVICE"

# 检查设备是否存在
if [ ! -b "$DEVICE" ]; then
    echo "❌ 设备 $DEVICE 不存在"
    exit 1
fi

# 停止使用该设备的虚拟机（可选）
echo "⚠️  请确保没有虚拟机正在使用此设备"
read -p "按回车继续..."

# 清除现有数据
echo "1. 清除现有分区表..."
sudo wipefs -a $DEVICE

# 创建GPT分区表
echo "2. 创建GPT分区表..."
sudo parted -s $DEVICE mklabel gpt

# 创建NTFS分区
echo "3. 创建NTFS分区..."
sudo parted -s $DEVICE mkpart primary ntfs 0% 100%
sudo parted -s $DEVICE set 1 msftdata on

# 强制重新读取分区表
echo "4. 强制重新读取分区表..."
sudo partprobe $DEVICE
sudo udevadm settle
sudo udevadm trigger --subsystem-match=block
sleep 3

# 确认分区设备名称
echo "5. 查找分区设备..."
PARTITION_DEVICE=""

# 检查多种可能的分区设备名称
for suffix in "-part1" "1" "p1"; do
    potential_device="${DEVICE}${suffix}"
    echo "检查: $potential_device"
    if [ -b "$potential_device" ]; then
        PARTITION_DEVICE="$potential_device"
        echo "✅ 找到分区设备: $PARTITION_DEVICE"
        break
    fi
done

# 如果标准方法找不到，尝试使用 kpartx
if [ -z "$PARTITION_DEVICE" ]; then
    echo "尝试使用 kpartx 创建分区映射..."
    sudo kpartx -av $DEVICE
    sleep 2

    # 检查 /dev/mapper/ 中的分区设备
    for mapper_dev in /dev/mapper/*p1 /dev/mapper/*-part1; do
        if [ -b "$mapper_dev" ]; then
            PARTITION_DEVICE="$mapper_dev"
            echo "✅ 通过 kpartx 找到分区设备: $PARTITION_DEVICE"
            break
        fi
    done
fi

# 如果仍然找不到，显示诊断信息
if [ -z "$PARTITION_DEVICE" ]; then
    echo "❌ 无法找到分区设备"
    echo ""
    echo "诊断信息："
    echo "1. 分区表信息："
    sudo parted $DEVICE print
    echo ""
    echo "2. 内核分区信息："
    cat /proc/partitions | grep dm
    echo ""
    echo "3. 设备映射："
    ls -la /dev/mapper/
    echo ""
    echo "4. 所有相关设备："
    ls -la ${DEVICE}*
    echo ""
    echo "请手动检查分区设备名称"
    exit 1
fi

# 格式化分区
echo "6. 格式化分区为NTFS..."
sudo mkfs.ntfs -Q -L "$LABEL" "$PARTITION_DEVICE"

# 验证结果
echo "7. 验证结果..."
echo "分区表："
sudo parted $DEVICE print
echo ""
echo "文件系统："
sudo blkid "$PARTITION_DEVICE"

echo ""
echo "✅ 修复完成！现在Windows应该能正确识别磁盘了"
echo "主设备: $DEVICE"
echo "分区设备: $PARTITION_DEVICE"
echo "在虚拟机配置中使用主设备路径: $DEVICE"
```

**专门针对您当前情况的快速修复脚本：**

```bash
#!/bin/bash
# 文件名: fix_game_base_partition.sh
# 针对 /dev/game-vg/game-base 的分区设备创建问题

DEVICE="/dev/game-vg/game-base"
LABEL="GameData"

echo "=== 修复 game-base 分区设备问题 ==="
echo "设备: $DEVICE"

# 检查分区表是否存在
echo "1. 检查当前分区表..."
sudo parted $DEVICE print

# 强制重新读取分区表
echo "2. 强制重新读取分区表..."
sudo partprobe $DEVICE

# 触发 udev 规则
echo "3. 触发 udev 规则..."
sudo udevadm settle
sudo udevadm trigger --subsystem-match=block
sleep 3

# 检查分区设备
echo "4. 检查分区设备..."
echo "当前设备列表："
ls -la /dev/game-vg/game-base*
echo ""
echo "DM设备列表："
ls -la /dev/dm-*
echo ""
echo "Mapper设备列表："
ls -la /dev/mapper/*game*

# 尝试 kpartx
echo "5. 尝试使用 kpartx..."
sudo kpartx -av $DEVICE
sleep 2

echo "6. 最终检查..."
echo "所有相关设备："
ls -la /dev/game-vg/game-base* /dev/dm-* /dev/mapper/*game* 2>/dev/null || true

echo ""
echo "如果看到了分区设备，请使用以下命令格式化："
echo "sudo mkfs.ntfs -Q -L \"$LABEL\" /dev/game-vg/game-base-part1"
echo "或者："
echo "sudo mkfs.ntfs -Q -L \"$LABEL\" /dev/mapper/game--vg-game--base1"
```

## 问题 2：格式化失败

**症状**：`mkfs.ntfs`命令报错

**解决方案**：

```bash
# 检查设备是否被占用
sudo lsof /dev/data_vg/windows_data
sudo fuser -v /dev/data_vg/windows_data

# 卸载如果已挂载
sudo umount /dev/data_vg/windows_data

# 强制格式化
sudo mkfs.ntfs -f -Q -L "WindowsData" /dev/data_vg/windows_data
```

## 问题 3：虚拟机启动失败

**症状**：添加磁盘后虚拟机无法启动

**解决方案**：

```bash
# 检查虚拟机配置
sudo virsh dumpxml 虚拟机名称 | grep -A 10 -B 10 "data_vg"

# 检查设备权限
ls -la /dev/data_vg/windows_data
sudo chown qemu:qemu /dev/data_vg/windows_data
sudo chmod 660 /dev/data_vg/windows_data
```

## 问题 4：性能问题

**症状**：磁盘 IO 性能差

**解决方案**：

```bash
# 检查磁盘调度器
cat /sys/block/$(basename $(readlink /dev/data_vg/windows_data))/queue/scheduler

# 设置为noop或deadline
echo noop | sudo tee /sys/block/$(basename $(readlink /dev/data_vg/windows_data))/queue/scheduler

# 永久设置（添加到/etc/rc.local）
echo 'echo noop > /sys/block/dm-*/queue/scheduler' >> /etc/rc.local
```

# 最佳实践

## 1. 容量规划

```bash
# 考虑预留空间（建议预留10-20%）
# 如果需要500GB可用空间，创建600GB的LVM卷
sudo lvcreate -L 600G -n windows_data data_vg
```

## 2. 备份策略

```bash
# 使用LVM快照进行备份
sudo lvcreate -L 10G -s -n windows_data_backup /dev/data_vg/windows_data

# 挂载快照进行备份
sudo mkdir /mnt/backup
sudo mount /dev/data_vg/windows_data_backup /mnt/backup
rsync -av /mnt/backup/ /backup/destination/
sudo umount /mnt/backup
sudo lvremove -f /dev/data_vg/windows_data_backup
```

## 3. 监控脚本

```bash
#!/bin/bash
# 文件名: monitor_windows_disk.sh
# 用途: 监控Windows数据盘状态

VG_NAME="data_vg"
LV_NAME="windows_data"
DEVICE="/dev/${VG_NAME}/${LV_NAME}"

echo "=== Windows数据盘状态监控 ==="
echo "设备: $DEVICE"
echo ""

# 检查LVM状态
echo "1. LVM状态："
sudo lvs $DEVICE

# 检查文件系统
echo ""
echo "2. 文件系统信息："
sudo blkid $DEVICE

# 检查设备使用情况
echo ""
echo "3. 设备使用情况："
if mountpoint -q /dev/mapper/${VG_NAME}-${LV_NAME} 2>/dev/null; then
    df -h /dev/mapper/${VG_NAME}-${LV_NAME}
else
    echo "设备未在宿主机挂载（正常，由虚拟机使用）"
fi

# 检查虚拟机使用情况
echo ""
echo "4. 虚拟机使用情况："
sudo virsh list --all | head -n 3
for vm in $(sudo virsh list --name); do
    if sudo virsh domblklist $vm | grep -q "${VG_NAME}-${LV_NAME}"; then
        echo "✅ 虚拟机 $vm 正在使用此设备"
    fi
done
```

## 4. 自动化脚本

```bash
#!/bin/bash
# 文件名: create_windows_data_disk.sh
# 用途: 自动创建Windows数据盘

set -e

# 配置参数
VG_NAME="${1:-data_vg}"
LV_NAME="${2:-windows_data}"
DISK_SIZE="${3:-500G}"
VOLUME_LABEL="${4:-WindowsData}"

echo "=== 创建Windows数据盘 ==="
echo "卷组: $VG_NAME"
echo "逻辑卷: $LV_NAME"
echo "大小: $DISK_SIZE"
echo "标签: $VOLUME_LABEL"
echo ""

# 检查必要工具
if ! command -v mkfs.ntfs &> /dev/null; then
    echo "❌ 未找到mkfs.ntfs，请安装ntfs-3g"
    exit 1
fi

# 检查卷组是否存在
if ! sudo vgs $VG_NAME &> /dev/null; then
    echo "❌ 卷组 $VG_NAME 不存在"
    exit 1
fi

# 创建逻辑卷
echo "1. 创建逻辑卷..."
sudo lvcreate -L $DISK_SIZE -n $LV_NAME $VG_NAME

# 创建分区表和分区
echo "2. 创建GPT分区表..."
sudo parted -s /dev/$VG_NAME/$LV_NAME mklabel gpt
sudo parted -s /dev/$VG_NAME/$LV_NAME mkpart primary ntfs 0% 100%
sudo parted -s /dev/$VG_NAME/$LV_NAME set 1 msftdata on

# 等待分区创建
sleep 2

# 确定分区设备名称
PARTITION_DEVICE=""
if [ -b "/dev/$VG_NAME/${LV_NAME}1" ]; then
    PARTITION_DEVICE="/dev/$VG_NAME/${LV_NAME}1"
elif [ -b "/dev/$VG_NAME/${LV_NAME}-part1" ]; then
    PARTITION_DEVICE="/dev/$VG_NAME/${LV_NAME}-part1"
fi

# 格式化分区为NTFS
echo "3. 格式化分区为NTFS..."
sudo mkfs.ntfs -Q -L "$VOLUME_LABEL" $PARTITION_DEVICE

# 设置权限
echo "4. 设置权限..."
sudo chown qemu:qemu /dev/$VG_NAME/$LV_NAME
sudo chmod 660 /dev/$VG_NAME/$LV_NAME

# 验证结果
echo "5. 验证结果..."
echo "分区表信息："
sudo parted /dev/$VG_NAME/$LV_NAME print
echo ""
echo "文件系统信息："
sudo blkid $PARTITION_DEVICE
echo ""
echo "逻辑卷信息："
sudo lvs /dev/$VG_NAME/$LV_NAME

echo ""
echo "✅ Windows数据盘创建完成！"
echo "设备路径: /dev/$VG_NAME/$LV_NAME"
echo "分区路径: $PARTITION_DEVICE"
echo "可以在虚拟机配置中添加主设备路径（不是分区路径）"
```

# 总结

通过以上步骤，您可以：

1. ✅ **在 Linux 上预格式化 LVM 设备**为 NTFS
2. ✅ **Windows 虚拟机直接识别**已格式化磁盘
3. ✅ **无需虚拟机内格式化**，即插即用
4. ✅ **获得良好性能**，支持大容量存储

这种方法特别适合：

-   云游戏平台的用户数据盘
-   开发环境的共享存储
-   企业虚拟机的数据分离
-   需要在宿主机和虚拟机间共享的存储

**关键优势**：

-   减少虚拟机初始化时间
-   简化部署流程
-   提高存储管理效率
-   支持快照和增量备份
