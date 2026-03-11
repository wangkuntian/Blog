---
title: Containerd容器存储配额配置手册
published: 2026-03-11 13:35:40
description: ''
image: ''
tags: []
category: ''
draft: false
lang: ''
---

# 概述

本手册指导如何为 Containerd 容器配置基于 XFS Project Quota 的存储配额限制，适用于需要限制单个容器存储使用量的场景。

---

# 1. 环境准备与文件系统格式化

## 1.1 检查现有块设备

```bash
# 查看可用块设备
lsblk
fdisk -l
```

## 1.2 创建 XFS 文件系统（带配额支持）

```bash
# 假设块设备为 /dev/sdb
mkfs.xfs -f -n ftype=1 -i size=512 -m crc=1,finobt=1 -l size=64m,version=2 /dev/sdb
```

## 1.3 挂载文件系统

```bash
DEVICE=/dev/sdb
MOUNT_POINT=/var/lib/containerd
MOUNT_OPTS="defaults,noatime,nodiratime,inode64,pquota,allocsize=2m"

# 创建挂载目录
mkdir -p $MOUNT_POINT

# 临时挂载（带 pquota 选项）
mount -o $MOUNT_OPTS $DEVICE $MOUNT_POINT

# 永久挂载（编辑 /etc/fstab）
echo "$DEVICE  $MOUNT_POINT  xfs  $MOUNT_OPTS  0 0" >> /etc/fstab
echo "/dev/sdb  /var/lib/containerd  xfs  defaults,noatime,nodiratime,inode64,pquota,allocsize=2m  0 0" >> /etc/fstab
# 验证挂载
mount | grep $MOUNT_POINT
# 应看到：prjquota
```

---

# 2. 配置 Containerd 使用新存储

## 2.1 备份现有数据

```bash
# 停止 containerd
systemctl stop containerd

# 备份（如果已有数据）
cp -r /var/lib/containerd /var/lib/containerd.backup.$(date +%Y%m%d)
```

## 2.2 恢复数据

```bash
# 从备份恢复
cp -r /var/lib/containerd.backup/* /var/lib/containerd/

# 修改权限
chown -R root:root /var/lib/containerd
chmod -R 755 /var/lib/containerd
```

## 2.3 重启 containerd

```bash
systemctl start containerd
systemctl status containerd
```

---

# 3. Project Quota 基础操作

## 3.1 创建和管理 Project ID

```bash
# 查看所有 project
xfs_quota -x -c "report -p" /var/lib/containerd

# 为目录创建 project
# 语法：xfs_quota -x -c "project -s -p <目录> <project_id>" <挂载点>
xfs_quota -x -c "project -s -p /var/lib/containerd/test_dir 10001" /var/lib/containerd

# 递归设置目录下所有文件
xfs_quota -x -c "project -s -r -p /var/lib/containerd/test_dir 10001" /var/lib/containerd
```

## 3.2 启用继承属性

```bash
# 设置目录继承属性，新文件自动继承 project ID
xfs_io -c "chattr +P" /var/lib/containerd/test_dir

# 验证继承属性
lsattr -d /var/lib/containerd/test_dir
# 应看到：-----------------P--
```

## 3.3 设置配额限制

```bash
# 设置硬限制（1G）
xfs_quota -x -c "limit -p bhard=1g 10001" /var/lib/containerd

# 设置软限制（可选，900M）
xfs_quota -x -c "limit -p bsoft=900m 10001" /var/lib/containerd

# 设置 inode 限制（可选）
xfs_quota -x -c "limit -p ihard=10000 10001" /var/lib/containerd
```

---

# 4. Containerd 容器配额自动化配置

## 4.1 创建自动化配置脚本

