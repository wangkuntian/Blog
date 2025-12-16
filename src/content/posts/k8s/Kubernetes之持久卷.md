---
title: Kubernetes之持久卷
published: 2025-12-15 16:41:22
description: ""
image: ""
tags: ["Kubernetes"]
category: "Kubernetes"
draft: false
lang: ""
---

在 Kubernetes 中创建 CSI（Container Storage Interface）类型的持久卷（PV），核心是依托**已部署的 CSI 驱动**，支持**静态创建**（手动关联后端存储卷）和**动态创建**（通过 StorageClass 自动生成 PV）两种方式。以下是详细步骤、示例和注意事项：

# 1. 前提条件

**K8s 版本兼容**：CSI 1.0 要求 K8s ≥ 1.13，推荐使用 1.17+ 以获得完整特性（如动态扩容、拓扑感知）。

**CSI 驱动已部署**：需提前部署目标存储的 CSI 驱动（如 NFS、Ceph RBD、AWS EBS 等）。

验证驱动是否就绪：

```bash
# 查看已注册的 CSI 驱动
kubectl get csidrivers
# 查看 CSI 驱动 Pod 状态（通常在 kube-system 命名空间）
kubectl get pods -n kube-system | grep csi
```

常见 CSI 驱动部署参考：

- NFS CSI：<https://github.com/kubernetes-csi/csi-driver-nfs>
- Ceph RBD CSI：<https://github.com/ceph/ceph-csi>
- AWS EBS CSI：<https://github.com/kubernetes-sigs/aws-ebs-csi-driver>

> 本文使用的CSI驱动为NFS。

---

# 2. 方式1：静态创建 CSI PV（手动绑定后端存储）

适用于后端已有存储卷（如预创建的 NFS 目录、Ceph RBD 镜像），手动创建 PV 关联该卷。

## 步骤1：编写 PV YAML（csi-nfs-pv.yaml）

核心字段是 `spec.csi`，需指定 CSI 驱动名称、卷唯一标识、后端存储参数。

```yaml
apiVersion: v1
kind: PersistentVolume
metadata:
  name: csi-nfs-pv
spec:
  capacity:
    storage: 10Gi  # 卷容量（需匹配后端实际容量）
  accessModes:
    - ReadWriteMany  # NFS 支持多节点读写（根据存储类型调整）
  persistentVolumeReclaimPolicy: Retain  # 回收策略：Retain/Delete/Recycle（Recycle 已废弃）
  csi:
    driver: nfs.csi.k8s.io  # CSI 驱动名称（必须和已部署的驱动一致）
    volumeHandle: nfs-volume-01  # 卷唯一标识（自定义，需全局唯一）
    volumeAttributes:
      server: 192.168.1.100  # NFS 服务器 IP
      share: /data/nfs-share  # NFS 共享目录路径
    # 若 CSI 驱动需要认证，添加 Secret 引用（示例省略）
    # nodeStageSecretRef:
    #   name: csi-nfs-secret
    #   namespace: default
```

## 步骤2：创建 PV

```bash
kubectl apply -f csi-nfs-pv.yaml
# 验证 PV 状态（应为 Available）
kubectl get pv csi-nfs-pv
```

## 步骤3：编写 PVC YAML（csi-nfs-pvc.yaml）

静态绑定无需指定 `storageClassName`（或设为空），通过容量/访问模式匹配 PV。

```yaml csi-nfs-pvc.yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: csi-nfs-pvc
spec:
  accessModes:
    - ReadWriteMany
  resources:
    requests:
      storage: 10Gi  # 请求容量 ≤ PV 的 capacity
  storageClassName: ""  # 静态绑定需清空 StorageClass
```

## 步骤4：创建 PVC 并验证绑定

```bash
kubectl apply -f csi-nfs-pvc.yaml
# 验证 PVC 状态（应为 Bound）
kubectl get pvc csi-nfs-pvc
```

## 步骤5：测试 Pod 挂载（csi-nfs-pod.yaml）

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: csi-nfs-pod
spec:
  containers:
  - name: nginx
    image: nginx:alpine
    volumeMounts:
    - name: nfs-volume
      mountPath: /usr/share/nginx/html  # 容器内挂载路径
  volumes:
  - name: nfs-volume
    persistentVolumeClaim:
      claimName: csi-nfs-pvc  # 关联上述 PVC
