---
title: dae DNS 请求处理流程分析
published: 2025-12-29 10:36:21
description: ''
image: ''
tags: ['网络', '代理']
category: '网络'
draft: false
lang: ''
---

本文档详细分析了 dae 程序处理 DNS 请求的完整流程，从 dae0 网卡接收请求到通过宿主机网卡发送到上游 DNS 服务器的整个过程。

# 1. DNS 请求接收阶段

## 入口：从 dae0 网卡接收 UDP 包

dae 程序启动时，会创建 ControlPlane 并启动 tproxy 监听服务：

```go title=132:175:cmd/run.go
func Run(log *logrus.Logger, conf *config.Config, externGeoDataDirs []string) (err error) {
	// Remove AbortFile at beginning.
	_ = os.Remove(AbortFile)

	// New ControlPlane.
	c, err := newControlPlane(log, nil, nil, conf, externGeoDataDirs)
	if err != nil {
		return err
	}

	var pprofServer *http.Server
	if conf.Global.PprofPort != 0 {
		pprofAddr := fmt.Sprintf("localhost:%d", conf.Global.PprofPort)
		pprofServer = &http.Server{Addr: pprofAddr, Handler: nil}
		go pprofServer.ListenAndServe()
	}

	// Start HTTP server if configured.
	if conf.Global.HttpPort != 0 {
		go startServer(log, conf)
	}

	// Serve tproxy TCP/UDP server util signals.
	var listener *control.Listener
	sigs := make(chan os.Signal, 1)
	signal.Notify(sigs, syscall.SIGINT, syscall.SIGTERM, syscall.SIGHUP, syscall.SIGQUIT, syscall.SIGKILL, syscall.SIGILL, syscall.SIGUSR1, syscall.SIGUSR2)
	go func() {
		readyChan := make(chan bool, 1)
		go func() {
			<-readyChan
			sdnotify.Ready()
			if !disablePidFile {
				_ = os.WriteFile(PidFilePath, []byte(strconv.Itoa(os.Getpid())), 0644)
			}
			_ = os.WriteFile(SignalProgressFilePath, []byte{consts.ReloadDone}, 0644)
		}()
		control.GetDaeNetns().With(func() error {
			if listener, err = c.ListenAndServe(readyChan, conf.Global.TproxyPort); err != nil {
				log.Errorln("ListenAndServe:", err)
			}
			return err
		})
		sigs <- nil
	}()
```

工作原理：

1. **eBPF 程序拦截**：eBPF 程序在 dae0 网卡上通过 TC（Traffic Control）挂载点拦截 UDP 数据包
2. **tproxy 重定向**：通过 tproxy 机制将需要代理的流量重定向到 dae 的 tproxy 监听端口
3. **用户空间接收**：在用户空间，`ListenAndServe` 监听该端口接收数据

# 2. DNS 请求识别与分发

## UDP 包处理

当 UDP 包到达用户空间后，会进入 `handlePkt` 函数进行处理：