```bash
cat > /usr/local/bin/set_container_quota.sh << 'EOF'
#!/bin/bash
# 为 Containerd 容器自动设置存储配额
# 用法：set_container_quota.sh <容器ID> <配额大小> [项目ID]

set -e

CONTAINER_ID="$1"
QUOTA_SIZE="$2"
PROJECT_ID="${3:-10001}"  # 默认为 10001

if [ -z "$CONTAINER_ID" ] || [ -z "$QUOTA_SIZE" ]; then
    echo "用法: $0 <容器ID> <配额大小> [项目ID]"
    echo "示例: $0 fc14a50da3d327cdf09a0161ddb85a3022e629180a4dc9ec512e10985ef678a6 1g 10001"
    exit 1
fi

# 查找容器的 upperdir
echo "正在查找容器 $CONTAINER_ID 的 upperdir..."
UPPERDIR=$(mount | grep overlay | grep "$CONTAINER_ID" | grep -o "upperdir=[^,]*" | cut -d= -f2)

if [ -z "$UPPERDIR" ]; then
    echo "错误: 找不到容器的 upperdir"
    exit 1
fi

echo "找到 upperdir: $UPPERDIR"

# 设置 project
echo "设置项目ID $PROJECT_ID 到目录..."
xfs_quota -x -c "project -s -p $UPPERDIR $PROJECT_ID" /var/lib/containerd

# 启用继承属性
echo "启用继承属性..."
xfs_io -c "chattr +P" "$UPPERDIR"

# 设置配额
echo "设置配额限制: $QUOTA_SIZE"
xfs_quota -x -c "limit -p bhard=${QUOTA_SIZE} $PROJECT_ID" /var/lib/containerd

# 验证
echo -e "\n验证设置:"
echo "1. 目录属性:"
lsattr -d "$UPPERDIR"

echo -e "\n2. 配额状态:"
xfs_quota -x -c "report -p -h" /var/lib/containerd | grep -A2 -B2 "#$PROJECT_ID"

echo -e "\n配额设置完成!"
EOF

chmod +x /usr/local/bin/set_container_quota.sh
```

## 4.2 监控脚本

```bash
cat > /usr/local/bin/monitor_container_quota.sh << 'EOF'
#!/bin/bash
# 简单版监控脚本，直接使用人类可读格式

PROJECT_ID="${1:-10001}"
INTERVAL="${2:-5}"

echo "监控项目 $PROJECT_ID 的配额使用情况 (Ctrl+C 退出)..."
echo "时间                已用          软限制      硬限制      状态"
echo "----------------------------------------------------------------"

while true; do
    TIMESTAMP=$(date '+%H:%M:%S')

    # 使用 -h 选项直接获取人类可读格式
    QUOTA_INFO=$(xfs_quota -x -c "report -p -h" /var/lib/containerd 2>/dev/null | grep "^#$PROJECT_ID")

    if [ -n "$QUOTA_INFO" ]; then
        # 直接输出人类可读的格式
        USED=$(echo "$QUOTA_INFO" | awk '{print $2}')
        SOFT=$(echo "$QUOTA_INFO" | awk '{print $3}')
        HARD=$(echo "$QUOTA_INFO" | awk '{print $4}')
        STATUS=$(echo "$QUOTA_INFO" | awk '{for(i=5;i<=NF;i++) printf $i" "; print ""}')

        printf "%-8s  %-12s  %-12s  %-12s  %s\n" "$TIMESTAMP" "$USED" "$SOFT" "$HARD" "$STATUS"
    else
        echo "$TIMESTAMP  未找到项目 $PROJECT_ID 的配额信息"
    fi

    sleep $INTERVAL
done
EOF
chmod +x /usr/local/bin/monitor_container_quota.sh
```

---

# 5. 常用命令参考

## 5.1 配额查看命令

```bash
# 查看所有项目的配额
xfs_quota -x -c "report -p" /var/lib/containerd
xfs_quota -x -c "report -p -h" /var/lib/containerd  # 人类可读

# 查看特定项目的配额
xfs_quota -x -c "quota -p 10001" /var/lib/containerd
xfs_quota -x -c "quota -p 10001 -h" /var/lib/containerd

# 查看目录的项目关联
xfs_quota -x -c "project -c <目录>" /var/lib/containerd
```

