---
title: s3fs-fuse 完整操作手册
published: 2026-01-16 13:17:25
description: s3fs-fuse 详细配置与参数说明
image: ''
tags: ['s3', 'storage', 'filesystem', 'aws']
category: '技术文档'
draft: false
lang: 'zh-CN'
---

# s3fs-fuse 完整操作手册

## 简介

s3fs 是一个基于 FUSE (Filesystem in Userspace) 的文件系统,允许将 Amazon S3 或兼容 S3 API 的对象存储挂载为本地文件系统。它使您能够像操作本地文件一样操作 S3 存储桶中的文件和目录。

### 主要特性

- 支持 POSIX 文件系统的子集,包括读/写文件、目录、符号链接、模式、uid/gid 和扩展属性
- 兼容 Amazon S3 和其他基于 S3 的对象存储
- 支持随机写入和追加
- 通过多部分上传支持大文件
- 通过服务器端复制支持重命名
- 可选的服务器端加密
- 通过 MD5 哈希确保数据完整性
- 内存中的元数据缓存
- 本地磁盘数据缓存
- 用户指定的区域,包括 Amazon GovCloud
- 通过 v2 或 v4 签名认证

### 系统要求

- Linux、macOS 或 FreeBSD 系统
- FUSE 库和内核模块
- libcurl 7.16 或更高版本
- libxml2

## 安装

### 通过包管理器安装

#### Debian/Ubuntu

```bash
sudo apt update
sudo apt install s3fs
```

#### RHEL/CentOS/Fedora

```bash
sudo yum install epel-release
sudo yum install s3fs-fuse
```

#### Arch Linux

```bash
sudo pacman -S s3fs-fuse
```

#### macOS (通过 Homebrew)

```bash
brew install --cask macfuse
brew install gromgit/fuse/s3fs-mac
```

#### FreeBSD

```bash
pkg install fusefs-s3fs
```

### 从源码编译

```bash
git clone https://github.com/s3fs-fuse/s3fs-fuse.git
cd s3fs-fuse
./autogen.sh
./configure
make
sudo make install
```

## 认证配置

### 方法一: AWS 凭证文件

s3fs 支持标准的 AWS 凭证文件格式,位于 `${HOME}/.aws/credentials`:

```ini
[default]
aws_access_key_id = YOUR_ACCESS_KEY_ID
aws_secret_access_key = YOUR_SECRET_ACCESS_KEY
```

### 方法二: 密码文件

创建密码文件并设置正确的权限:

```bash
echo ACCESS_KEY_ID:SECRET_ACCESS_KEY > ${HOME}/.passwd-s3fs
chmod 600 ${HOME}/.passwd-s3fs
```

对于多个 bucket:

```text
bucket1:ACCESS_KEY_ID_1:SECRET_ACCESS_KEY_1
bucket2:ACCESS_KEY_ID_2:SECRET_ACCESS_KEY_2
```

系统范围的密码文件:

```bash
echo ACCESS_KEY_ID:SECRET_ACCESS_KEY > /etc/passwd-s3fs
chmod 640 /etc/passwd-s3fs
```

### 方法三: 环境变量

```bash
export AWS_ACCESS_KEY_ID=YOUR_ACCESS_KEY_ID
export AWS_SECRET_ACCESS_KEY=YOUR_SECRET_ACCESS_KEY
export AWS_SESSION_TOKEN=YOUR_SESSION_TOKEN  # 可选,用于临时凭证
```

### 方法四: IAM 角色

在 EC2 实例上使用 IAM 角色:

```bash
s3fs mybucket /mnt/s3 -o iam_role=auto
```

指定特定 IAM 角色:

```bash
s3fs mybucket /mnt/s3 -o iam_role=my-role-name
```

## 基本用法

### 手动挂载

```bash
s3fs mybucket /path/to/mountpoint -o passwd_file=${HOME}/.passwd-s3fs
```

### 使用环境变量

```bash
export AWS_ACCESS_KEY_ID=YOUR_ACCESS_KEY_ID
export AWS_SECRET_ACCESS_KEY=YOUR_SECRET_ACCESS_KEY
s3fs mybucket /path/to/mountpoint
```

### 指定子目录

```bash
s3fs mybucket:/subdir/path /path/to/mountpoint
```

### 使用 AWS 凭证配置文件

```bash
s3fs mybucket /path/to/mountpoint -o profile=myprofile
```

### 卸载

```bash
fusermount -u /path/to/mountpoint
```

## 命令行参数详解

### 通用选项

#### `-h` / `--help`

显示帮助信息。

```bash
s3fs -h
```

#### `--version`

打印版本信息。

```bash
s3fs --version
```

#### `-f`

FUSE 前台选项,不作为守护进程运行。

```bash
s3fs mybucket /mnt/s3 -f
```

#### `-d`

调试模式,等同于 `dbglevel=info` 和 `-f`。

```bash
s3fs mybucket /mnt/s3 -d
```

### 挂载选项

#### 认证相关

