---
title: Kita 不是按路线图做出来的：从 6 月 13 日到 Media 上线
date: 2026-08-04 17:00:00
cover: /img/covers/kita-timeline.webp
description: 不从最终架构倒推设计，而是沿着 Kita 的真实 Git 历史，看看一个个人项目怎样在问题出现后逐层长出来。
tags:
  - Kita
  - Git
  - 项目复盘
  - 时间线
categories:
  - Kita 真实开发记录
---

Kita 的第一个 commit 是 2026 年 6 月 13 日。

```text
cd3aa03 chore: establish engineering base
```

它一次加入了 98 个文件和 17079 行变化。这个数字看起来像项目已经做了很多，其实其中有 lockfile，也有大量把旧项目和新项目重新讲清楚的 Markdown。页面、数据、部署和恢复并没有在第一天同时完成。

如果只看现在的 `main`，很容易编出一条过于漂亮的故事：先设计架构，再选择技术，然后逐项实现。Git 历史讲的是另一件事——每解决一个真实问题，项目才多长出一层。

## 6 月 13 日：我先建立的不是页面

第一批文件里已经有 Next.js、Payload、PostgreSQL、Dev Container、Dockerfile 和 Compose，但真正的重点是边界：

```text
src/app       路由
src/features  页面功能
src/server    服务端读取
src/payload   内容模型
```

旧 Kralgame 的全屏背景、雨滴、游戏墙和打字机句子是视觉参考；旧 `package.json`、`.env`、lockfile 和散落在组件里的 Payload URL 没有直接搬过来。

这一步受 CJ 的 Next.js Starter 视频和 `w3cj/next-start` 启发，但最后只留下我需要的工程习惯：ESLint、Prettier、类型化环境变量和比较清楚的目录。NextAuth、Drizzle、NextUI 没有进入 Kita，因为当时没有对应问题。

第一天真正完成的是“以后从哪里继续”，不是一个可以展示的产品。

## 6 月 14 日：我第一次把生产数据库当作长期状态

第二天的提交是：

```text
4a90723 chore: add payload production migrations
```

项目增加了初始 migration、migration 索引和容器 entrypoint。生产容器不再只执行 `node server.js`，而是先运行 Payload migration。

这个顺序后来引发过 503，但它本身没有错。它把一件以前很模糊的事说清楚了：数据库结构不是某台电脑里的附属品，应该和代码一起有历史。

## 6 月 17 日：网站终于重新有了自己的脸

```text
3b2ef18 feat: add games gallery and rain glass homepage
```

这一批才加入 Games 图片墙、详情页、lightbox 和 WebGL 雨滴。雨滴底层参考了 Codrops RainEffect，但没有搬它的 demo、天气切换、旧 Gulp 构建链和整套页面。

Kita 只保留了水滴模拟、WebGL 渲染和三张必要贴图，再用 TypeScript 重写成一个 `RainWaterLayer`。移动端和 `prefers-reduced-motion` 会降级，不要求每台设备都承担同样的视觉成本。

这里第一次出现了项目一直保留的做法：借一个成熟效果，不把对方的应用结构一起带回来。

## 6 月 28 日：Reviews 从模板变成内容

```text
ae18ac4 feat: connect reviews to Payload
6ee4905 feat: add rich text review bodies
```

Reviews 有了 Collection、getter、mapper、列表和详情查询。正文从静态段落变成 Payload Lexical Rich Text。

页面没有直接接收 Payload document，而是继续使用自己的 `ReviewPreview`。这个看起来多余的 mapper，后来证明很重要：数据库字段、nullable 数组和 Payload generated type 没有扩散到每个 React 组件里。

## 7 月 3 日：Games 接入 Payload，也第一次把生产打挂

```text
4d1e8a8 feat: add Payload-backed games archive
e49fc3f fix: keep games collection runtime self-contained
```

第一条提交让 Games 走上和 Reviews 一样的数据链。第二条只有一个文件、11 行变化，却修复了生产 503。

原因是 Payload Collection import 了前端图片 registry。Next build 阶段有完整源码，所以构建通过；production runner 只复制部分源码，启动 migration 时找不到 `src/features`，容器在 server 启动前退出。

