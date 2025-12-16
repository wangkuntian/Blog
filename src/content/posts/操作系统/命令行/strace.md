---
title: strace
published: 2025-12-11
description: ""
image: ""
tags: ["操作系统", "命令行"]
category: "操作系统"
draft: false
lang: ""
---

我们来详细讲解一下 Linux 中的 `strace`。

# 什么是 Strace？

`strace`是一个极其强大的命令行诊断和调试工具，用于 ​**​ 跟踪（Trace）一个正在运行的进程所发起的系统调用（System Calls）和接收到的信号（Signals）​**​。

简单来说，​**​ 系统调用 ​**​ 是应用程序（运行在“用户空间”）请求操作系统内核（运行在“内核空间”）为其执行特权操作的主要方式，例如读写文件、申请内存、创建进程、网络通信等。当程序打开一个文件、发送一个网络数据包或者分配内存时，它最终都会通过系统调用来完成。

因此，通过 `strace`，你可以像看“监视器”一样，清晰地看到你的程序在后台到底和操作系统进行了哪些交互。这对于以下情况非常有用：

1. ​**​ 程序调试 ​**​：当程序出现诡异错误（如“无法打开文件”、“权限不足”），但日志信息又不明确时。
2. ​**​ 性能分析 ​**​：发现程序为什么慢，是卡在哪个 IO 操作上了？（例如，频繁的磁盘读写或缓慢的网络连接）。
3. ​**​ 理解程序行为 ​**​：当你拿到一个陌生的二进制程序，想快速知道它做了什么（读了哪些配置文件，连接了哪个网络端口）。
4. ​**​ 解决依赖问题 ​**​：程序运行失败，可能是因为找不到某个动态库（`.so`文件），`strace`可以清楚地显示它尝试在哪些路径下寻找库文件。

# 如何使用 Strace？

## 1. 基本语法

`strace`的使用主要有两种形式：

​**​a) 跟踪一个新启动的进程 ​**​

```
strace [options] <command> [arguments...]
```

例如：`strace ls /home`

​**​b) 跟踪一个已经运行的进程 ​**​

```
strace -p <PID> [options]
```

例如：`strace -p 1234`会开始跟踪进程 ID 为 1234 的进程。使用 `Ctrl+C`来停止跟踪。

---

## 2. 常用选项和参数

| 选项        | 说明                                                                                                                                                               |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `-c`        | ​**​ 统计 ​**​。运行结束后，打印一个系统调用的统计摘要表，包括调用次数、耗时、错误次数等。非常适合做性能瓶颈的第一轮分析。                                         |
| `-f`        | ​**​ 跟踪子进程 ​**​。默认情况下，`strace`只跟踪目标进程本身。如果该进程会 `fork()`出子进程（例如，Apache/Nginx 的工作进程），加上这个选项可以同时跟踪所有子进程。 |
| `-e`        | ​**​ 表达式过滤 ​**​。只跟踪特定的系统调用或事件。这是最常用的选项之一。                                                                                           |
| `-o <file>` | ​**​ 将输出写入文件 ​**​。因为 `strace`的输出通常很长，将其保存到文件便于后续分析。                                                                                |
| `-s <size>` | ​**​ 设置字符串显示的最大长度 ​**​。默认只显示 32 个字符，你可能看不到完整的文件路径或网络数据。例如 `-s 1000`可以显示更长的字符串。                               |
| `-tt`       | ​**​ 打印精确的时间戳 ​**​（精确到微秒）。                                                                                                                         |
| `-T`        | ​**​ 显示每个系统调用所花费的时间 ​**​。可以看到哪个调用最耗时。                                                                                                   |
| `-y`        | ​**​ 打印文件描述符（fd）的具体路径 ​**​。非常有用，能直接告诉你 `fd=3`到底对应的是哪个文件或网络连接。                                                            |

---

## 3. 常用示例

​**​ 示例 1：基本使用，看看 `ls`命令做了什么 ​**​

```
strace ls /tmp
```

你会看到大量输出，显示了 `ls`在执行过程中发生的所有系统调用，如 `openat`, `read`, `write`, `close`等。

​**​ 示例 2：跟踪一个已运行的 Web 服务器（如 Nginx），并统计系统调用 ​**​

```
# 1. 找到 nginx worker 进程的 PID
ps aux | grep nginx

# 2. 开始跟踪并统计 (-c)
sudo strace -c -p <PID_OF_NGINX>

# 3. 此时对你的网站进行访问，模拟流量
# 4. 按 Ctrl+C 停止跟踪，你会看到一份漂亮的统计报告
```

