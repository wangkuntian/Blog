---
title: Python之Signal
published: 2025-12-30 10:01:08
description: ''
image: ''
tags: ['Python']
category: 'Python'
draft: false
lang: ''
---

Python 中 `signal` 模块，处理**Unix/Linux 信号机制**的核心模块，功能强大且实用。

# 一、前置核心概念：什么是「信号(signal)」？

信号（signal）是 **Unix/Linux 系统中进程间通信的一种异步机制**，也是操作系统给进程发送的「事件通知」。

- 操作系统可以通过信号告知进程发生了某个事件，进程可以选择「响应/忽略/默认处理」该事件；
- 信号的触发来源多样：用户按键（如Ctrl+C）、系统异常、进程主动发送、定时触发等；
- 信号是异步的，进程无需主动轮询，信号到来时会打断进程的正常执行流程，执行对应的处理逻辑。

## ✅ 最常用的核心信号（必记）

Python的`signal`模块封装了系统的信号，所有信号都是整数常量，以下是开发中**100%会用到的核心信号**，其余信号按需了解即可：

1. `signal.SIGINT` (2)：中断信号 → **用户按下 `Ctrl + C`** 时触发，默认行为是终止当前进程；
2. `signal.SIGTERM` (15)：终止信号 → `kill 进程号` 命令默认发送的信号，**最优雅的进程终止信号**，进程可以捕获并执行「收尾逻辑」（释放资源、保存数据），默认行为是终止进程；
3. `signal.SIGKILL` (9)：强制杀死信号 → 无法被捕获、无法被忽略、无法自定义处理，**只要系统发送该信号，进程一定会立即终止**，`kill -9 进程号` 就是发送此信号；
4. `signal.SIGQUIT` (3)：退出信号 → 用户按下 `Ctrl + \` 时触发，默认行为是终止进程并生成核心转储文件；
5. `signal.SIGALRM` (14)：闹钟信号 → 调用 `signal.alarm(seconds)` 后，指定秒数到达时触发该信号，无默认处理逻辑，必须自定义捕获。

## ✅ 重要规则：不可捕获/忽略的信号

有两个信号是「上帝信号」，**任何进程都无法捕获、无法忽略、无法自定义处理函数**，操作系统强制执行：

- `SIGKILL (9)`：强制终止进程
- `SIGSTOP (19)`：暂停进程执行
> 这是系统的安全机制，防止进程通过捕获信号变成「无法杀死的僵尸进程」。

---

# 二、signal 模块的核心函数与基础用法

## 2.1 核心函数：`signal.signal(signalnum, handler)` 【重中之重】

这是 `signal` 模块**最核心的函数**，没有之一！作用是：**为指定的信号注册「自定义处理函数」**，也叫「信号绑定」。

### 参数说明

- `signalnum`：必填，要处理的信号编号，比如 `signal.SIGINT`、`signal.SIGTERM`；
- `handler`：必填，信号的「处理策略」，有3种合法传值方式：
  ① 自定义的**信号处理函数**（最常用）：信号触发时自动执行该函数；
  ② `signal.SIG_DFL`：英文全称 Default，**使用系统「默认处理逻辑」**；
  ③ `signal.SIG_IGN`：英文全称 Ignore，**忽略该信号**，信号到来后进程无任何反应。

#### 返回值

返回该信号「上一次绑定的处理策略」（可以是函数对象、`SIG_DFL`、`SIG_IGN`），可用于后续恢复信号的默认行为。

## 2.2 信号处理函数的「固定格式」【必守规则】

当我们为信号绑定**自定义处理函数**时，该函数的**参数格式是固定的，缺一不可**，Python解释器会在信号触发时，自动传入两个参数，函数定义必须匹配：

```python
def 自定义处理函数(signum, frame):
    处理逻辑
```

### 参数说明

1. `signum` (int)：触发当前处理函数的**信号编号**（比如触发Ctrl+C就是2，对应SIGINT）；
   → 作用：一个处理函数可以绑定多个信号，通过`signum`判断是哪个信号触发的，复用逻辑。
2. `frame` (frame对象)：当前程序执行的栈帧对象，记录了信号触发时的程序执行上下文；
   → 作用：一般用不到，调试时可以通过该对象查看调用栈，开发中可直接忽略该参数。

---

# 三、基础实战示例（按优先级排序，必学）

## 示例1：捕获 `Ctrl+C (SIGINT)`，实现程序「优雅退出」

默认情况下，按下`Ctrl+C`程序会直接终止，控制台抛出`KeyboardInterrupt`异常；通过捕获`SIGINT`，可以让程序收到退出指令后，先执行「收尾逻辑」再退出。

```python
import signal
import sys
import time

