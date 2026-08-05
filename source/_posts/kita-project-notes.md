---
title: 从一个视频开始：我怎样为 Kita 搭起 Next.js 开发基座
date: 2026-08-01 20:30:00
cover: /img/covers/nextjs-starter.webp
description: 作为初学者，我先要解决的不是页面设计，而是弄明白一个 Next.js 项目需要哪些基础工具，以及每个工具究竟解决什么问题。
tags:
  - Next.js
  - TypeScript
  - ESLint
  - Prettier
  - 开发环境
categories:
  - Kita 开发记录
---

> 这是“Kita 技术选择”系列的第一篇。这个系列不会从完成后的技术栈倒推架构，而是按照真实顺序，记录我怎样寻找工具、解决问题，并逐步拼出一套符合自己审美和维护方式的技术栈。

Kita 最初并不是从 Payload、PostgreSQL 或 Docker 开始的。

在决定页面应该长什么样之前，我先遇到了一个更基础的问题：作为一个刚开始认真做 Next.js 项目的初学者，我到底应该怎样建立自己的开发基座？

执行一次 `create-next-app` 很容易。真正让我困惑的是接下来的事情：

- 为什么别人的项目里有那么多配置文件？
- ESLint 和 Prettier 都在改代码，它们有什么区别？
- 为什么编辑器里没有报错，构建时却会失败？
- Starter、Boilerplate、CLI Generator 和 SaaS Starter 到底是什么？
- 一套现成模板里的认证、数据库和 UI，我是不是都应该保留？
- 怎样让这些配置换一台电脑以后仍然有效？

我当时缺少的不是又一份“输入命令就能运行”的教程，而是一张路线图。

这也成为整个 Kita 项目后来一直遵循的方式：我不会因为一个工具流行就先把它装进项目，也不会因为某个 Starter 已经做了全部选择就照单全收。我更愿意先确定自己想要怎样的页面、开发体验和控制边界，再把合适的技术一层一层接上去。

所谓“拼出技术栈”，对我来说不是堆技术，而是不断做舍取。

后来我才发现，这张路线图并不只来自一份教程。

Next.js Starter 解决代码怎样开始；Dev Container 解决开发环境怎样跟随项目；Self Host 和 Coolify 则解决应用怎样真正运行在自己掌控的服务器上。Kita 最终的技术栈，是我从不同来源选择适合自己的部分，再把它们连接起来的结果。

## 这段思路从哪里来

