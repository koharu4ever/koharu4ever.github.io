---
title: 为什么 Build 通过了，生产容器仍然 503
date: 2026-08-04 14:00:00
cover: /img/P3F.jpg
description: 一次真实的 Kita 生产故障：Next.js 构建成功，但 Payload migration 在精简 runner 中加载前端依赖失败，导致容器反复退出。
tags:
  - 故障复盘
  - Docker
  - Payload CMS
  - Next.js
categories:
  - Kita 工程案例
---

> 这是“Kita 工程案例”系列的第七篇。这篇不介绍新工具，而是复盘一次最有价值的生产事故：CI 与 Docker build 都通过，线上仍然返回 503。

## 故障现象

当时的部署表现是：

```text
pnpm build                  成功
Docker image build         成功
Coolify 创建新容器         成功
访问任何页面               503 no available server
Runtime Logs               反复出现 Running Payload migrations...
```

第一反应很容易是继续检查 Next.js 构建或代理。但 image 已经生成，真正失败发生在容器启动之后。

## 先理解 Kita 的启动顺序

生产 Dockerfile 最终执行：

```dockerfile
CMD ["./docker-entrypoint.sh"]
```

entrypoint 顺序是：

```sh
#!/bin/sh
set -eu

echo "Running Payload migrations..."
./node_modules/.bin/payload migrate --use-swc

echo "Starting Next.js..."
exec node server.js
```

也就是说，Next.js server 只有在 Payload migration 成功后才启动。

日志反复出现第一行，不代表 migration 执行了很多次，而是容器失败后被不断重新创建或重启，每次都从第一步开始。

## Builder 与 Runner 看到的文件不同

多阶段 Dockerfile 的 builder 阶段拥有完整源码：

```text
COPY . .
pnpm build
```

runner 为了减少运行内容，只复制 Next standalone 和 Payload runtime 必需文件：

```text
payload.config.ts
src/config/media-storage.ts
src/payload
src/migrations
public
.next/standalone
.next/static
```

Next.js build 在 builder 中成功，只能证明完整源码环境可以打包页面。

Payload CLI 在 runner 启动时会直接读取：

```text
payload.config.ts
  -> src/payload/collections/games.ts
  -> 该 collection 的全部 import
```

它不只使用已经生成的 `.next/standalone`。

## 真正的错误依赖

当时 Games Collection 为 `coverKey` 下拉框导入：

```ts
import { gameCoverOptions } from "@/features/games/data/game-cover-assets";
```

这个前端文件同时保存：

- 允许的 key；
- key 对应的图片路径；
- alt、宽高等展示信息。

在 builder 中，`src/features` 存在，所以 build 通过。

在精简 runner 中，Dockerfile 没有复制整个 `src/features`。Payload migration 读取 Games Collection 时遇到：

```text
Cannot find module '@/features/games/data/game-cover-assets'
```

因为 entrypoint 使用 `set -e`，migration 返回非零后 shell 立即停止，`node server.js` 从未执行，最终由代理返回 503。

## 为什么不直接复制整个 `src/features`

最快的表面修复可能是：

```dockerfile
COPY --from=builder /app/src/features ./src/features
```

我没有采用，因为 Payload schema 只需要几个固定选项，不需要整个 Games 前端 feature。

扩大 runner 会留下不合理依赖：

```text
后端 Collection
  -> 前端图片 registry
```

以后前端目录移动仍可能让 migration 崩溃，Dockerfile 也会不断为错误依赖补复制规则。

## 当时怎样修复

修复方式是删除 Collection 对前端 registry 的 import，把允许写入数据库的几个 key 直接作为 schema options 保存。

前端 registry 继续负责：

```text
coverKey
  -> src / alt / width / height
```

两边出现少量重复，但职责清楚：

```text
Payload Collection
  定义哪些值可以进入数据库

Frontend Registry
  定义每个值怎样显示
```

对于当时六个固定 key，这比创建共享包、修改 runner COPY 或引入代码生成更简单。

## 为什么不需要 migration

修复前后，数据库允许保存的值完全相同。改变的只是 options 从哪个 TypeScript 文件获得。

没有新增字段、删除字段、改变 enum 值或索引，因此数据库 schema 未变化，不应该为了“修了生产问题”就生成一个空 migration。

这也是判断 migration 的一个实用问题：

> 数据库中的结构或数据需要变化吗？如果没有，代码依赖修复不一定对应 migration。

## 怎样在部署前复现 runner 路径

常规门禁仍然运行：

```bash
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

针对这次故障，还要模拟 runner 只拥有最小文件的环境，并执行只读命令：

```bash
payload migrate:status --use-swc
```

验证重点不是连接真实生产数据库，而是确认 Payload config 和全部 Collection import 能在 runner 文件集合中加载。

修复前会在导入 Games Collection 时失败；修复后能够继续到数据库连接阶段。

## 生产验证顺序

重新部署后检查：

```text
Runtime Logs
  -> migration 完成
  -> Starting Next.js 出现

HTTP smoke
  -> GET /                  200
  -> GET /reviews           200
  -> GET /games             200
  -> GET /api/games?limit=1 正常 Payload JSON
```

API 返回空 `docs` 并不表示系统仍然失败，只说明当时生产还没有录入 Games。能够返回标准 Payload 响应已经证明 Web、Collection、数据库和 migration 链路启动。

## 这次事故后来怎样失去业务影响

Games 封面随后迁移到 Payload Media，旧 `coverKey` 与前端本地图片 registry 已被整体移除。

因此本文中的具体 offending import 已经不属于当前代码。

但故障模式仍然存在：只要 Payload runtime 配置导入了 runner 没有复制的源码，`pnpm build` 仍可能无法发现。

当前 Dockerfile 显式复制 Payload config、Collection、migration 和媒体配置，就是在维护这个运行时边界。

## 可复用的排错方法

看到线上 503 时，先判断失败阶段：

```text
clone 失败
  -> 仓库与权限

install 失败
  -> package / lockfile / registry

build 失败
  -> Next / TypeScript / bundling

image 成功，container 退出
  -> entrypoint / migration / runtime import / env / database

container healthy，域名失败
  -> proxy / DNS / TLS
```

Build 成功不是无价值，只是它只覆盖了构建路径。生产启动还可能拥有另一条直接读取源码和配置的执行路径。

## 回滚边界

如果新版本在 migration 前崩溃，数据库可能完全没有变化，也可能已经执行了部分 migration。不能只根据 503 猜测。

先查看 migration 日志与数据库状态，再决定回滚镜像还是修复向前。不要反复重启并假设每次都“什么也没发生”。

## 这次案例留下的规则

1. 多阶段镜像中，builder 和 runner 是不同文件系统；
2. Next build 与 Payload CLI 是不同执行路径；
3. 后端配置不要随意依赖前端 feature；
4. selective `COPY` 后必须验证运行时直接加载的配置；
5. 线上 503 先看 Runtime Logs，不要只重看 Build Logs。

下一篇完成这套工程案例的最后一环：有了真实 backup 后，怎样在隔离环境做 Restore Drill，以及 Kita 当前究竟验证到了哪一步。

## 系列导航

- 上一篇：[用 Backup Sidecar 把 PostgreSQL 备份到 R2](/2026/08/04/kita-case-postgres-r2-backup/)
- 下一篇：[从备份文件到真正恢复：Kita Restore Drill 操作手册](/2026/08/04/kita-case-restore-drill/)
