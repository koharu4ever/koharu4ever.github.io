---
title: 我到底在 Kita 里保存什么：Games、Reviews、Tools 和 Media
date: 2026-08-04 17:10:00
cover: /img/covers/kita-data-model.webp
description: 不从数据库名词开始，而是直接拆开 Kita 当前五个 Payload Collections，说明哪些字段已经合理，哪些仍是过渡状态。
tags:
  - Payload CMS
  - 数据建模
  - PostgreSQL
  - 内容设计
categories:
  - Kita 真实开发记录
series: Kita 真实开发记录
---

Kita 当前注册了五个 Payload Collections：

```ts
collections: [Users, Media, Tools, Reviews, Games]
```

这五个名字并不代表五张孤立的后台表。它们回答的是五种不同问题：谁能进入后台、图片放哪里、工具怎样排序、测评怎样发布、游戏怎样展示。

真正的数据模型就在 `src/payload/collections/`，不是页面截图，也不是早期设计文档。

## Users：现在只有一种管理员

`Users` 的当前配置非常短：

```ts
export const Users: CollectionConfig = {
  slug: "users",
  auth: true,
  admin: {
    useAsTitle: "email",
  },
  fields: [],
};
```

它解决 Payload Admin 登录，没有 role、昵称或公开个人资料。Kita 目前是单管理员项目，所以没有提前做 editor/admin 分权。

这也意味着“以后找人只负责内容”不是现在已经具备的能力。那时需要新增角色字段、Admin 访问规则和相关测试，而不是简单创建第二个账号就算完成权限设计。

## Media：图片文件与图片说明的唯一入口

Media 保存的业务字段只有 `alt`，其他 filename、mime type、宽高和不同尺寸由 Payload upload 管理。

```text
原图
  -> thumbnail 400px WebP
  -> display 1600px WebP
```

本地文件写进 `.payload-media`；生产切换到 R2。PostgreSQL 保存 Media document 和关系，R2 保存图片二进制。

权限在这里是显式的：

```text
read                 公开
create/update/delete 登录用户
```

当前 Media 明确服务公开站点图片，因此公开 URL 合理。它不应该被顺手拿来保存私人文件；以后如有私密资源，应使用另一套 Collection、bucket 和访问控制。

## Tools：最简单，也最像目录

Tools 有五个核心字段：

```text
title
description
url
category
sortOrder
```

它没有 slug、详情页、draft 或 Rich Text。前台 getter 按 `sortOrder` 查询，mapper 再把 Payload document 转成 `ToolkitItem`。

Tools 的 read 永远返回 true，因为它本来就是公开资源目录。它当前真正没有决定的是内容归属：继续由 CMS 维护，还是保留少量内置静态项。两套来源长期并存会让人不知道哪边才是事实源。

## Reviews：已经能写长文，但仍有几个手填字段

Reviews 当前保存：

```text
title / slug
status: draft | published
gameTitle
publishedAt
excerpt
coverImage
rating: 0-10
readingTime
tags[]
body: Lexical Rich Text
```

公开读取只允许 `status = published`；登录用户可以看到 draft。

这套结构可以发布测评，但有三个明显的过渡状态。

第一，`gameTitle` 是普通文本，不是 Games relationship。标题改名时，Review 不会自动同步，也不能可靠地反向查询“这个 Game 有哪些 Reviews”。

第二，`coverImage` 仍然是文本 URL，没有迁移到 Media。Games 已解决的上传、alt、宽高与 R2 持久化问题，在 Reviews 上还没有统一。

第三，`readingTime` 是手填字符串。它允许写 `6` 或 `6 min read`，前端再格式化。当前内容少时够用，但它不是由正文自动计算的可靠数据。

这些不是必须立即重构的错误。只有真实 Reviews 增加、字段漂移开始发生时，relationship 和自动计算才有明确收益。

## Games：一个状态字段不够，所以分成两个

Games 没有使用一个含糊的 `status`，而是分开：

```text
playStatus
  finished | playing | planned

publicationStatus
  draft | published
```

前者描述我和游戏的关系，后者决定网站访客是否能看到内容。一个 planned Game 仍然可以 published；一个 finished Game 也可以暂时 draft。

其他字段是：

```text
title / originalTitle / slug
developer / releaseDate
summary / body
cover -> Media
tags[]
links[] { label, href }
```

`cover` 已经是必填 Media relationship。getter 使用 `depth: 1` 取得填充后的 Media document，mapper 优先使用 1600px display，缺失时才使用原图。如果 relationship 没展开或尺寸不可用，会明确抛错：

```text
Game "<slug>" has no resolvable Media cover
```

这比返回一张默认图严格，但能让损坏的数据在服务端暴露，而不是悄悄进入页面。

## Links 是现在最松的字段

Games 的 `links` 只有 `label` 和 `href`。OpenList archive 目前通过 label `Game archive` 识别。

好处是没有为了一个链接生成 migration；坏处是管理员把 label 改成 `Archive`，按钮可能消失。`href` 当前也只是 required text，还没有只允许 `https:` 的验证。

当链接种类变多时，更稳定的模型可能是：

```text
kind: archive | official | store
label
href
```

但今天只有一个明确约定时，先补字段说明和 URL 验证，比为了“模型漂亮”立刻改数据库更合适。

## 为什么页面不直接使用这些 Document

Payload generated type 是后端数据形状，页面需要的是稳定 view model：

```text
Game document
  -> mapGameDocumentToGameDetail
  -> GameDetail

Review document
  -> mapReviewDocumentToReviewPreview
  -> ReviewPreview

Tool document
  -> mapToolDocumentToToolkitItem
  -> ToolkitItem
```

例如 Payload tags 是 `{ label }[]`，前端只需要 `string[]`；Media document 很大，Games UI 只需要 `src/alt/width/height`。

mapper 不是为了增加层数，而是明确哪里允许数据库结构变化，哪里必须保持页面合同。

## 当前模型最值得补的不是新 Collection

从当前源码看，优先级更高的是把已有边界补完整：

1. 为 Games/Reviews 的 slug 和 URL 增加输入验证；
2. 把 create/update/delete 权限显式写在 Collection 中，避免依赖 Payload 默认登录检查；
3. 抽出 Games 与 Reviews 共用的 Lexical 配置；
4. 真实 Reviews 增长后，再评估 `Reviews.cover -> Media`；
5. 关联需求出现后，再把 `gameTitle` 改为 Games relationship；
6. 出现误删风险后，再启用 Trash 或版本历史。

Payload 官方的默认访问控制会要求请求中存在已登录用户，但把写权限显式写出来仍然更容易审查，详见 [Payload Access Control](https://payloadcms.com/docs/access-control/overview)。

这个数据模型没有追求“内容平台该有的所有能力”。它保留了当前网站真正使用的字段，也留下了几个可以被真实内容验证的过渡点。

下一篇沿着一条 Game 数据继续走：[打开一个 Games 页面时，数据到底走了哪条路](/2026/08/04/kita-real-request-path/)。
