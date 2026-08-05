---
title: 在 Windows 上为 Next.js 配置 Dev Container
date: 2026-08-04 09:00:00
cover: /img/covers/devcontainer-setup.webp
description: 以 Kita 的实际配置为例，把 Node、pnpm、VS Code 扩展和项目依赖写进 Dev Container，让 Windows 宿主机保持干净。
tags:
  - Dev Container
  - Next.js
  - Windows
  - 实操案例
categories:
  - Kita 工程案例
series: Kita 工程案例
---

> 这是“Kita 工程案例”系列的第一篇。技术选择系列解释我为什么使用 Dev Container；这一篇直接展示 Kita 当前怎样配置、验证和排错。

## 最终要得到什么

这次配置的目标不是“让 Next.js 在 Docker 里跑起来”，而是建立一个能够长期使用的开发边界：

```text
Windows 宿主机
  只安装 Git、Docker Desktop、VS Code、Dev Containers 扩展和浏览器

Dev Container
  提供 Node 22、pnpm、Linux 工具、VS Code 项目扩展和终端

项目仓库
  保存容器配置、依赖版本、编辑器设置和启动命令
```

完成以后，日常 Node 命令只在 Dev Container 中执行，Windows 不需要全局安装 Node、pnpm、Payload 或 PostgreSQL。

## 前置条件

宿主机准备：

- Windows 10/11；
- Docker Desktop，使用 WSL2 后端；
- VS Code；
- Dev Containers 扩展；
- Git。

先确认 Docker Desktop 已启动，再用 VS Code 打开**项目根目录**。如果打开的是父目录，`.devcontainer` 和 `.vscode` 可能不会按预期成为当前 workspace 配置。

## 第一步：创建 `devcontainer.json`

Kita 当前的核心配置如下：

```json
{
  "name": "kita",
  "image": "mcr.microsoft.com/devcontainers/javascript-node:1-22-bookworm",
  "features": {
    "ghcr.io/devcontainers/features/docker-in-docker:3": {}
  },
  "mounts": [
    "source=${devcontainerId}-node-modules,target=${containerWorkspaceFolder}/node_modules,type=volume",
    "source=${devcontainerId}-next-cache,target=${containerWorkspaceFolder}/.next,type=volume"
  ],
  "customizations": {
    "vscode": {
      "extensions": [
        "bradlc.vscode-tailwindcss",
        "dbaeumer.vscode-eslint",
        "esbenp.prettier-vscode"
      ],
      "settings": {
        "editor.defaultFormatter": "esbenp.prettier-vscode",
        "editor.formatOnSave": true,
        "typescript.tsdk": "node_modules/typescript/lib"
      }
    }
  },
  "postCreateCommand": "sudo corepack enable && sudo chown node:node node_modules .next && pnpm install --frozen-lockfile",
  "remoteUser": "node"
}
```

这份文件位于：

```text
.devcontainer/devcontainer.json
```

## 第二步：理解基础镜像，而不是只复制名称

```json
"image": "mcr.microsoft.com/devcontainers/javascript-node:1-22-bookworm"
```

它表示使用微软维护的 JavaScript/Node 开发镜像，Node 主版本为 22，Linux 基础为 Debian Bookworm。

这里固定的是开发环境基线，不是生产镜像。Kita 的生产环境仍由根目录多阶段 `Dockerfile` 构建。

选择官方 Dev Container 镜像的原因是它已经准备好常见开发用户和工具，不需要我先维护一份只为安装 Node 的开发 Dockerfile。

## 第三步：让包管理器版本跟随仓库

`package.json` 中固定：

```json
"packageManager": "pnpm@10.28.2"
```

容器创建后执行：

```bash
sudo corepack enable
pnpm install --frozen-lockfile
```

Corepack 根据 `packageManager` 提供对应 pnpm，`--frozen-lockfile` 则要求安装结果服从已经提交的 lockfile。

这解决了两个常见漂移：新电脑使用另一版 pnpm，以及安装时偷偷重写依赖解析结果。