我的主要参考是 Syntax 频道里 CJ 的视频：[Create your own Next.js Starter Template](https://www.youtube.com/watch?v=dLRKV-bajS4)。

视频没有直接丢出一份“最强 Next.js 技术栈”，而是先展示整个生态：CLI Generator、Starter Kit、SaaS Starter、付费模板和 Toolkit，然后从一个空的 Next.js 项目开始，逐项解释自己为什么选择某个工具。

视频的配套资料还整理了当时常见的 [Next.js Starters 清单](https://gist.github.com/w3cj/4fa5180fec37ececf0fceec0e3fcc8ab)。

这正是我需要的东西。

我并不只是想下载 CJ 最后完成的模板。我想学习的是：

> 怎样判断一个项目缺少什么，再为这个问题选择工具，并让这些工具真正协同工作。

视频前半段给了我开发基座的基本顺序：

```text
生成 Next.js 项目
  -> 统一代码格式
  -> 增加静态检查
  -> 让 VS Code 自动执行这些规则
  -> 确定目录结构
  -> 使用项目自己的 TypeScript
  -> 打开路由类型检查
  -> 再考虑 UI、认证、数据库和业务功能
```

后来 Kita 的技术选择和视频并不完全相同，但这个顺序保留了下来。

## 我先分清了几种“现成方案”

刚开始搜索 Next.js Starter 时，GitHub 上几乎每个项目都说自己能让开发更快。对初学者来说，它们看起来没有太大区别。

通过这段视频，我先建立了一个比较粗但有用的分类。

### `create-next-app`

它解决的是“怎样得到一个官方支持、能够运行的 Next.js 项目”。

它可以帮我选择 TypeScript、ESLint、Tailwind、`src/` 目录、App Router 和 import alias，但不会替我完成内容模型、数据库、认证和项目结构。

它是起点，不是完整开发基座。

### CLI Generator

CLI Generator 会在生成项目时询问我要使用哪些库，再替我完成一部分安装和连接工作。

它真正有价值的地方不是多装几个包，而是处理不同工具之间的“胶水配置”。不过生成器仍然不能替我决定 Kita 的业务逻辑。

### Starter Kit / Boilerplate

Starter 已经替使用者做了一组选择。下载以后通常可以直接得到代码格式、样式方案、目录约定和一些基础页面。

优点是快，问题是我必须先理解它替我做了什么决定。否则删除一个依赖时，可能连自己破坏了哪层关系都不知道。

### SaaS Starter

SaaS Starter 通常还会加入用户认证、支付、邮件、数据库 ORM 和用户面板。

这些能力当然更完整，但“更完整”不等于“更适合 Kita”。Kita 没有订阅、团队账户和付费计划，提前带入这些功能只会增加我不理解的代码。

我最终没有完整克隆一套 SaaS Starter，而是把 CJ 的过程当成自己的学习清单。

## 第一个问题：怎样从正确的 Next.js 起点开始

我先用 `create-next-app` 生成项目，并明确选择：

- TypeScript；
- ESLint；
- Tailwind CSS；
- `src/` 目录；
- App Router；
- `@/*` import alias。

这些选项分别解决不同问题。

TypeScript 让我能在运行前发现一部分数据类型错误；ESLint 提供 Next.js 和 React 相关的静态检查；Tailwind 给页面布局一个低成本起点；`src/` 把业务源码与根目录配置分开；App Router 是我准备继续学习的 Next.js 路由方式；alias 则避免目录变深以后出现大量 `../../../`。

当时我很容易把这一串选择理解成“视频里这样选，所以我也这样选”。后来才慢慢明白，更好的表达应该是：

```text
我遇到什么问题
  -> 哪个选项解决它
  -> 我是否真的需要这个解决方案
```

这套问法后来也影响了 Payload、OpenList 和 R2 的选择。

## 第二个问题：ESLint 和 Prettier 为什么要同时存在

以前我没有认真区分代码检查和代码排版。

写完以后能运行，我就认为代码没有问题；缩进和换行则主要靠自己手动整理。项目一大，这种方式很快就会失控。

Prettier 解决的是格式一致性。它不负责判断业务逻辑是否正确，而是按照固定规则重新输出代码，让缩进、换行、引号和尾随逗号不再取决于当时的手感。

ESLint 解决的是静态分析。它可以在代码真正运行前发现未使用变量、错误的 React Hooks 使用、可疑写法和 Next.js 特定问题。

我最后形成的分工是：

```text
Prettier
  负责代码看起来是否一致

ESLint
  负责代码中是否存在可静态发现的问题

TypeScript
  负责类型关系是否成立
```

三者有重叠，但并不互相替代。

Kita 后来还加入了 unused imports 检查和 Tailwind 的 Prettier plugin。前者避免已经不用的 import 留在源码中，后者自动统一 Tailwind class 的顺序。

这些工具没有增加任何页面功能，却减少了大量“这段代码到底只是格式不同，还是确实有问题”的噪音。

## 第三个问题：为什么只安装 VS Code 插件还不够

这是我在最早阶段花时间最多的一次小问题。

我已经安装了 ESLint 和 Prettier 的 VS Code 插件，也配置了 `.vscode/settings.json`，但保存文件时自动格式化始终没有按预期工作。

最后发现原因不是 ESLint，也不是 Prettier，而是我在 VS Code 中打开了错误的根目录。

项目实际位于更深一层的文件夹，但 VS Code 打开的是它的父目录。`.vscode/settings.json` 因此不属于当前 workspace，里面的 format on save 和 ESLint fix 设置自然不会应用。

我为视频中几分钟的配置排查了两个晚上。

这件事让我第一次真正理解 workspace setting 的意义。

如果规则只写在我的 VS Code 全局设置里，它只能证明“我的电脑现在可以工作”。把设置放在项目根目录下，才表示：

- 换一台电脑仍然知道推荐使用哪个 formatter；
- 编辑器使用项目安装的 TypeScript；
- 保存文件时按照项目规则格式化；
- 自动修复行为跟随仓库，而不是跟随个人记忆。

所以 `.vscode/settings.json` 不是一个无关紧要的编辑器偏好文件。它是开发基座的一部分。

## 第四个问题：为什么要使用项目自己的 TypeScript

VS Code 可以带有自己的 TypeScript 版本，项目的 `node_modules` 中也有一份 TypeScript。

如果编辑器和命令行使用的版本不同，就可能出现一种很困惑的情况：编辑器认为代码正确，`pnpm typecheck` 却失败；或者编辑器报错，实际构建又能通过。

因此 workspace 设置会让 VS Code 使用：

```text
node_modules/typescript/lib
```

这样编辑器、类型检查脚本和 CI 看到的是同一套 TypeScript 行为。

这个问题对熟悉工具的人可能很小，但对初学者很重要。只有检查工具本身保持一致，我才知道错误究竟来自代码，还是来自环境差异。

## 第五个问题：项目变大以后，文件应该放在哪里

视频介绍了 Bulletproof React 的项目结构原则。

我没有把它整套复制到 Kita，因为那套结构是为更大型应用准备的。一个个人项目如果提前加入过多抽象，同样会变得难以理解。

我真正借用的是 feature boundary：与 Games 有关的组件、类型和转换逻辑放在 Games 下面，Reviews、Tools 和 Home 也各自聚合。

```text
src/features/games
src/features/reviews
src/features/tools
src/features/home
```

公共路由放在 `src/app`，服务端数据访问放在 `src/server`，Payload schema 放在 `src/payload`。

这个选择解决的不是“目录看起来是否专业”，而是以后修改 Games 时，我不需要在整个仓库里寻找散落的组件和类型。

## 第六个问题：路由和环境变量能不能也被检查

普通字符串形式的路由很容易拼错，而且错误通常要点击以后才会发现。Kita 因此开启了 Next.js Typed Routes，让一部分内部链接错误能够在类型检查阶段暴露。

环境变量的问题更危险。

数据库地址、Payload secret、站点 URL 和媒体存储模式如果缺失，应用不应该先启动，再在某个页面以模糊错误失败。Kita 后来使用 Zod 和 `@t3-oss/env-nextjs`，明确区分 server-only 与 client 变量，并在值不合法时尽早停止。

这里还出现过一个很典型的错误：

```ts
Boolean("false") === true
```

环境变量在 Node 中是字符串。如果直接用 `Boolean()` 解析，文字 `"false"` 仍然会被当成真值。后来配置改为只接受 `"true"` 和 `"false"`，再显式转换。

这让我明白，typesafe env 不只是为了让 `process.env` 有自动补全，而是让配置错误尽量在启动边界失败。

## 哪些视频里的工具，我后来没有采用

CJ 的视频后半还演示了 NextUI、next-themes、NextAuth、Google OAuth、Drizzle、Docker PostgreSQL、Server Actions 和 Guestbook。

我没有因为它们出现在教程里就全部放进 Kita。

### 没有使用 NextUI

Kita 的首页和 Games 需要比较强的定制视觉。通用组件库可以快速完成普通表单和导航，却也可能让页面越来越像标准 SaaS 控制台。

我最终保留 Tailwind 和定制 CSS，只在确实需要时借鉴组件结构。

### 没有使用 NextAuth 和 Google OAuth

Kita 没有公开用户系统。需要登录的只有 Payload Admin，而 Payload 已经提供自己的认证。

在没有用户业务的情况下增加 OAuth，只会带来 provider 配置、session、安全边界和更多 secret。

### 没有使用 Drizzle

视频使用 Drizzle 连接 PostgreSQL 并定义 schema。Kita 后来选择 Payload 作为内容后台，Payload 自己管理 Collections、PostgreSQL adapter 和 migration。

同时维护 Payload schema 和 Drizzle schema 会产生重复的事实来源，因此当前没有必要再加第二套 ORM。

### 没有实现 Guestbook

Guestbook 是理解认证、数据库和 Server Action 的教学案例，但它不是 Kita 的真实需求。

教程中的示例可以帮助我理解工具，不代表最终网站必须保留这个功能。

## 从 Starter 到真正可重建的开发环境

视频帮助我建立的是代码基座，但 Kita 后来还遇到了另一个问题：这些工具仍然依赖我的电脑已经正确安装 Node、包管理器和数据库。

为了让开发环境也能被复现，项目继续加入：

- pnpm 和锁定的 package manager 版本；
- Corepack；
- frozen lockfile 安装；
- Dev Container；
- Docker-in-Docker；
- PostgreSQL Compose；
- GitHub Actions。

它们解决的是 Starter 没有完全覆盖的下一层问题：不仅源码要一致，运行源码的环境也应该能从仓库重建。

当前日常入口已经收敛成：

```bash
pnpm dev
```

它会检查 workspace 用户、启动并等待 PostgreSQL，再运行 Next.js。

从最初只会执行 `create-next-app`，到现在能解释这条命令背后发生了什么，这才是这套开发基座对我的真正意义。

## 我现在怎样理解“Production Ready”

刚看到这个词时，我容易把它理解成必须拥有登录、支付、数据库、邮件和完整后台。

现在我更愿意把它拆小：

- 同一份代码能否在另一台机器安装；
- 编辑器、命令行和 CI 是否使用相同规则；
- 格式、静态检查和类型检查能否重复执行；
- 环境变量错误能否尽早失败；
- 开发命令是否清楚；
- 构建结果是否可信；
- 项目不需要的功能是否被克制地排除。

Kita 并不是一个已经具备商业规模的 production-ready 产品。但它拥有一套可以继续开发、验证和部署的工程基座。

对我这个初学者来说，这比复制一份看起来功能齐全、实际却无法解释的 Starter 更有价值。

## 三段视频，最后变成三层基座

回头看，Kita 最重要的三层工程思路分别来自三段视频。

| 层次 | 思路来源 | 它最先帮我回答的问题 |
| --- | --- | --- |
| 代码基座 | [Create your own Next.js Starter Template](https://www.youtube.com/watch?v=dLRKV-bajS4) | 一个 Next.js 项目需要哪些基础工具，每项选择解决什么 |
| 开发环境基座 | [you should be using dev containers](https://www.youtube.com/watch?v=kPMA9cnpScU) | 怎样让 Node、依赖、容器能力和编辑器配置跟随项目 |
| 生产运行基座 | [Coolify Crash Course / Self Host 101](https://www.youtube.com/watch?v=taJlPG82Ucw) | 怎样从 VPS、HTTPS 和 GitHub 部署走到自己掌控的生产环境 |

Dev Container 那段视频介绍了 container、Dev Container spec、template、feature、Docker-in-Docker 和 editor customization。它让我意识到，开发环境也可以像源码一样被描述，而不是在每台电脑上重新安装和回忆。

但 Kita 没有把视频里的所有 feature 都装进去。当前只保留真正需要的 Node 环境、Docker-in-Docker、两个性能 volume 和 VS Code 扩展。容器不是为了让项目看起来复杂，而是为了让 Windows 宿主机不再承担 Node、pnpm 和 PostgreSQL 的版本管理。

Coolify 那段视频则从 VPS、HTTPS、防火墙、GitHub 自动部署讲到 Docker Compose、PostgreSQL、S3 兼容存储和数据库备份。它给我的不是“必须使用某个 VPS 厂商”的答案，而是一个完整的 self-host 视角：代码合并以后怎样进入服务器，域名怎样连接应用，数据库和文件又怎样离开服务器得到备份。

Kita 最终也没有原样复制这段课程：

- VPS 厂商按自己的支付和维护条件选择；
- 应用使用自己的多阶段 Dockerfile 和 Compose，而不是依赖 Nixpacks；
- 内容后台选择 Payload，不是视频示例里的 T3 或 Supabase；
- 对象存储使用 Cloudflare R2，不在 VPS 上维护 MinIO；
- PostgreSQL backup 使用项目自己的 sidecar、`pg_dump` 和 rclone；
- OpenList 作为独立应用部署，不塞进 Kita 的发布单元。

这也说明我所说的“适合自己的技术栈”并不是拒绝外部方案，更不是把喜欢的工具全部堆在一起。

我更在意两种审美。

第一种是页面审美：Kita 应该保持视觉小说式的全屏画面、封面馆藏和安静氛围，不应该因为使用现成组件就变成普通 SaaS dashboard。

第二种是工程审美：配置应该能解释，边界应该清楚，开发环境应该能重建，生产环境应该在自己掌控之中；可以借助成熟工具，但每个工具都必须回答“它具体解决了什么”。

所以 Kita 的技术栈更像下面这个过程：

```text
从不同作者那里看到一种解决问题的方法
  -> 理解它为什么成立
  -> 判断它是否符合自己的项目和审美
  -> 放弃不需要的部分
  -> 用简单边界连接保留下来的部分
  -> 在真实开发和部署中继续修正
```

这也是后面整个系列会使用的写法。文章不会从“我使用了哪些技术”开始，而会先交代这个选择从哪里来、当时想解决什么、为什么最后只保留其中一部分。

## 结语

CJ 的视频没有替我完成 Kita。

它真正提供的是一套思考顺序：先看清生态里有哪些现成方案，再逐项决定自己的项目需要什么。工具不是因为流行才进入项目，而是因为它解决了一个能够说清楚的问题。

这条原则后来一直延伸到 Kita 的其他选择：

- Payload 解决内容管理和数据模型；
- PostgreSQL 解决持久化数据；
- Dev Container 解决开发环境复现；
- R2 解决生产媒体和备份存储；
- OpenList 解决独立的文件目录；
- 而 NextAuth、Drizzle、NextUI 和更多基础设施，因为没有对应需求而没有加入。

接下来的文章会继续使用同一种方式记录：当时遇到了什么问题，我看过哪些方案，最后用了什么，它解决了什么，又带来了什么代价。

这个系列接下来会沿着真实的层次继续：

1. 为什么我一直使用 Dev Container，以及它后来在 Windows 和 DIND 中带来了什么问题；
2. 为什么 Kita 从一开始就准备 Self-host，并最终使用 Coolify；
3. 为什么没有继续修补 Kralgame，而是重新建立 Kita；
4. 静态页面怎样逐步接入 Payload、PostgreSQL 和 Local API；
5. Games 封面为什么从源码枚举迁移到 Payload Media 和 R2；
6. 为什么 OpenList 保持为一个独立应用；
7. 项目怎样从“能够部署”继续走向“能够备份和恢复”；
8. 最后再回看整套技术栈，以及我刻意没有采用什么。

下一篇先解决开发基座之后最自然的问题：源码可以放进 Git，但运行源码的 Node、pnpm、系统工具和数据库环境，怎样才能不继续依赖某一台电脑？

## 系列导航

- 下一篇：[为什么我一直使用 Dev Container：开发环境也应该写进仓库](/2026/08/02/kita-dev-container/)
- 系列总结：[Kita 用了哪些技术，以及我刻意没有使用什么](/2026/08/03/kita-technology-tradeoffs/)
- 初学者入口：[拿到一个陌生仓库，我应该先看什么](/2026/08/04/kita-basics-read-repository/)
- 真实开发记录：[Kita 不是按路线图做出来的](/2026/08/04/kita-real-timeline/)
