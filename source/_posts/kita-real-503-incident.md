---
title: Build 通过，网站却 503：我第一次真正看懂 Runner
date: 2026-08-04 17:05:00
cover: /img/covers/kita-503-incident.webp
description: 复盘 Kita 真实发生的一次生产故障：镜像成功构建，Payload migration 却因为缺少前端源文件让容器持续退出。
tags:
  - 故障复盘
  - Docker
  - Payload CMS
  - 503
categories:
  - Kita 真实开发记录
series: Kita 真实开发记录
---

2026 年 7 月 3 日，Kita 的 Games 接入 Payload 后，production build 是成功的，网站却返回：

```text
503 no available server
```

真正有用的错误不在 build log 里，而在容器 runtime log：

```text
Cannot find module '@/features/games/data/game-cover-assets'
```

事故提交和修复提交挨在一起：

```text
4d1e8a8 feat: add Payload-backed games archive
e49fc3f fix: keep games collection runtime self-contained
```

修复只改了 `src/payload/collections/games.ts`。这次故障真正改变的不是 11 行代码，而是我对 Docker image 的理解。

## 只看 503，什么都解释不了

503 只说明反向代理找不到可用的应用服务。它没有告诉我：

- Next build 是否失败；
- migration 是否失败；
- PostgreSQL 是否没 ready；
- server 是否监听错端口；
- container 是否启动后立刻退出。

这次 Coolify 已经完成 image build，也创建并启动了新 container。继续重复看 `pnpm build` 不会得到更多答案。

runtime log 反复出现：

```text
Running Payload migrations...
```

它不是 migration 被执行成功很多次，而是 container 启动、报错、退出、重启，然后重新从第一行开始。

## 出问题的 import 很普通

当时 Games Collection 为了得到封面选项，写了类似这样的依赖：

```ts
import { gameCoverOptions } from "@/features/games/data/game-cover-assets";
```

在开发目录里，这两个文件都存在：

```text
src/payload/collections/games.ts
src/features/games/data/game-cover-assets.ts
```

路径别名 `@/` 也配置正确。本地 dev 正常，Next production build 也正常。因此问题不是拼错路径。

问题是 build 时和运行时面对的根本不是同一个文件系统。

## Builder 有完整源码，Runner 没有

Kita 使用 multi-stage Dockerfile。

builder 阶段会：

```dockerfile
COPY . .
RUN pnpm build
```

整个 `src/features` 都在，因此 Next 能成功打包页面。

最终 runner 为了缩小镜像和明确边界，只复制运行需要的内容：

```text
payload.config.ts
src/config/media-storage.ts
src/payload
src/migrations
public
.next/standalone
.next/static
node_modules
```

它没有完整的 `src/features`。

如果 production 只运行 Next standalone，这未必有问题，因为页面代码已经进入构建产物。但 Kita 启动前还要执行：

```sh
payload migrate --use-swc
```

Payload CLI 会在 runtime 直接读取：

```text
payload.config.ts
  -> Games Collection
     -> game-cover-assets.ts
```

最后一个文件不在 runner 里，于是 migration 还没连接数据库，模块加载就失败了。

## 为什么整个网站会消失

entrypoint 的顺序很短：

```sh
#!/bin/sh
set -eu

echo "Running Payload migrations..."
./node_modules/.bin/payload migrate --use-swc

echo "Starting Next.js..."
exec node server.js
```

`set -e` 表示命令返回非零状态就停止。于是实际链路是：

```text
container start
  -> Payload migrate
  -> import Games Collection
  -> 找不到 src/features 文件
  -> shell exit
  -> node server.js 从未执行
  -> 代理没有健康 Web 服务
  -> 503
```

这次数据库没有被错误修改。migration 根本没走到执行 SQL 的阶段。

## 两个修法，为什么我选了更小的那个

最直接的补丁是让 runner 复制整个 `src/features`：

```dockerfile
COPY --from=builder /app/src/features ./src/features
```

这样确实能让模块存在，但它让 production image 为一个不合理的依赖方向买单：Payload schema 只需要六个合法 key，却被迫携带整个前端 feature。

最后的修复是删除这条跨层 import，把稳定的 select options 留在 Games Collection 内。前端 registry 继续负责 key 到图片显示信息的映射。

```text
Payload Collection
  只负责允许哪些值进入数据库

前端图片 registry
  只负责这些值怎样显示
```

这带来少量字符串重复，但换回了 runner 中可以独立加载的后端配置。

数据库允许值没有变化，所以没有生成新 migration。

## 这次验证补上了 build 漏掉的那一层

修复后不只重新跑 ESLint、typecheck 和 Next build，还临时构造了接近 runner 的目录，只放：

```text
package.json
payload.config.ts
tsconfig.json
src/payload
src/migrations
node_modules
```

然后执行只读的：

```text
payload migrate:status --use-swc
```

修复前，它在加载 Games 时报告缺少模块；修复后，它能够加载完整 Payload config，并继续走到连接临时 PostgreSQL 的阶段。

生产最终检查是：

```text
GET /                  -> 200
GET /reviews           -> 200
GET /games             -> 200
GET /api/games?limit=1 -> Payload JSON
```

## 我从这次事故留下的排错顺序

现在看到“部署成功但站点不可用”，我先区分失败发生在哪个阶段：

```text
clone
  -> install
  -> Next build
  -> image build
  -> container entrypoint
  -> migration
  -> server start
  -> health check
  -> reverse proxy
```

每一层有自己的证据。build 绿色，只能排除 build 失败；container running，也不保证应用已经走到监听端口。

更具体的一条规则是：如果 runner 使用 selective `COPY`，就要检查有哪些工具会在 runtime 直接读取 TypeScript 源文件。Kita 的 Payload migration CLI 就属于这一类。

这篇复盘的完整工程说明保存在 Kita 仓库的 `docs/games-production-runtime-dependency-incident.md`。下一篇回到数据本身：[我到底在 Kita 里保存什么](/2026/08/04/kita-real-data-model/)。
