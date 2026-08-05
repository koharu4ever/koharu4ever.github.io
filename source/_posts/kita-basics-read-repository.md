---
title: 拿到一个项目后，应该先看哪些文件
date: 2026-08-04 16:00:00
cover: /img/covers/read-repository.webp
description: 以 Kita 为例，建立阅读陌生仓库的顺序：先找入口、命令、环境、源码和数据边界，再决定从哪里开始修改。
tags:
  - 初学者
  - 项目结构
  - 工程基础
categories:
  - Kita 从零理解
series: Kita 从零理解
---

> 这是“从零读懂 Kita”系列的第一篇。前两套系列分别讲技术选择和工程配置；这一套从最基础的问题开始：我打开一个仓库时，究竟应该先看什么。

## 不要一上来就阅读所有源码

刚接触一个项目时，我以前会直接点进最大的 `.tsx` 文件，从第一行往下看。很快就会遇到一串不认识的 import、类型和框架约定，然后失去方向。

更有效的顺序不是“从源码第一行开始”，而是先回答六个问题：

```text
这是什么项目？
  -> 用什么工具安装和运行？
  -> 日常命令在哪里？
  -> 配置和 secret 从哪里来？
  -> 源码入口在哪里？
  -> 数据最终保存在哪里？
```

Kita 正好包含一个现代 Next.js 全栈项目常见的多数边界，可以用来练习这套阅读方法。

## 第一步：先看顶层目录

Kita 根目录大致是：

```text
.devcontainer/       开发容器
.github/workflows/   GitHub Actions
docker/              备份容器等基础设施代码
docs/                当前说明与历史记录
public/              公开静态文件
scripts/             项目辅助脚本
src/                 应用源码

compose.yaml         服务组合
Dockerfile           生产镜像
next.config.ts       Next.js 配置
package.json         包、版本和命令入口
payload.config.ts    Payload 配置
pnpm-lock.yaml       确定依赖解析结果
tsconfig.json        TypeScript 配置
```

这一步不要求理解每个文件内容，只需要先画出地图。

在终端中可以使用：

```bash
pwd
ls -la
find src -maxdepth 2 -type d | sort
```

如果已经安装 ripgrep，也可以用：

```bash
rg --files
```

这些都是只读命令，不会修改项目。

## 第二步：确认项目怎样运行

Node 项目先看 `package.json`：

```json
{
  "packageManager": "pnpm@10.28.2",
  "scripts": {
    "dev": "...",
    "build": "...",
    "test": "...",
    "check": "..."
  }
}
```

由此可以知道：

- 包管理器是 pnpm；
- 版本由 `packageManager` 固定；
- 日常开发入口是 `pnpm dev`；
- 生产构建是 `pnpm build`；
- 自动检查是 `pnpm check` 与 `pnpm test`。

不要看到 Next.js 就直接运行自己记忆中的 `npm run dev`。仓库已经告诉我它选择了哪个包管理器和哪些脚本。

## 第三步：确认开发环境边界

Kita 有：

```text
.devcontainer/devcontainer.json
```

这表示项目希望在 Dev Container 中执行 Node、pnpm、Payload 和 Docker 命令。

宿主机只需要 Git、Docker Desktop、VS Code、Dev Containers 扩展和浏览器。看到这个文件以后，我就不应该继续在 Windows 全局安装项目 Node 依赖。

阅读开发环境配置时先找：

- 基础镜像；
- remote user；
- post-create 命令；
- VS Code 扩展；
- volume；
- Docker feature。

## 第四步：确认哪些文件不能提交

`.gitignore` 是理解项目数据边界的重要文件，不只是“Git 忽略清单”。

Kita 忽略：

```text
node_modules/
.next/
.payload-media/
.env
*.dump
```

这些文件的原因不同：

| 内容 | 为什么不进 Git |
| --- | --- |
| `node_modules` | 可以根据 package 与 lockfile 重建 |
| `.next` | Next.js 生成缓存和构建产物 |
| `.payload-media` | 本地开发上传内容，不属于源码 |
| `.env` | 可能包含 secret |
| `*.dump` | 数据库备份可能包含真实内容和账号数据 |

`.env.example` 是例外：它只保存变量名称和安全占位符，应该进入 Git。

## 第五步：找到源码的分层入口

Kita 的 `src` 不是按“所有组件放一起、所有类型放一起”组织，而是：

```text
src/app          路由与组合
src/features     业务功能
src/server       服务端数据读取
src/payload      CMS schema 与权限
src/migrations   数据库结构演进
src/config       环境变量和模式配置
src/testing      共享测试 fixture
```

打开一个页面时，可以沿真实数据流阅读：

```text
src/app route
  -> src/server getter
  -> Payload Local API
  -> PostgreSQL
  -> feature mapper
  -> feature component
```

这比在全仓库随机搜索 `Game` 更容易建立上下文。

## 第六步：区分源码、生成文件和持久数据

这是阅读项目时最重要的分类之一。

```text
源码
  package.json、src、Dockerfile、migration
  可以由 Git 保存

生成文件
  node_modules、.next、payload-types.ts、importMap
  由工具生成或更新

持久数据
  PostgreSQL、R2 Media、OpenList data
  不能因为“重新构建”就默认删除
```

有些生成文件仍会提交，例如 Payload generated types 和 migration，因为其他环境需要它们形成一致的构建与数据库历史。是否提交不能只根据“它是不是工具生成”判断，还要看仓库是否把它当作事实来源。

## 第七步：找到当前事实，而不是相信所有文档

Kita 的 `docs` 包含路线图、事故记录和历史方案。它们并不全部代表今天的状态。

阅读优先级是：

```text
当前源码与配置
  > CODEX_HANDOFF / current-project-status
  > 最新专项实施记录
  > 早期 plan 和学习笔记
```

例如早期文档曾写不使用 named volume，当前配置已经根据 Windows 性能实测加入两个 targeted volume。旧文档没有错，它记录的是当时的判断；但不能把它直接当作现状。

## 第八步：修改前先做只读检查

安全起点：

```bash
git status
git branch --show-current
git diff
```

再看项目命令：

```bash
pnpm run
```

不要在尚未理解 volume、migration 和环境变量时执行：

```text
删除数据库 volume
重置 Git 历史
覆盖 .env
直接 push main
在生产数据库上试 migration
```

初学者最安全的能力不是记住更多命令，而是先分清哪些操作只读、哪些会改变本地状态、哪些会影响远程或生产。

## 一张最小阅读清单

拿到下一个仓库时，可以按顺序检查：

1. `README`、`AGENTS.md` 或入口文档；
2. 顶层文件和目录；
3. `package.json` 与 lockfile；
4. `.env.example` 与 `.gitignore`；
5. 开发容器或运行时配置；
6. `src` 目录结构；
7. 数据库、上传和部署文件；
8. Git 当前分支与未提交修改；
9. 最小启动、测试和构建命令；
10. 当前事实文档与历史文档的区别。

下一篇会把最常见、也最容易被当作普通 JSON 的 `package.json` 拆开解释。

## 系列导航

- 下一篇：[package.json、pnpm-lock.yaml 和 scripts 到底是什么](/2026/08/04/kita-basics-package-json-pnpm/)
- 相关工程案例：[在 Windows 上为 Next.js 配置 Dev Container](/2026/08/04/kita-case-devcontainer-setup/)
