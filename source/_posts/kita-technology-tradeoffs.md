---
title: Kita 用了哪些技术，以及我刻意没有使用什么
date: 2026-08-03 18:00:00
cover: /img/covers/technology-tradeoffs.webp
description: Kita 的技术栈不是一张依赖清单，而是从代码基座、开发环境、内容、部署到恢复逐层解决真实问题后的结果。
tags:
  - Kita
  - 技术栈
  - 架构取舍
  - 项目总结
categories:
  - Kita 开发记录
series: Kita 技术选择
---

> 这是“Kita 技术选择”系列的第九篇。前八篇按照真实顺序记录了每层问题；这一篇不再追逐新工具，而是回看整套组合为什么长成现在这样。

如果只列依赖，Kita 看起来是一组常见名词：Next.js、React、TypeScript、Payload、PostgreSQL、Docker、Coolify、Cloudflare R2 和 OpenList。

这种列表无法说明项目。

它没有告诉我为什么需要 Payload 却不需要 NextAuth，为什么选择 PostgreSQL 却没有再加入 Drizzle，为什么使用 OpenList 却拒绝把它放进 Kita Compose，也没有解释 Dev Container 和 R2 分别解决哪一层问题。

Kita 真正的技术栈不是依赖总和，而是一条选择历史。

## 最初不是从技术栈开始，而是从审美开始

我先知道自己不想做什么样的网站。

我不想让它变成标准 SaaS dashboard，也不想为了展示全栈能力制造用户、支付和社区功能。Kita 应该是带有视觉小说氛围的个人内容站和私人游戏文化档案馆。

这个视觉审美后来对应了一套工程审美：

- 配置应该能被自己解释；
- 开发环境应该跟随仓库；
- 生产环境尽量由自己掌握；
- 数据、文件和外部服务边界清楚；
- 可以借鉴成熟项目，但不复制不需要的全家桶；
- 新技术只有在真实问题出现时才加入。

所以我所说的“找到适合审美的技术，拼出自己的技术栈”，并不是把喜欢的工具全部堆起来。

它更接近：

```text
遇到真实问题
  -> 寻找方案和参考
  -> 理解每个方案的原始目的
  -> 判断是否适合自己的内容与维护能力
  -> 只吸收需要的部分
  -> 用简单边界连接
  -> 在实际运行中继续修正
```

## 三段视频形成三层原始基座

Kita 最早的工程方向可以追溯到三段视频。

