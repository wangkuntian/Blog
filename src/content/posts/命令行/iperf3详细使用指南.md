---
title: iperf3详细使用指南
published: 2026-01-08 16:59:35
description: 'iperf3 详细使用指南'
image: ''
tags: ['命令行', '网络']
category: '命令行'
draft: false
lang: ''
---

# 1. iperf3 简介

iperf3 是一个网络性能测试工具，用于测量网络带宽和网络质量。它可以测试 TCP/UDP 的吞吐量、延迟、丢包率等指标。

# 2. 安装 iperf3

## 在 Linux 系统上安装

**Ubuntu/Debian:**

```bash
sudo apt-get update
sudo apt-get install iperf3
```

**CentOS/RHEL:**

```bash
sudo yum install epel-release
sudo yum install iperf3
```

**Fedora:**

```bash
sudo dnf install iperf3
```

## 在 macOS 上安装

```bash
brew install iperf3
```

## 在 Windows 上安装

1. 访问 <https://iperf.fr/iperf-download.php>
2. 下载 Windows 版本
3. 解压并添加路径到环境变量

## 使用 Docker 运行

```bash
# 作为服务器
docker run -it --rm -p 5201:5201 networkstatic/iperf3 -s

# 作为客户端
docker run -it --rm networkstatic/iperf3 -c <服务器IP>
```

# 3. 基本使用方法

## 服务器端模式

```bash
# 基本启动
iperf3 -s

# 指定端口（默认5201）
iperf3 -s -p 5001

# 以守护进程模式运行
iperf3 -s -D
```

## 客户端模式

```bash
# 基本连接
iperf3 -c <服务器IP>

# 指定端口
iperf3 -c <服务器IP> -p 5001

# 指定测试时间（默认10秒）
iperf3 -c <服务器IP> -t 30

# 指定方向（从客户端到服务器）
iperf3 -c <服务器IP> -d  # 双向测试
iperf3 -c <服务器IP> -R  # 反向测试（服务器发送到客户端）
```

## 参数解析

灵活使用参数是精准测试的关键。下表汇总了最常用的核心参数。

| **参数** | **说明** | **示例** |
| :--- | :--- | :--- |
| **-t, --time** | 指定测试时长（秒），默认10秒。 | `-t 60` (测试60秒)  |
| **-u, --udp** | 使用UDP协议进行测试（默认是TCP）。UDP测试还能得到**抖动(Jitter)**和**丢包率** 。 | `-u` |
| **-b, --bandwidth** | **UDP测试必备**，指定发送带宽。单位 bits/sec，可使用 K, M, G。TCP模式下会根据窗口大小自动调整。 | `-u -b 100M` (以100Mbps发送UDP流)  |
| **-P, --parallel** | 设置并发数据流数，常用于突破单线程瓶颈或模拟高并发 。 | `-P 5` (使用5个并行连接)  |
| **-i, --interval** | 设置定期报告带宽的间隔时间（秒） 。 | `-i 2` (每2秒输出一次中间结果) |
| **-R, --reverse** | **反向测试**模式。让服务器端发送数据，客户端接收。**这是测试服务器上传（出口）带宽的便捷方法**，无需在两端互换角色 。 | `-c server_ip -R` (测试服务器到客户端的带宽) |
| **--bidir** | **双向同时测试**模式。客户端和服务器同时进行发送和接收，用于评估全双工能力 。 | `--bidir` |
| **-p, --port** | 指定服务器监听的端口/客户端连接的端口 。 | `-p 5202` |
| **-w, --window** | 设置TCP窗口大小，对高延迟网络优化至关重要 。 | `-w 512K` |

# 4. 测试服务器网络质量完整示例

## 场景描述

测试服务器 S（IP: 192.168.1.100）的网络质量，客户端 C（IP: 192.168.1.50）

## 步骤1：在服务器端启动 iperf3 服务

```bash
# 在服务器 S 上执行
iperf3 -s -p 5201
# 输出：Server listening on 5201
```

## 步骤2：基本带宽测试

测试下载速度（服务器到客户端）：

```bash
# 在客户端 C 上执行
iperf3 -c 192.168.1.100 -t 20 -i 5
```

参数说明：

- `-c 192.168.1.100`: 连接服务器
- `-t 20`: 测试20秒
- `-i 5`: 每5秒报告一次

测试上传速度（客户端到服务器）：

```bash
iperf3 -c 192.168.1.100 -t 20 -i 5 -R
```

## 步骤3：全面网络质量测试脚本

创建一个测试脚本 `network_test.sh`：