```go title=64:162:control/udp.go
func (c *ControlPlane) handlePkt(lConn *net.UDPConn, data []byte, src, pktDst, realDst netip.AddrPort, routingResult *bpfRoutingResult, skipSniffing bool) (err error) {
	var realSrc netip.AddrPort
	var domain string
	realSrc = src
	ue, ueExists := DefaultUdpEndpointPool.Get(realSrc)
	if ueExists && ue.SniffedDomain != "" {
		// It is quic ...
		// Fast path.
		domain := ue.SniffedDomain
		dialTarget := realDst.String()

		if c.log.IsLevelEnabled(logrus.TraceLevel) {
			fields := logrus.Fields{
				"network":  "udp(fp)",
				"outbound": ue.Outbound.Name,
				"policy":   ue.Outbound.GetSelectionPolicy(),
				"dialer":   ue.Dialer.Property().Name,
				"sniffed":  domain,
				"ip":       RefineAddrPortToShow(realDst),
				"pid":      routingResult.Pid,
				"dscp":     routingResult.Dscp,
				"pname":    ProcessName2String(routingResult.Pname[:]),
				"mac":      Mac2String(routingResult.Mac[:]),
			}
			c.log.WithFields(fields).Tracef("%v <-> %v", RefineSourceToShow(realSrc, realDst.Addr()), dialTarget)
		}

		_, err = ue.WriteTo(data, dialTarget)
		if err != nil {
			return err
		}
		return nil
	}

	// To keep consistency with kernel program, we only sniff DNS request sent to 53.
	dnsMessage, natTimeout := ChooseNatTimeout(data, realDst.Port() == 53)
	// We should cache DNS records and set record TTL to 0, in order to monitor the dns req and resp in real time.
	isDns := dnsMessage != nil
	if !isDns && !skipSniffing && !ueExists {
		// Sniff Quic, ...
		key := PacketSnifferKey{
			LAddr: realSrc,
			RAddr: realDst,
		}
		_sniffer, _ := DefaultPacketSnifferSessionMgr.GetOrCreate(key, nil)
		_sniffer.Mu.Lock()
		// Re-get sniffer from pool to confirm the transaction is not done.
		sniffer := DefaultPacketSnifferSessionMgr.Get(key)
		if _sniffer == sniffer {
			sniffer.AppendData(data)
			domain, err = sniffer.SniffUdp()
			if err != nil && !sniffing.IsSniffingError(err) {
				sniffer.Mu.Unlock()
				return err
			}
			if sniffer.NeedMore() {
				sniffer.Mu.Unlock()
				return nil
			}
			if err != nil {
				logrus.WithError(err).
					WithField("from", realSrc).
					WithField("to", realDst).
					Trace("sniffUdp")
			}
			defer DefaultPacketSnifferSessionMgr.Remove(key, sniffer)
			// Re-handlePkt after self func.
			toRehandle := sniffer.Data()[1 : len(sniffer.Data())-1] // Skip the first empty and the last (self).
			sniffer.Mu.Unlock()
			if len(toRehandle) > 0 {
				defer func() {
					if err == nil {
						for _, d := range toRehandle {
							dCopy := pool.Get(len(d))
							copy(dCopy, d)
							go c.handlePkt(lConn, dCopy, src, pktDst, realDst, routingResult, true)
						}
					}
				}()
			}
		} else {
			_sniffer.Mu.Unlock()
			// sniffer may be nil.
		}
	}
	if routingResult.Must > 0 {
		isDns = false // Regard as plain traffic.
	}
	if routingResult.Mark == 0 {
		routingResult.Mark = c.soMarkFromDae
	}
	if isDns {
		return c.dnsController.Handle_(dnsMessage, &udpRequest{
			realSrc:       realSrc,
			realDst:       realDst,
			src:           src,
			lConn:         lConn,
			routingResult: routingResult,
		})
	}
```

关键步骤：

1. **DNS 识别**：通过检查目标端口是否为 53 来判断是否为 DNS 请求
2. **DNS 解析**：如果是 DNS 请求，解析 DNS 消息格式
3. **分发处理**：将 DNS 请求传递给 `dnsController.Handle_` 进行专门处理

# 3. DNS 控制器处理

## 缓存检查与路由选择

DNS 控制器首先检查缓存，如果缓存未命中，则选择上游 DNS 服务器：