# 定义信号处理函数：固定参数 (signum, frame)
def sigint_handler(signum, frame):
    print(f"\n[信号处理] 捕获到信号 {signum} (SIGINT - Ctrl+C)")
    print("执行优雅退出逻辑：保存数据、释放资源、关闭连接...")
    sys.exit(0)  # 主动退出程序，退出码0表示正常退出

# 为 SIGINT 信号绑定自定义处理函数
signal.signal(signal.SIGINT, sigint_handler)

# 主程序逻辑：模拟持续运行的程序
if __name__ == "__main__":
    print("程序启动，按下 Ctrl+C 触发优雅退出...")
    count = 0
    while True:
        print(f"程序运行中，计数：{count}", end="\r")
        count += 1
        time.sleep(0.5)
```

运行效果：

```text
程序启动，按下 Ctrl+C 触发优雅退出...
程序运行中，计数：23
[信号处理] 捕获到信号 2 (SIGINT - Ctrl+C)
执行优雅退出逻辑：保存数据、释放资源、关闭连接...
```

## 示例2：忽略 `Ctrl+C (SIGINT)`，让程序无法被快捷键终止

通过给信号绑定 `signal.SIG_IGN`，可以**忽略指定信号**，最典型的场景就是忽略`SIGINT`，让`Ctrl+C`失效。

```python
import signal
import time

# 为 SIGINT 绑定「忽略」策略
signal.signal(signal.SIGINT, signal.SIG_IGN)

print("程序启动，Ctrl+C 已被忽略，无法通过快捷键终止！")
print("请使用 kill 命令 或 Ctrl+\ 终止程序")

count = 0
while True:
    print(f"程序运行中，计数：{count}", end="\r")
    count += 1
    time.sleep(0.5)
```

运行效果：按下`Ctrl+C`后，程序毫无反应，不会终止，只能通过`kill 进程号`或`Ctrl+\`终止。

## 示例3：恢复信号的「默认处理逻辑」

如果之前为信号绑定了自定义函数/忽略策略，想要恢复系统默认行为，只需重新绑定 `signal.SIG_DFL` 即可。

```python
import signal
import time

# 第一步：自定义处理函数
def sigint_handler(signum, frame):
    print(f"\n捕获到 Ctrl+C，但暂时不退出")

# 绑定自定义处理函数
signal.signal(signal.SIGINT, sigint_handler)
print("阶段1：Ctrl+C 被捕获，不会退出程序，倒计时5秒后恢复默认行为...")

count = 0
while count < 5:
    print(f"倒计时：{5 - count} 秒", end="\r")
    count += 1
    time.sleep(1)

# 第二步：恢复 SIGINT 的默认处理逻辑
signal.signal(signal.SIGINT, signal.SIG_DFL)
print("\n阶段2：已恢复 Ctrl+C 默认行为，按下 Ctrl+C 会直接终止程序")

while True:
    time.sleep(1)
```

运行效果：前5秒按下`Ctrl+C`只会打印提示，不会退出；5秒后恢复默认，按下`Ctrl+C`程序立即终止。

## 示例4：捕获 `SIGTERM`，实现进程的优雅终止（生产环境必用）

生产环境中，我们不会用`Ctrl+C`终止服务，而是用`kill 进程号`命令，该命令默认发送`SIGTERM (15)`信号。
捕获`SIGTERM`是**生产环境服务的标配**，可以在进程被终止前执行「保存配置、关闭数据库连接、释放句柄、记录日志」等收尾工作，这是「优雅终止」的核心实现。

```python
import signal
import sys
import time

# 统一处理 退出信号：SIGINT(Ctrl+C) + SIGTERM(kill默认信号)
def graceful_exit(signum, frame):
    signame = signal.Signals(signum).name  # 根据信号编号获取信号名称
    print(f"\n捕获到退出信号：{signame} ({signum})")
    print("【生产环境】执行收尾逻辑：")
    print("1. 关闭数据库连接")
    print("2. 保存当前运行状态到日志")
    print("3. 释放网络端口资源")
    print("4. 刷新缓冲区数据到磁盘")
    sys.exit(0)

# 为两个核心退出信号绑定同一个处理函数
signal.signal(signal.SIGINT, graceful_exit)
signal.signal(signal.SIGTERM, graceful_exit)

print("服务启动成功，进程号：", __import__('os').getpid())
print("终止方式：1. Ctrl+C  2. kill 进程号")

# 模拟服务持续运行
while True:
    time.sleep(1)