##### `passwd_file=<file>`

指定密码文件路径,优先级高于 `${HOME}/.passwd-s3fs` 和 `/etc/passwd-s3fs`。

```bash
s3fs mybucket /mnt/s3 -o passwd_file=/path/to/passwd-s3fs
```

##### `profile=<profile_name>`

从 `${HOME}/.aws/credentials` 中选择特定的配置文件进行认证。

```bash
s3fs mybucket /mnt/s3 -o profile=production
```

##### `iam_role[=<role_name>]`

使用 IAM 角色认证。如果不指定角色名或使用 `auto`,会自动使用实例上的 IAM 角色。

```bash
s3fs mybucket /mnt/s3 -o iam_role=auto
```

##### `ecs`

启用 ECS 容器凭证元数据地址查询,而不是实例元数据地址。

```bash
s3fs mybucket /mnt/s3 -o ecs
```

##### `ibm_iam_auth`

使用 IBM IAM 认证。在此模式下,AWSAccessKey 和 AWSSecretKey 将分别用作 IBM 的 Service-Instance-ID 和 APIKey。

```bash
s3fs mybucket /mnt/s3 -o ibm_iam_auth
```

##### `ibm_iam_endpoint=<url>`

设置 IBM IAM 认证使用的 URL,默认为 `<https://iam.cloud.ibm.com>`。

```bash
s3fs mybucket /mnt/s3 -o ibm_iam_endpoint=https://iam.cloud.ibm.com
```

##### `credlib=<library_path>`

指定处理包含认证令牌的凭证的共享库。

```bash
s3fs mybucket /mnt/s3 -o credlib=/usr/lib/s3fs-cred-plugin.so
```

##### `credlib_opts=<options>`

指定在加载和初始化 `credlib` 中指定的共享库时传递的选项。

```bash
s3fs mybucket /mnt/s3 -o credlib="option1=value1,option2=value2"
```

#### 网络和连接相关

##### `url=<url>`

设置访问 S3 使用的 URL。如果要用 HTTP,可以设置为 `url=<http://s3.amazonaws.com>`。

```bash
s3fs mybucket /mnt/s3 -o url=https://s3.amazonaws.com
```

##### `endpoint=<region>`

设置签名版本 4 使用的端点。默认使用 `us-east-1` 区域。

```bash
s3fs mybucket /mnt/s3 -o endpoint=ap-northeast-1
```

##### `host=<hostname>`

允许覆盖默认的 Amazon S3 主机名。

```bash
s3fs mybucket /mnt/s3 -o host=s3.ap-northeast-1.amazonaws.com
```

##### `servicepath=<path>`

当非 Amazon 主机需要前缀时设置服务路径。

```bash
s3fs mybucket /mnt/s3 -o servicepath=/s3
```

##### `connect_timeout=<seconds>`

连接超时时间,默认为 300 秒。

```bash
s3fs mybucket /mnt/s3 -o connect_timeout=60
```

##### `readwrite_timeout=<seconds>`

读/写活动超时时间,默认为 120 秒。

```bash
s3fs mybucket /mnt/s3 -o readwrite_timeout=300
```

##### `proxy=[scheme://]hostname[:port]`

指定 S3 服务器的代理。如果省略端口号,HTTPS 协议使用 443,其他协议使用 1080。

```bash
s3fs mybucket /mnt/s3 -o proxy=http://proxy.example.com:8080
```

##### `proxy_cred_file=<file>`

指定描述代理用户名和密码的文件。用户名和密码仅对 HTTP 协议有效。

```bash
s3fs mybucket /mnt/s3 -o proxy=http://proxy.example.com:8080 -o proxy_cred_file=/etc/s3fs-proxy
```

##### `ipresolve=<type>`

选择连接时使用的 IP 地址类型。默认是 `whatever`(可以使用所有 IP 版本),可设置为 `IPv4` 或 `IPv6`。

```bash
s3fs mybucket /mnt/s3 -o ipresolve=IPv4
```

##### `max_stat_cache_size=<entries>`

stat 缓存和符号链接缓存中的最大条目数,默认为 100,000 条目(约 40MB)。

```bash
s3fs mybucket /mnt/s3 -o max_stat_cache_size=200000
```

##### `stat_cache_expire=<seconds>`

指定 stat 缓存和符号链接缓存中条目的过期时间(秒),默认为 900 秒。

```bash
s3fs mybucket /mnt/s3 -o stat_cache_expire=1800
```

##### `stat_cache_interval_expire=<seconds>`

基于最后一次访问时间的缓存过期时间,默认为 900 秒。此选项与 `stat_cache_expire` 互斥。

```bash
s3fs mybucket /mnt/s3 -o stat_cache_interval_expire=600
```

##### `disable_noobj_cache`

默认情况下,s3fs 会记忆对象不存在直到 stat 缓存超时。禁用此选项可避免缓存陈旧。

```bash
s3fs mybucket /mnt/s3 -o disable_noobj_cache
```

