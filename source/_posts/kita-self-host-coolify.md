---
title: 为什么 Kita 要 Self-host：我怎样从 VPS 走到 Coolify
date: 2026-08-02 12:00:00
cover: /img/covers/self-host-coolify.webp
description: Self-host 对我不是拒绝自动化，而是理解代码怎样穿过 GitHub、Docker、域名和数据库，最终运行在自己管理的服务器上。
tags:
  - Self-host
  - Coolify
  - Docker Compose
  - Cloudflare
categories:
  - Kita 开发记录
series: Kita 技术选择
---

> 这是“Kita 技术选择”系列的第三篇。上一篇把开发环境写进了仓库；这一篇开始回答项目离开开发电脑以后，应该在哪里运行。

我很早就决定 Kita 要 Self-host。

当时我甚至还没有把页面和数据流完全做好，却已经在想 VPS、域名、Docker 和 GitHub 自动部署。这个顺序看起来有些奇怪：网站还没写完，为什么先考虑服务器？

因为我想学习的从来不只是“把页面做出来”。

我希望最终能够解释：一次提交怎样变成线上容器，域名怎样找到应用，HTTPS 在哪里终止，PostgreSQL 数据保存在哪里，服务器坏掉以后又能留下什么。

## 思路来源是 Self Host 101