## 5.2 文件属性查看

```bash
# 查看文件/目录的 project ID
xfs_io -r -c "stat" <文件路径> | grep projid

# 查看继承属性
lsattr -d <目录路径>
lsattr -R <目录路径> | head -20

# 查看目录大小
du -sh <目录路径>
```

## 5.3 配额管理命令

```bash
# 修改配额限制
xfs_quota -x -c "limit -p bhard=2g 10001" /var/lib/containerd

# 移除配额限制
xfs_quota -x -c "limit -p bhard=0 10001" /var/lib/containerd

# 重新计算配额（修复统计）
xfs_quota -x -c "repquota -p" /var/lib/containerd

# 清除项目的所有配额
xfs_quota -x -c "quotaoff -p 10001" /var/lib/containerd
xfs_quota -x -c "quotaon -p" /var/lib/containerd
```

### 5.4 Containerd 容器相关

```bash
# 查看容器列表
ctr container ls
ctr task ls

# 查看容器详情
ctr container info <容器ID>

# 查看快照
ctr snapshot ls

# 查看容器挂载信息
mount | grep overlay | grep <容器ID>
cat /proc/$(pgrep -f "<容器ID>")/mountinfo | grep overlay
```

---

# 6. 测试验证

## 6.1 基础配额测试

```bash
#!/bin/bash
# 基础配额测试脚本

TEST_DIR="/var/lib/containerd/io.containerd.snapshotter.v1.overlayfs/snapshots/13/fs"
PROJECT_ID=10001
QUOTA_LIMIT="1G"

echo "=== 开始配额测试 ==="
echo "测试目录: $TEST_DIR"
echo "项目ID: $PROJECT_ID"
echo "配额限制: $QUOTA_LIMIT"
echo

# 清理测试文件
cleanup() {
    echo "清理测试文件..."
    rm -f "$TEST_DIR"/test_*.dat 2>/dev/null
    xfs_quota -x -c "repquota -p" /var/lib/containerd
}
trap cleanup EXIT

# 初始状态
echo "1. 初始状态:"
xfs_quota -x -c "report -p -h" /var/lib/containerd | grep "#$PROJECT_ID"

# 测试1: 写入 600MB
echo -e "\n2. 写入 600MB 数据..."
dd if=/dev/zero of="$TEST_DIR/test1.dat" bs=1M count=600 2>/dev/null
echo "写入后状态:"
xfs_quota -x -c "report -p -h" /var/lib/containerd | grep "#$PROJECT_ID"

# 测试2: 尝试写入 500MB（应成功）
echo -e "\n3. 尝试写入 500MB 数据..."
dd if=/dev/zero of="$TEST_DIR/test2.dat" bs=1M count=500 2>&1 | tail -2
if [ $? -eq 0 ]; then
    echo "写入成功"
else
    echo "写入失败（预期内，达到配额限制）"
fi
echo "当前状态:"
xfs_quota -x -c "report -p -h" /var/lib/containerd | grep "#$PROJECT_ID"

# 测试3: 验证配额硬限制
echo -e "\n4. 验证硬限制..."
# 计算剩余空间
REMAINING=$(( 1024 - 600 ))  # 1G - 600M
if [ $REMAINING -gt 0 ]; then
    echo "尝试写入剩余 ${REMAINING}MB..."
    dd if=/dev/zero of="$TEST_DIR/test3.dat" bs=1M count=$REMAINING 2>&1 | tail -2
else
    echo "已达到配额限制"
fi

echo -e "\n5. 最终状态:"
xfs_quota -x -c "report -p -h" /var/lib/containerd | grep "#$PROJECT_ID"

echo -e "\n=== 测试完成 ==="
```

