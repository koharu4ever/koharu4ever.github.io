---
title: 一个人维护全栈项目：我准备怎样升级 Kita
date: 2026-08-04 17:30:00
cover: /img/covers/kita-upgrade-maintenance.webp
description: 把依赖升级拆成 Node、Next、Payload、PostgreSQL 和 OpenList 五条不同风险路径，而不是一次性追逐最新版。
tags:
  - 依赖升级
  - pnpm
  - Next.js
  - Payload CMS
categories:
  - Kita 真实开发记录
---

Kita 当前的版本组合写在 `package.json`：

```text
Node       22
pnpm       10.28.2
Next.js    16.2.7
React      19.2.7
Payload    3.85.1
TypeScript 6.0.3
PostgreSQL 16
```

这些数字迟早都会过时。真正需要长期保留的不是“永远使用这一版”，而是每一类升级应该改哪些文件、怎样证明没有破坏数据。

## Lockfile 不是不允许升级

`package.json` 表达允许范围，`pnpm-lock.yaml` 记录本次解析出的完整依赖树。

开发环境和 CI 都使用：

```bash
pnpm install --frozen-lockfile
```

这保证同一个 commit 安装相同依赖。要升级时，应该在一个明确 PR 中更新 package 和 lockfile；不应该让部署机器每次自己寻找“今天最新的兼容版本”。

## 我不会把所有包一起升级

一次升级 30 个 package 的问题不是 diff 太长，而是失败时不知道责任属于谁。

Kita 更适合把升级分成几组：

```text
工具组
  ESLint / Prettier / Vitest / TypeScript

Next 组
  Next.js / React / React DOM / eslint-config-next

Payload 组
  payload / @payloadcms/* / Lexical / storage adapter

运行环境组
  Node / Dev Container / Docker base image / GitHub Actions

数据服务组
  PostgreSQL / OpenList
```

同一生态中需要相互匹配的包一起升级，不相关的风险分开。

## Node 升级至少有三处

Kita 的 Node 22 不只存在于一行：

```text
.devcontainer/devcontainer.json
  javascript-node:1-22-bookworm

Dockerfile
  node:22-bookworm-slim

.github/workflows/ci.yml
  node-version: 22
```

还要核对 `@types/node`、Corepack/pnpm 行为和 native dependencies，例如 Sharp、SWC。

只改 Dev Container 会造成“本地新、生产旧”；只改 Dockerfile 会造成“CI 通过的不是部署版本”。运行环境升级必须把三处作为一个检查单元。

## Next.js 升级先看运行模式

Kita 使用：

- App Router；
- Server Components；
- dynamic routes 和 metadata；
- `output: "standalone"`；
- `typedRoutes`；
- Payload 的 `withPayload()`；
- Next Image remote pattern。

升级 Next 时，除了 `pnpm build`，还要检查 standalone runner、Payload Admin、dynamic 页面、图片 URL 和 Client Component 交互。

首页的 WebGL 雨滴不一定会被类型检查覆盖；Games Lightbox 的焦点和键盘行为也不一定因为 build 成功就正确。这些需要浏览器 smoke。

## Payload 升级要同时看代码和数据库

Payload 相关包应保持兼容版本，不单独把 `payload` 升级而留下旧的 `@payloadcms/db-postgres`、`@payloadcms/next` 或 rich text adapter。

升级后至少执行：

```bash
pnpm payload:types
pnpm payload:importmap
pnpm check
pnpm test
pnpm build
```

然后判断 Collection schema 是否真的变化。依赖版本变化不自动等于需要新 migration；但如果生成的 schema 或 adapter 行为改变，必须在空 PostgreSQL 和生产数据副本上验证 migration 链。

Kita 还有一项普通 Next build 不会覆盖的路径：production runner 会直接加载 Payload config 并运行 migration。7 月 3 日的 503 已经证明，这条路径需要单独检查。

## PostgreSQL 不能当作普通镜像 tag 更新

Compose 当前固定 `postgres:16`。升级到新的 major 版本不是把 `16` 改成另一个数字就结束。

数据库 major upgrade 需要：

1. 完整 dump；
2. 独立新实例；
3. restore；
4. 执行 Payload 查询与写入；
5. 检查 migration status；
6. 页面和 Admin smoke；
7. 明确回退到旧实例的方法。

Kita 目前连 PostgreSQL 16 的完整 restore drill 都尚未完成，因此没有理由为了追新版本提前扩大这个风险。

## OpenList 是另一条发布节奏

OpenList 使用独立 Coolify Application 和固定镜像版本。升级它不应该触发 Kita build、Payload migration 或 PostgreSQL 变更。

它自己的升级清单是：

```text
备份 OpenList data
  -> 阅读 release notes
  -> 更新固定 image tag
  -> 检查管理员登录
  -> 检查公开目录、预览、下载
  -> 检查 Kita 中旧 archive URL
```

如果 OpenList 回滚，Kita 不需要一起回滚。这正是当初没有把它塞进 Kita Compose 的长期收益。

## 一次依赖升级 PR 的实际顺序

我希望保持下面这种节奏：

```text
git fetch origin
  -> 从 origin/main 建功能分支
  -> 阅读目标版本 release notes / migration guide
  -> 只更新一个依赖组
  -> 阅读 package.json 和 lockfile diff
  -> 重新生成需要的 types/import map
  -> pnpm check
  -> pnpm test
  -> 停止 dev 后 pnpm build
  -> Docker / runner 路径检查
  -> 浏览器 smoke
  -> Pull Request + quality
```

涉及数据库或 storage adapter 时，还要在发布前备份，并把生产 smoke 和回滚条件写进 PR。

## Security Patch 与普通升级不是同一优先级

如果 Next、Payload、OpenList 或基础镜像出现影响当前用法的安全更新，应缩小范围尽快处理。普通 feature release 则可以等到项目有明确收益。

判断顺序不是“有没有新版本”，而是：

```text
当前版本是否受影响
  -> 项目是否使用受影响功能
  -> 补丁是否包含 breaking change
  -> 我能否在现有检查之外验证运行和数据
```

## 文档也会随升级过期

Kita 已经发生过文档与源码不一致：早期文档说不使用 named volume，后来 Windows 性能数据让 `.next` 和 `node_modules` 成为有边界的例外；测试数量和正常启动命令也曾漂移。

因此升级完成后，事实顺序应该是：

```text
当前源码与配置
  -> current-project-status
  -> 工程案例
  -> 教程文章
  -> 带日期的历史计划保留原样
```

不能为了让旧文章继续正确，反过来让源码保持旧决定。

## 我更在意可回退，而不是永远最新

一个人维护项目时，最危险的不是落后一个 minor version，而是同时升级应用、数据库、容器和内容模型，最后没有一个可以单独回退的节点。

Kita 以后可以继续更新，但每次只扩大一个已知边界。升级应该留下 commit、PR、检查结果和数据恢复路径，而不是只在 `package.json` 里留下几个更大的数字。

下一篇讨论 Self-host 最容易被忽略的部分：[Kita 的资源、成本与单点故障](/2026/08/04/kita-real-cost-and-resources/)。