这部分最直接的启发来自 [Coolify Crash Course / Self Host 101](https://www.youtube.com/watch?v=taJlPG82Ucw)。

课程把原本散落的词连成了一条路线：选择 VPS、安装 Coolify、配置域名和 HTTPS、保护服务器、连接 GitHub、部署 Next.js、运行 PostgreSQL，再把数据库备份到 S3-compatible storage。

我并没有照着视频复制一个完全相同的服务器，但它让我第一次看到“网站上线”不是一个按钮，而是一组可以理解和选择的边界。

```text
代码仓库
  -> 自动检查
  -> 构建镜像
  -> 运行应用与数据库
  -> 域名和 HTTPS
  -> 文件与备份
```

这成为 Kita 的第三层基座。

## Self-host 不是拒绝自动化

刚开始时，我容易把 Self-host 想成“所有事情都手工做”。自己 SSH 到服务器、拉代码、安装 Node、启动进程，仿佛步骤越多就越掌控系统。

后来我发现，控制权和手工劳动不是一回事。

我真正需要的是知道每一层由谁负责，并且保留替换它的可能，而不是每天重复执行部署命令。

Coolify 对我有价值，正是因为它承担了很多重复工作：管理应用、注入环境变量、连接域名、触发构建、保存部署历史和协调容器。它让我使用自动化，同时仍然在自己的 VPS 上运行自己的 Dockerfile 与 Compose。

所以我的理解变成：

> Self-host 不是排斥平台，而是选择一个自己能够理解、迁移和承担责任的平台边界。

## Kita 的生产路线怎样分层

当前部署链路大致是：

```text
本地分支
  -> GitHub Pull Request
  -> GitHub Actions
  -> main Ruleset
  -> Coolify
  -> Docker build
  -> PostgreSQL migration
  -> Next.js + Payload
```

链路中的每一层只负责一类问题。

### GitHub 负责代码事实和合并门禁

GitHub 保存源码与变更历史。Pull Request 和 Ruleset 约束 main，GitHub Actions 执行 format、lint、typecheck、test 和 build。

CI 不连接生产数据库，也不持有生产 secret。它只回答“这份代码能否通过仓库定义的检查”，不负责替生产环境做真实迁移。

### Dockerfile 负责应用镜像

Kita 使用自己的多阶段 Dockerfile，而不是完全依赖平台自动猜测构建方式。

依赖安装、构建和运行被分成不同阶段，最终使用 Next.js standalone 输出，并由非 root 的 `nextjs` 用户运行。

这样做增加了 Dockerfile 的维护工作，却让应用需要什么运行文件、使用什么 Node 版本和什么用户变得明确。

### Compose 负责发布单元内部的关系

Kita 的生产 Compose 包含：

```text
web
postgres
backup
postgres-data
```

`web` 等待 PostgreSQL healthcheck；`backup` 定时导出数据库并上传；数据库数据保存在专用 volume 中。

Compose 没有把所有相关服务都塞进来。OpenList 有自己的发布节奏和数据边界，因此是另一个 Coolify Application。这一点会在后面的独立文章里展开。

### Coolify 负责服务器上的应用管理

Coolify 连接 GitHub，在 main 更新后根据仓库里的 Dockerfile 和 Compose 重新部署，也负责生产环境变量、域名和应用状态。

它不是业务代码的事实来源，也不应该成为唯一备份。服务器上的配置仍然需要被记录，真正重要的 secret 需要独立保存。

### Cloudflare 负责公网入口与对象存储

Cloudflare 在 Kita 中主要承担 DNS、HTTPS 相关入口和 R2 对象存储。

R2 后来同时保存 Payload Media 和 PostgreSQL dump，但二者使用不同目的和凭据边界。Cloudflare 没有替代 PostgreSQL，也不负责运行 Next.js。

把这些职责分开以后，我不再用“上云”或“部署平台”概括所有事情，而是能够知道某个故障最可能属于哪一层。

## 为什么没有直接把项目交给 Vercel

Next.js 部署到 Vercel 通常更省事，我也借鉴过 Vercel 的项目和图片画廊示例。

没有选择它作为 Kita 的最终生产路线，不是因为 Vercel 不好，而是我的学习目标和项目组成不同。

Kita 不只有一个无状态前端。它还包括 Payload Admin、PostgreSQL、媒体上传、migration、备份任务，以及后来独立部署的 OpenList。我希望理解这些部分怎样组合，也希望数据库和对象存储的边界由自己决定。

如果目标只是尽快发布一个展示页，平台托管可能更合适；但 Kita 同时是我的完整开发与运维练习。Self-host 提供的复杂度本身也是我想学习的一部分。

## 开发与生产不需要完全相同，但要使用同一种语言

我曾经把“开发生产一致”理解成所有细节都必须一样。实际很难做到，也没有必要。

本地 Media 写入开发目录，生产 Media 强制写入 R2；本地使用 Dev Container 中的 DIND，生产运行在 VPS；secret 和数据当然也不能共享。

真正需要对齐的是结构和机制：

- 都使用 Node 22 基线；
- 都由 pnpm 和 lockfile 安装依赖；
- 都使用 PostgreSQL；
- 都通过 Payload migration 管理 schema；
- 都用明确环境变量决定媒体模式；
- 都以容器和 healthcheck 描述服务关系。

这样，本地并不是生产环境的复制品，却能够提前暴露大部分结构性问题。

## 获得控制权以后，也获得了责任

Self-host 最容易被忽略的是代价。

VPS 的系统更新、防火墙、SSH、2FA、Coolify 升级、磁盘空间、数据库健康、对象存储凭据和备份恢复，现在都属于我的责任范围。

“容器处于 Running”也不能证明系统安全。数据库可能没有备份，备份文件可能无法恢复，媒体对象可能只存在于一个 bucket，域名和账户的恢复信息也可能散落。

目前 Kita 已经有 PostgreSQL 到 R2 的定时备份，但完整生产 restore drill 和全新 VPS/Coolify 灾难恢复演练仍未最终完成。

我更愿意把这个边界写出来，而不是因为网站能打开就说部署已经完全可靠。

## 为什么这条生产路线适合我的审美

这里的审美同样不是界面颜色。

我喜欢能看见边界的系统：GitHub 管代码，Dockerfile 管镜像，Compose 管应用内部服务，Coolify 管 VPS 上的运行，Cloudflare 管公网入口和对象存储。

这些工具来自不同项目，却通过很少的接口连接：Git 提交、容器镜像、环境变量、网络地址和对象存储协议。

我不追求所有东西都由自己从零编写，也不想把决定全部交给一个无法解释的平台。Kita 的 Self-host 路线正好位于两者之间。

## 下一层问题来自旧项目本身

有了 Starter、Dev Container 和 Self-host 路线，我已经知道新项目应该怎样开发、怎样运行。

但真正开始整理 Kralgame 时，我发现旧项目不能因为拥有一些页面和后端就直接迁移。它的视觉方向值得保留，数据、配置和职责却已经混在一起。

下一篇会解释我为什么重新建立 Kita，而不是继续在 Kralgame 上打补丁。

## 相关工程案例

- [从空白 VPS 到 Coolify 部署 Kita](/2026/08/04/kita-case-vps-coolify-deployment/)
- [为什么 Build 通过了，生产容器仍然 503](/2026/08/04/kita-case-production-runtime-dependency/)

## 系列导航

- 上一篇：[为什么我一直使用 Dev Container：开发环境也应该写进仓库](/2026/08/02/kita-dev-container/)
- 下一篇：[为什么我重新做了 Kita，而不是继续修旧项目](/2026/08/02/rebuild-kita-not-kralgame/)