#### SSL/TLS 相关

##### `no_check_certificate`

服务器证书不会根据可用的证书颁发机构进行检查。

```bash
s3fs mybucket /mnt/s3 -o no_check_certificate
```

##### `ssl_verify_hostname=<value>`

当值为 0 时,不会根据主机名验证 SSL 证书。默认值为 2。

```bash
s3fs mybucket /mnt/s3 -o ssl_verify_hostname=0
```

##### `ssl_client_cert=<cert>[:<cert_type>[:<private_key>[:<key_type>[:<password>]]]]`

指定 SSL 客户端证书。

```bash
s3fs mybucket /mnt/s3 -o ssl_client_cert=/path/to/cert.pem:PEM:/path/to/key.pem:PEM:password
```

##### `nodnscache`

禁用 DNS 缓存。

```bash
s3fs mybucket /mnt/s3 -o nodnscache
```

##### `nosscache`

禁用 SSL 会话缓存。

```bash
s3fs mybucket /mnt/s3 -o nosscache
```

#### S3 API 相关

##### `list_object_max_keys=<number>`

指定 S3 list object API 返回的最大键数,默认为 1000。

```bash
s3fs mybucket /mnt/s3 -o list_object_max_keys=2000
```

##### `listobjectsv2`

使用 ListObjectsV2 而不是 ListObjects,适用于不支持 ListObjects 的对象存储。

```bash
s3fs mybucket /mnt/s3 -o listobjectsv2
```

##### `sigv2`

仅使用签名版本 2 签名 AWS 请求。

```bash
s3fs mybucket /mnt/s3 -o sigv2
```

##### `sigv4`

仅使用签名版本 4 签名 AWS 请求。

```bash
s3fs mybucket /mnt/s3 -o sigv4
```

##### `use_path_request_style`

使用旧版 API 调用样式(路径请求样式),支持不支持虚拟主机请求样式的 S3 兼容 API。

```bash
s3fs mybucket /mnt/s3 -o use_path_request_style
```

##### `noua`

抑制 User-Agent 头。

```bash
s3fs mybucket /mnt/s3 -o noua
```

##### `cipher_suites=<list>`

自定义 TLS 密码套件列表。

```bash
s3fs mybucket /mnt/s3 -o cipher_suites=ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-AES256-GCM-SHA384
```

#### 多部分上传相关

##### `parallel_count=<number>`

上传大对象的并行请求数,默认为 5。

```bash
s3fs mybucket /mnt/s3 -o parallel_count=20
```

##### `multipart_size=<size>`

每个多部分请求的分块大小(MB),最小为 5MB,最大为 5GB,默认为 10MB。

```bash
s3fs mybucket /mnt/s3 -o multipart_size=50
```

##### `multipart_copy_size=<size>`

每个多部分复制请求的分块大小(MB),用于重命名和混合上传,最小为 5MB,最大为 5GB,默认为 512MB。

```bash
s3fs mybucket /mnt/s3 -o multipart_copy_size=1024
```

##### `multipart_threshold=<size>`

使用多部分上传的阈值(MB),至少为 5MB,默认为 25MB。

```bash
s3fs mybucket /mnt/s3 -o multipart_threshold=50
```

##### `singlepart_copy_limit=<size>`

在尝试多部分复制之前单部分复制的最大大小(MB),默认为 512MB。

```bash
s3fs mybucket /mnt/s3 -o singlepart_copy_limit=1024
```

##### `nomultipart`

禁用多部分上传。

```bash
s3fs mybucket /mnt/s3 -o nomultipart
```

##### `streamupload`

启用流上传,预期比其他上传功能提供更好的性能。此选项仍处于实验阶段。

```bash
s3fs mybucket /mnt/s3 -o streamupload
```

##### `max_thread_count=<number>`

指定等待流上传的线程数,默认为 5。此选项仍处于实验阶段。

```bash
s3fs mybucket /mnt/s3 -o max_thread_count=20
```

##### `max_dirty_data=<size>`

在写入一定数量的 MB 数据后将脏数据刷新到 S3,最小值为 50MB,-1 表示禁用。

```bash
s3fs mybucket /mnt/s3 -o max_dirty_data=10240
```

#### 缓存相关

##### `use_cache=<directory>`

指定本地文件缓存使用的本地文件夹。如果未指定,则禁用缓存。

```bash
s3fs mybucket /mnt/s3 -o use_cache=/var/cache/s3fs
```

##### `check_cache_dir_exist`

如果设置了 use_cache,则检查缓存目录是否存在。如果未指定此选项,当缓存目录不存在时会在运行时创建。

```bash
s3fs mybucket /mnt/s3 -o use_cache=/var/cache/s3fs -o check_cache_dir_exist
```

##### `del_cache`

在 s3fs 启动和退出时删除本地文件缓存。

```bash
s3fs mybucket /mnt/s3 -o use_cache=/var/cache/s3fs -o del_cache
```

##### `ensure_diskfree=<size>`

