---
title: perf
published: 2025-12-11
description: ""
image: ""
tags: ["操作系统", "命令行"]
category: "操作系统"
draft: false
lang: ""
---

好的，我们来详细讲解一下 Linux 中的 `perf`。

# 什么是 Perf？

​**​Perf​**​ 是 Linux 系统上一个非常强大且官方的 ​**​ 性能分析工具 ​**​。它源自 Linux 内核的 `perf_events`子系统，因此与内核紧密集成，能够提供非常底层的硬件和软件性能数据。

它的核心功能是 ​**​ 采样 ​**​ 和 ​**​ 统计 ​**​。通过它，你可以：

1. ​**​ 监控 CPU 性能计数器 ​**​：如缓存命中/未命中、分支预测错误、指令周期数等。
2. ​**​ 跟踪软件事件 ​**​：如页面错误、上下文切换、调度事件等。
3. ​**​ 对代码进行采样 ​**​：找出哪些函数或代码行消耗了最多的 CPU 时间。
4. ​**​ 生成性能报告和可视化图表 ​**​：如火焰图（Flame Graph），直观地展示性能瓶颈。

简单来说，`perf`就像是一个给 Linux 系统和应用程序做的 “CT 扫描” 或 “X 光检查”，可以帮助开发者和系统管理员精准地定位性能问题的根源。

# 主要用法和常用命令

`perf`的功能通过一系列子命令来实现。以下是其中最常用和核心的几个：

## 1. `perf list`- 查看可用事件

首先，你需要知道你的硬件和内核支持监控哪些事件。这个命令会列出所有可用的 ​**​ 硬件性能事件 ​**​（由 CPU PMU 提供）和 ​**​ 软件事件 ​**​（由内核提供）。

```
perf list
```

输出示例会很长，比如你会看到 `cpu-cycles`, `instructions`, `cache-misses`, `page-faults`等。

## 2. `perf stat`- 执行并统计整体性能

`perf stat`用于运行一个指定的命令或程序，并在其结束后提供一个关于该程序运行的 ​**​ 宏观性能统计摘要 ​**​。非常适合快速了解一个程序的整体表现。

​**​ 基本用法：​**​

```
perf stat <command>
```

​**​ 示例：统计 `ls`命令的性能 ​**​

```
perf stat ls
```

​**​ 输出示例：​**​

```
Performance counter stats for 'ls':

              1.23 msec task-clock:u               #    0.570 CPUs utilized
                 0      context-switches:u         #    0.000 /sec
                 0      cpu-migrations:u           #    0.000 /sec
               253      page-faults:u              #  205.691 K/sec
         1,123,456      cycles:u                   #    0.914 GHz
         1,456,789      instructions:u             #    1.30  insn per cycle
           234,567      branches:u                 #  190.764 M/sec
            12,345      branch-misses:u            #    5.26% of all branches

       0.002156862 seconds time elapsed
       0.001000000 seconds user
       0.000000000 seconds sys
```

从这个输出中，你可以立刻看到：

-   ​**​CPI (Clocks Per Instruction)​**​：`instructions per cycle`是 1.30，说明每个时钟周期执行了 1.3 条指令，效率不错（越接近或大于 1 越好）。
-   ​**​ 分支预测失败率 ​**​：`branch-misses`为 5.26%，这是一个重要的性能指标，过高会影响流水线效率。
-   ​**​ 缓存未命中 ​**​：你可以通过 `-e`参数指定更多事件，例如 `perf stat -e cache-misses, cache-references, L1-dcache-load-misses <command>`来查看缓存相关的统计。

## 3. `perf top`- 实时性能监控

类似于 Linux 的 `top`命令，`perf top`是一个 ​**​ 实时动态 ​**​ 的分析工具。它会系统级或指定进程地采样，并实时显示最耗资源的函数或指令，帮助你快速发现系统级别的热点。

​**​ 基本用法：​**​

```
sudo perf top
```

​**​ 常用选项：​**​

-   `-p <pid>`：监控特定进程。
-   `-K`：隐藏内核符号，只显示用户空间的函数。
-   `-U`：隐藏用户空间符号，只显示内核函数。
-   `-g`：显示调用图（call graph）。

## 4. `perf record`+ `perf report`- 详细采样与分析

这是 `perf`最核心的用法。`record`用于对运行中的程序进行 ​**​ 数据采样并记录 ​**​ 到文件中（默认为 `perf.data`），然后使用 `report`来 ​**​ 离线、详细地分析 ​**​ 这个记录文件。

​**​ 基本流程：​**​

```
# 1. 采样 (对某个命令)
perf record -g <command>   # -g 选项记录调用栈信息，对生成火焰图至关重要

# 或者对某个正在运行的进程采样 (-p 指定PID)
perf record -g -p <PID>

# 2. 分析生成的 perf.data 文件
perf report
```

​**​`perf report`输出：​**​

它会启动一个交互式的 TUI 界面，将函数按开销从高到低排序。你可以展开查看其调用关系，精准定位到是哪个函数、甚至哪个调用路径消耗了最多的资源。

## 5. `perf script`- 生成详细脚本输出

此命令用于将 `perf record`记录的数据转换成详细的、可读的文本格式，或者供其他工具（如生成 ​**​ 火焰图 ​**​）进一步处理。

​**​ 生成火焰图：​**​

这是 `perf script`最著名的用法。

1. 使用 `perf record -g`采样。
2. 使用 `perf script > out.perf`导出数据。
3. 使用 `FlameGraph`项目中的脚本处理数据：

    ```
    ./stackcollapse-perf.pl out.perf > out.folded
    ./flamegraph.pl out.folded > out.svg
    ```

    生成的 `out.svg`就是直观的火焰图，宽度代表消耗的 CPU 时间，层次代表调用栈。

# 总结与使用场景

| 命令/用法                      | 适用场景                             | 特点                             |
| ------------------------------ | ------------------------------------ | -------------------------------- |
| ​**​`perf list`​**​            | 探索阶段，查看系统支持监控哪些事件   | 列出所有可用的性能事件           |
| ​**​`perf stat`​**​            | 快速基准测试，获取程序整体性能指标   | 宏观统计，结果直观，速度快       |
| ​**​`perf top`​**​             | 实时监控系统或进程，快速定位当前热点 | 动态实时，系统级视角             |
| ​**​`perf record/report`​**​   | 深度分析特定程序或进程，定位瓶颈函数 | 精准、详细、可离线分析，最常用   |
| ​**​`perf script`​**​ + 火焰图 | 向他人展示性能瓶颈，可视化调用路径   | 生成火焰图，直观展示性能开销分布 |

​**​ 注意事项：​**​

-   通常需要 `sudo`权限才能访问所有硬件性能计数器和内核事件。
-   在某些系统上，你可能需要先设置 `echo -1 > /proc/sys/kernel/perf_event_paranoid`来降低监控权限限制（出于安全考虑，生产环境需谨慎）。
-   某些功能需要调试符号（`-g`编译选项）才能将地址解析为有意义的函数名。

总而言之，​**​`perf`是 Linux 下进行性能分析和优化的瑞士军刀，是每一位开发者和运维人员都应该掌握的核心工具。​**​