这是 Kita 历史里很有价值的一次失败：它让我第一次不再把“build 成功”和“生产可以启动”当成一回事。

## 7 月 6 日到 7 日：部署之后才开始考虑丢失

```text
669b05e chore: align local and production workflows
002c892 feat: add PostgreSQL R2 backup sidecar
```

本地与生产的环境变量、PostgreSQL host、seed 和 fallback 被重新划清。随后 Compose 中增加了 backup sidecar，把 PostgreSQL custom dump 上传到独立 R2 bucket。

这不是因为数据量突然很大，而是 Payload 开始成为真实内容入口。只要内容不再完全存在于 Git，数据库丢失就不再等于“重新部署一次”。

不过这时完成的是备份生成和上传，不是完整恢复。这个区别直到现在仍然保留在项目状态里。

## 7 月 12 日：GitHub 不再只是远程硬盘

7 月 12 日连续合并了前几个正式 PR：

```text
PR #1  初始 Vitest
PR #2  GitHub Actions quality
PR #3  关闭测试与 CI 阶段文档
PR #4  Git/PR 工作流说明
PR #5  backup shell failure tests
PR #6  项目状态同步
```

main 开始要求 Pull Request 和 `quality` check。对单人项目来说，这一步最实际的作用是：Coolify 跟踪 main，而我不再把“上传代码”和“允许进入生产分支”合成一个动作。

## 7 月 14 日：性能问题改变了原来的原则

```text
9f5439c chore: speed up local Dev Container workflow
```

早期文档倾向于不为 `node_modules` 和 `.next` 使用额外 volume，认为 bind mount 更简单。Windows 上真实的高频小文件性能证明这个判断不适合当前机器。

最后只为这两个目录增加 targeted named volumes，源码仍然 bind mount。它不是推翻 Dev Container，而是承认“可理解”也包括日常能顺畅使用。

同一天，OpenList 通过 PR #11 接入 Games，但只保存公开 archive URL。它没有进入 Kita Compose，也没有共享数据库。

## 7 月 16 日到 20 日：我开始测试“换一台电脑还能不能做”

这几天主要不是功能 commit，而是恢复材料和复建记录：

- 盘点 Coolify、Cloudflare、GitHub、域名和 Secret；
- 加密保存 Coolify SSH 恢复材料；
- 在 C 盘重新 clone；
- 重建 Dev Container 和本地数据库；
- 重新跑页面、测试、check 与 build。

本地复建通过，说明源码仓库不再依赖旧 D 盘工作区。但生产 PostgreSQL restore、R2 Media restore 和 VPS 端到端恢复仍没有完成。

## 7 月 22 日：Games 封面终于不需要跟着代码部署

```text
6fcd49c feat: add Payload media storage with R2 support
396fe31 refactor: make game covers media-only
```

这次没有一次性删除旧字段。

第一步先增加 Media Collection、R2 adapter 和可空的 Games.cover，保留旧封面 fallback；项目所有者在生产 Admin 上传图片、建立关系并验证 custom domain 与 redeploy。第二步才把 `cover` 变成必填，删除四个 legacy 字段。

最终 6 条生产 Games 都使用 Payload Media，公开页面和 Media URL 通过 smoke。迁移被拆成两个 PR，不是因为代码写不完，而是生产内容需要一个安全过渡期。

## 这条时间线说明了什么

Kita 的技术栈并不是一份购物清单。它更像一串被实际问题推动的决定：

```text
想重建页面
  -> 需要稳定源码基座
内容开始离开 Git
  -> 需要 Payload、PostgreSQL、migration
开始部署
  -> 发现 build 与 runtime 不同
数据库开始有价值
  -> 需要 backup
main 会触发生产
  -> 需要 PR、CI、Ruleset
图片需要在后台维护
  -> 需要 Media 与 R2
```

Git 历史里没有“从第一天就想好一切”的证据。我真正想保留的也不是这种神话，而是每次改变都能找到当时的问题、代码和验证记录。

继续阅读：[Build 通过，网站却 503：我第一次真正看懂 Runner](/2026/08/04/kita-real-503-incident/)