设置确保磁盘空闲空间的 MB 数,用于控制 s3fs 使用的缓存文件大小。

```bash
s3fs mybucket /mnt/s3 -o use_cache=/var/cache/s3fs -o ensure_diskfree=10240
```

##### `free_space_ratio=<percentage>`

设置磁盘的最小空闲空间比率,值为 0 到 100 之间,默认为 10。

```bash
s3fs mybucket /mnt/s3 -o use_cache=/var/cache/s3fs -o free_space_ratio=20
```

##### `cachedir=<directory>`

设置缓存 s3fs 文件的基础目录,默认为 `$HOME/.fuse-s3fs-cache/`。

```bash
s3fs mybucket /mnt/s3 -o cachedir=/var/cache/s3fs
```

##### `preserve_cache=[no|yes]`

如果设置为 yes,给定挂载的缓存在卸载时不会被删除。

```bash
s3fs mybucket /mnt/s3 -o preserve_cache=yes
```

#### 存储类和加密相关

##### `storage_class=<class>`

使用指定的存储类存储对象。可能值:standard、standard_ia、onezone_ia、reduced_redundancy、intelligent_tiering、glacier、glacier_ir、deep_archive。

```bash
s3fs mybucket /mnt/s3 -o storage_class=standard_ia
```

##### `use_rrs`

使用 Amazon 的 Reduced Redundancy Storage。已被 storage_class 选项取代。

##### `use_sse=<type>`

指定三种类型的 Amazon 服务器端加密:SSE-S3、SSE-C 或 SSE-KMS。

```bash
# SSE-S3
s3fs mybucket /mnt/s3 -o use_sse

# SSE-C
s3fs mybucket /mnt/s3 -o use_sse=custom:/path/to/keyfile

# SSE-KMS
s3fs mybucket /mnt/s3 -o use_sse=kmsid:my-kms-key-id
```

##### `load_sse_c=<file>`

指定用于下载时解密的 SSE-C 密钥文件路径。

```bash
s3fs mybucket /mnt/s3 -o load_sse_c=/path/to/sse-c-keys
```

#### 权限和用户相关

##### `uid=<uid>`

设置挂载点的用户 ID。

```bash
s3fs mybucket /mnt/s3 -o uid=1000
```

##### `gid=<gid>`

设置挂载点的组 ID。

```bash
s3fs mybucket /mnt/s3 -o gid=1000
```

##### `umask=<mask>`

为挂载点下的文件设置 umask。

```bash
s3fs mybucket /mnt/s3 -o umask=0000
```

##### `mp_umask=<mask>`

为挂载点目录设置 umask。

```bash
s3fs mybucket /mnt/s3 -o mp_umask=0000
```

##### `allow_other`

允许其他用户访问挂载点。此选项需要 FUSE 配置中的 `user_allow_other`。

```bash
s3fs mybucket /mnt/s3 -o allow_other
```

#### ACL 和元数据相关

##### `default_acl=<acl>`

应用于所有写入的 S3 对象的默认预定义 ACL,例如 "private"、"public-read"。

```bash
s3fs mybucket /mnt/s3 -o default_acl=public-read
```

##### `ahbe_conf=<file>`

指定配置文件路径,用于根据文件(对象)扩展名设置额外的 HTTP 头。

配置文件格式示例:

```text
.gz
Content-Encoding gzip

.Z
Content-Encoding compress

reg:^/MYDIR/(.*)[.]t2$
Content-Encoding text2
```

```bash
s3fs mybucket /mnt/s3 -o ahbe_conf=/etc/s3fs/ahbe.conf
```

##### `requester_pays`

启用涉及请求者付费存储桶的请求。

```bash
s3fs mybucket /mnt/s3 -o requester_pays
```

#### 特殊功能相关

##### `complement_stat`

如果文件或目录对象没有 x-amz-meta-mode 头,则补充缺失的文件/目录模式信息。

```bash
s3fs mybucket /mnt/s3 -o complement_stat
```

##### `compat_dir`

启用替代目录名称的支持。包括 `dir/`、`dir`、通过路径间接确定(如 `/dir/file` 但没有父目录)以及旧的 `dir_$folder$` 格式。

```bash
s3fs mybucket /mnt/s3 -o compat_dir
```

##### `use_wtf8`

支持任意文件系统编码。S3 要求所有对象名都是有效的 UTF-8,但某些客户端使用自己的编码。

```bash
s3fs mybucket /mnt/s3 -o use_wtf8
```

##### `use_xattr`

启用处理扩展属性(xattrs)。

```bash
s3fs mybucket /mnt/s3 -o use_xattr
```

##### `noxmlns`

禁用注册 xml 命名空间。默认从 `<http://s3.amazonaws.com/doc/2006-03-01>` 查找命名空间。

```bash
s3fs mybucket /mnt/s3 -o noxmlns
```

##### `nomultipart`

禁用多部分上传。

```bash
s3fs mybucket /mnt/s3 -o nomultipart
```

##### `nomixupload`

