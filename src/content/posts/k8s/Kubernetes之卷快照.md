---
title: Kubernetes之卷快照
published: 2025-12-15 17:41:28
description: ''
image: ''
tags: ['Kubernetes']
category: 'Kubernetes'
draft: false
lang: ''
---

在 Kubernetes 中创建持久卷（PV）快照依赖 **VolumeSnapshot** API（`snapshot.storage.k8s.io/v1`），核心是通过 CSI 驱动实现快照能力（需驱动支持快照），整体流程分为「配置快照类」「创建快照」「验证快照」「从快照恢复」四步。以下是详细操作，结合 NFS CSI（需驱动支持）和 Ceph RBD CSI（典型块存储）示例说明。

# 1. 前提条件

1. **K8s 版本兼容**：
   - VolumeSnapshot v1 稳定版要求 K8s ≥ 1.20（1.17-1.19 为 beta，需开启特性门控 `VolumeSnapshotDataSource=true`）；
   - 推荐 1.21+，无需手动开启特性门控。
2. **CSI 驱动支持快照**：
   - 确认驱动是否支持快照：`kubectl get csidrivers <驱动名称> -o yaml`，查看 `volumeSnapshotClasses` 字段为 `true` 则支持；

```bash
# 示例：检查 NFS CSI 驱动（需 v4.0+ 支持快照）
kubectl get csidrivers nfs.csi.k8s.io -o yaml
# 示例：检查 Ceph RBD CSI 驱动
kubectl get csidrivers rbd.csi.ceph.com -o yaml
```

> 常见支持快照的 CSI 驱动：Ceph RBD、AWS EBS、Azure Disk、NFS CSI（v4.0+）。

3. **Snapshot Controller 已部署**：
   K8s 1.20+ 集群默认部署（在 `kube-system` 命名空间），验证：

```bash
kubectl get pods -n kube-system | grep snapshot-controller
```

---

# 2. 核心步骤：创建 PV 快照

## 步骤 1：创建 VolumeSnapshotClass（快照类）

`VolumeSnapshotClass` 类似 `StorageClass`，定义快照的「模板」，指定 CSI 驱动、快照参数、删除策略等，是创建快照的前提。

### NFS CSI 快照类（nfs-snapshotclass.yaml）

NFS CSI 快照通过复制 NFS 目录实现，需指定驱动和快照参数：

```yaml title="nfs-snapshotclass.yaml"
apiVersion: snapshot.storage.k8s.io/v1
kind: VolumeSnapshotClass
metadata:
  name: nfs-csi-snapshotclass  # 自定义快照类名称
driver: nfs.csi.k8s.io        # 关联 NFS CSI 驱动
deletionPolicy: Delete        # 删除快照时，同步删除后端存储的快照数据（可选 Retain）
parameters:
  # NFS CSI 快照无需额外参数（驱动自动复制目录）
  # 若需自定义快照目录，可添加：snapshotDir: /data/nfs-snapshots
```

### Ceph RBD CSI 快照类（rbd-snapshotclass.yaml）

块存储快照需指定 Ceph 集群认证等参数：

```yaml title="rbd-snapshotclass.yaml"
apiVersion: snapshot.storage.k8s.io/v1
kind: VolumeSnapshotClass
metadata:
  name: rbd-csi-snapshotclass
driver: rbd.csi.ceph.com
deletionPolicy: Delete
parameters:
  clusterID: my-cluster                # Ceph 集群 ID
  csi.storage.k8s.io/snapshotter-secret-name: ceph-csi-secret  # 认证 Secret
  csi.storage.k8s.io/snapshotter-secret-namespace: default     # Secret 命名空间
```

### 创建快照类

```bash
# NFS 示例
kubectl apply -f nfs-snapshotclass.yaml
# Ceph RBD 示例
kubectl apply -f rbd-snapshotclass.yaml

# 验证快照类
kubectl get volumesnapshotclasses.snapshot.storage.k8s.io
# 简写
kubectl get vsclass
```

## 步骤 2：创建 VolumeSnapshot（具体快照）

关联已绑定的 PVC（需确保 PVC 状态为 `Bound`），基于上述快照类创建快照。

### NFS CSI 快照（nfs-snapshot.yaml）

```yaml title="nfs-snapshot.yaml"
apiVersion: snapshot.storage.k8s.io/v1
kind: VolumeSnapshot
metadata:
  name: nfs-pvc-snapshot  # 自定义快照名称
spec:
  volumeSnapshotClassName: nfs-csi-snapshotclass  # 关联上述快照类
  source:
    persistentVolumeClaimName: csi-nfs-dynamic-pvc  # 要快照的 PVC 名称（必须 Bound）
```