​**​ 示例 3：跟踪 `vim`启动过程，并将输出保存到文件 ​**​

```
strace -o vim_trace.log vim
```

然后退出 `vim`，用 `less`或 `vim`查看 `vim_trace.log`文件，分析 `vim`启动时加载了哪些配置和插件。

​**​ 示例 4：只跟踪与文件操作相关的系统调用 ​**​

```
strace -e trace=open,read,write,close ls /home
```

`-e trace=`后面可以跟一个系统调用的列表，用逗号分隔。

​**​ 示例 5：跟踪网络相关的系统调用 ​**​

```
strace -e trace=connect,sendto,recvfrom curl https://www.example.com
```

​**​ 示例 6：显示详细的时间信息和文件描述符路径（非常实用！）​**​

```
strace -tt -T -y -s 1000 cat /etc/hosts
```

-   `-tt`: `15:30:01.123456 openat(...) = 3`
-   `-T`: `... = 0 <0.000123>`
-   `-y`: `... = 3</etc/hosts>`

## 4. 如何阅读输出？

`strace`的输出行通常是这样的格式：

```
系统调用(参数...) = 返回值 [错误信息（如果有）]
```

​**​ 例子分析：​**​

```
openat(AT_FDCWD, "/etc/ld.so.cache", O_RDONLY|O_CLOEXEC) = 3
```

-   ​**​ 系统调用 ​**​: `openat`
-   ​**​ 参数 ​**​: 它试图以只读（`O_RDONLY`）模式打开文件 `/etc/ld.so.cache`
-   ​**​ 返回值 ​**​: `3`（这是一个文件描述符，成功后内核返回一个正整数；失败时通常返回 `-1`）

如果失败，你会看到：

```
openat(AT_FDCWD, "/nonexistent/file", O_RDONLY) = -1 ENOENT (No such file or directory)
```

-   ​**​ 返回值 ​**​: `-1`
-   ​**​ 错误信息 ​**​: `ENOENT (No such file or directory)`— 这就是程序报错的根本原因！

# 总结

`strace`是 Linux 系统管理员和开发者的“瑞士军刀”之一。它的核心价值在于 ​**​ 将应用程序的黑盒行为变得透明 ​**​，让你能够从操作系统层面精准地定位问题。

​**​ 使用流程建议：​**​

1. 遇到问题，先尝试用 `strace`运行命令。
2. 如果输出太多，先用 `-e`过滤你关心的调用（如 `file`, `network`）。
3. 如果想看性能瓶颈，使用 `-c`或 `-T`选项。
4. 始终考虑使用 `-o`将输出保存到文件，然后用文本编辑器仔细分析。

熟练使用 `strace`会极大地提升你排查和解决 Linux 系统问题的能力。

```bash
sudo strace -f -e trace=setsockopt -s 512 -p <pid>
```