```

运行测试：

1. 运行程序，记录进程号；
2. 另开终端执行 `kill 进程号`，程序会捕获`SIGTERM`并执行收尾逻辑后退出；
3. 按下`Ctrl+C`，程序也会执行相同的收尾逻辑，实现「统一退出逻辑」。

---

# 四、高阶常用函数：`signal.alarm(seconds)` 定时触发信号

## 4.1 函数作用

`signal.alarm(seconds)` 是 `signal` 模块中**第二常用的核心函数**，作用是：
> 告诉操作系统，在 `seconds` 秒后，给当前进程发送一个 `signal.SIGALRM` 闹钟信号。

## 4.2 关键特性

1. `seconds` 传**正整数**：设置定时，比如 `signal.alarm(5)` 表示5秒后触发`SIGALRM`；
2. `seconds` 传**0**：取消当前已设置的所有闹钟定时；
3. 进程中**同一时间只能有一个闹钟生效**：如果重复调用`signal.alarm(n)`，会覆盖上一次的定时，重新计时；
4. `SIGALRM` 信号**没有默认处理逻辑**，如果不自定义捕获，该信号到来后进程无任何反应。

## 4.3 实战示例：实现「函数超时控制」（经典场景）

`signal.alarm()` 的**最经典用途**是实现「Python函数的超时控制」，比如调用一个第三方接口/执行一个耗时操作时，希望超过指定时间就终止并抛出异常，避免程序卡死。

```python
import signal
import time

# 定义超时异常
class TimeoutError(Exception):
    pass

# 定义SIGALRM的处理函数：触发时抛出超时异常
def timeout_handler(signum, frame):
    raise TimeoutError("函数执行超时！")

# 为SIGALRM绑定处理函数
signal.signal(signal.SIGALRM, timeout_handler)

# 待执行的函数：模拟耗时操作
def long_time_task(duration):
    print(f"开始执行耗时任务，预计{duration}秒...")
    time.sleep(duration)
    print("任务执行完成！")
    return "执行结果"

# 主逻辑：设置3秒超时
if __name__ == "__main__":
    try:
        signal.alarm(3)  # 设置3秒后触发闹钟信号
        result = long_time_task(5)  # 任务需要5秒，超过超时时间
    except TimeoutError as e:
        print(f"捕获超时异常：{e}")
    finally:
        signal.alarm(0)  # 取消闹钟（无论是否超时，都要取消，避免后续误触发）
```

运行效果：程序会在3秒后抛出`TimeoutError`，终止耗时任务，不会等待5秒，完美实现超时控制！

---

# 五、跨平台兼容性：Windows 系统的限制（重中之重）

## ✅ 核心结论：`signal` 模块是「Unix/Linux 优先」的模块，**Windows 系统支持极差**！

Python是跨平台的，但`signal`模块的底层依赖**Unix/Linux的信号机制**，Windows系统对信号的支持非常有限，这是**系统层面的限制**，不是Python的问题，必须牢记以下规则，避免踩坑：

1. Windows 系统中，`signal` 模块**仅支持两个信号**：`signal.SIGINT (Ctrl+C)` 和 `signal.SIGBREAK (Ctrl+Pause/Break)`，其余所有信号（如SIGTERM、SIGALRM、SIGKILL）均**无效**；
2. Windows 中**没有 `signal.alarm()` 函数**，调用该函数会直接抛出 `AttributeError` 异常；
3. Windows 中，`kill 进程号` 命令的行为和Linux不同，无法发送`SIGTERM`信号，本质是强制终止进程；
4. 所有「不可捕获的信号」规则，仅在Unix/Linux生效。

## ✅ 兼容写法建议

如果你的代码需要在**Windows + Linux/Mac** 跨平台运行，建议通过条件判断处理信号逻辑：

```python
import signal
import sys

# 判断是否为Unix/Linux/Mac系统
IS_UNIX = sys.platform in ("linux", "darwin")

if IS_UNIX:
    # Unix系统：正常使用signal模块的所有功能
    signal.signal(signal.SIGTERM, graceful_exit)
    signal.alarm(5)
else:
    # Windows系统：仅处理SIGINT
    signal.signal(signal.SIGINT, graceful_exit)
