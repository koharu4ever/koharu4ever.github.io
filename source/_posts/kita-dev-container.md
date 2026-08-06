---
title: 为什么我一直使用 Dev Container：开发环境也应该写进仓库
date: 2026-08-02 09:00:00
cover: /img/covers/dev-container.webp
description: 源码能够提交到 Git，并不代表开发环境就能复现。这篇记录 Kita 为什么把 Node、pnpm、Docker 和编辑器配置一起放进 Dev Container，以及我为此付出的代价。
tags:
  - Dev Container
  - Docker
  - Windows
  - 开发环境
categories:
  - Kita 开发记录
series: Kita 技术选择
---

> 这是“Kita 技术选择”系列的第二篇。上一篇解决了 Next.js 代码基座怎样建立；这一篇继续处理更靠下一层的问题：运行这些代码的环境，能不能也跟随仓库。

完成自己的 Next.js Starter 以后，我一度以为项目已经具备了可复现性。

源码在 Git 里，依赖写在 `package.json`，pnpm 还有 lockfile。换一台电脑时，把仓库拉下来再安装依赖，理论上就应该得到同一个项目。

实际并没有这么简单。

Node 版本、pnpm 版本、系统工具、PostgreSQL、Docker 权限和 VS Code 扩展仍然散落在电脑里。它们没有进入仓库，却会直接决定项目能不能启动。源码可以复制，开发环境仍然依赖“我记得当时装过什么”。

这就是我一直使用 Dev Container 的起点。

## 契机来自一段 Dev Container 视频

