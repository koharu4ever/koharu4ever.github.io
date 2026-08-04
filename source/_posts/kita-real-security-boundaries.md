---
title: Kita 的门锁装在哪里：Admin、数据库、R2 与 Secret
date: 2026-08-04 17:25:00
cover: /img/home-rain-harbor.jpg
description: 按公开入口、登录边界、内部网络和 Secret 存储检查 Kita 当前安全模型，同时保留尚未处理的风险。
tags:
  - 安全
  - Payload CMS
  - Secret
  - Cloudflare R2
categories:
  - Kita 真实开发记录
---

Kita 没有企业级安全团队，也不需要写一份假装覆盖所有威胁的安全白皮书。

对一个公开内容站，更实际的问题是：哪些东西本来就要公开，哪些入口必须登录，哪些服务不应该出现在公网，哪些密钥一旦泄露就必须轮换。

## 先列出我真正要保护的东西

```text
公开内容
  Games / Reviews / Tools / 公开 Media

管理权限
  Payload Admin 账号和 session

持久数据
  PostgreSQL、Media R2、backup R2、OpenList data

基础设施控制权
  GitHub、Coolify、VPS、Cloudflare、域名

秘密
  PAYLOAD_SECRET、数据库密码、R2 keys、SSH keys
```

不是每一项都用同一种锁。公开图片不需要登录读取，但删除图片必须受保护；Admin 路径可以公开访问登录页，但数据库端口不应该公开。

## 公开站点和公开 API

Kita 的 Next.js 与 Payload 在同一个应用中。除了页面，Payload 还注册了：

```text
/admin
/api/<collection>
/api/graphql
```

REST 和 GraphQL 路由存在并不等于所有 document 都公开。Collection access 决定每种 operation 是否允许。

当前读取规则是：

| Collection | 匿名读取 |
|---|---|
| Games | 只允许 `publicationStatus = published` |
| Reviews | 只允许 `status = published` |
| Tools | 全部公开 |
| Media | 全部公开 |
| Users | 使用 Payload 默认认证边界 |

Media 公开是因为它服务公开站点封面；Tools 公开是因为它本来就是资源目录。Games 和 Reviews 的 draft 不应该因为 API 存在就泄露。

## Admin 路径不是秘密

`/admin` 可以被扫描到，路径名称本身不能当作保护。真正的边界是 Users Collection 的认证、Payload session 和各 Collection access。

Kita 目前只有一个管理员类型，没有 role。单人维护阶段够用，但它带来一个很直接的后果：如果以后给别人 Admin 账号，对方默认不是“只写文章的编辑”，而是同类管理员。多人协作前必须先做角色和权限设计。

同时，项目还没有配置 Payload email adapter。忘记密码流程并没有完整的生产邮件发送能力，这一点不应等到真的丢失登录再发现。

## 写权限目前安全，但不够显眼

Media 已明确写出：

```text
create/update/delete -> isAuthenticated
```