```bash
#!/bin/bash

SERVER_IP="192.168.1.100"
PORT="5201"
TEST_TIME=30
PARALLEL=4  # 并行流数
REVERSE=""

echo "=== 开始网络质量测试 ==="
echo "目标服务器: $SERVER_IP"
echo "测试时间: ${TEST_TIME}秒"
echo "=========================="

# 1. 测试下载速度（TCP）
echo -e "\n1. TCP下载测试（服务器 → 客户端）"
iperf3 -c $SERVER_IP -p $PORT -t $TEST_TIME -i 2 -P $PARALLEL

# 2. 测试上传速度（TCP）
echo -e "\n2. TCP上传测试（客户端 → 服务器）"
iperf3 -c $SERVER_IP -p $PORT -t $TEST_TIME -i 2 -P $PARALLEL -R

# 3. 测试UDP性能（带宽和丢包）
echo -e "\n3. UDP性能测试（带宽和丢包率）"
iperf3 -c $SERVER_IP -p $PORT -t $TEST_TIME -u -b 1G -i 2

# 4. 双向同时测试
echo -e "\n4. 双向同时测试"
iperf3 -c $SERVER_IP -p $PORT -t $TEST_TIME -i 2 -d

# 5. 测试不同TCP窗口大小
echo -e "\n5. TCP窗口大小优化测试"
for window in 256K 512K 1M 2M 4M 8M; do
    echo -e "\n测试窗口大小: $window"
    iperf3 -c $SERVER_IP -p $PORT -t 10 -w $window
done

echo -e "\n=== 网络质量测试完成 ==="
```

## 步骤4：网络稳定性测试（长时间+间隔测试）

长时间稳定性测试：

```bash
# 测试1小时，每10秒报告一次
iperf3 -c 192.168.1.100 -t 3600 -i 10

# 将结果输出到文件
iperf3 -c 192.168.1.100 -t 3600 -i 60 --logfile iperf_results.txt
```

间隔测试（检测网络波动）：

```bash
#!/bin/bash
for i in {1..24}; do
    echo "=== 第 $i 次测试 $(date) ==="
    iperf3 -c 192.168.1.100 -t 60 -i 10
    echo "等待10分钟..."
    sleep 600
done
```

## 步骤5：进阶测试选项

使用 JSON 格式输出（便于分析）：

```bash
iperf3 -c 192.168.1.100 -t 20 -J > results.json
```

测试特定带宽限制：

```bash
# 测试100Mbps的限制
iperf3 -c 192.168.1.100 -t 20 -b 100M

# UDP测试特定带宽
iperf3 -c 192.168.1.100 -t 20 -u -b 500M
```

测试特定 MTU：

```bash
iperf3 -c 192.168.1.100 -t 20 -M 1400
```

设置服务质量（QoS）：

```bash
iperf3 -c 192.168.1.100 -t 20 -S 0xB8
```

# 5. 结果解读示例

## 典型输出分析：

```text
Connecting to host 192.168.1.100, port 5201
[  5] local 192.168.1.50 port 54322 connected to 192.168.1.100 port 5201
[ ID] Interval           Transfer     Bitrate         Retr  Cwnd
[  5]   0.00-1.00   sec  112 MBytes   939 Mbits/sec   46    230 KBytes
[  5]   1.00-2.00   sec  110 MBytes   923 Mbits/sec    0    230 KBytes
[  5]   2.00-3.00   sec  112 MBytes   940 Mbits/sec    0    230 KBytes
[  5]   3.00-4.00   sec  112 MBytes   940 Mbits/sec    0    230 KBytes
[  5]   4.00-5.00   sec  112 MBytes   940 Mbits/sec    0    230 KBytes
- - - - - - - - - - - - - - - - - - - - - - - - -
[ ID] Interval           Transfer     Bitrate         Retr
[  5]   0.00-5.00   sec   558 MBytes   936 Mbits/sec   46             sender
[  5]   0.00-5.00   sec   556 MBytes   933 Mbits/sec                  receiver
```

关键指标：

1. **Transfer**: 数据传输量
2. **Bitrate**: 带宽（关键指标）
3. **Retr**: 重传次数（网络稳定性指标，重传多表示网络不稳定）
4. **Cwnd**: 拥塞窗口大小

# 6. 实际应用案例：云服务器网络质量评估

## 测试场景：评估 AWS EC2 实例的网络性能

```bash
#!/bin/bash
# ec2_network_test.sh

SERVER_IP="ec2-instance-public-ip"
LOG_FILE="ec2_network_report_$(date +%Y%m%d_%H%M%S).log"

echo "EC2实例网络质量测试报告" | tee -a $LOG_FILE
echo "测试时间: $(date)" | tee -a $LOG_FILE
echo "服务器IP: $SERVER_IP" | tee -a $LOG_FILE
echo "=========================================" | tee -a $LOG_FILE

# 测试1: 基础TCP性能
echo -e "\n[测试1] 基础TCP下载性能" | tee -a $LOG_FILE
iperf3 -c $SERVER_IP -t 30 -i 5 -P 8 2>&1 | tee -a $LOG_FILE

# 测试2: 基础TCP上传性能
echo -e "\n[测试2] 基础TCP上传性能" | tee -a $LOG_FILE
iperf3 -c $SERVER_IP -t 30 -i 5 -P 8 -R 2>&1 | tee -a $LOG_FILE

# 测试3: 网络稳定性（短时间多次测试）
echo -e "\n[测试3] 网络稳定性测试" | tee -a $LOG_FILE
for i in {1..10}; do
    echo "第 $i 次测试:" | tee -a $LOG_FILE
    iperf3 -c $SERVER_IP -t 5 -i 1 -J | python3 -c "
import json, sys
data = json.load(sys.stdin)
end = data['end']
print(f'带宽: {end[\"sum_received\"][\"bits_per_second\"]/1e9:.2f} Gbps')
print(f'重传: {end[\"sum_sent\"][\"retransmits\"]}')
print(f'平均RTT: {end[\"sum_sent\"][\"mean_rtt\"]} ms')
" | tee -a $LOG_FILE
done

# 测试4: UDP丢包率测试
echo -e "\n[测试4] UDP丢包率测试" | tee -a $LOG_FILE
iperf3 -c $SERVER_IP -t 20 -u -b 100M -i 5 2>&1 | tee -a $LOG_FILE
```

