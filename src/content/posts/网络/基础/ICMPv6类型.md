---
title: ICMPv6类型
published: 2025-12-12
description: ""
image: ""
tags: ["网络", "网络基础"]
category: "网络"
draft: false
lang: ""
---

# ICMPv6 Type

| Type    | Name                                                                      | Reference                                    |
| ------- | ------------------------------------------------------------------------- | -------------------------------------------- |
| 0       | Reserved                                                                  |                                              |
| 1       | Destination Unreachable                                                   | [[RFC4443](https://www.iana.org/go/rfc4443)] |
| 2       | Packet Too Big                                                            | [[RFC4443](https://www.iana.org/go/rfc4443)] |
| 3       | Time Exceeded                                                             | [[RFC4443](https://www.iana.org/go/rfc4443)] |
| 4       | Parameter Problem                                                         | [[RFC4443](https://www.iana.org/go/rfc4443)] |
| 5-99    | Unassigned                                                                |                                              |
| 100     | Private experimentation                                                   | [[RFC4443](https://www.iana.org/go/rfc4443)] |
| 101     | Private experimentation                                                   | [[RFC4443](https://www.iana.org/go/rfc4443)] |
| 102-126 | Unassigned                                                                |                                              |
| 127     | Reserved for expansion of ICMPv6 error messages                           | [[RFC4443](https://www.iana.org/go/rfc4443)] |
| 128     | Echo Request                                                              | [[RFC4443](https://www.iana.org/go/rfc4443)] |
| 129     | Echo Reply                                                                | [[RFC4443](https://www.iana.org/go/rfc4443)] |
| 130     | Multicast Listener Query                                                  | [[RFC2710](https://www.iana.org/go/rfc2710)] |
| 131     | Multicast Listener Report                                                 | [[RFC2710](https://www.iana.org/go/rfc2710)] |
| 132     | Multicast Listener Done                                                   | [[RFC2710](https://www.iana.org/go/rfc2710)] |
| 133     | Router Solicitation                                                       | [[RFC4861](https://www.iana.org/go/rfc4861)] |
| 134     | Router Advertisement                                                      | [[RFC4861](https://www.iana.org/go/rfc4861)] |
| 135     | Neighbor Solicitation                                                     | [[RFC4861](https://www.iana.org/go/rfc4861)] |
| 136     | Neighbor Advertisement                                                    | [[RFC4861](https://www.iana.org/go/rfc4861)] |
| 137     | Redirect Message                                                          | [[RFC4861](https://www.iana.org/go/rfc4861)] |
| 138     | Router Renumbering                                                        | [[RFC2894](https://www.iana.org/go/rfc2894)] |
| 139     | ICMP Node Information Query                                               | [[RFC4620](https://www.iana.org/go/rfc4620)] |
| 140     | ICMP Node Information Response                                            | [[RFC4620](https://www.iana.org/go/rfc4620)] |
| 141     | Inverse Neighbor Discovery Solicitation Message                           | [[RFC3122](https://www.iana.org/go/rfc3122)] |
| 142     | Inverse Neighbor Discovery Advertisement Message                          | [[RFC3122](https://www.iana.org/go/rfc3122)] |
| 143     | Version 2 Multicast Listener Report                                       | [[RFC9777](https://www.iana.org/go/rfc9777)] |
| 144     | Home Agent Address Discovery Request Message                              | [[RFC6275](https://www.iana.org/go/rfc6275)] |
| 145     | Home Agent Address Discovery Reply Message                                | [[RFC6275](https://www.iana.org/go/rfc6275)] |
| 146     | Mobile Prefix Solicitation                                                | [[RFC6275](https://www.iana.org/go/rfc6275)] |
| 147     | Mobile Prefix Advertisement                                               | [[RFC6275](https://www.iana.org/go/rfc6275)] |
| 148     | Certification Path Solicitation Message                                   | [[RFC3971](https://www.iana.org/go/rfc3971)] |
| 149     | Certification Path Advertisement Message                                  | [[RFC3971](https://www.iana.org/go/rfc3971)] |
| 150     | ICMP messages utilized by experimental mobility protocols such as Seamoby | [[RFC4065](https://www.iana.org/go/rfc4065)] |
| 151     | Multicast Router Advertisement                                            | [[RFC4286](https://www.iana.org/go/rfc4286)] |
| 152     | Multicast Router Solicitation                                             | [[RFC4286](https://www.iana.org/go/rfc4286)] |
| 153     | Multicast Router Termination                                              | [[RFC4286](https://www.iana.org/go/rfc4286)] |
| 154     | FMIPv6 Messages                                                           | [[RFC5568](https://www.iana.org/go/rfc5568)] |
| 155     | RPL Control Message                                                       | [[RFC6550](https://www.iana.org/go/rfc6550)] |
| 156     | ILNPv6 Locator Update Message                                             | [[RFC6743](https://www.iana.org/go/rfc6743)] |
| 157     | Duplicate Address Request                                                 | [[RFC6775](https://www.iana.org/go/rfc6775)] |
| 158     | Duplicate Address Confirmation                                            | [[RFC6775](https://www.iana.org/go/rfc6775)] |
| 159     | MPL Control Message                                                       | [[RFC7731](https://www.iana.org/go/rfc7731)] |
| 160     | Extended Echo Request                                                     | [[RFC8335](https://www.iana.org/go/rfc8335)] |
| 161     | Extended Echo Reply                                                       | [[RFC8335](https://www.iana.org/go/rfc8335)] |
| 162-199 | Unassigned                                                                |                                              |
| 200     | Private experimentation                                                   | [[RFC4443](https://www.iana.org/go/rfc4443)] |
| 201     | Private experimentation                                                   | [[RFC4443](https://www.iana.org/go/rfc4443)] |
| 202-254 | Unassigned                                                                |                                              |
| 255     | Reserved for expansion of ICMPv6 informational messages                   | [[RFC4443](https://www.iana.org/go/rfc4443)] |

# ICMPv6 Code Fields

## Type 0 - Reserved

| Code                           |
| ------------------------------ |
| No registrations at this time. |

## Type 1 - Destination Unreachable

| Code  | Name                                                       | Reference                                                                                      |
| ----- | ---------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| 0     | no route to destination                                    |                                                                                                |
| 1     | communication with destination administratively prohibited |                                                                                                |
| 2     | beyond scope of source address                             | [[RFC4443](https://www.iana.org/go/rfc4443)]                                                   |
| 3     | address unreachable                                        |                                                                                                |
| 4     | port unreachable                                           |                                                                                                |
| 5     | source address failed ingress/egress policy                | [[RFC4443](https://www.iana.org/go/rfc4443)]                                                   |
| 6     | reject route to destination                                | [[RFC4443](https://www.iana.org/go/rfc4443)]                                                   |
| 7     | Error in Source Routing Header                             | [[RFC6550](https://www.iana.org/go/rfc6550)][[RFC6554](https://www.iana.org/go/rfc6554)]       |
| 8     | Headers too long                                           | [[RFC8883](https://www.iana.org/go/rfc8883)]                                                   |
| 9     | Error in P-Route                                           | [[RFC-ietf-roll-dao-projection-40](https://www.iana.org/go/draft-ietf-roll-dao-projection-40)] |

## Type 2 - Packet Too Big

| Code  |
| ----- |
| 0     |

## Type 3 - Time Exceeded

| Code  | Name                              |
| ----- | --------------------------------- |
| 0     | hop limit exceeded in transit     |
| 1     | fragment reassembly time exceeded |

## Type 4 - Parameter Problem

| Code  | Name                                                           | Reference                                    |
| ----- | -------------------------------------------------------------- | -------------------------------------------- |
| 0     | erroneous header field encountered                             |                                              |
| 1     | unrecognized Next Header type encountered                      |                                              |
| 2     | unrecognized IPv6 option encountered                           |                                              |
| 3     | IPv6 First Fragment has incomplete IPv6 Header Chain           | [[RFC7112](https://www.iana.org/go/rfc7112)] |
| 4     | SR Upper-layer Header Error                                    | [[RFC8754](https://www.iana.org/go/rfc8754)] |
| 5     | Unrecognized Next Header type encountered by intermediate node | [[RFC8883](https://www.iana.org/go/rfc8883)] |
| 6     | Extension header too big                                       | [[RFC8883](https://www.iana.org/go/rfc8883)] |
| 7     | Extension header chain too long                                | [[RFC8883](https://www.iana.org/go/rfc8883)] |
| 8     | Too many extension headers                                     | [[RFC8883](https://www.iana.org/go/rfc8883)] |
| 9     | Too many options in extension header                           | [[RFC8883](https://www.iana.org/go/rfc8883)] |
| 10    | Option too big                                                 | [[RFC8883](https://www.iana.org/go/rfc8883)] |

## Type 128 - Echo Request

| Code  |
| ----- |
| 0     |

## Type 129 - Echo Reply

| Code  |
| ----- |
| 0     |

## Type 130 - Multicast Listener Query

| Code  |
| ----- |
| 0     |

## Type 131 - Multicast Listener Report

| Code  |
| ----- |
| 0     |

## Type 132 - Multicast Listener Done

| Code  |
| ----- |
| 0     |

## Type 133 - Router Solicitation

| Code  |
| ----- |
| 0     |

## Type 134 - Router Advertisement

| Code  |
| ----- |
| 0     |

## Type 135 - Neighbor Solicitation

| Code  |
| ----- |
| 0     |

## Type 136 - Neighbor Advertisement

| Code  |
| ----- |
| 0     |

## Type 137 - Redirect Message

| Code  |
| ----- |
| 0     |

## Type 138 - Router Renumbering

| Code  | Name                       |
| ----- | -------------------------- |
| 0     | Router Renumbering Command |
| 1     | Router Renumbering Result  |
| 255   | Sequence Number Reset      |

## Type 139 - ICMP Node Information Query

| Code  | Name                                                                                                      | Reference                                    |
| ----- | --------------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| 0     | The Data field contains an IPv6 address which is the Subject of this Query.                               | [[RFC4620](https://www.iana.org/go/rfc4620)] |
| 1     | The Data field contains a name which is the Subject of this Query, or is empty, as in the case of a NOOP. | [[RFC4620](https://www.iana.org/go/rfc4620)] |
| 2     | The Data field contains an IPv4 address which is the Subject of this Query.                               | [[RFC4620](https://www.iana.org/go/rfc4620)] |

## Type 140 - ICMP Node Information Response

| Code  | Name                                                                                    | Reference                                    |
| ----- | --------------------------------------------------------------------------------------- | -------------------------------------------- |
| 0     | A successful reply. The Reply Data field may or may not be empty.                       | [[RFC4620](https://www.iana.org/go/rfc4620)] |
| 1     | The Responder refuses to supply the answer. The Reply Data field will be empty.         | [[RFC4620](https://www.iana.org/go/rfc4620)] |
| 2     | The Qtype of the Query is unknown to the Responder. The Reply Data field will be empty. | [[RFC4620](https://www.iana.org/go/rfc4620)] |

## Type 141 - Inverse Neighbor Discovery

| Code  |
| ----- |
| 0     |

## Type 142 - Inverse Neighbor Discovery

| Code  |
| ----- |
| 0     |

## Type 144 - Home Agent Address Discovery

| Code  |
| ----- |
| 0     |

## Type 145 - Home Agent Address Discovery

| Code  |
| ----- |
| 0     |

## Type 146 - Mobile Prefix Solicitation

| Code  |
| ----- |
| 0     |

## Type 147 - Mobile Prefix Advertisement

| Code  |
| ----- |
| 0     |

## Type 157 - Duplicate Address Request Code Suffix

| Code Suffix  | Meaning                              | Reference                                    |
| ------------ | ------------------------------------ | -------------------------------------------- |
| 0            | DAR message                          | [[RFC6775](https://www.iana.org/go/rfc6775)] |
| 1            | EDAR message with 64-bit ROVR field  | [[RFC8505](https://www.iana.org/go/rfc8505)] |
| 2            | EDAR message with 128-bit ROVR field | [[RFC8505](https://www.iana.org/go/rfc8505)] |
| 3            | EDAR message with 192-bit ROVR field | [[RFC8505](https://www.iana.org/go/rfc8505)] |
| 4            | EDAR message with 256-bit ROVR field | [[RFC8505](https://www.iana.org/go/rfc8505)] |
| 5-15         | Unassigned                           |                                              |

## Type 158 - Duplicate Address Confirmation Code Suffix

| Code Suffix  | Meaning                              | Reference                                    |
| ------------ | ------------------------------------ | -------------------------------------------- |
| 0            | DAC message                          | [[RFC6775](https://www.iana.org/go/rfc6775)] |
| 1            | EDAC message with 64-bit ROVR field  | [[RFC8505](https://www.iana.org/go/rfc8505)] |
| 2            | EDAC message with 128-bit ROVR field | [[RFC8505](https://www.iana.org/go/rfc8505)] |
| 3            | EDAC message with 192-bit ROVR field | [[RFC8505](https://www.iana.org/go/rfc8505)] |
| 4            | EDAC message with 256-bit ROVR field | [[RFC8505](https://www.iana.org/go/rfc8505)] |
| 5-15         | Unassigned                           |                                              |

## Type 160 - Extended Echo Request

| Code  | Name       | Reference                                    |
| ----- | ---------- | -------------------------------------------- |
| 0     | No Error   | [[RFC8335](https://www.iana.org/go/rfc8335)] |
| 1-255 | Unassigned |                                              |

## Type 161 - Extended Echo Reply

| Code  | Name                              | Reference                                    |
| ----- | --------------------------------- | -------------------------------------------- |
| 0     | No Error                          | [[RFC8335](https://www.iana.org/go/rfc8335)] |
| 1     | Malformed Query                   | [[RFC8335](https://www.iana.org/go/rfc8335)] |
| 2     | No Such Interface                 | [[RFC8335](https://www.iana.org/go/rfc8335)] |
| 3     | No Such Table Entry               | [[RFC8335](https://www.iana.org/go/rfc8335)] |
| 4     | Multiple Interfaces Satisfy Query | [[RFC8335](https://www.iana.org/go/rfc8335)] |
| 5-255 | Unassigned                        |                                              |
