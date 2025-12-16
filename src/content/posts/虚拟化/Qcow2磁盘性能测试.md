---
title: Qcow2磁盘性能测试
published: 2025-12-10
description: ""
image: ""
tags: ["QCOW2", "fio"]
category: "虚拟化"
draft: false
lang: ""
---

在宿主机上测试 qcow2 磁盘的性能，推荐使用功能强大的 ​**​`fio` (Flexible I/O Tester)​**​ 工具。它可以模拟各种 I/O 负载，并提供详细的性能报告。以下是完整的测试流程：

---

### ​**​1. 准备工作 ​**​

#### (1) 安装必要工具

```
# 安装fio（支持多种I/O引擎和测试模式）
sudo apt-get install fio  # Debian/Ubuntu
sudo yum install fio     # RHEL/CentOS
```

#### (2) 创建测试用的 qcow2 镜像

```
# 创建1GB测试镜像（实际大小按需调整）
qemu-img create -f qcow2 test.qcow2 1G

# 启用direct I/O测试（可选，绕过页缓存）
touch direct-test.img
sudo chmod 777 direct-test.img  # 确保有写入权限
```

---

### ​**​2. 使用 fio 进行性能测试 ​**​

#### 📍 ​**​ 基本参数说明 ​**​

| 参数         | 作用                             |
| ------------ | -------------------------------- |
| `--name`     | 测试名称                         |
| `--filename` | 测试文件路径                     |
| `--ioengine` | I/O 引擎（推荐`libaio`异步引擎） |
| `--direct=1` | 绕过缓存（直接磁盘 I/O）         |
| `--bs`       | 块大小（4k/64k 等）              |
| `--rw`       | 测试模式（read/write/randrw 等） |
| `--iodepth`  | I/O 队列深度（模拟并发）         |
| `--runtime`  | 测试时长（秒）                   |
| `--size`     | 测试数据大小                     |
| `--output`   | 结果输出文件                     |

---

#### ⚡ ​**​ 常用测试场景 ​**​

```bash
qemu-img create -f qcow2 -o preallocation=full base_full.qcow2 10G
qemu-img create -f qcow2 -o preallocation=falloc base_falloc.qcow2 10G
```

#### (1) 顺序读取测试（模拟大文件读取）

```
fio --name=seq_read \
    --filename=test.qcow2 \
    --ioengine=libaio \
    --direct=1 \
    --bs=1M \
    --rw=read \
    --iodepth=32 \
    --runtime=60 \
    --group_reporting
```

#### base-full

```bash
fio --name=seq_read --filename=base_full.qcow2 \
--ioengine=libaio --direct=1 --bs=1M --rw=read --iodepth=32 --runtime=60 --group_reporting

seq_read: (g=0): rw=read, bs=(R) 1024KiB-1024KiB, (W) 1024KiB-1024KiB, (T) 1024KiB-1024KiB, ioengine=libaio, iodepth=32
fio-3.28
Starting 1 process
Jobs: 1 (f=1): [R(1)][100.0%][r=525MiB/s][r=525 IOPS][eta 00m:00s]
seq_read: (groupid=0, jobs=1): err= 0: pid=303937: Sat Jun 21 01:44:30 2025
  read: IOPS=491, BW=491MiB/s (515MB/s)(10.0GiB/20848msec)
    slat (usec): min=21, max=378, avg=117.94, stdev=10.96
    clat (msec): min=6, max=117, avg=61.84, stdev= 3.33
     lat (msec): min=6, max=117, avg=61.96, stdev= 3.33
    clat percentiles (msec):
     |  1.00th=[   61],  5.00th=[   61], 10.00th=[   61], 20.00th=[   61],
     | 30.00th=[   61], 40.00th=[   61], 50.00th=[   62], 60.00th=[   63],
     | 70.00th=[   63], 80.00th=[   64], 90.00th=[   65], 95.00th=[   66],
     | 99.00th=[   70], 99.50th=[   71], 99.90th=[   99], 99.95th=[  108],
     | 99.99th=[  115]
   bw (  KiB/s): min=503808, max=540672, per=100.00%, avg=528909.13, stdev=9545.09, samples=39
   iops        : min=  492, max=  528, avg=516.51, stdev= 9.32, samples=39
  lat (msec)   : 10=0.05%, 20=0.05%, 50=0.20%, 100=99.62%, 250=0.09%
  cpu          : usr=1.03%, sys=11.22%, ctx=10315, majf=0, minf=8204
  IO depths    : 1=0.1%, 2=0.1%, 4=0.1%, 8=0.1%, 16=0.2%, 32=99.7%, >=64=0.0%
     submit    : 0=0.0%, 4=100.0%, 8=0.0%, 16=0.0%, 32=0.0%, 64=0.0%, >=64=0.0%
     complete  : 0=0.0%, 4=100.0%, 8=0.0%, 16=0.0%, 32=0.1%, 64=0.0%, >=64=0.0%
     issued rwts: total=10241,0,0,0 short=0,0,0,0 dropped=0,0,0,0
     latency   : target=0, window=0, percentile=100.00%, depth=32

Run status group 0 (all jobs):
   READ: bw=491MiB/s (515MB/s), 491MiB/s-491MiB/s (515MB/s-515MB/s), io=10.0GiB (10.7GB), run=20848-20848msec

Disk stats (read/write):
    dm-0: ios=10168/15, merge=0/0, ticks=625212/588, in_queue=625800, util=94.96%, aggrios=19522/9, aggrmerge=0/6, aggrticks=1199016/341, aggrin_queue=1199430, aggrutil=94.79%
  sda: ios=19522/9, merge=0/6, ticks=1199016/341, in_queue=1199430, util=94.79%
```

