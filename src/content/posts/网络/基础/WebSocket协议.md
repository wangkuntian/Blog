---
title: WebSocket协议
published: 2026-01-09 16:08:21
description: 'WebSocket协议'
image: ''
tags: ['网络']
category: '网络'
draft: false
lang: ''
---

WebSocket是一种在单个TCP连接上进行**全双工通信**的协议，允许客户端和服务器之间进行**双向实时数据传输**。下面从多个方面详细说明其原理和工作机制：

---

# 1. 建立连接（握手阶段）

WebSocket连接通过HTTP协议发起，然后**升级**为WebSocket协议。

## 1.1 客户端发起握手请求

客户端发送一个HTTP请求，包含以下关键头部：

```http
GET /chat HTTP/1.1
Host: server.example.com
Upgrade: websocket
Connection: Upgrade
Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==  // 随机16字节Base64编码
Sec-WebSocket-Version: 13
Origin: http://example.com
```

## 1.2 服务器响应握手

服务器验证请求后返回：

```http
HTTP/1.1 101 Switching Protocols
Upgrade: websocket
Connection: Upgrade
Sec-WebSocket-Accept: s3pPLMBiTxaQ9kYGzzhZRbK+xOo=  // 密钥验证
```

- **状态码101**表示协议切换成功。
- `Sec-WebSocket-Accept`是根据客户端密钥计算得出的（`base64(sha1(Sec-WebSocket-Key + "258EAFA5-E914-47DA-95CA-C5AB0DC85B11"))`）。

## 1.3 连接升级

握手完成后，TCP连接保持打开状态，但通信协议从HTTP切换为WebSocket帧格式。

---

# 2. 数据传输机制

连接建立后，所有数据通过**帧（Frame）** 的形式传输。

## 2.1 数据帧结构

```text
 0                   1                   2                   3
 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1
+-+-+-+-+-------+-+-------------+-------------------------------+
|F|R|R|R| opcode|M| Payload len |    Extended payload length    |
|I|S|S|S|  (4)  |A|     (7)     |             (16/64)           |
|N|V|V|V|       |S|             |   (if payload len==126/127)   |
| |1|2|3|       |K|             |                               |
+-+-+-+-+-------+-+-------------+ - - - - - - - - - - - - - - - +
|     Extended payload length continued, if payload len == 127  |
+ - - - - - - - - - - - - - - - +-------------------------------+
|                     Payload Data continued ...                |
+---------------------------------------------------------------+
```

- **FIN**：标志是否为消息的最后一帧。
- **Opcode**：帧类型（1=文本，2=二进制，8=关闭连接，9=Ping，10=Pong）。
- **Mask**：客户端到服务器的帧必须掩码处理（安全原因）。
- **Payload length**：数据长度（扩展长度支持大消息）。

## 2.2. 掩码机制

- 客户端发送的帧使用4字节掩码（Masking-key）对Payload Data进行XOR加密。
- 服务器发送的帧无需掩码。
- 目的：防止缓存污染攻击。

## 2.3 消息分片

- 大消息可拆分为多个帧（FIN=0表示未完，FIN=1表示结束）。
- 控制帧（如Ping/Pong）不能分片。

## 2.4 心跳保活

- **Ping帧**（opcode=9）：服务器/客户端可发送，携带可选数据。
- **Pong帧**（opcode=10）：必须回复相同数据。
- 作用：检测连接活性、维持NAT映射。

---

# 3. 断开连接

## 3.1 关闭握手

任一方发送**关闭帧**（opcode=8）：

- 可包含关闭原因（状态码+字符串）。
- 接收方必须回复关闭帧。
- 状态码示例：
  - 1000：正常关闭
  - 1001：端点离开
  - 1002：协议错误

## 3. TCP连接释放

双方完成关闭帧交换后，底层TCP连接才真正关闭。

---

# 4. 关键特性

1. **低延迟**：无需HTTP头部开销，帧结构轻量。
2. **全双工**：独立双向通信通道。
3. **基于TCP**：依赖TCP的可靠性，但自身提供轻量协议层。
4. **支持扩展**：如`permessage-deflate`压缩扩展。

---

# 5. 与HTTP对比

| **特性**       | **HTTP**          | **WebSocket**          |
|----------------|-------------------|------------------------|
| 通信模式       | 半双工（请求-响应）| 全双工                |
| 头部开销       | 每次请求携带完整头部 | 初始握手后仅帧头     |
| 连接生命周期   | 短连接（默认）     | 长连接                |
| 数据推送       | 需轮询/SSE        | 服务器可主动推送      |

---

# 6. 安全机制

1. **同源策略**：通过`Origin`头部防止跨站劫持。
2. **掩码加密**：客户端帧掩码防止恶意脚本。
3. **TLS支持**：`wss://`使用TLS加密传输。

---

# 7. 典型应用场景

- 实时聊天/协作工具
- 在线游戏
- 股票行情推送
- 物联网设备控制

---

通过以上机制，WebSocket在保持TCP可靠性的同时，实现了低开销、低延迟的双向实时通信，成为现代Web应用实时交互的核心技术之一。
