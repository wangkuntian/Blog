---
title: ICMPv4类型
published: 2025-12-12
description: ""
image: ""
tags: ["网络", "网络基础"]
category: "网络"
draft: false
lang: ""
---

# ICMPv4 Type

| Type   | Name                                                                      | Reference                                                                                                                                           |
| ------ | ------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0      | Echo Reply                                                                | [[RFC792](https://www.iana.org/go/rfc792)]                                                                                                          |
| 1      | Unassigned                                                                |                                                                                                                                                     |
| 2      | Unassigned                                                                |                                                                                                                                                     |
| 3      | Destination Unreachable                                                   | [[RFC792](https://www.iana.org/go/rfc792)]                                                                                                          |
| 4      | Source Quench (Deprecated)                                                | [[RFC792](https://www.iana.org/go/rfc792)][[RFC6633](https://www.iana.org/go/rfc6633)]                                                              |
| 5      | Redirect                                                                  | [[RFC792](https://www.iana.org/go/rfc792)]                                                                                                          |
| 6      | Alternate Host Address (Deprecated)                                       | [[RFC6918](https://www.iana.org/go/rfc6918)]                                                                                                        |
| 7      | Unassigned                                                                |                                                                                                                                                     |
| 8      | Echo                                                                      | [[RFC792](https://www.iana.org/go/rfc792)]                                                                                                          |
| 9      | Router Advertisement                                                      | [[RFC1256](https://www.iana.org/go/rfc1256)]                                                                                                        |
| 10     | Router Solicitation                                                       | [[RFC1256](https://www.iana.org/go/rfc1256)]                                                                                                        |
| 11     | Time Exceeded                                                             | [[RFC792](https://www.iana.org/go/rfc792)]                                                                                                          |
| 12     | Parameter Problem                                                         | [[RFC792](https://www.iana.org/go/rfc792)]                                                                                                          |
| 13     | Timestamp                                                                 | [[RFC792](https://www.iana.org/go/rfc792)]                                                                                                          |
| 14     | Timestamp Reply                                                           | [[RFC792](https://www.iana.org/go/rfc792)]                                                                                                          |
| 15     | Information Request (Deprecated)                                          | [[RFC792](https://www.iana.org/go/rfc792)][[RFC6918](https://www.iana.org/go/rfc6918)]                                                              |
| 16     | Information Reply (Deprecated)                                            | [[RFC792](https://www.iana.org/go/rfc792)][[RFC6918](https://www.iana.org/go/rfc6918)]                                                              |
| 17     | Address Mask Request (Deprecated)                                         | [[RFC950](https://www.iana.org/go/rfc950)][[RFC6918](https://www.iana.org/go/rfc6918)]                                                              |
| 18     | Address Mask Reply (Deprecated)                                           | [[RFC950](https://www.iana.org/go/rfc950)][[RFC6918](https://www.iana.org/go/rfc6918)]                                                              |
| 19     | Reserved (for Security)                                                   | [[Solo](https://www.iana.org/assignments/icmp-parameters/icmp-parameters.xhtml#Solo)]                                                               |
| 20-29  | Reserved (for Robustness Experiment)                                      | [[ZSu](https://www.iana.org/assignments/icmp-parameters/icmp-parameters.xhtml#ZSu)]                                                                 |
| 30     | Traceroute (Deprecated)                                                   | [[RFC1393](https://www.iana.org/go/rfc1393)][[RFC6918](https://www.iana.org/go/rfc6918)]                                                            |
| 31     | Datagram Conversion Error (Deprecated)                                    | [[RFC1475](https://www.iana.org/go/rfc1475)][[RFC6918](https://www.iana.org/go/rfc6918)]                                                            |
| 32     | Mobile Host Redirect (Deprecated)                                         | [[David_Johnson](https://www.iana.org/assignments/icmp-parameters/icmp-parameters.xhtml#David_Johnson)][[RFC6918](https://www.iana.org/go/rfc6918)] |
| 33     | IPv6 Where-Are-You (Deprecated)                                           | [[Simpson](https://www.iana.org/assignments/icmp-parameters/icmp-parameters.xhtml#Simpson)][[RFC6918](https://www.iana.org/go/rfc6918)]             |
| 34     | IPv6 I-Am-Here (Deprecated)                                               | [[Simpson](https://www.iana.org/assignments/icmp-parameters/icmp-parameters.xhtml#Simpson)][[RFC6918](https://www.iana.org/go/rfc6918)]             |
| 35     | Mobile Registration Request (Deprecated)                                  | [[Simpson](https://www.iana.org/assignments/icmp-parameters/icmp-parameters.xhtml#Simpson)][[RFC6918](https://www.iana.org/go/rfc6918)]             |
| 36     | Mobile Registration Reply (Deprecated)                                    | [[Simpson](https://www.iana.org/assignments/icmp-parameters/icmp-parameters.xhtml#Simpson)][[RFC6918](https://www.iana.org/go/rfc6918)]             |
| 37     | Domain Name Request (Deprecated)                                          | [[RFC1788](https://www.iana.org/go/rfc1788)][[RFC6918](https://www.iana.org/go/rfc6918)]                                                            |
| 38     | Domain Name Reply (Deprecated)                                            | [[RFC1788](https://www.iana.org/go/rfc1788)][[RFC6918](https://www.iana.org/go/rfc6918)]                                                            |
| 39     | SKIP (Deprecated)                                                         | [[Markson](https://www.iana.org/assignments/icmp-parameters/icmp-parameters.xhtml#Markson)][[RFC6918](https://www.iana.org/go/rfc6918)]             |
| 40     | Photuris                                                                  | [[RFC2521](https://www.iana.org/go/rfc2521)]                                                                                                        |
| 41     | ICMP messages utilized by experimental mobility protocols such as Seamoby | [[RFC4065](https://www.iana.org/go/rfc4065)]                                                                                                        |
| 42     | Extended Echo Request                                                     | [[RFC8335](https://www.iana.org/go/rfc8335)]                                                                                                        |
| 43     | Extended Echo Reply                                                       | [[RFC8335](https://www.iana.org/go/rfc8335)]                                                                                                        |
| 44-252 | Unassigned                                                                |                                                                                                                                                     |
| 253    | RFC3692-style Experiment 1                                                | [[RFC4727](https://www.iana.org/go/rfc4727)]                                                                                                        |
| 254    | RFC3692-style Experiment 2                                                | [[RFC4727](https://www.iana.org/go/rfc4727)]                                                                                                        |
| 255    | Reserved                                                                  | [[JBP](https://www.iana.org/assignments/icmp-parameters/icmp-parameters.xhtml#JBP)]                                                                 |

# ICMPv4 Code Fields

## Type 0 — Echo Reply

| Codes | Description | Reference |
| ----- | ----------- | --------- |
| 0     | No Code     |           |

## Type 1 — Unassigned

| Codes                          | Description | Reference |
| ------------------------------ | ----------- | --------- |
| No registrations at this time. |             |           |

## Type 2 — Unassigned

| Codes                          | Description | Reference |
| ------------------------------ | ----------- | --------- |
| No registrations at this time. |

## Type 3 — Destination Unreachable

| Codes  | Description                                                           | Reference                                    |
| ------ | --------------------------------------------------------------------- | -------------------------------------------- |
| 0      | Net Unreachable                                                       | [[RFC792](https://www.iana.org/go/rfc792)]   |
| 1      | Host Unreachable                                                      | [[RFC792](https://www.iana.org/go/rfc792)]   |
| 2      | Protocol Unreachable                                                  | [[RFC792](https://www.iana.org/go/rfc792)]   |
| 3      | Port Unreachable                                                      | [[RFC792](https://www.iana.org/go/rfc792)]   |
| 4      | Fragmentation Needed and Don't Fragment was Set                       | [[RFC792](https://www.iana.org/go/rfc792)]   |
| 5      | Source Route Failed                                                   | [[RFC792](https://www.iana.org/go/rfc792)]   |
| 6      | Destination Network Unknown                                           | [[RFC1122](https://www.iana.org/go/rfc1122)] |
| 7      | Destination Host Unknown                                              | [[RFC1122](https://www.iana.org/go/rfc1122)] |
| 8      | Source Host Isolated                                                  | [[RFC1122](https://www.iana.org/go/rfc1122)] |
| 9      | Communication with Destination Network is Administratively Prohibited | [[RFC1122](https://www.iana.org/go/rfc1122)] |
| 10     | Communication with Destination Host is Administratively Prohibited    | [[RFC1122](https://www.iana.org/go/rfc1122)] |
| 11     | Destination Network Unreachable for Type of Service                   | [[RFC1122](https://www.iana.org/go/rfc1122)] |
| 12     | Destination Host Unreachable for Type of Service                      | [[RFC1122](https://www.iana.org/go/rfc1122)] |
| 13     | Communication Administratively Prohibited                             | [[RFC1812](https://www.iana.org/go/rfc1812)] |
| 14     | Host Precedence Violation                                             | [[RFC1812](https://www.iana.org/go/rfc1812)] |
| 15     | Precedence cutoff in effect                                           | [[RFC1812](https://www.iana.org/go/rfc1812)] |

## Type 4 — Source Quench (Deprecated)

| Codes  | Description  | Reference  |
| ------ | ------------ | ---------- |
| 0      | No Code      |            |

## Type 5 — Redirect

| Codes  | Description                                           | Reference  |
| ------ | ----------------------------------------------------- | ---------- |
| 0      | Redirect Datagram for the Network (or subnet)         |            |
| 1      | Redirect Datagram for the Host                        |            |
| 2      | Redirect Datagram for the Type of Service and Network |            |
| 3      | Redirect Datagram for the Type of Service and Host    |            |

## Type 6 — Alternate Host Address (Deprecated)

| Codes  | Description                | Reference  |
| ------ | -------------------------- | ---------- |
| 0      | Alternate Address for Host |            |

## Type 7 — Unassigned

| Codes                          | Description | Reference |
| ------------------------------ | ----------- | --------- |
| No registrations at this time. |

## Type 8 — Echo

| Codes  | Description  | Reference  |
| ------ | ------------ | ---------- |
| 0      | No Code      |            |

## Type 9 — Router Advertisement

| Codes  | Description                   | Reference                                    |
| ------ | ----------------------------- | -------------------------------------------- |
| 0      | Normal router advertisement   | [[RFC3344](https://www.iana.org/go/rfc3344)] |
| 16     | Does not route common traffic | [[RFC3344](https://www.iana.org/go/rfc3344)] |

## Type 10 — Router Selection

| Codes  | Description  | Reference  |
| ------ | ------------ | ---------- |
| 0      | No Code      |            |

## Type 11 — Time Exceeded

| Codes  | Description                       | Reference  |
| ------ | --------------------------------- | ---------- |
| 0      | Time to Live exceeded in Transit  |            |
| 1      | Fragment Reassembly Time Exceeded |            |

## Type 12 — Parameter Problem

| Codes  | Description                 | Reference                                    |
| ------ | --------------------------- | -------------------------------------------- |
| 0      | Pointer indicates the error |                                              |
| 1      | Missing a Required Option   | [[RFC1108](https://www.iana.org/go/rfc1108)] |
| 2      | Bad Length                  |                                              |

## Type 13 — Timestamp

| Codes  | Description  | Reference  |
| ------ | ------------ | ---------- |
| 0      | No Code      |            |

## Type 14 — Timestamp Reply

| Codes  | Description  | Reference  |
| ------ | ------------ | ---------- |
| 0      | No Code      |            |

## Type 15 — Information Request (Deprecated)

| Codes  | Description  | Reference  |
| ------ | ------------ | ---------- |
| 0      | No Code      |            |

## Type 16 — Information Reply (Deprecated)

| Codes  | Description  | Reference  |
| ------ | ------------ | ---------- |
| 0      | No Code      |            |

## Type 17 — Address Mask Request (Deprecated)

| Codes  | Description  | Reference  |
| ------ | ------------ | ---------- |
| 0      | No Code      |            |

## Type 18 — Address Mask Reply (Deprecated)

| Codes  | Description  | Reference  |
| ------ | ------------ | ---------- |
| 0      | No Code      |            |

## Type 19 — Reserved (for Security)

| Codes                          | Description | Reference |
| ------------------------------ | ----------- | --------- |
| No registrations at this time. |

## Types 20-29 — Reserved (for Robustness Experiment)

| Codes                          | Description | Reference |
| ------------------------------ | ----------- | --------- |
| No registrations at this time. |

## Type 30 — Traceroute (Deprecated)

| Codes                          | Description | Reference |
| ------------------------------ | ----------- | --------- |
| No registrations at this time. |

## Type 31 — Datagram Conversion Error (Deprecated)

| Codes                          | Description | Reference |
| ------------------------------ | ----------- | --------- |
| No registrations at this time. |

## Type 32 — Mobile Host Redirect (Deprecated)

| Codes                          | Description | Reference |
| ------------------------------ | ----------- | --------- |
| No registrations at this time. |

## Type 33 — IPv6 Where-Are-You (Deprecated)

| Codes                          | Description | Reference |
| ------------------------------ | ----------- | --------- |
| No registrations at this time. |

## Type 34 — IPv6 I-Am-Here (Deprecated)

| Codes                          | Description | Reference |
| ------------------------------ | ----------- | --------- |
| No registrations at this time. |

## Type 35 — Mobile Registration Request (Deprecated)

| Codes                          | Description | Reference |
| ------------------------------ | ----------- | --------- |
| No registrations at this time. |

## Type 36 — Mobile Registration Reply (Deprecated)

| Codes                          | Description | Reference |
| ------------------------------ | ----------- | --------- |
| No registrations at this time. |

## Type 37 — Domain Name Request (Deprecated)

| Codes                          | Description | Reference |
| ------------------------------ | ----------- | --------- |
| No registrations at this time. |             |           |

## Type 38 — Domain Name Reply (Deprecated)

| Codes                          | Description | Reference |
| ------------------------------ | ----------- | --------- |
| No registrations at this time. |

## Type 39 — SKIP (Deprecated)

| Codes                          | Description | Reference |
| ------------------------------ | ----------- | --------- |
| No registrations at this time. |

## Type 40 — Photuris

| Codes  | Description           | Reference  |
| ------ | --------------------- | ---------- |
| 0      | Bad SPI               |            |
| 1      | Authentication Failed |            |
| 2      | Decompression Failed  |            |
| 3      | Decryption Failed     |            |
| 4      | Need Authentication   |            |
| 5      | Need Authorization    |            |

## Type 41 — ICMP messages utilized by experimental mobility protocols such as Seamoby

| Codes                          | Description | Reference |
| ------------------------------ | ----------- | --------- |
| No registrations at this time. |

## Type 42 — Extended Echo Request

| Codes  | Description  | Reference                                    |
| ------ | ------------ | -------------------------------------------- |
| 0      | No Error     | [[RFC8335](https://www.iana.org/go/rfc8335)] |
| 1-255  | Unassigned   |                                              |

## Type 43 — Extended Echo Reply

| Codes  | Description                       | Reference                                    |
| ------ | --------------------------------- | -------------------------------------------- |
| 0      | No Error                          | [[RFC8335](https://www.iana.org/go/rfc8335)] |
| 1      | Malformed Query                   | [[RFC8335](https://www.iana.org/go/rfc8335)] |
| 2      | No Such Interface                 | [[RFC8335](https://www.iana.org/go/rfc8335)] |
| 3      | No Such Table Entry               | [[RFC8335](https://www.iana.org/go/rfc8335)] |
| 4      | Multiple Interfaces Satisfy Query | [[RFC8335](https://www.iana.org/go/rfc8335)] |
| 5-255  | Unassigned                        |                                              |

## Types 44-252 — Unassigned

| Codes                          | Description | Reference |
| ------------------------------ | ----------- | --------- |
| No registrations at this time. |

## Type 253 — RFC3692-style Experiment 1

| Codes                          | Description | Reference |
| ------------------------------ | ----------- | --------- |
| No registrations at this time. |

## Type 254 — RFC3692-style Experiment 2

| Codes                          | Description | Reference |
| ------------------------------ | ----------- | --------- |
| No registrations at this time. |