#### base-falloc

```bash
fio --name=seq_read --filename=base_falloc.qcow2 \
--ioengine=libaio --direct=1 --bs=1M --rw=read --iodepth=32 --runtime=60 --group_reporting

seq_read: (g=0): rw=read, bs=(R) 1024KiB-1024KiB, (W) 1024KiB-1024KiB, (T) 1024KiB-1024KiB, ioengine=libaio, iodepth=32
fio-3.28
Starting 1 process
Jobs: 1 (f=1)
seq_read: (groupid=0, jobs=1): err= 0: pid=303974: Sat Jun 21 01:50:52 2025
  read: IOPS=10.9k, BW=10.6GiB/s (11.4GB/s)(10.0GiB/943msec)
    slat (usec): min=52, max=1115, avg=90.60, stdev=55.62
    clat (usec): min=1441, max=33451, avg=2801.46, stdev=1019.05
     lat (usec): min=1535, max=34460, avg=2892.18, stdev=1068.15
    clat percentiles (usec):
     |  1.00th=[ 2671],  5.00th=[ 2704], 10.00th=[ 2704], 20.00th=[ 2704],
     | 30.00th=[ 2704], 40.00th=[ 2737], 50.00th=[ 2737], 60.00th=[ 2737],
     | 70.00th=[ 2769], 80.00th=[ 2769], 90.00th=[ 2802], 95.00th=[ 2868],
     | 99.00th=[ 3261], 99.50th=[ 3884], 99.90th=[23987], 99.95th=[28443],
     | 99.99th=[32113]
   bw (  MiB/s): min=10412, max=10412, per=95.87%, avg=10412.00, stdev= 0.00, samples=1
   iops        : min=10412, max=10412, avg=10412.00, stdev= 0.00, samples=1
  lat (msec)   : 2=0.07%, 4=99.47%, 10=0.21%, 20=0.10%, 50=0.15%
  cpu          : usr=1.59%, sys=98.20%, ctx=5, majf=0, minf=8203
  IO depths    : 1=0.1%, 2=0.1%, 4=0.1%, 8=0.1%, 16=0.2%, 32=99.7%, >=64=0.0%
     submit    : 0=0.0%, 4=100.0%, 8=0.0%, 16=0.0%, 32=0.0%, 64=0.0%, >=64=0.0%
     complete  : 0=0.0%, 4=100.0%, 8=0.0%, 16=0.0%, 32=0.1%, 64=0.0%, >=64=0.0%
     issued rwts: total=10241,0,0,0 short=0,0,0,0 dropped=0,0,0,0
     latency   : target=0, window=0, percentile=100.00%, depth=32

Run status group 0 (all jobs):
   READ: bw=10.6GiB/s (11.4GB/s), 10.6GiB/s-10.6GiB/s (11.4GB/s-11.4GB/s), io=10.0GiB (10.7GB), run=943-943msec

Disk stats (read/write):
    dm-0: ios=2/0, merge=0/0, ticks=8/0, in_queue=8, util=0.80%, aggrios=3/0, aggrmerge=0/0, aggrticks=7/0, aggrin_queue=7, aggrutil=1.08%
  sda: ios=3/0, merge=0/0, ticks=7/0, in_queue=7, util=1.08%

```