```bash
strace -ff -p $(pidof com.google.android.gms.unstable) -e trace=network,r
strace: Process 12889 attached with 39 threads
[pid 13168] connect(103, {sa_family=AF_INET6, sin6_port=htons(7810), inet_pton(AF_INET6, "::ffff:127.0.0.1", &sin6_addr), sin6_flowinfo=htonl(0), sin6_scope_id=0}, 28 <unfinished ...>
[pid 12911] read(62,  <unfinished ...>
[pid 12903] connect(104, {sa_family=AF_INET6, sin6_port=htons(7810), inet_pton(AF_INET6, "::ffff:127.0.0.1", &sin6_addr), sin6_flowinfo=htonl(0), sin6_scope_id=0}, 28 <unfinished ...>
[pid 12901] connect(5, {sa_family=AF_INET6, sin6_port=htons(6790), inet_pton(AF_INET6, "::ffff:127.0.0.1", &sin6_addr), sin6_flowinfo=htonl(0), sin6_scope_id=0}, 28 <unfinished ...>
[pid 12895] read(51,  <unfinished ...>
[pid 12901] <... connect resumed> )     = -1 ETIMEDOUT (Connection timed out)
[pid 12901] socket(AF_UNIX, SOCK_STREAM|SOCK_CLOEXEC, 0) = 105
[pid 12901] connect(105, {sa_family=AF_UNIX, sun_path="/dev/socket/fwmarkd"}, 110) = 0
[pid 12901] sendmsg(105, {msg_name=NULL, msg_namelen=0, msg_iov=[{iov_base="\6\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0", iov_len=16}, {iov_base="n\0\0\0\374\367\1\0\n\0\32\206\0\0\0\0\0\0\0\0\0\0\0\0\0\0\377\377\177\0\0\1"..., iov_len=36}], msg_iovlen=2, msg_control=[{cmsg_len=20, cmsg_level=SOL_SOCKET, cmsg_type=SCM_RIGHTS, cmsg_data=[5]}], msg_controllen=24, msg_flags=0}, 0) = 52
[pid 12901] recvfrom(105, "\0\0\0\0", 4, 0, NULL, NULL) = 4
[pid 12901] getsockname(5, {sa_family=AF_INET6, sin6_port=htons(58820), inet_pton(AF_INET6, "::", &sin6_addr), sin6_flowinfo=htonl(0), sin6_scope_id=0}, [128->28]) = 0
[pid 12901] socketpair(AF_UNIX, SOCK_STREAM, 0, [105, 106]) = 0
[pid 12901] shutdown(105, SHUT_RDWR)    = 0
[pid 12901] getsockopt(106, SOL_SOCKET, SO_DOMAIN, [1], [4]) = 0
[pid 12901] getsockopt(106, SOL_SOCKET, SO_LINGER, {l_onoff=0, l_linger=0}, [8]) = 0
[pid 12901] getsockopt(105, SOL_SOCKET, SO_DOMAIN, [1], [4]) = 0
[pid 12901] getsockopt(105, SOL_SOCKET, SO_LINGER, {l_onoff=0, l_linger=0}, [8]) = 0
[pid 12901] getsockopt(5, SOL_SOCKET, SO_DOMAIN, [1], [4]) = 0
[pid 12901] getsockopt(5, SOL_SOCKET, SO_LINGER, {l_onoff=0, l_linger=0}, [8]) = 0
[pid 12901] socket(AF_UNIX, SOCK_STREAM|SOCK_CLOEXEC, 0) = 5
[pid 12901] setsockopt(5, SOL_SOCKET, SO_REUSEADDR, [1], 4) = 0
[pid 12901] connect(5, {sa_family=AF_UNIX, sun_path="/dev/socket/dnsproxyd"}, 110) = 0
[pid 12901] write(5, "getaddrinfo localhost ^ 1024 0 1"..., 37) = 37
[pid 12901] read(5, "222\0", 4096)      = 4
[pid 12901] read(5, "\0\0\0\1\0\0\4\0\0\0\0\2\0\0\0\1\0\0\0\6\0\0\0\20\2\0\0\0\177\0\0\1"..., 4096) = 48
[pid 12901] socket(AF_INET6, SOCK_STREAM, IPPROTO_IP) = 5
[pid 12901] getsockopt(5, SOL_SOCKET, SO_DOMAIN, [10], [4]) = 0
[pid 12901] socket(AF_UNIX, SOCK_STREAM|SOCK_CLOEXEC, 0) = 105
[pid 12901] connect(105, {sa_family=AF_UNIX, sun_path="/dev/socket/fwmarkd"}, 110) = 0
[pid 12901] sendmsg(105, {msg_name=NULL, msg_namelen=0, msg_iov=[{iov_base="\7\0\0\0\0\0\0\0\377\377\377\377\t\30\0\0", iov_len=16}, {iov_base=NULL, iov_len=0}], msg_iovlen=2, msg_control=[{cmsg_len=20, cmsg_level=SOL_SOCKET, cmsg_type=SCM_RIGHTS, cmsg_data=[5]}], msg_controllen=24, msg_flags=0}, 0) = 16
[pid 12901] recvfrom(105, "\0\0\0\0", 4, 0, NULL, NULL) = 4
[pid 12901] getsockopt(5, SOL_SOCKET, SO_PROTOCOL, [6], [4]) = 0
[pid 12901] getsockopt(5, SOL_SOCKET, SO_DOMAIN, [10], [4]) = 0
[pid 12901] socket(AF_UNIX, SOCK_STREAM|SOCK_CLOEXEC, 0) = 105
[pid 12901] connect(105, {sa_family=AF_UNIX, sun_path="/dev/socket/fwmarkd"}, 110) = 0
[pid 12901] sendmsg(105, {msg_name=NULL, msg_namelen=0, msg_iov=[{iov_base="\1\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0", iov_len=16}, {iov_base="\0\0\0\0\0\0\0\0\n\0\32\207\0\0\0\0\0\0\0\0\0\0\0\0\0\0\377\377\177\0\0\1"..., iov_len=36}], msg_iovlen=2, msg_control=[{cmsg_len=20, cmsg_level=SOL_SOCKET, cmsg_type=SCM_RIGHTS, cmsg_data=[5]}], msg_controllen=24, msg_flags=0}, 0) = 52
[pid 12901] recvfrom(105, "\0\0\0\0", 4, 0, NULL, NULL) = 4
```
