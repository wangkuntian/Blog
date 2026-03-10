---
title: MinIO浏览器直连上传问题分析
published: 2026-03-10 16:52:51
description: 'S3/MinIO浏览器直连上传问题分析'
image: ''
tags: []
category: '存储'
draft: false
lang: ''
---

# 1. 问题现象

- 前端使用 `@aws-sdk/client-s3` + `@aws-sdk/lib-storage`（`Upload`）在浏览器中直连 MinIO 进行 S3 兼容上传。
- 当 **桶配额未满** 时：
  - macOS 浏览器上传正常；
  - Windows 浏览器上传正常。
- 当 **桶配额已满** 时：
  - **macOS 浏览器**：上传失败，前端可以拿到明确的 S3/MinIO 业务错误，例如 `Bucket quota exceeded`，日志中 HTTP 响应为 `400 Bad Request`，XML 中包含：
    - `<Code>XMinioAdminBucketQuotaExceeded</Code>`
    - `<Message>Bucket quota exceeded</Message>`
  - **Windows 浏览器（Edge/Chrome）**：上传失败，但前端拿到的错误是：
    - JS 层抛出 `TypeError: Failed to fetch`
    - DevTools Network 面板中，多条 `fetch` 请求状态为 `(failed) net::ERR_CONNECTION_RESET`，Size 为 `0 B`，看不到 HTTP 状态码和响应体。

---

# 2. 关键日志与行为

## 2.1 MinIO 服务端日志（macOS、Windows 都一致）

- 可以看到 `NewMultipartUpload`、`PutObjectPart` 等请求：
  - `NewMultipartUpload`：`200 OK`
  - `PutObjectPart`：当配额已满时，多次返回 `400 Bad Request`，响应体为 S3 错误 XML，`Message` 为 `Bucket quota exceeded`。
- 响应头中包含：
  - `Access-Control-Allow-Origin: http://10.10.0.2:5174`
  - `Access-Control-Expose-Headers: ...`
  - 说明 **MinIO 已经正确处理了 CORS，并返回了可在浏览器中读取的错误响应**。

## 2.2 Windows 浏览器 Network 面板

- 失败的 `fetch` 请求状态行类似：
  - `(failed) net::ERR_CONNECTION_RESET`
- 对应条目的：
  - **Status 为空**
  - **Size 为 0 B**
  - 说明浏览器 **没有把 HTTP 响应（400 + XML）交付给 JS 层**，而是将其视为一次“网络连接被重置”的失败。

---

# 3. 结论：不是 SDK/业务错误解析问题，而是传输层连接被重置

综合以上现象：

1. **服务端（MinIO）行为是确定的**：  
   - 收到了浏览器的 multipart 请求；
   - 在桶配额满时返回 `400 Bad Request` + 含 `Bucket quota exceeded` 的 XML；
   - 响应中带了正确的 CORS 头。

2. **macOS 与 Windows 的差异发生在浏览器网络栈 / 传输层**：  
   - macOS 上浏览器能够完整接收并交付这份 `400` 响应给 `fetch`，因此 AWS SDK v3 可以解析到 `Bucket quota exceeded`。
   - Windows 上浏览器在上传大文件（单分片 64MB）时，服务端提前返回错误并结束连接的组合，更容易被视为 **TCP 连接被 RST（`ERR_CONNECTION_RESET`）**，从而：
     - `fetch` Promise 直接以 `TypeError: Failed to fetch` 形式 reject；
     - JS 拿不到 `Response` 对象，自然也解析不到 MinIO 返回的 XML 错误。

3. **这不是 aws-sdk-js 的业务逻辑问题**：  
   - SDK 浏览器版底层本质上调用的就是 `fetch` / XHR；一旦底层返回的是纯网络错误（`ERR_CONNECTION_RESET`），SDK 无法“魔法般”读到已经被操作系统/浏览器丢弃的响应内容。

---

# 4. 已尝试的缓解措施与结果

- 将 `Upload` 的参数调整为：
  - `queueSize: 1`（禁用并发，避免多分片并发写入）
  - `partSize: 1024 * 1024 * 64`（单分片 64MB）
- 目的：
  - 减少并发导致的复杂时序问题，只保留“单个大 body + 服务端快速返回错误”的场景。
- 实际结果：
  - MinIO 日志中依然能看到 `PutObjectPart` 返回 `400 Bad Request` + XML；
  - Windows 端浏览器仍然报告 `(failed) net::ERR_CONNECTION_RESET` → JS 层 `Failed to fetch`。
- 由此进一步确认：**并发不是根本原因，根因是“上传大请求体时，服务端在很早阶段返回错误并终止连接”，在某些平台/网络环境下被视为连接重置，而不是一个正常的 HTTP 400 响应。**

---

# 5. 为什么 macOS 能看到 `Bucket quota exceeded`，而 Windows 只能 `Failed to fetch`？

可以理解为不同操作系统 + 浏览器 + 网络环境下，对同一种“服务端提前拒绝大请求体”的处理方式不同：