#### (2) 顺序写入测试（模拟大文件写入）

```
fio --name=seq_write \
    --filename=test.qcow2 \
    --ioengine=libaio \
    --direct=1 \
    --bs=1M \
    --rw=write \
    --iodepth=32 \
    --runtime=60 \
    --group_reporting
```

#### base-full

```bash
fio --name=seq_write --filename=base_full.qcow2 --ioengine=libaio --direct=1 --bs=1M --rw=write --iodepth=32 --runtime=60 --group_reporting --size 10G

seq_write: (g=0): rw=write, bs=(R) 1024KiB-1024KiB, (W) 1024KiB-1024KiB, (T) 1024KiB-1024KiB, ioengine=libaio, iodepth=32
fio-3.28
Starting 1 process
Jobs: 1 (f=1): [W(1)][100.0%][w=208MiB/s][w=208 IOPS][eta 00m:00s]
seq_write: (groupid=0, jobs=1): err= 0: pid=304051: Sat Jun 21 01:55:59 2025
  write: IOPS=237, BW=237MiB/s (249MB/s)(10.0GiB/43121msec); 0 zone resets
    slat (usec): min=38, max=1381.0k, avg=1282.18, stdev=17537.04
    clat (msec): min=5, max=2510, avg=133.45, stdev=180.58
     lat (msec): min=12, max=2510, avg=134.74, stdev=182.50
    clat percentiles (msec):
     |  1.00th=[   60],  5.00th=[   65], 10.00th=[   65], 20.00th=[   65],
     | 30.00th=[   65], 40.00th=[   65], 50.00th=[   66], 60.00th=[   67],
     | 70.00th=[   90], 80.00th=[  194], 90.00th=[  230], 95.00th=[  464],
     | 99.00th=[  667], 99.50th=[  885], 99.90th=[ 2433], 99.95th=[ 2500],
     | 99.99th=[ 2500]
   bw (  KiB/s): min= 2048, max=507904, per=100.00%, avg=251879.33, stdev=167701.15, samples=83
   iops        : min=    2, max=  496, avg=245.98, stdev=163.77, samples=83
  lat (msec)   : 10=0.02%, 20=0.19%, 50=0.49%, 100=69.83%, 250=21.12%
  lat (msec)   : 500=3.78%, 750=4.01%, 1000=0.13%, 2000=0.18%, >=2000=0.25%
  cpu          : usr=2.42%, sys=2.24%, ctx=9117, majf=0, minf=11
  IO depths    : 1=0.1%, 2=0.1%, 4=0.1%, 8=0.1%, 16=0.2%, 32=99.7%, >=64=0.0%
     submit    : 0=0.0%, 4=100.0%, 8=0.0%, 16=0.0%, 32=0.0%, 64=0.0%, >=64=0.0%
     complete  : 0=0.0%, 4=100.0%, 8=0.0%, 16=0.0%, 32=0.1%, 64=0.0%, >=64=0.0%
     issued rwts: total=0,10240,0,0 short=0,0,0,0 dropped=0,0,0,0
     latency   : target=0, window=0, percentile=100.00%, depth=32

Run status group 0 (all jobs):
  WRITE: bw=237MiB/s (249MB/s), 237MiB/s-237MiB/s (249MB/s-249MB/s), io=10.0GiB (10.7GB), run=43121-43121msec

Disk stats (read/write):
    dm-0: ios=0/10312, merge=0/0, ticks=0/1384204, in_queue=1384204, util=98.83%, aggrios=0/20540, aggrmerge=0/17, aggrticks=0/2659749, aggrin_queue=2660525, aggrutil=99.51%
  sda: ios=0/20540, merge=0/17, ticks=0/2659749, in_queue=2660525, util=99.51%
```

#### base-alloc

