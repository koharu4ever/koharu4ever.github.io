---
title: 在 Dev Container 中用 DIND 启动 PostgreSQL
date: 2026-08-04 09:30:00
cover: /img/home-rain-harbor.jpg
description: 以 Kita 为例，把 PostgreSQL 16 运行在 Dev Container 内部的 Docker 中，并让 pnpm dev 自动启动、等待和验证数据库。
tags:
  - Docker-in-Docker
  - PostgreSQL
  - Docker Compose
  - 实操案例
categories:
  - Kita 工程案例
---

> 这是“Kita 工程案例”系列的第二篇。上一篇建立 Dev Container；这一篇在容器内部加入 PostgreSQL，并把“两步启动”收敛为一个可靠入口。

## 这个案例解决什么问题

Kita 的 Next.js 与 Payload 需要 PostgreSQL。

我不想在 Windows 宿主机安装数据库，也不希望开发者每天记住“先启动数据库，再启动 Next.js”。最终结构是：

```text
Windows
  -> Dev Container
       -> pnpm dev 直接运行 Next.js
       -> Docker-in-Docker
            -> Compose PostgreSQL 16
```

Next.js 进程运行在 Dev Container 中，PostgreSQL 则运行在 DIND 创建的子容器中。

## 第一步：启用 Docker-in-Docker Feature

在 `.devcontainer/devcontainer.json` 中加入：

```json
"features": {
  "ghcr.io/devcontainers/features/docker-in-docker:3": {}
}
```

修改后必须 Rebuild Container。重建完成后，在容器终端验证：

```bash
docker version
docker compose version
```

这里使用的是开发容器内部的 Docker daemon，不要求把 Windows Docker socket 直接挂给项目。

## 第二步：用基础 Compose 描述 PostgreSQL

Kita 的 `compose.yaml` 同时服务生产部署，因此 PostgreSQL 的核心定义放在基础文件中：

```yaml
services:
  postgres:
    image: postgres:16
    environment:
      POSTGRES_DB: ${POSTGRES_DB:-kita}
      POSTGRES_USER: ${POSTGRES_USER:-postgres}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-postgres}
    healthcheck:
      test:
        [
          "CMD-SHELL",
          "pg_isready -U ${POSTGRES_USER:-postgres} -d ${POSTGRES_DB:-kita}",
        ]
      interval: 5s
      timeout: 5s
      retries: 12
      start_period: 10s
    volumes:
      - postgres-data:/var/lib/postgresql/data

volumes:
  postgres-data:
```

几个关键点：

- 固定 PostgreSQL 16，与生产基线一致；
- 数据进入专用 volume，不随容器重建消失；
- healthcheck 使用 `pg_isready`；
- 用户、数据库和密码来自环境变量；
- 基础文件不直接暴露数据库端口。

## 第三步：用开发 override 暴露端口

本地开发时，Next.js 不在 Compose 的 `web` service 中，而是直接运行在 Dev Container。因此需要把子容器的 PostgreSQL 映射到 Dev Container 的 `localhost:5432`。

`compose.dev.yaml` 只包含开发差异：

```yaml
services:
  postgres:
    ports:
      - "5432:5432"
    restart: unless-stopped
```

生产 Coolify 只读取 `compose.yaml`，不会读取这份开发 override，也不应公开 PostgreSQL 端口。

## 第四步：正确理解两种 `DATABASE_URI`

本地 `.env` 使用：

```env
DATABASE_URI=postgres://postgres:postgres@localhost:5432/kita
```

原因是 Next.js 进程直接位于 Dev Container，Compose 已把子容器的 5432 映射到这个环境的 localhost。

生产 `web` 与 `postgres` 同属 Compose 网络，使用 service name：

```env
DATABASE_URI=postgres://<user>:<password>@postgres:5432/kita
```

可以用一张表区分：

| 运行位置 | 数据库 host | 原因 |
| --- | --- | --- |
| Dev Container 中直接运行 Next.js | `localhost` | PostgreSQL 端口已由开发 override 映射出来 |
| Coolify Compose 的 `web` service | `postgres` | Compose 内部 DNS 使用 service name |

把生产 URI 原样复制到本地，或者把 localhost 带进生产，是最常见的连接错误之一。