Games、Reviews 和 Tools 只自定义了 read，没有逐项写出 create/update/delete。Payload 官方当前默认 access 会检查请求中是否存在登录用户，因此这不是“匿名用户可以任意写数据库”的现状：[Payload Access Control](https://payloadcms.com/docs/access-control/overview)。

但默认安全不等于边界清楚。把写权限显式写成 `isAuthenticated` 有两个价值：代码审查时一眼可见，未来升级或复制 Collection 时不依赖记忆中的框架默认行为。

这也是当前项目状态里已经记录、但尚未实现的小 PR。

## Local API 有一个相反的默认值

Payload Local API 默认 `overrideAccess: true`，也就是服务端调用会跳过 access control。Kita 的公开 getter 因此主动设置：

```ts
overrideAccess: false
```

并额外筛选 published。

这条设置比“Local API 不走 HTTP”更值得记住。服务端代码并不会因为在仓库内部就天然安全；它拥有更高权限，必须明确什么时候代表公开访客，什么时候执行受信任的后台任务。

官方说明见 [Respecting Access Control with Local API Operations](https://payloadcms.com/docs/local-api/access-control)。

## Seed 为什么有两道开关

Kita 的开发 seed route 只有同时满足下面条件才工作：

```text
NODE_ENV !== production
ENABLE_DEV_SEED=true
```

生产环境固定 `ENABLE_DEV_SEED=false`。这防止一个为了方便本地开发的 HTTP route 变成公开写入入口。

但环境变量只是 guard，不是应该频繁切换的功能开关。使用 seed 前仍要确认连接的是开发数据库。

## PostgreSQL 不需要被公网看到

生产 Compose 中 `postgres` 没有映射主机端口。Web 和 backup 通过内部 service name `postgres` 连接：

```text
Internet
  -> web:3000

Compose internal network
  web    -> postgres:5432
  backup -> postgres:5432
```

数据库密码同时出现在 PostgreSQL 初始化变量和 `DATABASE_URI` 中，两者必须一致。已有 volume 建立后，只修改 `POSTGRES_PASSWORD` 环境变量通常不会自动改变数据库内部用户密码；轮换必须先修改数据库，再同步连接串。

## R2 实际上有两种完全不同的权限

Kita 使用 R2 做两件事：

```text
Media bucket
  公开读取图片，应用需要上传/删除能力

Backup bucket
  保存 PostgreSQL dump，不应该公开读取
```

它们不应共享一个全账户、全 bucket token。凭据应该限制到具体 bucket 和必要 operation。

公开 Media URL 可以进入 HTML；`MEDIA_R2_ACCESS_KEY_ID` 和 `MEDIA_R2_SECRET_ACCESS_KEY` 只能存在于运行时 Secret。backup 凭据只给 backup container，不给浏览器，也不需要进入 Next client bundle。

## 哪些环境变量可以被浏览器看到

Next.js 中带 `NEXT_PUBLIC_` 的变量会进入客户端构建。Kita 目前公开的是站点 URL：

```text
NEXT_PUBLIC_SITE_URL
```

`PAYLOAD_SECRET`、`DATABASE_URI` 和 R2 secret 都不能添加这个前缀，也不能通过 Client Component、错误信息或调试页面返回。

CI 使用的是无生产价值的 build placeholder，不持有 Coolify、PostgreSQL 或 R2 生产凭据。Pull Request 代码在通过审查前不应该获得这些权限。

## 已经发生过一次 Secret 越界

项目状态文档记录：早期 Coolify 截图曾直接显示 Payload Secret 和数据库连接凭据。

删除截图不能让已经暴露的值重新变成秘密。正确处理应当是：

1. 确认备份；
2. 生成新 Payload Secret 和数据库密码；
3. 真正修改数据库内部密码；
4. 同步 Coolify 变量；
5. redeploy；
6. 检查 migration、Admin 登录和前台查询。

当前事实是：项目所有者决定暂缓这次生产 Secret 轮换。文章不能把计划写成已经完成。

## Backup 也需要安全边界

backup container 已做了几项限制：只读 root filesystem、临时 `/tmp`、drop all capabilities、`no-new-privileges`，并且不挂载 PostgreSQL data volume。它只通过数据库连接生成 dump，再上传 R2。

但“自动备份成功”没有消除这些问题：

- backup token 泄露后能做什么；
- R2 账号本身失去访问时怎么办；
- dump 是否含管理员账号和其他敏感内容；
- restore 是否真的可用；
- 谁能读取恢复材料。

备份扩大了恢复能力，也增加了一份需要保护的数据副本。

## 当前还没有关上的门

按现在的源码和状态文档，仍需保留这些风险：

- Games/Reviews/Tools 写权限尚未显式声明；
- slug 和外链验证仍然不足；
- 生产 Secret 轮换暂缓；
- 没有管理员角色分级；
- 没有生产邮件找回密码；
- 没有专用 health endpoint 和 backup last-success 告警；
- PostgreSQL、R2 Media 和 VPS 的恢复演练没有全部闭环；
- OpenList 最终 storage 与 data backup 尚未定型。

这份清单不是“项目不安全”的结论，而是当前安全承诺的边界。对 Kita 来说，下一步不是增加一套昂贵安全平台，而是先把已有默认权限显式化、轮换已经越界的 Secret，并验证恢复。

下一篇讨论另一种长期风险：[一个人维护全栈项目，我准备怎样升级 Kita](/2026/08/04/kita-real-upgrade-maintenance/)。

