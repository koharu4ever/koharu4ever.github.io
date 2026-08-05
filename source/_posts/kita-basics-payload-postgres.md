---
title: Payload、PostgreSQL、Collection、CRUD 和 Adapter 的关系
date: 2026-08-04 16:25:00
cover: /img/covers/payload-postgres.webp
description: 用 Kita 的真实数据流解释 CMS、数据库、Collection、Document、CRUD、关系、Adapter、Admin 和 Local API。
tags:
  - Payload CMS
  - PostgreSQL
  - 数据库基础
  - 初学者
categories:
  - Kita 从零理解
series: Kita 从零理解
---

> 这是“从零读懂 Kita”系列的第六篇。上一篇解释配置怎样进入不同环境；这一篇解释 Kita 的内容究竟怎样进入数据库和页面。

## Payload 不是数据库

这是我一开始最容易混淆的地方。

```text
Payload
  内容管理系统和应用层能力

PostgreSQL
  持久保存结构化数据的数据库
```

Payload 提供 Admin、Collection、认证、访问控制、API、上传、类型生成和 migration；PostgreSQL 保存用户、内容、关系和 Media 元数据。

如果停止 Payload，数据仍在 PostgreSQL 中；但失去 Payload 后，我需要自己理解表结构、认证和业务规则。

## CMS 是什么

CMS 是 Content Management System，内容管理系统。

对 Kita 来说，它解决：

- 我怎样登录私有后台；
- 怎样创建 Games、Reviews、Tools；
- 字段哪些必填；
- 谁可以读写；
- 富文本怎样编辑；
- 图片怎样上传；
- 数据怎样提供给前台。

它不是“数据库可视化工具”这么简单，而是把内容规则与管理界面连接起来。

## Collection 是什么

Payload Collection 可以理解成一类内容的定义，例如：

```text
Users
Media
Tools
Reviews
Games
```

Games Collection 定义：

- title；
- slug；
- developer；
- publicationStatus；
- summary 与 rich text body；
- cover Media relationship；
- tags 与 links；
- 公开访问过滤。

Collection 不是单条游戏，它是“游戏内容应该具备什么结构”的 schema。

## Document 是什么

Collection 中的一条实际记录叫 document。

```text
Games Collection
  -> Game A document
  -> Game B document
  -> Game C document
```

在 PostgreSQL 中，它们最终会映射到表、列和关联记录；在 Payload API 中，它们表现为带字段的 TypeScript/JSON 对象。

## CRUD 是什么

CRUD 是四类基本数据操作：

```text
Create  创建
Read    读取
Update  更新
Delete  删除
```

Payload Admin 让管理员执行这些操作，Payload API 让服务端代码执行这些操作，access control 决定当前请求是否有权限。

拥有 CRUD 不等于所有人都应该拥有全部权限。例如 Kita 的 Media：公开访客可以 Read，只有登录管理员可以 Create、Update、Delete。

## Relationship 是什么

Games 不直接保存一整张图片，而是通过 `cover` 关联一个 Media document。

```text
Games.cover
  -> Media.id
  -> Media URL / alt / width / height
```

PostgreSQL 使用外键保护这种关系。Payload Local API 可以按指定 depth 展开关联 document。

relationship 只有 ID 和完整 document 是两种不同运行状态，mapper 需要明确处理。

## Database Adapter 做什么

Payload 支持不同数据库，Adapter 是 Payload 与具体数据库之间的翻译层。

根据 [Payload Database 文档](https://payloadcms.com/docs/database/overview)，Adapter 把 Payload 内部的数据结构转换成数据库原生结构。

Kita 配置：

```ts
db: postgresAdapter({
  pool: {
    connectionString: payloadEnv.DATABASE_URI,
  },
  prodMigrations: migrations,
});
```

它负责连接 PostgreSQL，并让 Payload 的 Collection、关系和 migration 落到关系数据库。

Adapter 不是另一个数据库，`DATABASE_URI` 也不是 Payload 自己的数据格式。

## Admin 与公开站点怎样共存

Kita 把 Payload 集成在同一个 Next.js 应用：

```text
/admin
  Payload 管理界面

/api/...
  Payload REST/GraphQL 路由

/games /reviews /tools
  公开 Next.js 页面
```

后台负责写入，公开页面主要在服务端通过 Local API 读取。

这不是前后端两个仓库，也没有独立 Express server。

## Local API 是什么

Next.js 与 Payload 在同一个 Node 进程中时，服务端可以直接调用 Payload：

```text
server getter
  -> Payload Local API
  -> PostgreSQL
```

不需要先向自己的 REST URL 发 HTTP 请求。

优点：

- 少一层网络和序列化；
- 不需要服务端硬编码 base URL；
- 类型和 Payload 配置可以直接使用；
- 查询集中在 server-only 代码。

REST 仍然存在，只是当前公开服务端页面不需要绕远路。

## 完整数据流

写入：

```text
管理员
  -> Payload Admin
  -> Collection validation / access
  -> PostgreSQL
```

读取：

```text
app route
  -> server getter
  -> Payload Local API
  -> PostgreSQL
  -> Payload document
  -> mapper
  -> view model
  -> feature component
```

mapper 把 CMS document 转成 UI 真正需要的模型，让组件不必理解 Payload 内部字段与可空关系。

## Generated Types 是什么

Payload 根据 Collection 生成：

```text
src/payload/payload-types.ts
```

修改 Collection 后运行：

```bash
pnpm payload:types
```

这个文件由工具维护，不应该手工添加业务字段。类型生成让 server getter、mapper 和测试知道 document 当前形状。

## 为什么 Kita 没有 Prisma、Drizzle 或 Express

Payload 已提供：

- Admin；
- Auth；
- CRUD；
- access control；
- PostgreSQL adapter；
- schema/migration；
- Local/REST/GraphQL API；
- upload；
- generated types。

再为同一批内容增加第二套 ORM 或后端，会产生重复 schema 与职责。

如果以后出现不适合 CMS 的独立业务数据，再重新评估，不提前支付复杂度。

## Seed 是什么

Seed 是为了开发或测试快速写入一组已知数据的脚本。

它不是 production migration，也不应该在生产自动运行。

Kita 要求：

```text
NODE_ENV 不是 production
+ ENABLE_DEV_SEED=true
```

才允许 seed route 工作。使用结束后恢复 `false`。

## 常见误解

- Payload 不等于 PostgreSQL；
- Collection 不等于单条 document；
- TypeScript type 不会自动修改数据库表；
- Local API 不代表数据存在内存中；
- Admin 能打开不代表公开权限正确；
- seed 不是备份，也不是 migration；
- 删除 Docker database volume 不等于“重新生成类型”。

下一篇专门解释最容易让初学者害怕的 migration：为什么修改 Collection 后，生产数据库不能只靠重新启动自动跟上。

## 系列导航

- 上一篇：[环境变量到底是什么](/2026/08/04/kita-basics-environment-variables/)
- 下一篇：[我一开始不懂 Migration：数据库为什么不能跟着代码自动变](/2026/08/04/kita-basics-migrations/)
- 相关决策：[从静态页面到 Payload Local API](/2026/08/02/kita-payload-local-api/)