```

---

# 六、使用 signal 模块的「必知注意事项」（避坑指南）

## ✅ 注意1：信号处理函数「必须简洁」

信号是**异步触发**的，会打断程序的正常执行流程，因此信号处理函数的逻辑要**尽可能简单、无阻塞、无耗时操作**：

- 禁止在处理函数中执行 `time.sleep()`、网络请求、文件读写、数据库操作等耗时操作；
- 处理函数的核心职责：标记退出状态、触发收尾逻辑、抛出异常，复杂逻辑应放在主程序中判断执行。

## ✅ 注意2：Python的「线程信号限制」

**Python的信号机制，仅在「主线程」中生效**！这是一个非常重要的规则：

1. 子线程中**无法注册信号处理函数**：调用`signal.signal()`会抛出异常；
2. 操作系统发送的信号，**只会被主线程捕获**，子线程无法感知信号；
3. 所有信号的处理逻辑，都会在**主线程**中执行，即使信号触发时子线程正在运行。

## ✅ 注意3：信号的「重复触发」问题

如果一个信号正在处理中，此时又触发了同一个信号，**新的信号会被阻塞**，直到当前处理函数执行完毕，才会处理下一个信号。

## ✅ 注意4：`SIGKILL` 永远生效

无论你写了多么复杂的信号处理逻辑，只要执行 `kill -9 进程号`，进程一定会立即终止，这是系统强制的，无法规避。

---

# 七、完整综合实战案例（整合所有核心知识点）

下面是一个生产环境级别的完整示例，整合了「捕获退出信号」「优雅收尾」「超时控制」「跨平台兼容」所有核心知识点，可直接复用：

```python
import signal
import sys
import time
import os

# 定义全局退出标记
EXIT_FLAG = False

# 跨平台判断
IS_UNIX = sys.platform in ("linux", "darwin")

# 自定义超时异常
class TimeoutError(Exception):
    pass

# 1. 超时处理函数
def timeout_handler(signum, frame):
    raise TimeoutError("操作超时，强制终止！")

# 2. 优雅退出处理函数（处理SIGINT/SIGTERM）
def graceful_exit(signum, frame):
    global EXIT_FLAG
    if EXIT_FLAG:
        # 防止重复触发退出
        return
    EXIT_FLAG = True
    signame = signal.Signals(signum).name if IS_UNIX else "SIGINT"
    print(f"\n\n===== 捕获退出信号：{signame} ({signum}) =====")
    print("【收尾逻辑开始】")
    print(f"1. 释放资源：关闭数据库连接、网络端口")
    print(f"2. 保存运行日志：进程退出时间 {time.strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"3. 刷新缓冲区数据到磁盘")
    print("【收尾逻辑结束】程序即将退出...")
    sys.exit(0)

# 3. 注册信号处理函数
def register_signals():
    # 绑定退出信号
    signal.signal(signal.SIGINT, graceful_exit)
    if IS_UNIX:
        signal.signal(signal.SIGTERM, graceful_exit)
        signal.signal(signal.SIGALRM, timeout_handler)
    print(f"信号注册完成，进程号：{os.getpid()}")
    print(f"支持的退出方式：{'Ctrl+C / kill 进程号 / kill -9 进程号' if IS_UNIX else 'Ctrl+C'}")

# 4. 模拟业务逻辑（带超时控制）
def business_task():
    task_duration = 6
    timeout_seconds = 3
    print(f"\n开始执行业务任务，预计耗时 {task_duration} 秒，超时阈值 {timeout_seconds} 秒")
    try:
        if IS_UNIX:
            signal.alarm(timeout_seconds)
        time.sleep(task_duration)
        print("业务任务执行完成！")
    except TimeoutError as e:
        print(f"业务任务异常：{e}")
    finally:
        if IS_UNIX:
            signal.alarm(0)

# 主程序入口
if __name__ == "__main__":
    register_signals()
    business_task()
    # 持续运行
    while not EXIT_FLAG:
        time.sleep(1)
```

---

# 总结（核心知识点速记）

1. 信号是Unix/Linux的**异步进程间通信机制**，`signal`模块是Python的封装，Windows支持极差；
2. 核心函数：`signal.signal(信号, 处理策略)` 绑定信号，`signal.alarm(秒数)` 设置定时闹钟信号；
3. 核心信号：`SIGINT(Ctrl+C)`、`SIGTERM(优雅终止)`、`SIGKILL(强制终止，不可捕获)`、`SIGALRM(定时)`；
4. 处理函数格式固定：`handler(signum, frame)`，参数缺一不可；
5. 处理策略三选一：自定义函数 / `SIG_DFL`(默认) / `SIG_IGN`(忽略)；
6. 生产环境必做：捕获`SIGINT+SIGTERM`实现优雅退出，捕获`SIGALRM`实现超时控制；
7. 核心限制：信号仅主线程生效，处理函数要简洁，`SIGKILL/SIGSTOP`不可捕获。

以上就是`signal`模块的全部核心内容，掌握这些知识点足以应对Python开发中所有的信号处理场景！