## 第五步：让 `pnpm dev` 自动启动数据库

Kita 的脚本是：

```json
{
  "dev": "node scripts/assert-dev-workspace-user.mjs --check-next --mode=dev && pnpm dev:services && next dev",
  "dev:services": "node scripts/assert-dev-workspace-user.mjs && docker compose -f compose.yaml -f compose.dev.yaml up -d --wait postgres",
  "dev:services:stop": "node scripts/assert-dev-workspace-user.mjs && docker compose -f compose.yaml -f compose.dev.yaml stop postgres"
}
```

完整顺序是：

```text
pnpm dev
  -> 检查当前不是 root
  -> 检查 .next 所有权和冲突进程
  -> Compose 启动 postgres
  -> --wait 等待 healthcheck
  -> next dev
```

`docker compose up -d` 是幂等的。数据库已经运行时，它会确认状态，不会因为再次执行就清空 volume。

## 为什么 `--wait` 不能省略

容器进程启动，不代表 PostgreSQL 已准备好接受连接。

如果脚本只执行 `up -d` 后立刻启动 Next.js，Payload 可能在数据库初始化期间连接失败，页面表现成超时或错误 fallback。

`--wait` 配合 healthcheck，让启动脚本等待数据库真正 ready。出现问题时，失败也会停在服务准备阶段，而不是继续产生一串模糊的页面错误。

## `restart: unless-stopped` 与启动脚本不是重复

DIND 所在的 Dev Container 重启时，内部 Docker daemon 也会重启。开发 override 的 restart policy 尝试恢复 PostgreSQL 子容器。

但它不能替代 `pnpm dev:services`：

- restart policy 负责 daemon 恢复后的自动启动；
- `pnpm dev:services` 负责每次开发前确定性确认和等待。

两层分别解决“自动恢复”和“明确验收”。

## 本地验证清单

第一次配置后执行：

```bash
pnpm dev:services
docker compose -f compose.yaml -f compose.dev.yaml ps
```

预期看到 PostgreSQL 为 healthy。然后检查端口：

```bash
docker compose -f compose.yaml -f compose.dev.yaml exec postgres \
  pg_isready -U postgres -d kita
```

最后运行：

```bash
pnpm dev
```

验收内容：

- 首页能打开；
- `/admin` 能连接本地 Payload；
- 依赖数据库的 Games、Reviews、Tools 不超时；
- 重启 Dev Container 后再次执行 `pnpm dev` 能自动恢复服务；
- `pnpm dev:services:stop` 只停止数据库容器，不删除 volume。

## 常见故障

### 端口 5432 已被占用

检查是否有另一套本地 PostgreSQL 或另一个项目占用端口。不要通过同时启动多套数据库再猜测连接目标来解决。

### 数据库容器 running，但页面仍连接失败

先看 health 状态，再核对 `DATABASE_URI` 中的 host、用户、密码和数据库名。Running 不等于 healthy。

### 修改了 `POSTGRES_PASSWORD`，旧 volume 仍不能登录

PostgreSQL 官方镜像只在第一次初始化空数据目录时应用初始密码。已有 volume 后，仅修改环境变量不会自动修改数据库内部密码。

### 完整执行 `docker compose up` 启动了不需要的服务

本地标准命令明确指定 `postgres`。不要把生产 `web` 和 `backup` 一起当成本地日常入口。

## 回滚边界

如果要撤销 DIND 数据库方案，先导出需要保留的本地数据，再停止服务。不要把删除 Docker volume 当作普通停止操作。

Compose 文件可以回滚，数据库 volume 中的内容则属于开发数据资产。两者必须分开对待。

## 当前结果

Kita 当前使用 `pnpm dev` 作为单一日常入口，PostgreSQL 由脚本自动启动并等待。这个方案已经在全新 clone 的本地重建中验证。

下一篇处理这套结构在 Windows 上暴露的性能问题：为什么源码适合 bind mount，而 `.next` 和 `node_modules` 不适合。

## 系列导航

- 上一篇：[在 Windows 上为 Next.js 配置 Dev Container](/2026/08/04/kita-case-devcontainer-setup/)
- 下一篇：[修复 Windows 9P 导致的 Next.js 编译缓慢](/2026/08/04/kita-case-windows-nextjs-performance/)