```bash
fio --name=seq_write --filename=base_alloc.qcow2 --ioengine=libaio --direct=1 --bs=1M --rw=write --iodepth=32 --runtime=60 --group_reporting --size 10G

seq_write: (g=0): rw=write, bs=(R) 1024KiB-1024KiB, (W) 1024KiB-1024KiB, (T) 1024KiB-1024KiB, ioengine=libaio, iodepth=32
fio-3.28
Starting 1 process
Jobs: 1 (f=1): [W(1)][100.0%][w=474MiB/s][w=474 IOPS][eta 00m:00s]
seq_write: (groupid=0, jobs=1): err= 0: pid=304063: Sat Jun 21 01:58:02 2025
  write: IOPS=156, BW=157MiB/s (164MB/s)(9420MiB/60065msec); 0 zone resets
    slat (usec): min=37, max=4066.0k, avg=1714.60, stdev=44881.37
    clat (msec): min=5, max=6714, avg=202.31, stdev=422.82
     lat (msec): min=12, max=6715, avg=204.02, stdev=425.05
    clat percentiles (msec):
     |  1.00th=[   46],  5.00th=[   64], 10.00th=[   65], 20.00th=[   65],
     | 30.00th=[   65], 40.00th=[   65], 50.00th=[   66], 60.00th=[   69],
     | 70.00th=[  146], 80.00th=[  236], 90.00th=[  550], 95.00th=[  617],
     | 99.00th=[  986], 99.50th=[ 1133], 99.90th=[ 6678], 99.95th=[ 6678],
     | 99.99th=[ 6745]
   bw (  KiB/s): min= 2048, max=507904, per=100.00%, avg=172689.61, stdev=172269.75, samples=109
   iops        : min=    2, max=  496, avg=168.64, stdev=168.23, samples=109
  lat (msec)   : 10=0.06%, 20=0.23%, 50=1.05%, 100=64.60%, 250=14.47%
  lat (msec)   : 500=3.22%, 750=14.27%, 1000=1.25%, 2000=0.51%, >=2000=0.34%
  cpu          : usr=1.48%, sys=1.58%, ctx=8003, majf=0, minf=11
  IO depths    : 1=0.1%, 2=0.1%, 4=0.1%, 8=0.1%, 16=0.2%, 32=99.7%, >=64=0.0%
     submit    : 0=0.0%, 4=100.0%, 8=0.0%, 16=0.0%, 32=0.0%, 64=0.0%, >=64=0.0%
     complete  : 0=0.0%, 4=100.0%, 8=0.0%, 16=0.0%, 32=0.1%, 64=0.0%, >=64=0.0%
     issued rwts: total=0,9420,0,0 short=0,0,0,0 dropped=0,0,0,0
     latency   : target=0, window=0, percentile=100.00%, depth=32

Run status group 0 (all jobs):
  WRITE: bw=157MiB/s (164MB/s), 157MiB/s-157MiB/s (164MB/s-164MB/s), io=9420MiB (9878MB), run=60065-60065msec

Disk stats (read/write):
    dm-0: ios=0/9503, merge=0/0, ticks=0/1851312, in_queue=1851312, util=99.32%, aggrios=0/18923, aggrmerge=0/62, aggrticks=0/3636432, aggrin_queue=3638611, aggrutil=99.80%
  sda: ios=0/18923, merge=0/62, ticks=0/3636432, in_queue=3638611, util=99.80%

```

#### (3) 随机读取测试（模拟数据库/虚拟内存）

```
fio --name=rand_read \
    --filename=test.qcow2 \
    --ioengine=libaio \
    --direct=1 \
    --bs=4k \
    --rw=randread \
    --iodepth=64 \
    --runtime=60 \
    --group_reporting
```

#### base-full