不要把 Windows 已有的 `node_modules` 直接带进 Linux 容器。原生依赖、文件链接和平台二进制可能不同，应该让容器自己安装。

## 第四步：让编辑器工具也进入容器

VS Code 的 UI 仍运行在 Windows，但 ESLint、Prettier、Tailwind IntelliSense 和 TypeScript 服务需要理解容器内的项目。

因此项目声明三类扩展，并指定：

```json
"editor.defaultFormatter": "esbenp.prettier-vscode",
"editor.formatOnSave": true,
"typescript.tsdk": "node_modules/typescript/lib"
```

最后一项很重要。它让编辑器使用项目安装的 TypeScript，而不是 VS Code 自带的另一个版本。这样编辑器、`pnpm typecheck` 和 CI 看到的类型行为更接近。

## 第五步：坚持使用普通用户

```json
"remoteUser": "node"
```

Kita 不允许在 bind-mounted workspace 中使用 root 运行日常项目命令。

root 写入 `.next` 后，普通 `node` 用户可能无法删除或更新缓存，表现成难以解释的类型错误和构建失败。因此 `package.json` 的主要脚本都会先调用 workspace 用户守卫。

守卫的第一条规则可以概括为：

```text
当前路径位于 /workspaces
+ 当前 UID 为 0
= 拒绝继续运行
```

需要管理员权限的操作只在容器创建阶段通过 `sudo` 精确执行，例如启用 Corepack、修复两个 volume 挂载点的所有权。正常开发仍使用 `node`。

## 第六步：打开容器并完成首次验证

在 VS Code 命令面板执行：

```text
Dev Containers: Reopen in Container
```

首次创建完成后，在容器终端检查：

```bash
whoami
node --version
pnpm --version
pwd
```

预期结果：

```text
whoami        -> node
Node          -> 22.x
pnpm          -> packageManager 指定版本
工作目录      -> /workspaces/Kita
```

再运行：

```bash
pnpm format:check
pnpm lint
pnpm typecheck
```

这一步不仅验证 Node 能运行，也验证编辑器配置、依赖安装和项目脚本已经进入同一环境。

## 常见问题怎样定位

### VS Code 没有识别配置

先确认打开的是包含 `.devcontainer` 的项目根目录，而不是它的父目录。

### 容器内找不到依赖

确认 `postCreateCommand` 是否成功，以及 `node_modules` 是否在容器内重新安装。不要从 Windows 复制依赖目录。

### 文件由 root 创建

先停止相关 Next.js 进程，确认错误文件属于可再生缓存，再按项目故障文档处理。不要对整个仓库盲目执行递归 `chown`，更不要把删除 workspace 当成第一反应。

### 修改配置后没有变化

`devcontainer.json` 的 image、feature、mount 和创建命令发生变化后，需要执行：

```text
Dev Containers: Rebuild Container
```

普通窗口重载不会重新创建容器或 volume 挂载。

## 回滚和安全边界

Dev Container 不会取代 Git。源码仍位于 Windows 仓库，Docker volume 只保存依赖、缓存或开发数据库。

回滚配置时：

1. 先提交或备份源码改动；
2. 停止开发进程；
3. 修改 `devcontainer.json`；
4. Rebuild Container；
5. 重新运行健康检查。

不要因为容器异常就删除 PostgreSQL volume。依赖缓存可以重建，数据库数据不能默认视为缓存。

## 当前结果

这份配置已经在 Kita 的全新 C 盘工作区重建中验证：clone、打开 Dev Container、安装依赖、启动开发、测试、检查和构建均能完成。

下一篇会继续处理这里出现但尚未展开的 DIND：为什么 Kita 在 Dev Container 内再运行 PostgreSQL，以及 `localhost`、`postgres` 两种数据库 host 分别属于什么环境。

## 系列导航

- 对应的决策文章：[为什么我一直使用 Dev Container](/2026/08/02/kita-dev-container/)
- 下一篇：[在 Dev Container 中用 DIND 启动 PostgreSQL](/2026/08/04/kita-case-devcontainer-dind-postgres/)
