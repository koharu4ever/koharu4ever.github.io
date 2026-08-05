---
title: 为什么 OpenList 是独立应用，而不是 Kita 的一个微服务
date: 2026-08-03 12:00:00
cover: /img/covers/openlist-boundary.webp
description: Games 与资源目录在体验上应该连接，但这不代表 OpenList 必须进入 Kita 的数据库、Compose 和发布流程。
tags:
  - OpenList
  - 系统边界
  - Coolify
  - 架构取舍
categories:
  - Kita 开发记录
series: Kita 开发记录
---

> 这是“Kita 技术选择”系列的第七篇。上一篇把 Games 封面变成由 Payload 管理的内容；这一篇继续划分 Games 与外部文件资源之间的边界。

当 Games 页面逐渐接近“私人游戏馆藏”以后，一个很自然的问题出现了：如果某个条目有对应的公开文件或资料目录，用户应该怎样找到它？

OpenList 能够连接不同存储 provider，提供目录、预览、下载和管理界面。它看起来像 Games 缺少的那块能力。

但“用户需要从 Games 进入 OpenList”并不等于“OpenList 应该成为 Kita 的一部分”。

## 我先分清了三个产品问题

Kita 中有三个容易混在一起的概念：

```text
Reviews
  我怎样看这部游戏？

Games
  这是什么游戏，我整理了哪些资料？

OpenList
  对应的公开文件在哪里？
```

Reviews 是主观内容，Games 是馆藏和元数据，OpenList 是文件目录。

如果 Games 同时承担评论、条目、文件索引和存储凭据，它很快就会从内容页面变成一个并不完整的下载站后台。

把产品职责分开，是后面工程边界的前提。

## 为什么没有把 OpenList 塞进 Kita Compose

OpenList 有自己的运行时、管理员、配置、data 目录、SQLite 状态、存储凭据和版本节奏。

Kita 则由 Next.js、Payload、PostgreSQL 和 backup 组成。

如果把 OpenList 加入同一个 Compose，表面上只多一个 service，实际会产生很多隐含关系：

- 两个系统是否共享网络和 secret；
- Kita 部署是否必须等待 OpenList；
- OpenList 升级是否要触发 Kita 整体发布；
- data volume 由谁备份；
- provider 凭据是否进入 Kita 的环境变量；
- OpenList 故障是否让主站被判断为失败。

这些关系没有为当前用户体验增加明显价值。

因此最终结构是两个独立 Coolify Application：

```text
Kita Application
  Next.js + Payload + PostgreSQL + backup
  https://kita.kral-koharu.com

OpenList Application
  官方镜像 + 自己的管理界面 + data volume
  https://archive.kral-koharu.com
```

它们可以位于同一个 VPS，却不属于同一个发布单元。

## 为什么我不把它称为 Kita 的微服务

“微服务”听起来像一种更正式的架构，但这个词会误导 Kita 与 OpenList 的关系。

Kita 没有通过内部 API 把业务流程拆给 OpenList，也没有共同事务、服务发现、消息队列或内部鉴权。OpenList 本身就是一个完整的独立产品。

Kita 只是把一条公开 HTTPS URL 保存到 `Games.links` 中。

所以更准确的表达是：

> Kita 链接到一个独立的 OpenList 应用，而不是拥有一个 OpenList 微服务。

这也避免为了“微服务架构”而夸大个人项目的规模。

## 为什么第一版只使用 URL

我考虑过让 Kita 深度调用 OpenList API，例如自动读取目录、文件数量或下载状态，再显示在 Games 详情页。

最终没有这样做，因为当前产品任务只需要一个清晰入口。

URL 方案的边界很简单：

- Payload 保存公开链接，不保存管理 token；
- Games 页面只负责展示入口；
- 用户点击后由 OpenList 接管目录体验；
- OpenList 不可用时，Kita 其他内容仍可正常读取；
- 将来更换文件服务，只需更新链接。

API 集成会带来 token、缓存、超时、错误降级和版本兼容，却没有解决 URL 尚未解决的真实问题。

这正是整个系列一直使用的判断方法：不是因为能够集成就一定要集成。

## 为什么没有 fork OpenList 前端

为了让两个站点视觉完全统一，我也可以 fork OpenList 的 SolidJS 前端，修改主题、导航和交互。

这样做会让我承担一套额外前端的依赖升级、上游版本配对和许可证维护成本。每次 OpenList 更新，定制前端都可能需要重新合并。

当前官方前端已经能完成目录和文件访问。相比完全统一视觉，我更重视系统能够独立升级。

因此 Kita 通过命名、域名和跳转文案建立体验联系，不通过维护一个深度 fork 强行让两边成为同一套 UI。

## 为什么不共享数据库、volume 和 secret

独立应用最容易在基础设施层被重新耦合。

如果两边共享 PostgreSQL、volume 或管理员 secret，看起来节省了资源，恢复和安全边界却会变得模糊。

当前原则是：

- Kita 的 PostgreSQL 不保存 OpenList 内部状态；
- OpenList 的 data volume 不挂载进 Kita；
- Kita 不持有 OpenList provider secret；
- 两边独立部署、升级和回滚；
- 两边需要分别记录备份与恢复方法。

公开 URL 是唯一正式连接。

这种松耦合对小项目尤其有价值，因为我不需要同时维护一套复杂的跨服务协议。

## 产品上靠近，工程上分开

从用户角度，一张 Games 封面可以直接进入对应 archive，两个页面关系很紧密。

从系统角度，Kita 不需要 OpenList 才能启动，OpenList 也不需要读取 Kita 的数据库。

```text
用户体验
  Games -> 对应资源目录

系统依赖
  Kita --公开 URL--> OpenList
```

这正是我想要的组合方式：不同工具来自不同项目，只用足够简单的接口连接。

## 我仍然需要承担的风险

把 OpenList 独立出来并没有消除责任。

我仍然需要考虑：

- 公开内容的版权和使用边界；
- archive 是否逐渐让 Kita 变成下载站；
- OpenList data 和 provider 配置怎样备份；
- 存储 provider 失效时怎样替换；
- 公开链接是否需要健康检查；
- 管理入口、2FA 和升级怎样保护。

当前 OpenList 已经独立上线，但最终 storage provider 与完整 data backup 仍是需要继续确认的恢复边界。

把未完成部分写出来，比用“服务解耦”四个字跳过运维责任更诚实。

## 下一层问题：能运行不等于能恢复

到这里，Kita 已经有应用、数据库、媒体对象和独立资源目录。

系统越完整，失败后需要恢复的资产也越多。一个绿色的部署状态只能说明容器现在正在运行，不能证明代码、数据和账号能够从事故中重建。

下一篇会从 CI、migration、PostgreSQL backup 和 restore drill 开始，说明 Kita 怎样从“能部署”走向“知道自己还不能恢复什么”。

## 系列导航

- 上一篇：[Games 封面从源码枚举到 Payload Media + R2](/2026/08/03/kita-media-r2/)
- 下一篇：[从能部署到能恢复：PostgreSQL、R2 与灾难恢复](/2026/08/03/kita-backup-recovery/)