```go title=504:614:control/dns_control.go
func (c *DnsController) handleWithResponseWriter_(
	dnsMessage *dnsmessage.Msg,
	req *udpRequest,
	needResp bool,
	responseWriter dnsmessage.ResponseWriter,
) (err error) {
	// Prepare qname, qtype.
	var qname string
	var qtype uint16
	if len(dnsMessage.Question) != 0 {
		q := dnsMessage.Question[0]
		qname = q.Name
		qtype = q.Qtype
	}

	// Route request.
	upstreamIndex, upstream, err := c.routing.RequestSelect(qname, qtype)
	if err != nil {
		return err
	}

	cacheKey := c.cacheKey(qname, qtype, req.src)
	if c.log.IsLevelEnabled(logrus.DebugLevel) {
		c.log.WithFields(logrus.Fields{
			"qname":    qname,
			"qtype":    QtypeToString(qtype),
			"src":      req.src.String(),
			"realSrc":  req.realSrc.String(),
			"cacheKey": cacheKey,
		}).Debugf("DNS request - looking up cache")
	}

	if upstreamIndex == consts.DnsRequestOutboundIndex_Reject {
		// Reject with empty answer.
		c.RemoveDnsRespCache(cacheKey)
		return c.sendRejectWithResponseWriter_(dnsMessage, req, responseWriter)
	}

	// No parallel for the same lookup.
	handlingState_, _ := c.handling.LoadOrStore(cacheKey, new(handlingState))
	handlingState := handlingState_.(*handlingState)
	atomic.AddUint32(&handlingState.ref, 1)
	handlingState.mu.Lock()
	defer func() {
		handlingState.mu.Unlock()
		atomic.AddUint32(&handlingState.ref, ^uint32(0))
		if atomic.LoadUint32(&handlingState.ref) == 0 {
			c.handling.Delete(cacheKey)
		}
	}()

	if resp := c.LookupDnsRespCache_(dnsMessage, cacheKey, false); resp != nil {
		// Send cache to client directly.
		if needResp {
			if responseWriter != nil {
				var respMsg dnsmessage.Msg
				if err = respMsg.Unpack(resp); err != nil {
					return fmt.Errorf("failed to unpack DNS response: %w", err)
				}
				return responseWriter.WriteMsg(&respMsg)
			}
			if err = sendPkt(c.log, resp, req.realDst, req.realSrc, req.src, req.lConn); err != nil {
				return fmt.Errorf("failed to write cached DNS resp: %w", err)
			}
		}
		if c.log.IsLevelEnabled(logrus.DebugLevel) && len(dnsMessage.Question) > 0 {
			q := dnsMessage.Question[0]
			c.log.WithFields(logrus.Fields{
				"cacheKey": cacheKey,
				"qname":    strings.ToLower(q.Name),
				"qtype":    QtypeToString(q.Qtype),
				"src":      req.src.String(),
				"realSrc":  req.realSrc.String(),
			}).Debugf("UDP(DNS) %v <-> Cache: %v %v",
				RefineSourceToShow(req.realSrc, req.realDst.Addr()), strings.ToLower(q.Name), QtypeToString(q.Qtype),
			)
		}
		return nil
	}

	if c.log.IsLevelEnabled(logrus.DebugLevel) {
		upstreamName := upstreamIndex.String()
		if upstream != nil {
			upstreamName = upstream.String()
		}
		c.log.WithFields(logrus.Fields{
			"cacheKey": cacheKey,
			"qname":    qname,
			"qtype":    QtypeToString(qtype),
			"src":      req.src.String(),
			"realSrc":  req.realSrc.String(),
			"upstream": upstreamName,
		}).Debugf("DNS cache miss - requesting from upstream")
	}
	if c.log.IsLevelEnabled(logrus.TraceLevel) {
		upstreamName := upstreamIndex.String()
		if upstream != nil {
			upstreamName = upstream.String()
		}
		c.log.WithFields(logrus.Fields{
			"question": dnsMessage.Question,
			"upstream": upstreamName,
		}).Traceln("Request to DNS upstream")
	}

	// Re-pack DNS packet.
	data, err := dnsMessage.Pack()
	if err != nil {
		return fmt.Errorf("pack DNS packet: %w", err)
	}
	return c.dialSend(0, req, data, dnsMessage.Id, upstream, needResp)
}
```

处理逻辑：

1. **提取查询信息**：从 DNS 消息中提取域名（qname）和查询类型（qtype）
2. **路由选择**：通过 `RequestSelect` 根据域名和类型选择合适的上游 DNS 服务器
3. **缓存检查**：使用 `cacheKey` 查找缓存，如果命中则直接返回
4. **并发控制**：使用 `handlingState` 防止同一个查询的并发请求
5. **发送请求**：如果缓存未命中，调用 `dialSend` 向上游发送请求