### 创建快照

```bash
kubectl apply -f nfs-snapshot.yaml

# 查看快照状态（ReadyToUse 为 true 表示快照创建成功）
kubectl get volumesnapshots.snapshot.storage.k8s.io nfs-pvc-snapshot
# 简写
kubectl get vs
```

输出示例（成功状态）：

```text
NAME                READYTOUSE   SOURCEPVC               SOURCESNAPSHOTCONTENT   RESTORESIZE   SNAPSHOTCLASS          SNAPSHOTCONTENT                                    CREATIONTIME   AGE
nfs-pvc-snapshot    true         csi-nfs-dynamic-pvc     <none>                  5Gi           nfs-csi-snapshotclass   snapcontent-xxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx   10s            15s
```

## 步骤 3：验证快照（查看快照内容）

1. 查看快照底层资源（SnapshotContent）：

```bash
kubectl get volumesnapshotcontents.snapshot.storage.k8s.io
# 简写
kubectl get vsc
```

2. 验证后端存储的快照（以 NFS 为例）：NFS CSI 快照会在 NFS 服务端创建快照目录（默认在共享目录下的 `snapshot-` 开头的子目录），登录 NFS 服务端查看：

```bash
# NFS 服务端执行
ls -l /data/nfs-root/<PVC 对应的子目录>/snapshot-<snapshot-id>/
```

Ceph RBD 快照可通过 `rbd snap ls` 验证：

```bash
rbd snap ls rbd/<镜像名>
```

---

# 3. 从快照恢复为新 PVC/PV

创建快照后，可基于快照恢复出全新的 PVC（进而自动创建 PV），步骤如下：

## 从 NFS 快照恢复 PVC（nfs-restore-pvc.yaml）

```yaml title="nfs-restore-pvc.yaml"
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: nfs-restore-pvc  # 恢复后的 PVC 名称
spec:
  accessModes:
    - ReadWriteMany
  resources:
    requests:
      storage: 5Gi  # 需 ≤ 快照的容量（RESTORESIZE 字段）
  storageClassName: csi-nfs-sc  # 需与原快照的存储类一致
  dataSource:
    name: nfs-pvc-snapshot  # 关联已创建的快照名称
    kind: VolumeSnapshot
    apiGroup: snapshot.storage.k8s.io
```

## 创建恢复的 PVC 并验证

```bash
kubectl apply -f nfs-restore-pvc.yaml

# 验证恢复后的 PVC 状态（Bound 为成功）
kubectl get pvc nfs-restore-pvc
```

恢复后的 PVC 可直接挂载到 Pod 中使用，数据与快照创建时一致。

---

# 4. 关键注意事项

1. **CSI 驱动兼容性**：
   - 并非所有 CSI 驱动都支持快照（如早期版本的 NFS CSI 不支持，需升级到 v4.0+）；
   - 块存储（Ceph RBD/EBS）的快照支持更完善，文件存储（NFS）需驱动实现目录复制逻辑。
2. **快照删除策略**：
   - `deletionPolicy: Delete`：删除 `VolumeSnapshot` 时，自动删除后端存储的快照数据和 `VolumeSnapshotContent`；
   - `deletionPolicy: Retain`：仅删除 `VolumeSnapshot`，保留后端快照和 `VolumeSnapshotContent`（需手动清理）。
3. **容量限制**：
   恢复 PVC 时，请求容量不能超过快照的 `RESTORESIZE` 字段（可通过 `kubectl describe vs <快照名>` 查看）。
4. **快照与 PVC 生命周期**：
   删除原 PVC/PV 不会影响已创建的快照（快照是独立资源），但快照依赖后端存储的原始数据（若手动删除后端存储，快照会失效）。
5. **调试技巧**：
   - 查看快照控制器日志：`kubectl logs -n kube-system snapshot-controller-xxxx`；
   - 查看 CSI 驱动日志（如 NFS CSI）：`kubectl logs -n kube-system nfs-csi-controller-xxxx`；
   - 查看快照事件：`kubectl describe vs <快照名>`。

---

# 5. 总结

K8s 中 PV 快照的核心是：

1. 确保 CSI 驱动和 Snapshot Controller 就绪；
2. 创建 `VolumeSnapshotClass` 定义快照规则；
3. 创建 `VolumeSnapshot` 关联 PVC 生成快照；
4. 基于快照的 `dataSource` 恢复新 PVC。

生产环境中，快照常用于数据备份、环境还原、故障恢复等场景，建议结合存储类型（块/文件）选择支持快照的 CSI 驱动，并测试快照/恢复流程的完整性。
