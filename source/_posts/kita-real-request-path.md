---
title: 打开一个 Games 页面时，数据到底走了哪条路
date: 2026-08-04 17:15:00
cover: /img/covers/kita-request-path.webp
description: 跟踪一次真实的 /games/[slug] 请求，从 Cloudflare、Next Route、Payload Local API、PostgreSQL 一直到 R2 图片和 OpenList 外链。
tags:
  - Next.js
  - Payload Local API
  - 数据流
  - 排错
categories:
  - Kita 真实开发记录
---

假设浏览器打开：

```text
https://kita.kral-koharu.com/games/white-album-2
```

页面上最后只看到标题、封面、正文和几个按钮，但这次请求会穿过两条不同的网络路径：HTML 由 Kita 生成，封面图片由 R2 custom domain 提供。

把这条路画完整以后，很多“页面坏了”的问题就不再需要从头猜。

## 第一段：请求先找到正在运行的 Web Container

```text
Browser
  -> DNS / Cloudflare
  -> Coolify 反向代理
  -> Kita web container:3000
  -> Next.js App Router
```

Cloudflare 和 Coolify 不理解 Game 数据。它们只负责把域名请求交给健康的 Kita 容器。

如果这里失败，常见表现是 TLS、域名、代理或 503；它与某条 Game 的 `slug` 是否存在还没有关系。

## 第二段：Next Route 取得 slug

对应文件是：

```text
src/app/(site)/games/[slug]/page.tsx
```

route 从 `params` 取出 `white-album-2`，调用：

```ts
const game = await getGameBySlug(slug);
```

查不到时执行 `notFound()`；查到后把稳定的 `GameDetail` 交给 `GameDetailPage`。

这个页面声明了：

```ts
export const dynamic = "force-dynamic";
```

因此内容在请求时读取，不是构建时把所有 Games 永久烤进 HTML。

## Metadata 现在会再查一次

同一个 route 还在 `generateMetadata()` 中调用 `getGameBySlug(slug)`，用于生成标题和 description。

当前实现没有对这次 getter 做 request cache，因此一个详情请求可能产生两次相同查询：

```text
generateMetadata -> getGameBySlug
page             -> getGameBySlug
```

内容量很小时这不是事故，但它是一个可以通过日志确认、再用 React request cache 收口的真实优化点。不能因为代码看起来重复，就在没有测量前引入全局缓存策略。

## 第三段：Getter 在服务器里调用 Payload

`src/server/games/get-games.ts` 不会拼接 `/api/games` URL，也不会从浏览器发 fetch。

它先取得 Payload client：

```ts
getPayload({ config })
```

再执行 Local API 查询：

```ts
payload.find({
  collection: "games",
  depth: 1,
  limit: 1,
  overrideAccess: false,
  where: {
    and: [
      { slug: { equals: slug } },
      { publicationStatus: { equals: "published" } },
    ],
  },
});
```

这里有四个容易忽略的决定：

- `Local API`：Next 和 Payload 在同一个 Node 服务内，不多走一次 HTTP；
- `overrideAccess: false`：明确要求查询遵守 Collection access；
- `published`：即使知道 draft slug，公开页面也不读取；
- `depth: 1`：把 `cover` relationship 展开成 Media document，而不是只得到一个 ID。

Payload 官方说明 Local API 默认会跳过 access control，因此 Kita 显式传入 `overrideAccess: false` 是有意的安全边界：[Payload Local API Access Control](https://payloadcms.com/docs/local-api/access-control)。

## 第四段：Payload 才去 PostgreSQL

```text
getGameBySlug
  -> Payload Local API
  -> PostgreSQL adapter
  -> games / media 等表
  -> Payload Game document
```

PostgreSQL 保存 Game 字段、Media 元数据和两者关系。图片二进制不在数据库里。

查询结果仍然是 Payload 的 document 形状，其中包含很多 UI 不需要知道的字段。它不会直接传进 React 组件。

## 第五段：Mapper 把后端形状收窄

`mapGameDocumentToGameDetail()` 负责把数据变成：

```text
slug / title / developer / summary / body
playStatus -> status
tags objects -> string[]
links objects -> link DTO[]
Media document -> cover { src, alt, width, height }
```

封面优先使用 `sizes.display`；如果 display 不完整，再尝试原图。两边都不能解析时抛错，而不是给页面一张无来源的 placeholder。

这一层也是数据库与 UI 的断点。以后 Media 字段变化时，优先改 mapper，不需要让 Gallery、Lightbox 和详情页到处理解 Payload。

## 第六段：Server Component 组合 HTML

`GameDetailPage` 接收 `GameDetail`，使用 Payload Rich Text renderer 输出正文，再把需要交互的区域交给 Client Components。

大部分标题、简介和正文可以在服务器生成 HTML；lightbox、键盘导航、滚动锁定等需要浏览器状态的部分才在客户端运行。

所以“Next.js 页面”不是全部在服务器，也不是全部在浏览器。路由和数据读取偏服务器，交互状态偏客户端。

## 第七段：浏览器另外去 R2 下载图片

HTML 中的封面 URL 来自 Media document：

```text
https://<media-custom-domain>/media/<filename>
```

浏览器收到 HTML 后，直接向这个公开域名请求图片：

```text
Browser ── HTML ──> Kita web container
Browser ── image ─> Cloudflare R2 custom domain
```

图片不需要再次穿过 Kita Web 容器。这也是 `disablePayloadAccessControl` 只适用于公开 Media 的原因。

因此这些症状代表不同层：

```text
页面 200、图片 404
  -> 先查 Media URL、R2 object、custom domain

页面直接 500
  -> 先查 getter、Payload、PostgreSQL、mapper

整个域名 503
  -> 先查 container、entrypoint、health 和 proxy
```

## OpenList 是第三条独立请求

如果用户点击 `Game archive`，浏览器才访问：

```text
https://archive.kral-koharu.com/...
```

Kita server 不调用 OpenList API。Payload 只保存公开 URL，浏览器完成跳转。

所以 OpenList 暂时不可用时，Game 的标题、正文和封面仍然可以显示；坏的是一个外部操作入口，不是 Kita 的核心读取链。

## 开发环境为什么有时“数据库坏了页面还在”

getter 在 development 中允许本地 fallback：Payload 为空或查询失败时，返回 `gameItems`。production 则返回空或抛错，不用假数据掩盖真实故障。

这意味着本地看到 `white-album-2`，不能单凭页面判断数据库中已有这条记录。要验证数据链，必须同时检查 Payload Admin 或 API 响应。

## 我现在用这张图排错

```text
域名 / TLS
  -> Coolify proxy
  -> web container / entrypoint
  -> Next route
  -> server getter
  -> Payload config + access
  -> PostgreSQL
  -> mapper
  -> Server/Client Components
  -> R2 image
  -> 可选 OpenList link
```

排错不再从“重启 VPS”开始，而是先问：哪一段已经有 200，哪一段第一次出现错误。

下一篇把同一条链反过来，从 Admin 写入开始：[发布一条 Game 不是点一下 Save](/2026/08/04/kita-real-content-workflow/)。