# 4. 选择最佳 Dialer 并发送

## 选择拨号器

`dialSend` 函数负责选择最佳的拨号器（dialer）并发送 DNS 请求：

```go title=666:750:control/dns_control.go
func (c *DnsController) dialSend(invokingDepth int, req *udpRequest, data []byte, id uint16, upstream *dns.Upstream, needResp bool) (err error) {
	if invokingDepth >= MaxDnsLookupDepth {
		return fmt.Errorf("too deep DNS lookup invoking (depth: %v); there may be infinite loop in your DNS response routing", MaxDnsLookupDepth)
	}

	upstreamName := "asis"
	if upstream == nil {
		// As-is.

		// As-is should not be valid in response routing, thus using connection realDest is reasonable.
		var ip46 netutils.Ip46
		if req.realDst.Addr().Is4() {
			ip46.Ip4 = req.realDst.Addr()
		} else {
			ip46.Ip6 = req.realDst.Addr()
		}
		upstream = &dns.Upstream{
			Scheme:   "udp",
			Hostname: req.realDst.Addr().String(),
			Port:     req.realDst.Port(),
			Ip46:     &ip46,
		}
	} else {
		upstreamName = upstream.String()
	}

	// Select best dial arguments (outbound, dialer, l4proto, ipversion, etc.)
	dialArgument, err := c.bestDialerChooser(req, upstream)
	if err != nil {
		return err
	}

	c.log.Infof("*************************************************")
	c.log.Infof("dialArgument: %v", dialArgument)
	c.log.Infof("*************************************************")

	networkType := &dialer.NetworkType{
		L4Proto:   dialArgument.l4proto,
		IpVersion: dialArgument.ipversion,
		IsDns:     true,
	}

	// Dial and send.
	var respMsg *dnsmessage.Msg
	// defer in a recursive call will delay Close(), thus we Close() before
	// the next recursive call. However, a connection cannot be closed twice.
	// We should set a connClosed flag to avoid it.
	var connClosed bool

	ctxDial, cancel := context.WithTimeout(context.TODO(), consts.DefaultDialTimeout)
	defer cancel()

	// get forwarder from cache
	c.dnsForwarderCacheMu.Lock()
	forwarder, ok := c.dnsForwarderCache[dnsForwarderKey{upstream: upstream.String(), dialArgument: *dialArgument}]
	if !ok {
		forwarder, err = newDnsForwarder(upstream, *dialArgument)
		if err != nil {
			c.dnsForwarderCacheMu.Unlock()
			return err
		}
		c.dnsForwarderCache[dnsForwarderKey{upstream: upstream.String(), dialArgument: *dialArgument}] = forwarder
	}
	c.dnsForwarderCacheMu.Unlock()

	defer func() {
		if !connClosed {
			forwarder.Close()
		}
	}()

	if err != nil {
		return err
	}

	c.log.Infof("*************************************************")
	c.log.Infof("ForwardDNS request: %v", data)
	c.log.Infof("*************************************************")

	respMsg, err = forwarder.ForwardDNS(ctxDial, data)
	c.log.Infof("*************************************************")
	c.log.Infof("ForwardDNS response: %v", respMsg)
	c.log.Infof("ForwardDNS error: %v", err)
	c.log.Infof("*************************************************")
	if err != nil {
		return err
	}
```

关键步骤：

1. **选择拨号器**：通过 `bestDialerChooser` 选择最佳的拨号器（可能是直连或代理）
2. **创建 Forwarder**：根据上游 DNS 服务器的协议类型（UDP/TCP/TLS/HTTPS/QUIC）创建对应的 forwarder
3. **发送请求**：调用 `ForwardDNS` 发送 DNS 请求并等待响应

# 5. 网络路径：从 dae0 到宿主机网卡

## UDP 转发示例

以 UDP 协议为例，展示如何通过 dialer 发送 DNS 请求：

