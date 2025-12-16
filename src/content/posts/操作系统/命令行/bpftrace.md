---
title: bpftrace
published: 2025-12-11
description: ""
image: ""
tags: ["操作系统", "命令行"]
category: "操作系统"
draft: false
lang: ""
---

好的，我们来深入探讨一下 Linux 中的 `bpftrace`。

# 什么是 bpftrace？

​**​bpftrace​**​ 是一个基于 ​**​eBPF​**​（Extended Berkeley Packet Filter）技术的 ​**​ 高级跟踪工具 ​**​，专为 Linux 系统设计。它被誉为 Linux 系统分析的“超级武器”。

你可以把它理解为：

-   ​**​ 一个强大的动态跟踪框架 ​**​：允许你在生产环境中，无需修改代码或重启服务，即可实时深入洞察系统和应用程序的内核态与用户态行为。
-   ​**​ 一个专为 tracing 设计的语言 ​**​：它提供了一种简洁、易读的领域特定语言（DSL），让你用简单的单行命令或短脚本就能完成极其复杂的跟踪任务。
-   ​**​eBPF 的前端 ​**​：它封装了 eBPF 的复杂性，让你无需编写复杂的 C 代码和手动管理 eBPF 程序，就能享受到 eBPF 的所有强大功能。

​**​ 它与 perf 的关系：​**​

-   ​**​ 互补 ​**​：`perf`更擅长 ​**​ 采样 ​**​（Sampling）和提供系统级的 ​**​ 性能计数器 ​**​ 概览。
-   ​**​ 进阶 ​**​：`bpftrace`更擅长 ​**​ 事件跟踪 ​**​（Tracing），即基于特定的内核事件或用户空间事件（如函数调用、系统调用）进行触发和精细分析。

简单来说，`perf`告诉你 _“哪个函数最耗 CPU”_，而 `bpftrace`可以告诉你 _“每次调用 `read`系统调用时，是谁调用的、参数是什么、返回值是多少”_。

# 核心概念与工作原理

1. ​**​ 事件源（Probes）​**​：bpftrace 脚本被附加到“探测点”上。这些探测点可以是：

    - ​**​ 内核态 ​**​：`kprobe`（内核函数入口）、`kretprobe`（内核函数返回）、`tracepoint`（内核静态跟踪点，更稳定）、`uprobe`（用户空间函数入口）、`uretprobe`（用户空间函数返回）。
    - ​**​ 硬件 ​**​：`hardware`（硬件性能计数器）。
    - ​**​ 软件 ​**​：`software`（软件事件，如页面错误）。
    - ​**​ 间隔 ​**​：`interval`（按时间间隔触发）。

2. ​**​ 动作（Action）​**​：当探测点被命中时，执行的动作。最常见的动作是 `printf`打印信息，也可以是 `@count[args] = count()`这样的聚合操作。
3. ​**​ 过滤（Filter）​**​：可以对事件附加条件，只有满足条件时才执行动作，极大降低开销。例如 `/@pid == 1234/ { ... }`。
4. ​**​ 聚合（Aggregation）​**​：bpftrace 内置了强大的聚合功能，可以在内核中直接对数据进行统计（如计数、求平均值、构造频率分布图），然后只将统计结果发送到用户空间，这使其效率极高。

# 安装 bpftrace

在大多数主流 Linux 发行版中，都可以通过包管理器安装：

```
# Ubuntu/Debian
sudo apt install bpftrace

# Fedora/CentOS/RHEL
sudo dnf install bpftrace

# Arch Linux
sudo pacman -S bpftrace
```

安装后，可以通过 `sudo bpftrace -V`检查版本，并通过 `sudo bpftrace -l`查看所有可用的探测点。

---

# 主要用法和示例

bpftrace 的用法主要分为两类：​**​ 单行命令 ​**​ 和 ​**​ 脚本文件 ​**​。

## 1. 单行命令（One-Liners）

这是 bpftrace 最强大和常用的特性之一，可以快速解决特定问题。

​**​a. 按进程统计系统调用 ​**​

```
# 统计系统中所有进程发生的系统调用次数，每秒输出一次
sudo bpftrace -e 'tracepoint:raw_syscalls:sys_enter { @[comm] = count(); } interval:s:1 { print(@); clear(@); }'
```

​**​b. 跟踪 `openat`系统调用（查看文件打开）​**​

```
# 显示所有进程打开的文件名
sudo bpftrace -e 'tracepoint:syscalls:sys_enter_openat { printf("%s -> %s\n", comm, str(args->filename)); }'
```

​**​c. 跟踪块设备 I/O 大小分布 ​**​

```
# 显示块设备I/O请求大小的直方图
sudo bpftrace -e 'tracepoint:block:block_rq_issue { @ = hist(args->bytes); }'
```