在多部分上传中禁用复制功能。

```bash
s3fs mybucket /mnt/s3 -o nomixupload
```

##### `nocopyapi`

不使用 PUT (copy api),用于不兼容的 S3 API。

```bash
s3fs mybucket /mnt/s3 -o nocopyapi
```

##### `norenameapi`

仅在重命名命令中不使用 copy-api。

```bash
s3fs mybucket /mnt/s3 -o norenameapi
```

#### 数据完整性相关

##### `enable_content_md5`

允许 S3 服务器通过 Content-MD5 头检查上传的数据完整性。这会增加 CPU 开销。

```bash
s3fs mybucket /mnt/s3 -o enable_content_md5
```

##### `enable_unsigned_payload`

不为 PutObject 和 UploadPart 有效负载计算 Content-SHA256。这可以减少传输的 CPU 开销。

```bash
s3fs mybucket /mnt/s3 -o enable_unsigned_payload
```

#### 调试和日志相关

##### `logfile=<file>`

指定日志输出文件。

```bash
s3fs mybucket /mnt/s3 -o logfile=/var/log/s3fs.log
```

##### `dbglevel=<level>`

设置调试消息级别。可设置为 crit(严重)、err(错误)、warn(警告)、info(信息)、debug(调试)。

```bash
s3fs mybucket /mnt/s3 -o dbglevel=info
```

##### `curldbg[=normal|body]`

输出 libcurl 的调试消息。

```bash
s3fs mybucket /mnt/s3 -o curldbg=body
```

##### `no_time_stamp_msg`

调试消息中不输出时间戳。

```bash
s3fs mybucket /mnt/s3 -o no_time_stamp_msg
```

##### `set_check_cache_sigusr1[=<file>]`

发送 SIGUSR1 信号到 s3fs 进程时检查缓存状态。

```bash
s3fs mybucket /mnt/s3 -o set_check_cache_sigusr1=/tmp/cache-check.log
```

##### `instance_name=<name>`

当前 s3fs 挂载点的实例名称,将添加到日志消息和用户代理头中。

```bash
s3fs mybucket /mnt/s3 -o instance_name=production-s3
```

#### 其他选项

##### `tmpdir=<directory>`

临时文件的本地文件夹,默认为 `/tmp`。

```bash
s3fs mybucket /mnt/s3 -o tmpdir=/var/tmp/s3fs
```

##### `retries=<number>`

重试失败的 S3 事务的次数,默认为 5。

```bash
s3fs mybucket /mnt/s3 -o retries=10
```

##### `bucket=<bucket_name>[:/path]`

指定要挂载的 Amazon S3 存储桶名称。如果命令行中没有指定存储桶名称(和路径),必须在 `-o` 选项后指定此选项。

```bash
s3fs /mnt/s3 -o bucket=mybucket:/subdir/path
```

##### `public_bucket=[1|yes]`

设置为 1 时匿名挂载公共存储桶,忽略 `$HOME/.passwd-s3fs` 和 `/etc/passwd-s3fs` 文件。

```bash
s3fs mybucket /mnt/s3 -o public_bucket=1
```

##### `use_session_token`

指示应提供会话令牌。

```bash
s3fs mybucket /mnt/s3 -o use_session_token
```

##### `multireq_max=<number>`

列出对象的并行请求的最大数量,默认为 20。

```bash
s3fs mybucket /mnt/s3 -o multireq_max=50
```

##### `lazy_fsdata=[no|yes]`

如果设置为 yes,文件系统元数据仅在卸载时写回 S3,默认为 yes。

```bash
s3fs mybucket /mnt/s3 -o lazy_fsdata=yes
```

##### `writeback_time=<seconds>`

考虑上传文件到 S3 时的暂停秒数。如果在暂停后,s3fs 检测到其他进程已打开文件,则推迟上传,默认为 10 秒。

```bash
s3fs mybucket /mnt/s3 -o writeback_time=30
```

##### `bucket_size=<size>`

桶大小,默认为最大长无符号整数值。

```bash
s3fs mybucket /mnt/s3 -o bucket_size=10TB
```

##### `mime=<file>`

指定 mime.types 文件的路径,默认为 `/etc/mime.types`。

```bash
s3fs mybucket /mnt/s3 -o mime=/etc/mime.types
```

##### `update_parent_dir_stat`

当创建或删除文件或目录时,更新父目录的 mtime 和 ctime。

```bash
s3fs mybucket /mnt/s3 -o update_parent_dir_stat
```

#### IMDS (实例元数据服务) 相关

##### `imdsv1only`

使用 IMDSv1 而不是 IMDSv2。在环境不支持 IMDSv2 时使用。

```bash
s3fs mybucket /mnt/s3 -o imdsv1only
```

## 挂载配置

### /etc/fstab 配置

将 S3 存储桶添加到 `/etc/fstab` 可以在启动时自动挂载:

```text
mybucket /mnt/s3 fuse.s3fs _netdev,allow_other,passwd_file=/etc/passwd-s3fs 0 0
```