```go title=308:427:control/dns.go
func (d *DoUDP) ForwardDNS(ctx context.Context, data []byte) (*dnsmessage.Msg, error) {
	conn, err := d.dialArgument.bestDialer.DialContext(
		ctx,
		common.MagicNetwork("udp", d.dialArgument.mark, d.dialArgument.mptcp),
		d.dialArgument.bestTarget.String(),
	)
	if err != nil {
		return nil, err
	}
	defer conn.Close()

	timeout := 10 * time.Second
	targetAddr := d.dialArgument.bestTarget.String()

	// Check if connection is PacketConn (like in udp_endpoint_pool.go)
	// PacketConn uses ReadFrom/WriteTo, while connected Conn uses Read/Write
	var pktConn netproxy.PacketConn
	var usePacketConn bool
	if pc, ok := conn.(netproxy.PacketConn); ok {
		pktConn = pc
		usePacketConn = true
		_ = pktConn.SetDeadline(time.Now().Add(timeout))
		fmt.Println("*************************************************")
		fmt.Println("DoUDP using PacketConn (ReadFrom/WriteTo), timeout: %v", timeout)
		fmt.Println("DoUDP target: %v", targetAddr)
		fmt.Println("*************************************************")
	} else {
		// Fallback to Conn (Read/Write)
		_ = conn.SetDeadline(time.Now().Add(timeout))
		fmt.Println("*************************************************")
		fmt.Println("DoUDP using Conn (Read/Write), timeout: %v", timeout)
		fmt.Println("DoUDP target: %v", targetAddr)
		fmt.Println("*************************************************")
	}

	dnsReqCtx, cancelDnsReqCtx := context.WithTimeout(context.TODO(), timeout)
	defer cancelDnsReqCtx()

	go func() {
		// Send DNS request every seconds.
		writeCount := 0
		for {
			var err error
			var n int
			if usePacketConn {
				n, err = pktConn.WriteTo(data, targetAddr)
				writeCount++
				if writeCount == 1 {
					fmt.Println("*************************************************")
					fmt.Println("DoUDP WriteTo bytes: %v, target: %v, error: %v", n, targetAddr, err)
					fmt.Println("*************************************************")
				}
			} else {
				n, err = conn.Write(data)
				writeCount++
				if writeCount == 1 {
					fmt.Println("*************************************************")
					fmt.Println("DoUDP Write bytes: %v, error: %v", n, err)
					fmt.Println("*************************************************")
				}
			}
			if err != nil {
				fmt.Println("*************************************************")
				fmt.Println("DoUDP Write error: %v", err)
				fmt.Println("*************************************************")
				return
			}
			select {
			case <-dnsReqCtx.Done():
				return
			case <-time.After(1 * time.Second):
			}
		}
	}()

	// We can block here because we are in a coroutine.
	respBuf := pool.GetFullCap(consts.EthernetMtu)
	fmt.Println("*************************************************")
	fmt.Println("DoUDP respBuf cap: %v", cap(respBuf))
	fmt.Println("DoUDP respBuf len: %v", len(respBuf))
	fmt.Println("*************************************************")
	defer pool.Put(respBuf)

	// Wait for response
	var n int
	readStartTime := time.Now()
	if usePacketConn {
		// Use ReadFrom for PacketConn (unconnected socket)
		var from netip.AddrPort
		n, from, err = pktConn.ReadFrom(respBuf)
		readDuration := time.Since(readStartTime)
		fmt.Println("*************************************************")
		fmt.Println("DoUDP ReadFrom n: %v", n)
		if from.IsValid() {
			fmt.Println("DoUDP ReadFrom from: %v", from.String())
		}
		fmt.Println("DoUDP ReadFrom error: %v", err)
		fmt.Println("DoUDP ReadFrom duration: %v", readDuration)
		fmt.Println("DoUDP expected from: %v", targetAddr)
		fmt.Println("*************************************************")
	} else {
		// Use Read for Conn (connected socket)
		n, err = conn.Read(respBuf)
		readDuration := time.Since(readStartTime)
		fmt.Println("*************************************************")
		fmt.Println("DoUDP Read n: %v", n)
		fmt.Println("DoUDP Read error: %v", err)
		fmt.Println("DoUDP Read duration: %v", readDuration)
		fmt.Println("*************************************************")
	}

	if err != nil {
		return nil, err
	}
	var msg dnsmessage.Msg
	if err = msg.Unpack(respBuf[:n]); err != nil {
		return nil, err
	}
	return &msg, nil
}
```