# 7. 性能优化建议

1. **调整TCP窗口大小**：

```bash
# 根据网络延迟调整窗口大小
iperf3 -c server_ip -w 2M  # 高延迟网络使用大窗口
```

2. **使用并行流**：

```bash
# 多线程/多连接测试
iperf3 -c server_ip -P 4   # 4个并行连接
```

3. **避免CPU瓶颈**：

```bash
# 使用零拷贝（如果支持）
iperf3 -c server_ip -Z
```

# 8. 故障排除

## 常见问题：

1. **连接被拒绝**：
   - 检查防火墙设置
   - 确认服务器端已启动

   ```bash
   # 检查端口
   netstat -tuln | grep 5201
   # 临时关闭防火墙测试
   sudo systemctl stop firewalld  # CentOS
   sudo ufw disable  # Ubuntu
   ```

2. **带宽测试结果远低于预期**：
   - 检查中间网络设备限制
   - 测试两端都使用高性能机器
   - 使用 `-A` 参数绑定到特定CPU核心

3. **高重传率**：
   - 检查网络拥塞
   - 测试不同时间段
   - 减少并行流数量

# 9. 自动化监控脚本示例

```python
#!/usr/bin/env python3
"""
iperf3自动化网络监控脚本
"""

import subprocess
import json
import time
from datetime import datetime
import csv

def run_iperf_test(server_ip, duration=10, reverse=False):
    """执行iperf3测试并返回结果"""
    cmd = ['iperf3', '-c', server_ip, '-t', str(duration), '-J']
    if reverse:
        cmd.append('-R')

    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=duration+5)
        if result.returncode == 0:
            return json.loads(result.stdout)
        else:
            print(f"测试失败: {result.stderr}")
            return None
    except Exception as e:
        print(f"执行错误: {e}")
        return None

def monitor_network_quality(server_ip, interval=300, duration=60):
    """持续监控网络质量"""
    with open('network_monitor.csv', 'w', newline='') as csvfile:
        writer = csv.writer(csvfile)
        writer.writerow(['时间戳', '下载带宽(Mbps)', '上传带宽(Mbps)', 
                        '下载重传数', '上传重传数', '下载抖动(ms)', '上传抖动(ms)'])

        while True:
            timestamp = datetime.now().isoformat()

            # 下载测试
            down_result = run_iperf_test(server_ip, duration)
            # 上传测试
            up_result = run_iperf_test(server_ip, duration, reverse=True)

            if down_result and up_result:
                down_stats = down_result['end']['sum_received']
                up_stats = up_result['end']['sum_received']

                writer.writerow([
                    timestamp,
                    down_stats['bits_per_second'] / 1e6,
                    up_stats['bits_per_second'] / 1e6,
                    down_result['end']['sum_sent']['retransmits'],
                    up_result['end']['sum_sent']['retransmits'],
                    down_stats.get('jitter_ms', 0),
                    up_stats.get('jitter_ms', 0)
                ])
                csvfile.flush()

                print(f"[{timestamp}] "
                      f"下载: {down_stats['bits_per_second']/1e6:.2f} Mbps, "
                      f"上传: {up_stats['bits_per_second']/1e6:.2f} Mbps")

            time.sleep(interval)

if __name__ == "__main__":
    # 使用示例
    monitor_network_quality("192.168.1.100", interval=600, duration=30)
```

# 10. 最佳实践建议

1. **测试前准备**：
   - 确保测试期间无其他大流量应用运行
   - 预热测试（先运行30秒测试，不计入结果）
   - 多次测试取平均值

2. **测试时间选择**：
   - 选择业务高峰期和低峰期分别测试
   - 长时间测试（至少24小时）了解网络稳定性

3. **结果分析**：
   - 关注带宽、延迟、抖动、丢包率综合指标
   - 对比不同时间段的结果
   - 建立基线性能指标

4. **安全考虑**：
   - 测试完成后关闭iperf3服务
   - 使用非标准端口
   - 限制可连接IP范围

这个指南提供了从基础到进阶的iperf3使用方法，可以根据具体需求选择合适的测试方法和参数来评估服务器网络质量。
