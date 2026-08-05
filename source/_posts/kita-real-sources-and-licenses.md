---
title: 哪些是我写的，哪些来自别人：Kita 的参考、改造与许可证
date: 2026-08-04 17:40:00
cover: /img/covers/kita-sources-licenses.webp
description: 盘点 Kita 已确认的 Starter、目录思想、WebGL 雨滴、OpenList 和图片来源边界，并记录目前缺失的 attribution 工作。
tags:
  - 开源许可证
  - Attribution
  - Codrops
  - 开源项目
categories:
  - Kita 真实开发记录
series: Kita 真实开发记录
---

Kita 不是从空白屏幕里独立发明出来的。

项目的工程基座受教程和 Starter 启发，目录结构参考过 Bulletproof React，首页雨滴改造自 Codrops 的实验，OpenList 直接运行官方镜像。视觉上也看过很多个人主页和开源博客。

真正需要说清楚的是：**参考思路、改造代码、复制素材、运行第三方软件，是四种不同关系。**

## 当前仓库有一个明显缺口

截至这次检查，Kita 根目录没有：

```text
LICENSE
NOTICE
THIRD_PARTY_NOTICES
```

`package.json` 中的 `"private": true` 只是不允许把这个 package 意外发布到 npm，不等于为 GitHub 仓库选择了许可证。

因此现在不应该把 Kita 描述成“MIT 开源项目”。仓库公开可见，也不自动授权别人复制、修改和再发布。是否开放 Kita 自己的代码，需要项目所有者单独决定；GitHub 对这个边界的说明见 [Licensing a repository](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/licensing-a-repository)。

## Next.js Starter：我借的是基座选择

Kita 的起点来自 CJ 的 Next.js Starter 视频和 [w3cj/next-start](https://github.com/w3cj/next-start)。该仓库标注 MIT License。

我没有把它的完整 main 分支原样留下。最后保留的是：

- ESLint 与 Prettier；
- type-safe environment variables；
- pnpm 与 lockfile；
- 一部分项目结构和工程检查思路。

没有保留：

- NextAuth / Google OAuth；
- Drizzle；
- NextUI；
- Guestbook 和 Starter 自带业务。

即使最终代码已经发生很大变化，在项目说明里记录这个起点仍然是合理 attribution，也能解释 Kita 为什么从这些工具开始。

## Bulletproof React：参考的是目录思想

`src/features` 的 feature-oriented 组织和测试就近放置，参考了 [Bulletproof React](https://github.com/alan2207/bulletproof-react) 的 project structure。它使用 MIT License。

这里主要是方法和结构参考，不是把对方应用源码复制进 Kita。但仍应在 README 的 “References” 中链接原项目，而不是把一种公开方法写成自己的独创架构。

## Codrops RainEffect：这里确实有改造代码和资产

Kita 的 `src/features/home/lib/rain-effect/` 与三张水滴贴图来自 [Codrops RainEffect](https://github.com/codrops/RainEffect) 的底层思路和素材。

实施时做了明显改造：

- JavaScript 模块重写为 TypeScript；
- 没有复制 demo 页面、天气系统、GSAP 和旧构建链；
- shader 改成透明输出；
- 增加 reduced-motion、移动端降级、页面隐藏暂停和 resize 处理；
- 代码收进 Home feature，而不是保留原项目入口。

但“改了很多”不会消除原作者和许可边界。Codrops README 使用的是自己的许可说明，允许集成和改造，但限制原样再发布、再分发或销售。它不是可以随手标成 MIT 的普通依赖。

Kita 至少应新增第三方说明，保留：

```text
项目名与作者
原仓库和原文章
使用了哪些模块/贴图
做过哪些改造
原许可链接
```

在这件事完成前，不能只靠一篇内部 implementation plan 充当对外 attribution。

## OpenList：运行官方软件，不等于它变成 Kita 源码

Kita 没有 fork OpenList，也没有把 Go/SolidJS 源码复制进仓库。生产以独立 Coolify Application 运行固定官方 image，Kita 只保存公开 URL。

[OpenList 官方仓库](https://github.com/OpenListTeam/OpenList) 当前标注 AGPL-3.0。使用未修改官方镜像、fork 并修改源码、把它嵌进自己的产品，是不同场景。当前最小责任是记录准确镜像版本、官方来源和许可证；如果以后修改或分发衍生版本，再单独核对 AGPL 义务。

本文只是工程 inventory，不代替法律意见。

## 图片是目前最需要人工确认的部分

Kita 的 `public/` 中有：

```text
about-bg.jpg
cover.png
home-*.jpg
P3F.jpg
games/covers/white-album-2-v2.jpg
rain-effect/drop-*.png
```

Git 历史能告诉我这些文件什么时候进入仓库，却不能证明版权来源。旧迁移笔记也明确写着：旧项目素材可以用于本地开发，但正式上线前要检查来源和版权。

需要为每个图片建立最小表格：

```text
文件
来源 URL 或“本人拍摄/制作”
作者
许可或授权方式
是否允许修改
是否要求署名
证明保存在哪里
```

如果无法确认来源，最稳妥的做法不是猜测“网上都在用”，而是替换成自己拥有权利的图片。

## 视觉参考和复制代码不是一回事

像 `blog.saop.cc`、`AdingApkgg/blog`、`AdingApkgg/home` 可以用于讨论：导航怎样分组、项目页怎样排版、小组件应该多密。

但公开仓库不等于可以直接复制。没有核对具体 LICENSE 前，我只把它们当视觉参考，不把布局文件、组件、图片和文案原样搬进 Kita。即使仓库允许使用，也要按许可保留 copyright notice 或 attribution。

“我重新写了 CSS”也不能自动回答图片、图标、字体和非平凡代码片段的来源问题。

## npm 依赖也属于第三方代码

Next.js、React、Payload、Sharp、Zod 等通过 package manager 进入项目。lockfile 能记录版本，但不会自动生成适合公开发布的第三方许可清单。

如果 Kita 将来发布 Docker image、桌面包或可下载源码，可以在 CI 中生成 dependency license report 或 SBOM。现在至少应保持 package/lockfile 完整，不删除依赖自身的 license 文件，也不把某个 package 的许可证误认为整个 Kita 的许可证。

## 我准备补的最小文件

这次博客写作不会替 Kita 仓库直接选择许可证，因为那是项目所有者对外授权的决定。更合理的后续是一个独立小 PR：

```text
README.md
  -> 项目来源、运行入口、References

THIRD_PARTY_NOTICES.md
  -> Codrops RainEffect、Starter、结构参考、OpenList

docs/asset-inventory.md
  -> 图片、字体、图标来源与状态

LICENSE
  -> 只在明确希望怎样授权 Kita 自有代码后添加
```

这会把“我受哪些作品帮助”从零散文档变成项目的一部分，也能防止以后忘记哪些资产其实仍未确认。

下一篇不会用漂亮总结收尾，而是列出当前仍然没有完成的事情：[Kita 还没有完成](/2026/08/04/kita-real-unfinished-work/)。