### 完整示例

#### 基本配置

```text
mybucket /mnt/s3 fuse.s3fs _netdev,allow_other 0 0
```

#### 指定区域和端点

```text
mybucket /mnt/s3 fuse.s3fs _netdev,allow_other,url=https://s3.ap-northeast-1.amazonaws.com,endpoint=ap-northeast-1 0 0
```

#### 启用缓存

```text
mybucket /mnt/s3 fuse.s3fs _netdev,allow_other,use_cache=/var/cache/s3fs 0 0
```

#### 使用加密

```text
mybucket /mnt/s3 fuse.s3fs _netdev,allow_other,use_sse 0 0
```

#### 使用 SSE-KMS

```text
mybucket /mnt/s3 fuse.s3fs _netdev,allow_other,use_sse=kmsid:arn:aws:kms:us-east-1:123456789012:key/abcd1234-5678-90ef-ghij-klmnopqrstuv 0 0
```

#### 使用 IAM 角色

```text
mybucket /mnt/s3 fuse.s3fs _netdev,allow_other,iam_role=auto 0 0
```

#### 非 Amazon S3 存储

```text
mybucket /mnt/s3 fuse.s3fs _netdev,allow_other,use_path_request_style,url=https://storage.example.com 0 0
```

#### 使用代理

```text
mybucket /mnt/s3 fuse.s3fs _netdev,allow_other,proxy=http://proxy.example.com:8080 0 0
```

### Systemd 单元文件

创建 `/etc/systemd/system/s3fs-mybucket.service`:

```ini
[Unit]
Description=s3fs for mybucket
After=network.target

[Service]
Type=fuse
User=s3fs-user
Group=s3fs-group
ExecStart=/usr/bin/s3fs mybucket:/data /mnt/s3 \
    -o passwd_file=/home/s3fs-user/.passwd-s3fs \
    -o url=https://s3.ap-northeast-1.amazonaws.com \
    -o use_cache=/var/cache/s3fs \
    -o allow_other \
    -o mp_umask=000 \
    -o dbglevel=info \
    -o curldbg

ExecStop=/bin/fusermount -u /mnt/s3
Restart=on-failure
RestartSec=30s

[Install]
WantedBy=multi-user.target
```

启用和启动服务:

```bash
sudo systemctl daemon-reload
sudo systemctl enable s3fs-mybucket.service
sudo systemctl start s3fs-mybucket.service
```

## 生产环境优化

### 基础优化配置

对于一般生产环境,推荐以下基础配置:

```bash
s3fs mybucket /mnt/s3 \
    -o passwd_file=/etc/passwd-s3fs \
    -o endpoint=us-east-1 \
    -o url=https://s3.amazonaws.com \
    -o use_cache=/var/cache/s3fs \
    -o ensure_diskfree=10240 \
    -o free_space_ratio=20 \
    -o max_stat_cache_size=100000 \
    -o stat_cache_expire=900 \
    -o parallel_count=20 \
    -o multipart_size=50 \
    -o multipart_copy_size=1024 \
    -o multipart_threshold=25 \
    -o connect_timeout=60 \
    -o readwrite_timeout=300 \
    -o retries=10 \
    -o allow_other \
    -o noatime \
    -o _netdev
```

### 高性能配置

对于需要更高性能的场景:

```bash
s3fs mybucket /mnt/s3 \
    -o passwd_file=/etc/passwd-s3fs \
    -o endpoint=us-east-1 \
    -o url=https://s3.amazonaws.com \
    -o use_cache=/var/cache/s3fs \
    -o ensure_diskfree=20480 \
    -o free_space_ratio=15 \
    -o max_stat_cache_size=200000 \
    -o stat_cache_expire=1800 \
    -o stat_cache_interval_expire=600 \
    -o parallel_count=50 \
    -o multipart_size=100 \
    -o multipart_copy_size=2048 \
    -o multipart_threshold=50 \
    -o max_dirty_data=10240 \
    -o connect_timeout=30 \
    -o readwrite_timeout=180 \
    -o retries=15 \
    -o multireq_max=100 \
    -o disable_noobj_cache \
    -o allow_other \
    -o noatime \
    -o _netdev
```

### 高可靠性配置

对于需要更高可靠性的场景:

```bash
s3fs mybucket /mnt/s3 \
    -o passwd_file=/etc/passwd-s3fs \
    -o endpoint=us-east-1 \
    -o url=https://s3.amazonaws.com \
    -o use_cache=/var/cache/s3fs \
    -o ensure_diskfree=51200 \
    -o free_space_ratio=25 \
    -o max_stat_cache_size=50000 \
    -o stat_cache_expire=600 \
    -o stat_cache_interval_expire=300 \
    -o parallel_count=10 \
    -o multipart_size=25 \
    -o multipart_copy_size=512 \
    -o multipart_threshold=25 \
    -o connect_timeout=120 \
    -o readwrite_timeout=600 \
    -o retries=20 \
    -o enable_content_md5 \
    -o preserve_cache=yes \
    -o allow_other \
    -o noatime \
    -o _netdev
```