- macOS 上：
  - 更倾向于把这次交互视为“完成的 HTTP 事务”，即便请求 body 还在上传，也允许读取到服务器返回的 `400` 状态与响应体。
  - 因此 `fetch` 能拿到 `Response`，SDK 可以解析 XML 得到 `Bucket quota exceeded`。

- Windows 上：
  - 更倾向于将这种情况视为“连接异常终止”（例如 TCP RST），而不是一个完整的 HTTP 响应。
  - 浏览器直接将其归类为网络错误：`ERR_CONNECTION_RESET`，对 JS 只暴露 `TypeError: Failed to fetch`。
  - 在这种模式下，即使服务器端确实发送了 `400`+XML，浏览器也不会把它暴露给前端代码。

---

# 6. 影响与风险评估

- **影响范围**：
  - 仅在“桶配额已满 / 服务器主动快速拒绝大请求”的场景中出现；
  - 正常上传（配额充足）不受影响。
- **风险**：
  - 前端无法在所有平台上统一拿到“配额已满”这一业务错误信息；
  - 对于需要严格区分“配额问题”和“网络问题”的交互/告警，会造成体验差异。

---

# 7. 推荐解决方案

## 方案一：上传前做配额/可用空间检查（业务侧兜底）【推荐】

思路：

- 不依赖“上传时由 MinIO 返回配额错误”，而是 **上传前** 就通过后端接口拿到桶配额/剩余可用空间：
  - 例如由后端 admin 调用 MinIO 管理 API 或维护一套配额元数据；
  - 当前要上传的文件大小 > 剩余配额时，直接在前端提示“配额不足”，不发实际的 PUT。
- 优点：
  - 彻底避免触发 `ERR_CONNECTION_RESET` 这种“先发大 body 再被拒绝”的场景；
  - 错误信息由后端统一返回，前端各平台表现一致。
- 缺点：
  - 需要后端具备配额信息和一个简单的“上传前检查”接口。

## 方案二：后端代理上传 / 预签名 + 后端兜底

思路：

- 浏览器不直接 PUT 到 MinIO，而是：
  - 把文件 POST 到自己的后端，由后端以 SDK 方式上传到 MinIO；
  - 或者后端生成预签名 URL + 短期凭证，同时后端监听 MinIO 的错误并以业务 JSON 返回。
- 一旦发生 `BucketQuotaExceeded`，后端一定可以拿到并转换成稳定的错误信息；前端只和后端交互，不受 `ERR_CONNECTION_RESET` 之类的影响。
- 缺点：
  - 实现复杂度和带宽压力都会增加（文件流经后端）。

## 方案三：前端层面仅做“网络错误”友好提示

在当前“浏览器直连 MinIO”的前提下，可以对错误信息做更细分的展示：

- 如果捕获到的错误是：
  - `err instanceof TypeError && err.message === 'Failed to fetch'`，并且 Network 面板显示 `net::ERR_CONNECTION_RESET`：
    - 在 UI 上提示：“上传过程中连接被重置，可能是桶配额不足或网络设备中断连接，请联系管理员检查 MinIO 配额与网络环境。”
- 如果是能拿到 Response / SDK ServiceException 的情况：
  - 展示具体的业务错误（例如 `Bucket quota exceeded`）。

这个方案 **无法在 Windows 浏览器里恢复出 `Bucket quota exceeded` 文本**，但至少让错误提示更贴近真实原因，而不是简单的“上传失败”。

---

# 8. 实际代码层面的调整建议

1. **保留当前基于 `@aws-sdk/lib-storage` 的上传实现**（短期不必替换 SDK）。  
2. **在上传失败的 catch 中区分错误类型**：
   - `err instanceof Error && err.message === 'Failed to fetch'` → 判定为网络/连接层错误；
   - 否则尝试从 `err.name`、`err.$metadata`、`err.Code/Message` 中提取业务错误信息。
3. **视项目需求决定是否引入“上传前配额检查”或“后端代理上传”**：
   - 如果这是生产环境的关键链路，建议至少实现一个简单的“配额预检查”接口，避免让前端盲目尝试大文件上传到配额已满的桶。

---

# 9. 总结

- **问题本质**：  
  - MinIO 在桶配额满时工作正常，返回 `400 Bad Request` + `Bucket quota exceeded` 错误；
  - macOS 浏览器能接收到并交给 JS；
  - Windows 浏览器在上传大文件时，遇到服务端快速拒绝，更倾向于将连接视为 `ERR_CONNECTION_RESET`，导致 `fetch` 直接以 `Failed to fetch` 形式失败，JS 无法读取错误响应。

- **结论**：  
  - 这是浏览器/操作系统/网络栈在处理“提前拒绝的大请求体”时的差异，不是 aws-sdk-js 的业务 bug。
  - 要在所有平台上稳定拿到“桶配额已满”的业务错误，需要引入后端层的配额检查或上传代理，而不能只依赖浏览器直连 MinIO 的错误响应。
