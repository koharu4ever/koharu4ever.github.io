---
title: 修复 Windows 9P 导致的 Next.js 编译缓慢
date: 2026-08-04 10:00:00
cover: /img/covers/windows-nextjs-performance.webp
description: Kita 在 Windows bind mount 上出现分钟级编译和 root 污染，本案例展示怎样用两个定向 volume 与用户守卫修复，而不搬走整个源码。
tags:
  - Windows
  - Next.js
  - Docker Volume
  - 故障排查
categories:
  - Kita 工程案例
---

> 这是“Kita 工程案例”系列的第三篇。前两篇建立了 Dev Container 与 DIND PostgreSQL；这一篇处理实际使用后出现的性能和文件所有权问题。

## 故障现象

Kita 源码位于 Windows，并以 bind mount 出现在：

```text
/workspaces/Kita
```

这种方式很适合源码：Windows、VS Code 和容器看到的是同一份文件。

问题出现在 Next.js 开发缓存和依赖目录。首次页面编译达到分钟级，`.next` 中还曾混入 root 创建的文件，导致 TypeScript 和 `next build` 产生看似无关的错误。

我最后确认这是两个问题，不应该用一个模糊的“Docker 很慢”概括：

1. Windows 与 Linux 容器之间的小文件 I/O 很慢；
2. 不同用户写入同一 `.next`，破坏了缓存所有权。

## 为什么 `.next` 和 `node_modules` 特别敏感

Next.js 开发模式会在 `.next` 中频繁创建和读取：

- Turbopack 编译产物；
- 路由与模块缓存；
- 服务端和客户端中间文件；
- 大量体积小、数量多的文件。

`node_modules` 也包含大量小文件，模块解析会不断访问它们。

Windows bind mount 的优势是实时共享源码，不擅长这种高频 Linux 小文件工作负载。把整个项目移入 volume 又会失去宿主机直接保存源码的便利。

所以修复目标是：只移动真正有问题的两个目录。

## 第一步：增加两个定向 named volume

在 `.devcontainer/devcontainer.json` 中加入：

```json
"mounts": [
  "source=${devcontainerId}-node-modules,target=${containerWorkspaceFolder}/node_modules,type=volume",
  "source=${devcontainerId}-next-cache,target=${containerWorkspaceFolder}/.next,type=volume"
]
```

最终文件系统边界是：

```text
Windows bind mount
└── /workspaces/Kita
    ├── src/             继续与 Windows 同步
    ├── docs/            继续与 Windows 同步
    ├── package.json     继续与 Windows 同步
    ├── node_modules/    Docker named volume 覆盖
    └── .next/           Docker named volume 覆盖
```

源码、文档和配置仍然属于 Windows 仓库；依赖和可再生缓存使用 Docker 所在的 Linux 文件系统。

## 第二步：修复新 volume 的所有权

新挂载点第一次创建时可能归 root 所有，而 Kita 的日常用户是 `node`。

因此创建命令使用：

```json
"postCreateCommand": "sudo corepack enable && sudo chown node:node node_modules .next && pnpm install --frozen-lockfile"
```

这里只修改两个明确的挂载点，不递归改变整个 workspace。`pnpm install` 随后在新的 Linux volume 中安装依赖。

修改 mount 后必须 Rebuild Container。只重启终端不会重新建立挂载关系。

## 第三步：阻止 root 再次污染缓存

只执行一次 `chown` 不能阻止未来的 root 命令再次写入。

Kita 为主要脚本增加 `assert-dev-workspace-user.mjs`。它检查：

- bind-mounted workspace 中 UID 不能为 0；
- 执行关键命令前，`.next` 不能包含其他 owner 的文件；
- `next dev` 与 `next build` 不能同时操作同一输出目录。

`package.json` 中的入口因此类似：

```json
"build": "node scripts/assert-dev-workspace-user.mjs --check-next --mode=build && next build",
"dev": "node scripts/assert-dev-workspace-user.mjs --check-next --mode=dev && pnpm dev:services && next dev"
```

`next.config.ts` 还保留第二层 root 防护。这样即使有人绕过 package script 直接启动 Next.js，项目仍会拒绝在 `/workspaces` 中以 root 运行。

## 第四步：不要同时运行 dev 和 build

开发服务器和生产构建默认都使用 `.next`。

如果 `next dev` 正在写缓存，同时执行 `next build`，即使用户一致，也可能产生相互覆盖和难以复现的生成错误。

Kita 的守卫会检查活动进程：

```text
准备 build
  -> 如果发现 next dev，拒绝执行

准备 dev
  -> 如果发现 next build，拒绝执行
```

提交前运行 build 时，先停止开发服务器。

## 验证 volume 是否真正生效

Rebuild Container 后，在容器终端检查：

```bash
whoami
findmnt node_modules
findmnt .next
```

也可以使用：

```bash
mount | grep -E '/node_modules|/.next'
```

预期：

- 当前用户为 `node`；
- 两个目录是独立 Docker volume 挂载；
- 源码目录仍然是 bind mount；
- `pnpm install --frozen-lockfile` 成功；
- `pnpm dev` 可以写入 `.next`。

## 怎样测量，而不是凭感觉判断

至少记录三组时间：

1. Rebuild 后首次 `pnpm dev` 到首页可用；
2. 首次打开数据较重的 `/games`；
3. 修改一个组件后的增量编译。

Kita 在修复前首屏编译达到分钟级，调整后回到秒级。第一次 `/games` 仍可能因为路由、Payload 和数据库首次加载较慢，所以不能只用一个页面的一次请求判断 volume 是否有效。

测试时还要区分：

```text
冷启动
路由首次编译
数据库首次连接
浏览器缓存
增量编译
```

否则很容易把不同阶段的等待全部归咎于 Docker。

## 常见错误

### 把整个仓库复制进 named volume

这会让宿主机源码、Git 和容器内部文件产生新的事实来源。Kita 只移动依赖与缓存。

### 用 root 安装依赖

安装成功不代表正确。随后普通用户可能无法更新依赖或缓存，错误会延迟出现。

### 把数据库 volume 当缓存删除

`.next` 可以重建，PostgreSQL 数据不应默认删除。处理 Docker volume 前必须先识别其职责。

### 修复性能时忽略数据库

Kita 当时还存在 PostgreSQL 没有自动启动的问题。页面长时间等待既可能来自编译，也可能来自数据库连接超时。最后同时用 targeted volume 和 `pnpm dev:services` 分别修复。

## 回滚方案

如果新的 volume 配置有问题：

1. 先停止 Next.js；
2. 保留 Windows 源码和未提交改动；
3. 回滚 `mounts` 与 `postCreateCommand`；
4. Rebuild Container；
5. 重新安装依赖；
6. 再做一次冷启动测量。

不要在没有识别 volume 名称和内容前批量删除 Docker volumes。

## 当前结果

Kita 目前只有两个经过实测证明的性能例外：`node_modules` 和 `.next`。没有为了追求更多隔离把源码、Media 或其他目录继续放进 volume。

下一篇离开开发环境，进入内容存储：怎样配置 Payload Media、Cloudflare R2、图片尺寸、公开域名和生产 fail-fast。

## 系列导航

- 上一篇：[在 Dev Container 中用 DIND 启动 PostgreSQL](/2026/08/04/kita-case-devcontainer-dind-postgres/)
- 下一篇：[从 Payload Media 到 Cloudflare R2 的完整配置](/2026/08/04/kita-case-payload-media-r2/)