```bash
fio --name=rand_read --filename=base_full.qcow2 \
--ioengine=libaio --direct=1 --bs=4k --rw=randread --iodepth=64 --runtime=60 --group_reporting

rand_read: (g=0): rw=randread, bs=(R) 4096B-4096B, (W) 4096B-4096B, (T) 4096B-4096B, ioengine=libaio, iodepth=64
fio-3.28
Starting 1 process
Jobs: 1 (f=1): [r(1)][100.0%][r=81.4MiB/s][r=20.8k IOPS][eta 00m:00s]
rand_read: (groupid=0, jobs=1): err= 0: pid=304073: Sat Jun 21 02:00:57 2025
  read: IOPS=20.9k, BW=81.5MiB/s (85.5MB/s)(4891MiB/60004msec)
    slat (usec): min=2, max=4170, avg=13.29, stdev=10.53
    clat (usec): min=233, max=36369, avg=3051.91, stdev=1312.26
     lat (usec): min=258, max=36389, avg=3065.37, stdev=1312.30
    clat percentiles (usec):
     |  1.00th=[  889],  5.00th=[ 1303], 10.00th=[ 1582], 20.00th=[ 1991],
     | 30.00th=[ 2343], 40.00th=[ 2638], 50.00th=[ 2933], 60.00th=[ 3228],
     | 70.00th=[ 3556], 80.00th=[ 3949], 90.00th=[ 4555], 95.00th=[ 5145],
     | 99.00th=[ 7373], 99.50th=[ 8717], 99.90th=[11469], 99.95th=[12387],
     | 99.99th=[14877]
   bw (  KiB/s): min=78792, max=85736, per=100.00%, avg=83540.50, stdev=1067.06, samples=119
   iops        : min=19698, max=21434, avg=20885.09, stdev=266.74, samples=119
  lat (usec)   : 250=0.01%, 500=0.03%, 750=0.39%, 1000=1.33%
  lat (msec)   : 2=18.38%, 4=61.23%, 10=18.39%, 20=0.24%, 50=0.01%
  cpu          : usr=10.36%, sys=31.30%, ctx=476596, majf=0, minf=75
  IO depths    : 1=0.1%, 2=0.1%, 4=0.1%, 8=0.1%, 16=0.1%, 32=0.1%, >=64=100.0%
     submit    : 0=0.0%, 4=100.0%, 8=0.0%, 16=0.0%, 32=0.0%, 64=0.0%, >=64=0.0%
     complete  : 0=0.0%, 4=100.0%, 8=0.0%, 16=0.0%, 32=0.0%, 64=0.1%, >=64=0.0%
     issued rwts: total=1252080,0,0,0 short=0,0,0,0 dropped=0,0,0,0
     latency   : target=0, window=0, percentile=100.00%, depth=64

Run status group 0 (all jobs):
   READ: bw=81.5MiB/s (85.5MB/s), 81.5MiB/s-81.5MiB/s (85.5MB/s-85.5MB/s), io=4891MiB (5129MB), run=60004-60004msec

Disk stats (read/write):
    dm-0: ios=1249812/12, merge=0/0, ticks=3797660/48, in_queue=3797708, util=99.92%, aggrios=1252037/10, aggrmerge=43/2, aggrticks=3783854/47, aggrin_queue=3783923, aggrutil=99.85%
  sda: ios=1252037/10, merge=43/2, ticks=3783854/47, in_queue=3783923, util=99.85%
```

#### base-alloc

```bash
fio --name=rand_read --filename=base_alloc.qcow2 \
--ioengine=libaio --direct=1 --bs=4k --rw=randread --iodepth=64 --runtime=60 --group_reporting
rand_read: (g=0): rw=randread, bs=(R) 4096B-4096B, (W) 4096B-4096B, (T) 4096B-4096B, ioengine=libaio, iodepth=64
fio-3.28
Starting 1 process
Jobs: 1 (f=1): [r(1)][100.0%][r=86.7MiB/s][r=22.2k IOPS][eta 00m:00s]
rand_read: (groupid=0, jobs=1): err= 0: pid=304085: Sat Jun 21 02:03:06 2025
  read: IOPS=22.2k, BW=86.7MiB/s (90.9MB/s)(5203MiB/60003msec)
    slat (usec): min=2, max=3232, avg=12.33, stdev= 7.38
    clat (usec): min=199, max=102943, avg=2869.17, stdev=1387.06
     lat (usec): min=211, max=102962, avg=2881.63, stdev=1387.07
    clat percentiles (usec):
     |  1.00th=[  824],  5.00th=[ 1205], 10.00th=[ 1483], 20.00th=[ 1876],
     | 30.00th=[ 2180], 40.00th=[ 2474], 50.00th=[ 2737], 60.00th=[ 3032],
     | 70.00th=[ 3326], 80.00th=[ 3720], 90.00th=[ 4293], 95.00th=[ 4817],
     | 99.00th=[ 6849], 99.50th=[ 8094], 99.90th=[10552], 99.95th=[11600],
     | 99.99th=[14222]
   bw (  KiB/s): min=72080, max=90344, per=100.00%, avg=88870.05, stdev=1702.77, samples=119
   iops        : min=18020, max=22586, avg=22217.55, stdev=425.71, samples=119
  lat (usec)   : 250=0.01%, 500=0.06%, 750=0.57%, 1000=1.76%
  lat (msec)   : 2=21.56%, 4=61.95%, 10=13.95%, 20=0.15%, 100=0.01%
  lat (msec)   : 250=0.01%
  cpu          : usr=10.29%, sys=31.34%, ctx=577880, majf=0, minf=76
  IO depths    : 1=0.1%, 2=0.1%, 4=0.1%, 8=0.1%, 16=0.1%, 32=0.1%, >=64=100.0%
     submit    : 0=0.0%, 4=100.0%, 8=0.0%, 16=0.0%, 32=0.0%, 64=0.0%, >=64=0.0%
     complete  : 0=0.0%, 4=100.0%, 8=0.0%, 16=0.0%, 32=0.0%, 64=0.1%, >=64=0.0%
     issued rwts: total=1331904,0,0,0 short=0,0,0,0 dropped=0,0,0,0
     latency   : target=0, window=0, percentile=100.00%, depth=64

Run status group 0 (all jobs):
   READ: bw=86.7MiB/s (90.9MB/s), 86.7MiB/s-86.7MiB/s (90.9MB/s-90.9MB/s), io=5203MiB (5455MB), run=60003-60003msec

Disk stats (read/write):
    dm-0: ios=1329595/5, merge=0/0, ticks=3802532/12, in_queue=3802544, util=99.93%, aggrios=1331861/4, aggrmerge=43/1, aggrticks=3791812/16, aggrin_queue=3791836, aggrutil=99.85%
  sda: ios=1331861/4, merge=43/1, ticks=3791812/16, in_queue=3791836, util=99.85%
```