我的主要思路来源是 CJ 的视频：[you should be using dev containers](https://www.youtube.com/watch?v=kPMA9cnpScU)。

视频从 container、Dev Container spec、template 和 feature 讲起，又演示了 Docker-in-Docker 与编辑器定制。对我影响最大的并不是某一段配置，而是一个很直接的观念：

> 开发工具也可以像源码一样被描述，而不是每次换电脑都重新安装和回忆。

我以前把容器主要理解成部署工具。应用写完以后，把它装进镜像，再放到服务器运行。Dev Container 让我看到另一种用法：容器也可以成为编辑器打开项目时的开发空间。

源码仍然在本地仓库中，VS Code 仍然是我熟悉的界面，但终端里的 Node、pnpm 和系统命令来自容器。

## 我先分清了几个容易混淆的概念

刚开始接触时，我经常把开发容器、生产容器和 Docker Compose 混在一起。

它们在 Kita 中承担的职责并不相同。

```text
Dev Container
  回答“我在哪里写代码、执行命令”

Docker-in-Docker
  回答“开发容器里怎样运行其他容器”

Docker Compose
  回答“PostgreSQL 等服务怎样组合和启动”

生产 Dockerfile
  回答“Kita 最终以什么镜像运行”
```

Dev Container 不是把生产环境原样搬到本地，也不是说有了它就不再需要生产镜像。它首先解决的是开发工具的一致性。

## 为什么我不想在 Windows 宿主机安装 Node

我给宿主机留下的工具很少：Git、Docker、VS Code、Dev Containers 扩展和浏览器。

Node、pnpm、Payload、PostgreSQL 客户端以及项目脚本都在开发容器中运行。

这样做符合我的工程审美：电脑是承载项目的宿主机，不应该逐渐变成多个项目版本冲突的集合。

如果 Kita 将来需要升级 Node，我希望修改的是仓库里的容器配置，而不是先回忆 Windows 上的 Node 来自安装包、版本管理器还是某个旧终端。新电脑也不应该先阅读一份很长的“请手工安装以下软件”清单。

这并不代表宿主机安装 Node 一定错误。对于很小的项目，它可能更快。只是 Kita 同时需要 Node、PostgreSQL 和容器化部署，而我又希望环境能够从仓库重建，所以 Dev Container 的收益开始大于它的配置成本。

## `devcontainer.json` 实际解决了什么

Kita 的开发容器把几类信息固定下来：

- 基础镜像和 Node 主版本；
- 使用哪个普通用户进入 workspace；
- 需要哪些 Dev Container Features；
- VS Code 应安装哪些扩展；
- 容器创建后怎样启用 Corepack、安装依赖；
- 哪些目录使用 volume；
- 项目终端和编辑器默认在哪个 Linux 环境工作。

其中最重要的不是配置行数，而是这些决定有了共同的事实来源。

以前一句“请使用正确的 Node 和 pnpm”依赖每个人自行理解；现在编辑器打开仓库时就能据此创建环境。

## 为什么 Kita 使用 Docker-in-Docker

Kita 本地开发需要 PostgreSQL。我不想在 Windows 安装数据库，也不想让每个项目共享一套容易互相影响的本地数据库。

因此开发容器中加入了 Docker-in-Docker，让容器里的终端可以启动项目自己的 PostgreSQL Compose 服务。

当前关系大致是：

```text
Windows
  -> VS Code
  -> Kita Dev Container
       -> pnpm dev
       -> Docker-in-Docker
            -> PostgreSQL 16
```

这个方案让我在同一个 Linux 开发环境中管理 Next.js 和数据库，也避免 Windows 与 Linux 的 `node_modules` 混用。

但 DIND 不是免费得到的隔离。它增加了容器层次、权限和 volume 的理解成本。遇到问题时，我必须先判断错误发生在 Windows、开发容器，还是开发容器内部启动的服务中。

我接受这个代价，是因为它换来了更明确的宿主机边界和更可重建的项目环境。

## 一次 root 污染让我重新理解“正确用户”

Kita 曾出现过 root 创建的 `.next` 文件。

表面症状很混乱：TypeScript 读到残缺的生成文件，`next build` 又无法删除旧缓存。看起来像源码、类型和构建同时坏了，实际根因是同一个目录被不同身份写入。

最直接的反应可能是执行一次 `chown`，然后继续开发。但这只能修复当前文件，不能阻止下一次 root 进程再次写入。

最后我做了几层约束：

- 日常 workspace 明确使用普通 `node` 用户；
- 启动和构建前检查当前用户与 `.next` 所有权；
- 防止 `next dev` 和 `next build` 同时操作同一输出目录；
- 在 Next 配置中增加第二层 root 防护；
- 对确认可再生的 `.next` 做干净重建，而不是保存污染缓存。

这次事故让我意识到，开发环境的“可运行”还不够。执行检查的环境本身必须可信，否则我无法判断失败来自业务代码，还是来自环境污染。

## 为什么我后来改变了对 named volume 的判断

修复 root 污染时，我最初不想立刻引入更多 volume。

当时的判断并没有错：首要问题是用户身份，增加 volume 不能替代权限修复。

但在 Windows 上继续实测后，另一个问题变得非常明显。`.next` 和 `node_modules` 会产生大量小文件和高频 I/O，把它们放在 Windows 与 Linux 容器之间的 bind mount 上，编译速度非常慢。

于是我根据新证据修改了方案，只为两个高频目录增加 targeted named volume：

```text
源码            Windows bind mount，便于编辑和版本管理
node_modules    Docker named volume
.next           Docker named volume
PostgreSQL 数据 独立 Compose volume
```

调整后，首屏编译从分钟级回到秒级。

这段经历对我很重要，因为它说明技术选择不是写完就不能变化。早期“不增加 volume”针对的是权限事故；后来的“增加两个 volume”针对的是已经测量到的 Windows I/O 问题。问题不同，答案也可以不同。

## 为什么入口最后收敛为 `pnpm dev`

项目早期需要先启动 PostgreSQL，再启动 Next.js。步骤不算多，但它要求我每次都记住顺序、服务名和等待时间。

现在日常入口收敛为：

```bash
pnpm dev
```

这个命令负责启动并等待 PostgreSQL，再运行 Next。底层服务脚本仍然存在，但正常开发不再要求手工执行两套流程。

我喜欢这种入口：简单并不等于隐藏一切，而是把已经稳定的顺序封装起来，同时保留能够继续排查的内部脚本。

## Dev Container 没有解决什么

Dev Container 解决了开发环境复现，但没有自动解决下面这些问题：

- 生产镜像是否安全、足够小；
- 数据库 migration 是否能够在生产运行；
- Windows bind mount 是否足够快；
- volume 中的数据怎样备份；
- 容器内外的权限是否正确；
- 开发环境与生产环境是否真的使用同一套假设。

它还要求 Docker 正常工作，也增加了初次构建时间和磁盘占用。出现容器网络或 volume 问题时，排查门槛会比直接运行 Node 更高。

所以我不会把 Dev Container 描述成所有项目都必须采用的标准答案。它适合 Kita，是因为我的目标恰好包括 Windows 宿主机整洁、Linux 开发环境、DIND 数据库和可重建工作区。

## 今天它在 Kita 中的位置

现在，Dev Container 已经不是可选的辅助配置，而是 Kita 的正式开发边界。

它与 Starter 的关系很清楚：Starter 固定代码规则，Dev Container 固定执行这些规则的环境。两个层次合在一起，我才能较有把握地说“这个仓库可以重新开始工作”。

但开发环境稳定以后，问题自然转向生产：Kita 最终在哪里运行，域名、HTTPS、数据库和自动部署由谁管理？

下一篇会写第三层基座——为什么 Kita 从一开始就想 Self-host，以及我怎样从一段 Coolify 课程走到自己的生产部署路线。

## 相关工程案例

- [在 Windows 上为 Next.js 配置 Dev Container](/2026/08/04/kita-case-devcontainer-setup/)
- [在 Dev Container 中用 DIND 启动 PostgreSQL](/2026/08/04/kita-case-devcontainer-dind-postgres/)
- [修复 Windows 9P 导致的 Next.js 编译缓慢](/2026/08/04/kita-case-windows-nextjs-performance/)

## 系列导航

- 上一篇：[从一个视频开始：我怎样为 Kita 搭起 Next.js 开发基座](/2026/08/01/kita-project-notes/)
- 下一篇：[为什么 Kita 要 Self-host：我怎样从 VPS 走到 Coolify](/2026/08/02/kita-self-host-coolify/)
