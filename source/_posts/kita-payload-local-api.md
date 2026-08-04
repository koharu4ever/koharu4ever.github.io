---
title: 从静态页面到 Payload Local API：Kita 的数据流怎么形成
date: 2026-08-02 18:00:00
cover: /img/home-sea-girl.jpg
description: 页面效果确定以后，Kita 怎样用 Payload、PostgreSQL、Local API、server getter 和 mapper 建立一条可解释的数据流。
tags:
  - Payload CMS
  - PostgreSQL
  - Next.js
  - 数据流
categories:
  - Kita 开发记录
---

> 这是“Kita 技术选择”系列的第五篇。上一篇先从旧项目中恢复了页面和内容意图；这一篇让静态效果开始承载真实数据。

使用 mock 做页面时，开发体验非常直接。

在文件里写几条 Games 或 Reviews 数据，刷新页面就能看见结果。没有数据库、没有后台、没有 migration，也不会因为连接失败而阻塞 UI。

问题在于，一旦网站准备长期维护，新增一篇评论或一张游戏封面不应该要求修改 TypeScript、重新构建并部署整个应用。

Kita 需要一条真实的数据流。

## 我当时真正需要的不是“再写一个 API”

最初接触全栈时，我很容易把后端等同于 Express 路由：先建一个独立 API 服务，再为每种内容写 CRUD，前端通过 HTTP 请求它。

这种结构没有错，但 Kita 的需求其实更具体：

- 只有我自己登录后台编辑内容；
- 需要 Games、Reviews、Tools 和 Media 等内容模型；
- 需要发布状态和访问控制；
- 需要富文本与文件上传；
- 数据最终进入 PostgreSQL；
- 公开页面主要在 Next.js 服务端读取数据。

如果从 Express 开始，我还要自己补管理后台、认证、schema、migration、上传和类型生成。真正缺少的不是一个 HTTP 框架，而是一套内容管理能力。

这也是我选择 Payload 的原因。

## Payload 在 Kita 中负责哪些事情

Payload 与 Next.js 运行在同一个应用中，承担：

- Admin 管理界面；
- Collections 与字段定义；
- 后台用户认证；
- access control；
- PostgreSQL adapter；
- migration；
- REST、GraphQL 和 Local API；
- Media 上传；
- TypeScript 类型生成；
- Lexical 富文本。

它不是为了给简历增加一个 CMS 名字，而是一次解决了 Kita 原本需要自行连接的多项内容后台能力。

代价也很明确：Payload schema、migration 和生成类型成为项目的重要边界，升级时需要同时理解 Payload 与 Next.js 的变化。

## 为什么底层选择 PostgreSQL

Kita 的内容并不只是几份独立 Markdown。

Games 会关联 Media，Reviews 有发布状态和富文本，后台有用户，数据之间存在关系，也需要可靠 migration。PostgreSQL 适合承担这类持久化数据。

它还符合 Self-host 路线：本地由 Compose 启动 PostgreSQL 16，生产由 Kita 自己的 Compose 运行同一主版本，数据可以通过 `pg_dump` 导出，不依赖某个 CMS 厂商的专有存储。

这并不意味着每个个人站都需要数据库。当前这个 Hexo 博客继续用 Markdown 就很合适。Kita 选择 PostgreSQL，是因为它有后台录入、关系内容和媒体元数据，而不是因为数据库天然比静态文件高级。

## 为什么服务端读取使用 Local API

Next.js 页面和 Payload 在同一个 Node 应用中。

如果服务端组件为了读取自己的 CMS，再向自己的 REST endpoint 发一个 HTTP 请求，会多出网络、序列化、API base URL 和错误处理边界。

Payload Local API 可以直接在服务端调用：

```text
Payload Admin
  -> Collection
  -> PostgreSQL
  -> Payload Local API
  -> server getter
  -> mapper
  -> view model
  -> feature component
  -> app route
```

Local API 仍然使用 Payload 的类型和访问控制，但不需要服务端硬编码 `http://localhost` 或生产域名。

Payload 的 REST 和 GraphQL 路由依旧存在，只是 Kita 当前公开页面没有必要绕一圈 HTTP 才读取同进程数据。

## 为什么不让页面直接调用 Payload

能够直接调用不代表应该到处直接调用。