## 6.2 容器内测试

```bash
# 运行测试容器
ctr run --rm -t docker.io/library/alpine:latest quota-test sh

# 在容器内执行
# 监控容器内磁盘使用
df -h /

# 测试写入
dd if=/dev/zero of=/test.dat bs=1M count=500
dd if=/dev/zero of=/test2.dat bs=1M count=500  # 应失败
```

## 6.3 实时监控测试

```bash
# 在一个终端启动监控
/usr/local/bin/monitor_quota.sh 10001 2

# 在另一个终端执行写入测试
TEST_DIR="/var/lib/containerd/io.containerd.snapshotter.v1.overlayfs/snapshots/13/fs"
for i in {1..20}; do
    echo "写入 100MB 数据 (第 $i 次)"
    dd if=/dev/zero of="$TEST_DIR/chunk_$i.dat" bs=1M count=100 2>/dev/null
    sleep 1
done
```

---

# 7. 故障排除

## 7.1 常见问题

| 问题 | 可能原因 | 解决方案 |
|------|---------|---------|
| 配额不生效 | 文件系统未启用 pquota | 检查挂载选项，重新挂载 |
| 文件 project ID 为 0 | 未启用继承属性 | 执行 `xfs_io -c "chattr +P" <目录>` |
| 配额统计不准确 | 缓存问题 | 执行 `xfs_quota -x -c "repquota -p"` |
| 写入不触发限制 | 文件在其他 project | 检查文件实际 project ID |

## 7.2 诊断命令

```bash
# 完整的诊断脚本
cat > /usr/local/bin/diagnose_quota.sh << 'EOF'
#!/bin/bash
echo "=== XFS Project Quota 诊断 ==="
echo

echo "1. 文件系统挂载信息:"
mount | grep containerd
echo

echo "2. 配额全局状态:"
xfs_quota -x -c "state" /var/lib/containerd
echo

echo "3. 所有项目配额:"
xfs_quota -x -c "report -p -h" /var/lib/containerd
echo

echo "4. 检查特定目录:"
if [ -n "$1" ]; then
    echo "检查目录: $1"
    lsattr -d "$1"
    echo
    xfs_quota -x -c "project -c $1" /var/lib/containerd
fi
EOF
chmod +x /usr/local/bin/diagnose_quota.sh
```

---

# 8. 最佳实践

1. **规划 Project ID**
   - 为系统预留 1-1000
   - 为容器分配 1001-65535
   - 建立映射文档

2. **配额大小设置**
   - 根据应用需求设置合理配额
   - 设置软限制提供缓冲
   - 监控并定期调整

3. **自动化管理**
   - 使用脚本自动化配额设置
   - 集成到容器编排系统
   - 设置监控告警

4. **备份与恢复**

   ```bash
   # 备份配额配置
   xfs_quota -x -c "report -p -b" /var/lib/containerd > quota_backup.txt

   # 备份 project 映射
   xfs_quota -x -c "project -d" /var/lib/containerd > project_backup.txt
   ```

---

# 附录

## A. XFS 配额单位换算

```text
1 block = 512 bytes (默认)
1KB = 2 blocks
1MB = 2048 blocks
1GB = 2097152 blocks
```

## B. 相关配置文件

```text
/etc/fstab                    # 文件系统挂载配置
/etc/projects                # 项目ID映射（可选）
/etc/projid                  # 项目名称映射（可选）
/etc/containerd/config.toml  # Containerd 配置
```

## C. 参考文档

- XFS 手册页: `man xfs_quota`
- Containerd 文档: <https://containerd.io/docs/>
- XFS 项目管理: <https://xfs.org/docs/xfsdocs-xml-dev/XFS_User_Guide/tmp/en-US/html/xfs-quotas.html>

---

**重要提示**: 在生产环境部署前，请在测试环境中充分验证。配额设置不当可能导致容器无法启动或数据丢失。