### 加密和安全配置

```bash
s3fs mybucket /mnt/s3 \
    -o passwd_file=/etc/passwd-s3fs \
    -o endpoint=us-east-1 \
    -o url=https://s3.amazonaws.com \
    -o use_cache=/var/cache/s3fs \
    -o use_sse=kmsid:arn:aws:kms:us-east-1:123456789012:key/abcd1234 \
    -o ssl_verify_hostname=2 \
    -o connect_timeout=60 \
    -o readwrite_timeout=300 \
    -o allow_other \
    -o noatime \
    -o _netdev
```

### 低延迟配置

对于需要低延迟的场景:

```bash
s3fs mybucket /mnt/s3 \
    -o passwd_file=/etc/passwd-s3fs \
    -o endpoint=us-east-1 \
    -o url=https://s3.amazonaws.com \
    -o use_cache=/var/cache/s3fs \
    -o max_stat_cache_size=300000 \
    -o stat_cache_expire=3600 \
    -o stat_cache_interval_expire=1800 \
    -o parallel_count=100 \
    -o multireq_max=200 \
    -o connect_timeout=15 \
    -o readwrite_timeout=60 \
    -o retries=5 \
    -o streamupload \
    -o max_thread_count=50 \
    -o enable_unsigned_payload \
    -o disable_noobj_cache \
    -o allow_other \
    -o noatime \
    -o _netdev
```

### 存储成本优化配置

```bash
s3fs mybucket /mnt/s3 \
    -o passwd_file=/etc/passwd-s3fs \
    -o endpoint=us-east-1 \
    -o url=https://s3.amazonaws.com \
    -o use_cache=/var/cache/s3fs \
    -o ensure_diskfree=51200 \
    -o free_space_ratio=30 \
    -o storage_class=intelligent_tiering \
    -o max_stat_cache_size=100000 \
    -o stat_cache_expire=1800 \
    -o parallel_count=5 \
    -o multipart_size=50 \
    -o multipart_copy_size=1024 \
    -o multipart_threshold=128 \
    -o connect_timeout=120 \
    -o readwrite_timeout=600 \
    -o retries=10 \
    -o allow_other \
    -o noatime \
    -o _netdev
```

## 性能调优

### 并发优化

#### 增加 parallel_count

对于高带宽网络或大文件上传:

```bash
-o parallel_count=50
```

对于低带宽网络或小文件:

```bash
-o parallel_count=5
```

#### 增加 multireq_max

用于目录列表优化:

```bash
-o multireq_max=100
```

### 缓存优化

#### 调整缓存大小

```bash
-o max_stat_cache_size=200000
```

#### 调整缓存过期时间

```bash
-o stat_cache_expire=1800
-o stat_cache_interval_expire=900
```

### 多部分上传优化

#### 调整分块大小

对于大文件:

```bash
-o multipart_size=100
-o multipart_copy_size=2048
```

对于小文件:

```bash
-o multipart_size=10
-o multipart_copy_size=512
```

#### 调整阈值

```bash
-o multipart_threshold=50
```

### 网络优化

#### 调整超时时间

```bash
-o connect_timeout=60
-o readwrite_timeout=300
```

#### 调整重试次数

```bash
-o retries=10
```

### CPU 优化

#### 禁用 MD5 校验

```bash
-o enable_content_md5  # 不设置此项以减少 CPU 开销
```

#### 启用未签名有效负载

```bash
-o enable_unsigned_payload
```

### 内存优化

#### 限制缓存大小

```bash
-o max_stat_cache_size=50000
-o ensure_diskfree=20480
```

## 故障排查

### 常见问题

#### 1. Input/output error

**可能原因:**

- 存储桶不存在
- 凭证不正确
- 本地时钟与 Amazon 服务器时间差超过 15 分钟

**解决方案:**

```bash
# 检查存储桶是否存在
aws s3 ls s3://mybucket

# 检查时钟同步
sudo ntpdate pool.ntp.org

# 使用调试模式查看详细错误
s3fs mybucket /mnt/s3 -f -o dbglevel=info -o curldbg
```

#### 2. Permission denied

**可能原因:**

- 文件/目录权限问题
- 缺少 allow_other 选项
- 文件由其他工具创建,缺少元数据

**解决方案:**

```bash
# 添加 allow_other 选项
s3fs mybucket /mnt/s3 -o allow_other

# 使用 complement_stat 选项
s3fs mybucket /mnt/s3 -o complement_stat

# 设置 umask
s3fs mybucket /mnt/s3 -o umask=0000 -o mp_umask=0000
```

#### 3. Check bucket failed

**可能原因:**

- 非 Amazon S3 存储
- 需要使用路径请求样式

**解决方案:**

```bash
s3fs mybucket /mnt/s3 -o use_path_request_style
```

#### 4. HTTPS 连接失败(存储桶名称包含点)

