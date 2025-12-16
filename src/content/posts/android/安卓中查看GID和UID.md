---
title: 安卓中查看GID和UID
published: 2025-12-12
description: ""
image: ""
tags: ["Android"]
category: "Android"
draft: false
lang: ""
---

在 Android 中查看 ​**​GID（Group ID）​**​ 和 ​**​UID（User ID）​**​ 有几种方法，主要取决于你的具体需求（查看当前应用的还是其他应用的）以及你对设备的访问权限（是否需要 root）。以下是最常用的几种方法：

# 📌 核心方法：使用 ADB（Android Debug Bridge - 首选）

这是最可靠且无需 root 的方法（但需要启用 USB 调试）。它主要用于获取当前 ​**​ 前台活动应用 ​**​ 或其所属进程的 UID/GID。

1. ​**​ 在设备上启用 USB 调试 ​**​：
    - 进入 `设置` > `关于手机` > 多次点击 `版本号` 直到看到 "您现在是开发者" 的提示。
    - 返回 `设置` > `系统` > `开发者选项` > 找到并启用 `USB 调试`。
2. ​**​ 在电脑上安装 ADB​**​：从 [Android SDK 平台工具](https://developer.android.com/tools/releases/platform-tools) 页面下载并解压。确保 `adb` 命令在系统的 PATH 中，或者进入解压目录运行。
3. ​**​ 连接设备到电脑 ​**​：使用 USB 数据线连接。设备上会弹出 `允许 USB 调试吗？` 的提示，勾选 `一律允许` 然后点击 `允许`。
4. ​**​ 在终端或命令提示符中运行 ADB 命令 ​**​：

    - ​**​ 查看当前前台应用的 UID/GID 等：​**​
        ```
        adb shell dumpsys activity top | grep userId
        ```
        - 在输出中寻找类似 `userId=10123` 的行。这个 `10123` 就是 ​**​ 该应用所属用户的 UID​**​。应用的主要 GID 通常与 UID 相同。
    - ​**​ 查看特定应用包的 UID（安装时分配）​**​：
        ```
        adb shell pm list packages -U | grep your.app.package.name
        ```
        - 将 `your.app.package.name` 替换为目标应用的实际包名（例如 `com.whatsapp`）。输出格式为 `package:your.app.package.name uid:10123`。这里的 `10123` 就是应用安装时分配的用户范围的 UID。
    - ​**​ 查看进程的 UID/GID（最详细）​**​:

        1. 先找到目标应用的进程 ID (PID)：

            ```
            adb shell ps -A | grep your.app.package.name
            ```

            （或者使用 `adb shell pidof your.app.package.name` 如果设备支持 `pidof`）

        2. 假设找到的 PID 是 `12345`，然后查看该进程的状态文件：

            ```
            adb shell cat /proc/12345/status
            ```

        - 在输出中，找到 `Uid:` 和 `Gid:` 这两行。例如：
            ```
            Uid:  10123  10123  10123  10123
            Gid:  10123  10123  10123  10123
            Groups: 3003 9997 50023 ... (很多数字)
            ```
        - ​**​ 解释 ​**​：
            - `Uid:` 后面的四个数字分别代表：Real UID、Effective UID、Saved set UID、Filesystem UID（在 Android 应用进程中，通常这四个值都一样，代表应用用户 UID）。
            - `Gid:` 后面的四个数字同样代表不同的 GID（与 UID 解释类似，通常也都相同，代表应用的主要 GID）。
            - `Groups:` 列出了该进程所属的所有 ​**​ 补充组（Supplementary Groups）​**​ 的 GID。这是进程除了主要 GID 外还具有的其他组权限。这些 GID 对应着 Android 中定义的权限组（如 `inet`, `sdcard_rw`, `bluetooth` 等）。

# 🔑 在拥有 Root 权限的终端中查看（需要 Root）

如果你已经 root 了设备或者使用具有 root 权限的终端模拟器应用（如 Termux + `tsu` 或 Magisk 的终端），你可以直接在设备上使用一些强大的 Linux 命令。

1. ​**​ 查看所有进程的 UID/GID​**​：

    ```
    su -c 'ps -A -o pid,uid,gid,comm'
    ```

    - `-A`：显示所有进程。
    - `-o pid,uid,gid,comm`：自定义输出列（PID, UID, GID, 命令名）。
    - 找到你要的应用进程名或包名片段，对应的 `uid` 和 `gid` 列就是你要的值。补充组信息仍然需要用 `/proc/[pid]/status` 查看。

2. ​**​ 查看特定进程的 `/proc/[pid]/status` 文件 ​**​：

    ```
    su
    cat /proc/[pid]/status
    ```

    - 替换 `[pid]` 为实际进程 ID。输出解释同上文 ADB 方法中的 `/proc/[pid]/status`。

# 📱 使用终端模拟器应用查看（权限受限）

在非 root 设备上使用如 `Termux` 等终端模拟器：

1. ​**​ 查看当前 Shell/应用的 UID 和 GID​**​：

    ```
    id
    ```

    - 这会输出类似 `uid=10123(u0_a123) gid=10123(u0_a123) groups=10123(u0_a123), ...` 的信息。
    - `uid` 和 `gid` 就是你 ​**​ 当前使用的这个终端应用自身 ​**​ 的用户 UID 和主要 GID。
    - `groups` 列出了补充组（通常受限）。
    - ​**​ 重要限制 ​**​：普通应用无法直接访问其他应用的进程信息（PID）或 `/proc/` 下其他进程的文件。因此，此方法*只能查看自身（Termux 应用）的 UID/GID*。

# 🗂 其他方法：查看应用数据目录权限（间接）

应用的私有数据目录路径通常是 `/data/data/your.app.package.name` 或 `/data/user/[user_id]/your.app.package.name`。

-   在拥有 root 权限的文件管理器（如 Solid Explorer、Root Explorer）或 `adb shell` (可能需要 `su`) 中：
    ```
    su
    ls -ld /data/data/your.app.package.name
    ```
    -   输出类似于：`drwx------ 7 u0_a123 u0_a123 ...`
    -   第三列 `u0_a123` 表示目录的 ​**​ 属主用户 ​**​（即该应用的用户名），第四列 `u0_a123` 表示目录的 ​**​ 属组 ​**​（即该应用的主要组）。
    -   `u0_a123` 是一个可读格式，对应数字 UID/GID `10123`。Android 应用用户的命名规则通常是 `u<user_id>_a<app_id>`。数字 UID 的计算公式是： `UID = USER_ID * 100000 + (APP_ID % 100000)`。通常 `APP_ID` 就是 UID 的后几位（如 `10123` 的 `APP_ID` 部分就是 `123`）。

# 📖 总结一下

1. ​**​ 对于开发者和不需要 root 的情况 ​**​：​**​ADB​**​ 是最佳选择（特别是 `dumpsys activity top`, `pm list packages -U` 和查看 `/proc/[pid]/status`）。
2. ​**​ 对于已 root 设备 ​**​：在 ​**​Terminal（带 `su`）​**​ 中使用 `ps` 和直接 `cat /proc/[pid]/status` 最直接、信息最全。
3. ​**​ 只想快速查看当前应用的 UID​**​：`ADB shell dumpsys activity top | grep userId` 最快。
4. ​**​ 查看自身应用的 UID（非 root）​**​：在 ​**​Termux​**​ 等终端模拟器中运行 `id`。

# 📎 关键概念说明

-   ​**​UID​**​：在 Android（基于 Linux）中，每个进程运行时会关联一个用户标识符（UID）。每个应用在安装时会被分配一个 ​**​ 唯一的、应用级别的用户 ID​**​（在设备的那个用户空间内唯一）。相同签名且设置了 `sharedUserId` 的应用才会共享 UID。
-   ​**​GID​**​：类似 UID，是组标识符。应用的主 GID 通常与其 UID 相同，形成一个专用的应用用户组。
-   ​**​ 补充组（Supplementary Groups）​**​：进程可以属于多个组，这些额外的组就是补充组。它们决定了进程除了拥有自己主组的权限外，还能获得哪些系统定义的权限（如 `sdcard_rw` 对应访问外部存储的权限）。这些 GID 在 `/proc/[pid]/status` 的 `Groups:` 行列出。