```

```bash
kubectl apply -f csi-nfs-pod.yaml
# 验证挂载是否成功
kubectl exec -it csi-nfs-pod -- df -h /usr/share/nginx/html
```

---

# 3. 方式2：动态创建 CSI PV（推荐）

无需手动创建 PV，K8s 通过 `StorageClass` 调用 CSI 驱动**自动创建后端存储卷和 PV**，适配大规模场景。

## 步骤1：编写 StorageClass YAML（csi-nfs-sc.yaml）

`StorageClass` 是动态创建的核心，需指定 CSI 驱动、后端存储参数、回收策略等。

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: csi-nfs-sc  # 自定义 StorageClass 名称
provisioner: nfs.csi.k8s.io  # CSI 驱动名称
parameters:
  server: 192.168.1.100  # NFS 服务器 IP
  share: /data/nfs-root  # NFS 根目录（CSI 驱动会在此自动创建子目录作为卷）
reclaimPolicy: Delete  # 删除 PVC 时，自动删除后端 NFS 目录和 PV（需驱动支持）
volumeBindingMode: Immediate  # 绑定策略：Immediate（立即）/WaitForFirstConsumer（等待首个 Pod 调度）
allowVolumeExpansion: true  # 允许卷扩容（需 CSI 驱动支持）
# 若需认证，添加 Secret 引用
# secretName: csi-nfs-secret
# secretNamespace: default
```

## 步骤2：创建 StorageClass

```bash
kubectl apply -f csi-nfs-sc.yaml
# 验证 StorageClass
kubectl get sc csi-nfs-sc
```

## 步骤3：编写 PVC YAML（csi-nfs-dynamic-pvc.yaml）

指定 `storageClassName` 为上述 SC 名称，触发动态创建。

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: csi-nfs-dynamic-pvc
spec:
  accessModes:
    - ReadWriteMany
  resources:
    requests:
      storage: 5Gi  # 按需指定容量
  storageClassName: csi-nfs-sc  # 关联上述 StorageClass
```

## 步骤4：创建 PVC 并验证

```bash
kubectl apply -f csi-nfs-dynamic-pvc.yaml
# 查看 PVC 状态（Bound），并验证自动创建的 PV
kubectl get pvc csi-nfs-dynamic-pvc
kubectl get pv  # 会看到名称为 pvc-xxxxxxx 的自动创建 PV
```

## 步骤5：测试 Pod 挂载

与静态方式的 Pod YAML 一致，仅需修改 PVC 名称为 `csi-nfs-dynamic-pvc`。

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: csi-nfs-dynamic-pod
spec:
  containers:
  - name: nginx
    image: nginx:alpine
    volumeMounts:
    - name: nfs-volume
      mountPath: /usr/share/nginx/html  # 容器内挂载路径
  volumes:
  - name: nfs-volume
    persistentVolumeClaim:
      claimName: csi-nfs-dynamic-pvc
```

```bash
kubectl apply -f csi-nfs-dynamic-pod.yaml
# 验证挂载是否成功
kubectl exec -it csi-nfs-dynamic-pod -- df -h /usr/share/nginx/html
```

# 4. 其他存储示例（Ceph RBD CSI 静态 PV）

块存储（如 Ceph RBD）的 CSI PV 配置略有差异，核心是 `volumeHandle` 和认证 Secret：

```yaml
apiVersion: v1
kind: PersistentVolume
metadata:
  name: csi-rbd-pv
spec:
  capacity:
    storage: 10Gi
  accessModes:
    - ReadWriteOnce  # 块存储仅支持单节点读写
  persistentVolumeReclaimPolicy: Retain
  csi:
    driver: rbd.csi.ceph.com  # Ceph RBD CSI 驱动名称
    volumeHandle: my-cluster/rbd/my-image  # 卷标识：集群名/池名/镜像名
    volumeAttributes:
      clusterID: my-cluster  # Ceph 集群 ID
      pool: rbd  # Ceph RBD 池名
      imageFeatures: layering  # RBD 镜像特性
    nodeStageSecretRef:  # Ceph 认证 Secret
      name: ceph-csi-secret
      namespace: default
```

# 5. 关键注意事项

1. **CSI 驱动名称必须准确**：需与 `kubectl get csidrivers` 输出的名称一致（如 `rbd.csi.ceph.com`、`ebs.csi.aws.com`）。
2. **volumeHandle 唯一性**：静态创建时，`volumeHandle` 需全局唯一，且与后端存储标识匹配（如 NFS 的 server+share、Ceph 的镜像 ID）。
3. **回收策略**：
   - `Retain`：删除 PVC 后保留 PV 和后端存储（需手动清理）；
   - `Delete`：删除 PVC 后自动删除 PV 和后端存储（需驱动支持）。
4. **访问模式匹配**：需与存储类型匹配（如 NFS 支持 `ReadWriteMany`，EBS/RBD 仅支持 `ReadWriteOnce`）。
5. **调试技巧**：
   - 查看 CSI 驱动 Pod 日志：`kubectl logs -n kube-system <csi-driver-pod>`；
   - 查看 PV/PVC 事件：`kubectl describe pv <pv-name>` / `kubectl describe pvc <pvc-name>`。
6. **扩容操作**：若开启 `allowVolumeExpansion`，直接编辑 PVC 修改 `resources.requests.storage` 即可触发扩容。

# 6. 总结

- 静态创建：适合后端存储已存在的场景，需手动维护 PV；
- 动态创建：适合大规模集群，通过 StorageClass 自动化管理，是生产环境推荐方式；
- 核心是匹配 CSI 驱动的参数（名称、认证、卷标识），确保与后端存储一致。