第一段是 [Create your own Next.js Starter Template](https://www.youtube.com/watch?v=dLRKV-bajS4)。它让我学习怎样区分 Generator、Starter、SaaS Starter 和 Toolkit，再为格式、检查、编辑器、目录、路由与环境变量逐项选择工具。

第二段是 [you should be using dev containers](https://www.youtube.com/watch?v=kPMA9cnpScU)。它让我意识到，源码之外的 Node、pnpm、系统工具和编辑器扩展也可以写进仓库。

第三段是 [Coolify Crash Course / Self Host 101](https://www.youtube.com/watch?v=taJlPG82Ucw)。它把 VPS、HTTPS、GitHub 部署、Docker Compose、PostgreSQL、S3-compatible storage 和备份连成一条生产路线。

三段视频分别成为：

| 基座 | 最初回答的问题 | Kita 保留的思想 |
| --- | --- | --- |
| 代码基座 | Next.js 项目怎样开始 | 工具必须对应问题，规则跟随仓库 |
| 开发环境基座 | 项目怎样在新电脑重建 | Dev Container、DIND、编辑器与运行时一体化 |
| 生产运行基座 | 应用怎样离开本地 | Self-host、Coolify、Compose、域名、数据与备份 |

它们没有提供 Kita 的最终答案。Payload、R2、OpenList 和恢复流程，是后来在真实开发中继续增加的层。

## 应用层：Next.js、React、TypeScript 与定制样式

Next.js 提供 App Router、服务端组件、构建和 standalone 生产输出。React 负责页面和交互组件，TypeScript 保护数据边界，Typed Routes 检查一部分内部链接。

样式上，Kita 使用 Tailwind 处理通用布局，再用 CSS Modules 和全局 CSS 完成更定制的视觉。

这种组合解决的是“普通部分保持高效，辨识度部分保留控制权”。

首页的雨滴效果没有引入 Three.js，而是使用 Canvas 2D 与较小的 WebGL shader；Games 的封面墙借鉴 Vercel Image Gallery 的布局与 lightbox，却没有把它的存储选择和整个模板一起复制。

我会借用成熟交互，但不会让参考项目替我决定 Kita 的产品和视觉。

## 内容层：Payload、PostgreSQL、Lexical 与 mapper

Payload 负责 Admin、Collections、后台认证、access control、API、上传、migration 和类型生成。PostgreSQL 保存内容、用户、关系和 Media 元数据，Lexical 承载 Games 与 Reviews 的富文本。

公开页面的服务端读取使用 Payload Local API，不为同一个 Node 应用额外制造内部 HTTP 请求。

server getter 集中查询与发布过滤，mapper 再把 Payload document 转成页面稳定的 view model。

这条链路是：

```text
Payload Admin
  -> Collection
  -> PostgreSQL
  -> Local API
  -> server getter
  -> mapper
  -> feature component
  -> route
```

它比静态数组复杂，但换来了真实后台、关系内容、migration 和可测试的数据边界。

## 媒体层：Payload Media、Sharp 与 R2

Games 封面最初是源码枚举，后来是静态路径，最终才成为必填 Payload Media relationship。

本地文件写入 `.payload-media`，生产对象进入 Cloudflare R2。Sharp 生成 thumbnail 与 display，Next Image 在页面渲染阶段继续做优化。

选择 R2 不是因为对象存储天然高级，而是生产容器本地文件不适合长期内容；图片也不应该每增加一张就修改源码并重新部署。

代价是恢复必须同时考虑 PostgreSQL 元数据和 R2 对象。

## 开发层：pnpm、Corepack、Dev Container 与 DIND

pnpm、Corepack 和 lockfile 固定包管理器与依赖解析。ESLint、Prettier、TypeScript 和 Vitest分别检查排版、静态规则、类型和关键逻辑。

Dev Container 把 Node 22、系统工具、VS Code 扩展和生命周期命令写进仓库；Docker-in-Docker 在开发容器内部运行 PostgreSQL Compose。

Windows 宿主机只需要 Git、Docker、VS Code 和浏览器。

`.next` root 污染与 9P I/O 性能问题也说明这套方案有真实代价。Kita 最后通过普通用户守卫和两个 targeted named volume 修正，而不是把容器描述成自动解决一切的黑盒。

## 生产层：Dockerfile、Compose、Coolify 与 Cloudflare

多阶段 Dockerfile 负责应用镜像，Next standalone 减少运行文件，非 root 用户降低容器权限。

Compose 管理 `web`、`postgres`、`backup` 和数据 volume。Coolify 在 VPS 上管理构建、环境变量、域名和部署，Cloudflare 承担 DNS、HTTPS 相关入口与 R2。

GitHub Actions 和 main Ruleset 在代码进入部署前执行质量门禁，生产 migration 在服务器上推进数据库 schema。

这些工具没有合并成一个万能平台，而是通过 Git、容器、环境变量、网络和 S3-compatible storage 连接。

## 外部资源层：OpenList 只通过 URL 连接

OpenList 是独立 Coolify Application，拥有自己的管理员、data、存储凭据和发布节奏。

Kita 只在 `Games.links` 中保存公开 HTTPS URL，不调用内部 API，不共享数据库、volume 和 secret，也不维护 SolidJS 前端 fork。

用户体验上，Games 可以直接进入对应资源目录；系统架构上，OpenList 故障不会阻止 Kita 启动。

这是整套组合里最能体现边界的一项选择：产品关系紧密，不代表部署和数据必须耦合。

## 可靠性层：CI、migration、backup 与恢复清单

格式、lint、类型、单元测试和生产 build 构成合并门禁。Payload migration 管理生产 schema，backup sidecar 使用 `pg_dump --format=custom`、`pg_restore --list` 和 rclone，把 PostgreSQL dump 上传到私有 R2 bucket。

但 Kita 仍然没有完成全部恢复证明。

定时 dump 已经运行，本地源码重建已经验证；生产 PostgreSQL 完整 restore drill、R2 Media 独立恢复和全新 VPS/Coolify 演练仍然待完成。

我把“知道缺什么”也视为架构的一部分。比起用“生产级”概括系统，明确未验证边界更有价值。

## 我刻意没有采用什么

没有采用的技术并不是不好，只是当前没有对应问题。

| 没有采用 | Kita 当前的判断 |
| --- | --- |
| Express / Hono / Fastify | Payload 已覆盖当前需要的 Admin、CRUD、Auth、API 和访问控制 |
| Prisma / Drizzle | 内容 schema 与 migration 已由 Payload 管理，不需要第二套事实来源 |
| Auth.js / NextAuth | 没有公开用户登录，Payload Admin auth 已满足私有后台 |
| Redis / 队列 / 微服务 | 没有相应规模、异步任务和独立团队边界 |
| tRPC | Server Components + Payload Local API 已覆盖内部类型化读取 |
| MUI / Ant Design / Chakra / HeroUI | 通用组件风格不符合 Kita 的定制视觉方向 |
| Three.js | 当前雨滴只需要小型 2D shader 层 |
| Vercel Blob | Payload Media + R2 已覆盖生产图片存储 |
| Cloudflare Images | Sharp + R2 已覆盖尺寸生成与对象保存 |
| OpenList API 深度集成 | 公开 URL 已完成任务，API 会增加 token、缓存和故障耦合 |
| OpenList 前端 fork | 官方界面已够用，不值得承担版本配对和长期维护 |

这张表不是永久禁用名单。

如果以后出现公开用户，认证问题会重新成立；如果出现不适合 CMS 的复杂业务表，独立 ORM 可能合理；如果后台需要耗时任务，队列也可能成为真实需求。

现在不采用，只表示我不为想象中的未来提前支付复杂度。

## 哪些早期判断后来改变了

Kita 并不是沿着一份完美路线图完成的。

- PostgreSQL 从需要手工启动，变成由 `pnpm dev` 自动启动和等待；
- 开发环境从不增加 named volume，变成只为 `.next` 与 `node_modules` 增加性能 volume；
- Games 从 mock、`coverKey` 和静态路径，走到 Payload Media + R2；
- OpenList 从评估项变成独立上线应用；
- 数据库备份从路线图变成定时 sidecar；
- 构建从被 root 缓存阻断，走到用户、所有权和并发守卫；
- 项目从没有测试，走到 mapper、配置和备份脚本的自动检查。

这些变化没有破坏“选择适合自己的技术栈”这条主线，反而证明它需要允许修正。

技术审美不是固执地保留第一次选择，而是在新证据出现时仍然能解释为什么改变。

## Kita 最终证明的不是技术数量

Kita 不是高并发商业平台，也不是成熟社区产品。

它真正完成的是一条适合单人维护的工程链路：

```text
页面和内容模型
  -> 私有管理后台
  -> PostgreSQL
  -> 服务端读取与 mapper
  -> Media 与对象存储
  -> 测试和质量门禁
  -> 容器构建
  -> Self-host 部署
  -> 备份与恢复边界
```

对我这个最初只是想建立自己 Next.js Starter 的初学者来说，最大的收获不是终于收集齐一套“现代技术栈”。

而是我开始能够说清楚：每个工具是什么时候进入项目的，它解决了什么，我为什么只保留其中一部分，它带来了什么代价，以及什么情况下我会再次替换它。

这就是 Kita 一直以来的发展方式，也是这个系列真正想记录的东西。

如果想继续查看具体配置、执行顺序、故障和回滚，可以从工程案例系列的第一篇开始：

- [在 Windows 上为 Next.js 配置 Dev Container](/2026/08/04/kita-case-devcontainer-setup/)

如果还不熟悉 `package.json`、环境变量、migration、Git、Pull Request 或 CI，可以先从基础系列开始：

- [拿到一个陌生仓库，我应该先看什么](/2026/08/04/kita-basics-read-repository/)

如果想看 commit 时间线、真实 503、当前内容工作流和仍未关闭的缺口，可以进入真实开发记录：

- [Kita 不是按路线图做出来的](/2026/08/04/kita-real-timeline/)

## 系列导航

- 上一篇：[从能部署到能恢复：PostgreSQL、R2 与灾难恢复](/2026/08/03/kita-backup-recovery/)
- 从头阅读：[从一个视频开始：我怎样为 Kita 搭起 Next.js 开发基座](/2026/08/01/kita-project-notes/)
- 基础系列：[从零读懂 Kita](/2026/08/04/kita-basics-read-repository/)
- 真实开发记录：[从 Git 历史开始](/2026/08/04/kita-real-timeline/)
