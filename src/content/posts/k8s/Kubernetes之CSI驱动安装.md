---
title: Kubernetes之CSI驱动安装
published: 2025-12-15 13:40:20
description: "CSI驱动安装"
image: ""
tags: ["Kubernetes"]
category: "Kubernetes"
draft: false
lang: ""
---

# 安装CSI NFS

[官方文档](https://github.com/kubernetes-csi/csi-driver-nfs)

## 使用helm

### 安装

```bash
helm repo add csi-driver-nfs https://raw.githubusercontent.com/kubernetes-csi/csi-driver-nfs/master/charts

helm install csi-driver-nfs csi-driver-nfs/csi-driver-nfs \
--namespace kube-system --version 4.12.1 \
-set externalSnapshotter.enabled=true
```

* `externalSnapshotter.enabled`：默认值false，`true`表示开启`snapshot-controller`。

### 卸载

```bash
helm uninstall csi-driver-nfs -n kube-system
```

## 使用kubectl

### 安装

```bash
curl -skSL https://raw.githubusercontent.com/kubernetes-csi/csi-driver-nfs/v4.12.1/deploy/install-driver.sh | bash -s v4.12.1 --
```

检查pod状态。

```bash
kubectl -n kube-system get pod -o wide -l app=csi-nfs-controller
kubectl -n kube-system get pod -o wide -l app=csi-nfs-node
```

### 卸载

```bash
curl -skSL https://raw.githubusercontent.com/kubernetes-csi/csi-driver-nfs/v4.12.1/deploy/uninstall-driver.sh | bash -s v4.12.1 --
```