#### (4) 随机写入测试（最严苛的压力测试）

```
fio --name=rand_write \
    --filename=test.qcow2 \
    --ioengine=libaio \
    --direct=1 \
    --bs=4k \
    --rw=randwrite \
    --iodepth=64 \
    --runtime=60 \
    --group_reporting
```

#### base-full

```bash
fio --name=rand_write --filename=base_full.qcow2 \
--ioengine=libaio --direct=1 --bs=4k --rw=randwrite --iodepth=64 --runtime=60 --group_reporting

rand_write: (g=0): rw=randwrite, bs=(R) 4096B-4096B, (W) 4096B-4096B, (T) 4096B-4096B, ioengine=libaio, iodepth=64
fio-3.28
Starting 1 process
Jobs: 1 (f=1): [w(1)][100.0%][w=113MiB/s][w=29.0k IOPS][eta 00m:00s]
rand_write: (groupid=0, jobs=1): err= 0: pid=304104: Sat Jun 21 02:25:52 2025
  write: IOPS=42.9k, BW=167MiB/s (176MB/s)(9.82GiB/60040msec); 0 zone resets
    slat (usec): min=2, max=73709, avg= 6.86, stdev=92.98
    clat (usec): min=196, max=537285, avg=1484.88, stdev=9354.76
     lat (usec): min=201, max=537289, avg=1491.83, stdev=9355.22
    clat percentiles (usec):
     |  1.00th=[   412],  5.00th=[   457], 10.00th=[   502], 20.00th=[   586],
     | 30.00th=[   676], 40.00th=[   750], 50.00th=[   824], 60.00th=[   914],
     | 70.00th=[   988], 80.00th=[  1123], 90.00th=[  1369], 95.00th=[  1401],
     | 99.00th=[  3359], 99.50th=[ 79168], 99.90th=[ 89654], 99.95th=[ 96994],
     | 99.99th=[497026]
   bw (  KiB/s): min=21912, max=210224, per=100.00%, avg=172176.20, stdev=34934.15, samples=119
   iops        : min= 5478, max=52556, avg=43044.10, stdev=8733.54, samples=119
  lat (usec)   : 250=0.01%, 500=9.96%, 750=30.71%, 1000=30.53%
  lat (msec)   : 2=26.59%, 4=1.45%, 10=0.11%, 20=0.01%, 50=0.03%
  lat (msec)   : 100=0.57%, 250=0.01%, 500=0.01%, 750=0.01%
  cpu          : usr=10.86%, sys=31.00%, ctx=1745170, majf=0, minf=12
  IO depths    : 1=0.1%, 2=0.1%, 4=0.1%, 8=0.1%, 16=0.1%, 32=0.1%, >=64=100.0%
     submit    : 0=0.0%, 4=100.0%, 8=0.0%, 16=0.0%, 32=0.0%, 64=0.0%, >=64=0.0%
     complete  : 0=0.0%, 4=100.0%, 8=0.0%, 16=0.0%, 32=0.0%, 64=0.1%, >=64=0.0%
     issued rwts: total=0,2574353,0,0 short=0,0,0,0 dropped=0,0,0,0
     latency   : target=0, window=0, percentile=100.00%, depth=64

Run status group 0 (all jobs):
  WRITE: bw=167MiB/s (176MB/s), 167MiB/s-167MiB/s (176MB/s-176MB/s), io=9.82GiB (10.5GB), run=60040-60040msec

Disk stats (read/write):
    dm-0: ios=2/2571215, merge=0/0, ticks=36/3214056, in_queue=3214092, util=99.74%, aggrios=2/2573995, aggrmerge=0/442, aggrticks=3/3217446, aggrin_queue=3217933, aggrutil=99.84%
  sda: ios=2/2573995, merge=0/442, ticks=3/3217446, in_queue=3217933, util=99.84%
```