​**​d. 跟踪内核函数调用的延迟（函数执行时间）​**​

```
# 跟踪 vfs_read 函数的执行时间分布
sudo bpftrace -e 'kprobe:vfs_read { @start[tid] = nsecs; } kretprobe:vfs_read /@start[tid]/ { @ns = hist(nsecs - @start[tid]); delete(@start[tid]); }'
```

​**​e. 跟踪 TCP 连接状态变化（非常有用！）​**​

```
# 跟踪TCP状态变化，显示主机和端口
sudo bpftrace -e 'tracepoint:tcp:tcp_set_state { printf("%s -> %s:%d => %s:%d state: %s\n", comm, args->saddr, args->sport, args->daddr, args->dport, args->newstate); }'
```

## 2. 脚本文件（.bt Files）

对于复杂的逻辑，可以编写 `.bt`文件。

​**​ 示例：`tcpaccept.bt`​**​

这是一个 bpftrace 自带的工具脚本，用于跟踪接受的 TCP 连接。

```
#!/usr/bin/env bpftrace

tracepoint:syscalls:sys_enter_accept*,
tracepoint:syscalls:sys_enter_accept4*
{
    @fd[pid] = args->fd;
}

tracepoint:syscalls:sys_exit_accept*,
tracepoint:syscalls:sys_exit_accept4*
/@fd[pid]/
{
    $fd = @fd[pid];
    $retval = args->ret;
    if ($retval >= 0) {
        @sock[pid] = $retval;
    }
    delete(@fd[pid]);
}

...

// 运行脚本
sudo bpftrace /usr/share/bpftrace/tools/tcpaccept.bt
```

bpftrace 安装后自带了许多这样的实用工具脚本，位于 `/usr/share/bpftrace/tools/`目录下，它们是学习 bpftrace 的绝佳范例。

---

## 常用工具脚本

bpftrace 社区提供了大量开箱即用的工具脚本，功能极其强大：

| 脚本名                  | 功能描述                                                         |
| ----------------------- | ---------------------------------------------------------------- |
| ​**​`biolatency.bt`​**​ | 统计块设备 I/O 延迟的直方图                                      |
| ​**​`biosnoop.bt`​**​   | 实时跟踪块设备 I/O，显示延迟、进程、大小等信息（类似 `iosnoop`） |
| ​**​`execsnoop.bt`​**​  | 跟踪新进程的执行（用于排查短时进程）                             |
| ​**​`opensnoop.bt`​**​  | 跟踪 `open`系统调用，显示哪些进程在打开哪些文件                  |
| ​**​`tcptop.bt`​**​     | 按进程实时显示 TCP 流量（发送/接收的字节数）                     |
| ​**​`pidpersec.bt`​**​  | 统计每秒创建的新进程数量                                         |
| ​**​`vfsstat.bt`​**​    | 统计 VFS（虚拟文件系统）的读写操作次数                           |
| ​**​`capable.bt`​**​    | 跟踪内核中所有权限检查（capability）事件                         |

你可以直接运行它们，例如：

```
sudo bpftrace /usr/share/bpftrace/tools/execsnoop.bt
```

---

# 总结

​**​bpftrace 的核心优势：​**​

1. ​**​ 强大 ​**​：得益于 eBPF，几乎可以跟踪系统和应用的任何角落。
2. ​**​ 高效 ​**​：聚合操作在内核中完成，极大减少了用户空间的数据传输开销。
3. ​**​ 安全 ​**​：eBPF 程序必须通过内核验证器的检查，确保不会导致系统崩溃。
4. ​**​ 易用 ​**​：简洁的 DSL 语言让编写跟踪脚本变得非常简单，远胜于直接使用 eBPF C 代码。

​**​ 适用场景：​**​

-   ​**​ 性能分析 ​**​：分析函数延迟、I/O 性能、调度问题等。
-   ​**​ 故障排查 ​**​：调查文件无法打开、连接失败、权限问题、短时进程等。
-   ​**​ 安全监控 ​**​：跟踪敏感系统调用（如 `execve`, `connect`）。
-   ​**​ 教学学习 ​**​：动态地观察操作系统和应用程序的运行行为。

总而言之，​**​bpftrace 是现代 Linux 系统工程师和性能分析师工具箱中不可或缺的利器 ​**​，它将 eBPF 的强大能力以一种极其友好的方式交付给了所有用户。当你需要深入系统内部进行 ​**​ 动态跟踪和调试 ​**​ 时，bpftrace 几乎总是最佳选择。

```bash
sudo bpftrace -e '
tracepoint:syscalls:sys_enter_setsockopt
{
    if (args->level == 1 && args->optname == 36) {
        printf("PID %d (%s) set SO_MARK at %p\n", pid, comm, args->optval);
    }
}'
```