## 网络路径说明

1. Dialer 选择

- **直连模式**：通过 `direct.SymmetricDirect` 直接连接到上游 DNS 服务器
- **代理模式**：通过代理协议（如 VMess、Trojan 等）连接到上游 DNS 服务器

2. Socket 创建

- 在 dae 的网络命名空间中创建 socket
- 设置 `SO_MARK`（通过 `d.dialArgument.mark`）用于路由标记
- 如果是直连，socket 会绑定到宿主机的网络命名空间

3. 数据发送

- 通过 `DialContext` 建立连接
- 写入 DNS 请求数据
- 数据经过内核网络栈，从宿主机网卡发出

4. 网络命名空间切换

- dae 运行在独立的网络命名空间（dae netns）中
- 通过 `control.GetDaeNetns().With()` 切换命名空间
- 直连时，socket 绑定到宿主机命名空间，数据从宿主机网卡发出

# 完整流程图

```text
客户端应用
    ↓ (DNS 请求到 53 端口)
dae0 网卡 (虚拟网卡)
    ↓ (eBPF TC 程序拦截)
eBPF tproxy 重定向
    ↓ (重定向到 tproxy 端口)
用户空间 UDP Listener
    ↓ (识别为 DNS 请求)
DnsController.Handle_
    ↓ (检查缓存)
缓存未命中 → RequestSelect (选择上游 DNS)
    ↓ (选择最佳 dialer)
bestDialerChooser
    ↓ (创建 forwarder)
DoUDP/DoTCP/DoTLS/DoH/DoQ
    ↓ (DialContext 建立连接)
网络命名空间切换
    ↓ (通过 socket 发送)
宿主机网卡 (eth0/wlan0 等)
    ↓ (发送到上游 DNS 服务器)
互联网
```

## 关键点总结

### 1. 接收阶段

- **eBPF 拦截**：在 dae0 网卡上通过 TC 挂载点拦截 UDP 包
- **tproxy 重定向**：将需要代理的流量重定向到用户空间监听端口
- **用户空间接收**：通过 `ListenAndServe` 接收数据

### 2. 处理阶段

- **DNS 识别**：通过目标端口（53）识别 DNS 请求
- **缓存机制**：优先检查缓存，提高响应速度
- **路由选择**：根据域名和类型选择合适的上游 DNS 服务器
- **并发控制**：防止同一查询的重复请求

### 3. 发送阶段

- **Dialer 选择**：根据路由规则选择直连或代理
- **协议支持**：支持 UDP、TCP、TLS、HTTPS、QUIC 等多种协议
- **网络命名空间**：在 dae netns 中创建连接，通过宿主机网卡发送

### 4. 网络路径

- **daens → 宿主机 netns → 宿主机网卡 → 互联网**

# 技术特点

1. **高性能**：通过 eBPF 在较早路径拦截流量，减少内核态与用户态的切换
2. **灵活性**：支持多种 DNS 协议和代理方式
3. **缓存优化**：智能缓存 DNS 响应，减少重复查询
4. **路由策略**：支持基于域名的智能路由选择

# 相关代码文件

- `cmd/run.go` - 程序入口和启动逻辑
- `control/udp.go` - UDP 包处理
- `control/dns_control.go` - DNS 控制器核心逻辑
- `control/dns.go` - DNS Forwarder 实现
- `control/dns_listener.go` - DNS 监听器
- `control/control_plane.go` - 控制平面主逻辑
- `component/dns/dns.go` - DNS 路由选择