#### base-alloc

```bash
fio --name=rand_write --filename=base_alloc.qcow2 \
--ioengine=libaio --direct=1 --bs=4k --rw=randwrite --iodepth=64 --runtime=60 --group_reporting
```

#### (5) 混合读写测试（70%读 + 30%写）

```
fio --name=mixed_io \
    --filename=test.qcow2 \
    --ioengine=libaio \
    --direct=1 \
    --bs=4k \
    --rw=randrw \
    --rwmixread=70 \
    --iodepth=64 \
    --runtime=120 \
    --group_reporting
```

---

### ​**​3. 关键性能指标解读 ​**​

fio 输出结果包含核心性能数据：

```
READ: bw=356MiB/s (373MB/s)  # 带宽（越高越好）
READ: iops=89.1k        # 每秒I/O操作数（关键指标）
READ: lat (usec): min=100, max=8000, avg=500.12  # 延迟（越低越好）

WRITE: bw=150MiB/s (157MB/s)
WRITE: iops=37.5k
WRITE: lat (usec): min=150, max=12000, avg=600.35
```

#### 📊 指标重要性排序：

1. ​**​IOPS​**​：随机访问性能的核心指标，尤其对数据库/VMs 重要
2. ​**​Latency (延迟)​**​：响应时间，95%和 99%分位值更关键
3. ​**​Bandwidth (带宽)​**​：顺序读写性能指标
4. ​**​CPU Usage​**​：高并发下 CPU 开销（`fio`可记录）

---

### ​**​4. 高级技巧 ​**​

#### (1) 排除文件系统缓存干扰

```
# 测试前清空缓存（需要root）
sync; echo 3 > /proc/sys/vm/drop_caches
```

#### (2) 测试 Native 性能（对比基准）

```
# 直接在原始设备或RAW文件测试
fio --filename=/dev/sdb ...  # 替换为实际设备
```

#### (3) 生成可视化报告

```
# 安装gnuplot生成图表
sudo apt install gnuplot
fio --bandwidth-log=output.log test.fio
fio2gnuplot -b -g  # 生成PNG图表
```

#### (4) 长时间稳定性测试

```
# 运行12小时混合负载测试
fio --runtime=43200 --ramp_time=300 ...  # 预热5分钟后测试12小时
```

---

### ​**​5. 结果分析建议 ​**​

1. ​**​ 对比测试 ​**​：
    - RAW vs qcow2（相同硬件）
    - 不同`preallocation`模式（`off`/`falloc`/`full`）
2. ​**​ 瓶颈定位 ​**​：
    - 若 IOPS 低 → 检查存储介质性能（SSD/HDD）
    - 若延迟高 → 优化队列深度(`iodepth`)
    - 若 CPU 饱和 → 减少并发或升级 CPU
3. ​**​ 生产建议 ​**​：
    - 虚拟机磁盘：关注 4K 随机读写性能
    - 备份存储：关注大块顺序读写带宽

> 💡 真实场景测试：最终建议在虚拟机内再测试一次（使用`fio`或`dd`），因为虚拟化层和驱动（如 virtio-blk）会影响最终性能。

使用 qemu-img 创建 100G 大小的 qcow2 磁盘文件，preallocation=falloc，用时 2s；preallocation=full，用时 1m43s。
创建 1T 大小的 qcow2 磁盘文件，preallocation=falloc，用时 20s

使用 cp --reflink 复制上面制作的磁盘文件，用时基本上都是 0.01s，没有什么差别。