**可能原因:**

- 通配符 SSL 证书不支持多级标签

**解决方案:**

```bash
s3fs mybucket /mnt/s3 -o use_path_request_style -o endpoint=us-west-2
```

#### 5. 挂载时无法连接网络

**解决方案:**

```bash
# 在 fstab 中添加 _netdev 选项
mybucket /mnt/s3 fuse.s3fs _netdev,allow_other 0 0

# 确保 netfs 服务启动
sudo systemctl enable netfs
sudo systemctl start netfs
```

### 调试技巧

#### 启用调试日志

```bash
s3fs mybucket /mnt/s3 -f -o dbglevel=info -o curldbg
```

#### 查看系统日志

```bash
tail -f /var/log/messages
tail -f /var/log/syslog
tail -f /var/log/s3fs.log
```

#### 检查挂载状态

```bash
mount | grep s3fs
df -h | grep s3fs
```

#### 测试网络连接

```bash
curl -I https://s3.amazonaws.com
curl -I https://s3.us-east-1.amazonaws.com/mybucket
```

### 性能监控

#### 使用 iostat 监控磁盘 I/O

```bash
iostat -x 1
```

#### 使用 top/htop 监控 CPU 和内存

```bash
top
htop
```

#### 使用 nfsiostat 监控文件系统性能

```bash
nfsiostat 1
```

## 最佳实践

### 安全最佳实践

1. **使用 IAM 角色**而不是硬编码凭证
2. **限制存储桶访问权限**,只授予必要的权限
3. **启用服务器端加密**
4. **使用 HTTPS** 连接 S3
5. **定期轮换访问密钥**
6. **限制 allow_other** 的使用,仅在必要时启用
7. **保护密码文件权限** (600 或 640)

### 性能最佳实践

1. **启用本地缓存**以减少网络请求
2. **调整并行上传数量**以适应网络带宽
3. **合理设置缓存过期时间**
4. **使用较大的多部分上传分块**处理大文件
5. **避免频繁的小文件操作**
6. **禁用 noatime** 以减少元数据更新
7. **使用 appropriate 存储类**以降低成本

### 可靠性最佳实践

1. **设置合理的重试次数和超时时间**
2. **监控磁盘空间**,确保有足够的缓存空间
3. **使用 enable_content_md5** 确保数据完整性
4. **定期备份重要数据**
5. **测试故障恢复流程**
6. **监控日志和错误**

### 成本优化最佳实践

1. **使用智能分层存储类** (intelligent_tiering)
2. **设置合理的缓存大小**以减少 API 调用
3. **优化目录结构**,减少 ListObject 调用
4. **使用生命周期策略**自动转换存储类
5. **监控和审计 API 使用情况**

### 运维最佳实践

1. **使用 systemd 或 fstab** 实现自动挂载
2. **配置日志轮转**避免日志文件过大
3. **设置监控和告警**
4. **定期清理缓存**
5. **使用配置管理工具**统一管理配置
6. **文档化配置和流程**

## 工具模式

### 列出不完整的多部分上传

```bash
s3fs --incomplete-mpu-list mybucket
```

### 删除不完整的多部分上传

```bash
# 删除所有
s3fs --incomplete-mpu-abort all mybucket

# 删除 24 小时前的(默认)
s3fs --incomplete-mpu-abort mybucket

# 删除 1 年 6 个月 10 天 12 小时 30 分 30 秒前的
s3fs --incomplete-mpu-abort 1Y6M10D12h30m30s mybucket
```

## 限制和注意事项

### 文件系统限制

- **单文件大小限制**: 5TB (受 S3 限制)
- **目录结构性能**: 由于网络延迟,元数据操作性能较差
- **随机写入**: 需要重写整个对象,使用多部分复制优化
- **原子性**: 不支持文件或目录的原子重命名
- **硬链接**: 不支持硬链接
- **多客户端**: 多个客户端挂载同一存储桶没有协调机制
- **inotify**: 仅检测本地修改,不检测其他客户端或工具的外部修改

### 一致性限制

- **AWS S3**: 自 2020 年 12 月起提供读写后强一致性
- **非 AWS 提供商**: 可能提供最终一致性,读取可能暂时返回陈旧数据

### 性能限制

- 网络延迟影响所有操作
- 大量小文件操作性能较差
- 列出目录需要多个 API 调用

## 参考资源

- [s3fs-fuse GitHub 仓库](https://github.com/s3fs-fuse/s3fs-fuse)
- [AWS S3 文档](https://docs.aws.amazon.com/s3/)
- [FUSE 文档](https://github.com/libfuse/libfuse)
- [s3fs-fuse FAQ](https://github.com/s3fs-fuse/s3fs-fuse/wiki/FAQ)
- [AWS S3 存储类](https://docs.aws.amazon.com/AmazonS3/latest/dev/storage-class-intro.html)
- [AWS S3 加密](https://docs.aws.amazon.com/AmazonS3/latest/userguide/serv-side-encryption.html)