Kita 把查询集中在 `src/server` 中的 server getter。页面路由只请求“已发布的 Games”或“首页需要的 Tools”，不自己拼 Payload 查询条件。

这样做解决了几个问题：

- server-only 逻辑不会误入客户端组件；
- 发布状态过滤集中在一个位置；
- 数据库失败时有统一行为；
- 页面路由保持薄；
- 查询变化不需要逐个修改组件。

我没有再增加 repository、service、use case 等更多层，因为当前规模下 server getter 已经足够表达边界。

## mapper 为什么不是多余的复制

Payload 生成的 document 类型包含 CMS 所需的字段、关系、内部元数据和可空状态。页面真正需要的是更稳定、更简单的展示模型。

以 Games 封面为例，Payload relationship 可能是 ID，也可能是已经展开的 Media document。组件不应该在每次渲染时重新判断这些 CMS 细节。

mapper 负责：

- 解析 Media 关系；
- 把可空 CMS 字段变成明确的 UI 状态；
- 输出页面真正使用的 view model；
- 隔离 Payload 自动生成类型；
- 让组件测试不需要启动数据库。

这确实产生了一次数据转换，但它把后台 schema 和页面模型之间的变化集中到一个地方。

对 Kita 来说，这比让所有组件直接依赖 Payload document 更容易长期维护。

## 开发 fallback 和生产 fail-fast

从 mock 迁移时，我仍然希望数据库暂时没有内容时可以继续开发页面。因此开发环境可以保留受控的 fallback 或空状态。

生产环境不能用假数据掩盖错误。

如果 PostgreSQL 连接失败或 Payload 查询异常，页面继续显示一组本地 mock，会让网站看起来正常，却把真实数据故障隐藏起来。当前策略是生产明确失败或显示真实空状态，不悄悄回退到演示内容。

这条边界让我区分了两个目的：

```text
开发 fallback
  帮助尚未准备好内容时继续制作 UI

生产 fail-fast
  让数据链路错误能够被发现，而不是被假内容遮住
```

## Tools、Reviews、Games 是逐条迁移的

Kita 没有一次性把所有 mock 删除。

我先为每类内容建立 Collection 和服务端读取，再补 mapper、发布过滤与组件测试。Tools 相对简单，Reviews 引入富文本和发布状态，Games 还涉及 Media、详情页、lightbox 与外部链接。

逐条迁移的好处是每完成一条链路，就能确认：后台录入、数据库保存、服务端读取和页面展示确实形成闭环。

如果一次性重写所有内容，错误会同时出现在 schema、seed、mapper 和 UI 中，反而更难知道问题属于哪一层。

## 为什么当前没有 Prisma、Drizzle 或第二套后端

Payload 已经管理 Collection schema、PostgreSQL adapter、migration 和生成类型。

如果同时为相同内容增加 Prisma 或 Drizzle，我会得到两套 schema 与迁移事实来源。再加 Express、Hono 或 Fastify，则需要决定哪些路由属于 Payload、哪些属于第二个后端。

Kita 当前没有只能由独立业务服务解决的复杂交易或队列任务，因此这些工具没有对应的真实问题。

这不是说它们以后永远不会出现。如果未来产生不适合 CMS 管理的独立业务表，我会重新评估 ORM；但不会为了让架构看起来完整而预先增加它。

## 这条数据流带来的成本

从静态页面走到真实数据以后，项目明显变复杂了：

- schema 修改需要 migration；
- 本地开发需要 PostgreSQL；
- Admin 与公开页面有不同访问边界；
- 生成类型需要保持更新；
- 内容失败不能只靠重新构建修复；
- 数据库和媒体开始需要备份。

这些成本之所以可以接受，是因为它们对应真实需求：我能够在后台新增、修改和发布内容，而不是编辑源码数组。

## 下一层问题出现在图片上

文字和结构进入 Payload 后，Games 封面仍然经历了更曲折的迁移。

最初一张图片对应一个 TypeScript 枚举；后来图片变成静态路径；最终才由 Payload Media 和 Cloudflare R2 管理。

下一篇会专门解释这三次变化，以及为什么内容图片不应该继续要求代码发布。

## 系列导航

- 上一篇：[为什么我重新做了 Kita，而不是继续修旧项目](/2026/08/02/rebuild-kita-not-kralgame/)
- 下一篇：[Games 封面从源码枚举到 Payload Media + R2](/2026/08/03/kita-media-r2/)
