---
title: Kita 常用命令手册：先判断目的，再敲命令
date: 2026-08-04 16:50:00
cover: /img/covers/kita-command-guide.webp
description: 按查看、开发、检查、Payload、Docker 和 Git 六类目的整理 Kita 命令，并标记它们会改变什么。
tags:
  - 命令行
  - pnpm
  - Docker
  - Git
  - 初学者
categories:
  - Kita 从零理解
series: 从零读懂 Kita
---

> 这是“从零读懂 Kita”系列的第十一篇。命令不是咒语。同一条命令在不同目录、分支和环境中可能得到完全不同的结果，因此每次执行前先回答：我想观察什么，还是改变什么？

## 先给命令分风险

| 类型 | 例子 | 可能影响 |
|---|---|---|
| 只读观察 | `git status`、`docker compose ps` | 不主动改变项目状态 |
| 本地生成或修改 | `pnpm format`、`pnpm build` | 修改源码格式或生成目录 |
| 本地服务状态 | `pnpm dev`、`docker compose up` | 启停进程与容器 |
| 数据写入 | migration、seed、restore | 改变数据库或对象存储 |
| 远程写入 | `git push`、合并 PR | 改变 GitHub 或触发部署流程 |

一条命令属于哪类，比它有几个参数更值得先记住。

## 进入项目后先观察

这些命令帮助我确认“我在哪里、现在是什么状态”：

```bash
pwd
ls
git status
git diff
git log --oneline -5
pnpm run
docker compose -f docker/dev/compose.yaml ps
```

- `pwd` 确认当前目录；
- `git status` 确认分支、改动和未跟踪文件；
- `pnpm run` 列出项目已经定义的 scripts；
- `docker compose ... ps` 只查看开发服务状态。

如果命令提示找不到 `package.json` 或 compose 文件，先检查目录，不要立刻重装工具。

## 开发服务

Kita 的 Node 命令全部在 Dev Container 中运行：

```bash
pnpm dev
```

它启动 Next.js 开发服务器。需要本地 PostgreSQL 等依赖服务时：

```bash
pnpm dev:services
```

或者只启动明确的服务：

```bash
docker compose -f docker/dev/compose.yaml up -d --wait postgres
```

停止 PostgreSQL：

```bash
docker compose -f docker/dev/compose.yaml stop postgres
```

停止服务和删除数据不是一回事。普通结束开发不需要删除 volume。

## 代码质量命令

```bash
pnpm format:check
pnpm lint
pnpm typecheck
pnpm check
pnpm test
pnpm build
```

- `format:check` 只检查格式；
- `lint` 检查容易出错或不符合约定的写法；
- `typecheck` 让 TypeScript 验证类型，不生成应用；
- `check` 聚合项目定义的静态检查；
- `test` 运行自动测试；
- `build` 验证生产构建路径。

如果项目提供写入式格式化命令，例如 `pnpm format`，它会修改文件。运行前后都要看 `git diff`。

Kita 的 test 还可以细分为 unit 和 backup shell cases。选择最窄的命令用于快速反馈，提交前再运行项目要求的整套检查。

## Build 前为什么先停 Dev

Next.js dev 和 build 都可能写 `.next`。在同一个工作目录同时运行，可能出现缓存互相覆盖、文件被占用或结果不可重复。

所以验证 build 时：

1. 停止 `pnpm dev`；
2. 确认没有另一个进程使用同一 `.next`；
3. 再运行 `pnpm build`；
4. build 完成后按需重新启动 dev。

## Payload 与 Migration 命令

```bash
pnpm payload:types
pnpm payload:migrate:create
pnpm payload:migrate:status
pnpm payload:migrate
```

- `payload:types` 根据 Payload 配置生成 TypeScript 类型；
- `migrate:create` 创建新的迁移文件；
- `migrate:status` 查看已运行与待运行状态；
- `migrate` 真正改数据库，执行前必须确认连接的是哪个环境。

生产 migration 不是“看到有命令就试一下”。应先备份、核对 `DATABASE_URI`、阅读 migration，并在副本或临时数据库验证。

Seed 同样会写入数据。Kita 只在非 production 且 `ENABLE_DEV_SEED=true` 时开放开发 seed，使用后应关闭。

## Docker Compose 的安全边界

### 常规观察与启停

```bash
docker compose -f docker/dev/compose.yaml ps
docker compose -f docker/dev/compose.yaml logs postgres
docker compose -f docker/dev/compose.yaml up -d --wait postgres
docker compose -f docker/dev/compose.yaml stop postgres
```

### 需要格外警惕

```text
docker compose down -v
```

`-v` 会删除 compose 管理的 volume。数据库 volume 中可能是唯一一份本地内容，它不是普通清理选项。

我在执行任何 delete、prune、reset、restore 前，都会先解析明确目标，确认它不是宿主机根目录、工作区根目录或生产资源。

## Git 日常流程命令

```bash
git fetch origin
git switch -c codex/short-task-name origin/main
git status
git diff
git add -- path/to/file
git diff --cached
git diff --check
git commit -m "docs: explain one change"
git push -u origin codex/short-task-name
```

这里真正改变远程的是最后一条 `push`。前面的 commit 仍然只在本地。

PR 合并后：

```bash
git switch main
git pull --ff-only origin main
```

对于这个 Hexo 仓库，在迁移方案确定之前不执行 push，也不修改现有 GitHub Pages 远程内容。

## 命令失败时的排查顺序

### 1. 先读第一条有效错误

最后一行通常只有退出码，真正原因可能在前面几十行。

### 2. 确认四个上下文

```text
当前目录
当前 Git 分支
当前用户
当前环境变量指向的服务
```

### 3. 缩小到最小命令

如果 `pnpm check` 失败，分别运行 format、lint、typecheck；如果 build 失败，先确认 dev 是否仍在运行。

### 4. 不用破坏性命令掩盖原因

删除 lockfile、database volume、`.git` 或强制覆盖远程可能暂时让错误消失，但同时也删除了诊断证据。

## 我执行前会问自己的五个问题

1. 这条命令必须在哪个目录运行？
2. 它只读，还是会写文件、数据或远程？
3. 它使用了哪个 `.env` 和哪个数据库？
4. 失败后能否安全重试？
5. 如果有删除或覆盖，确切目标是什么，是否有备份？

下一篇把目前所有概念放到一条完整链路中：从我保存源码，到 CI、Coolify、容器、PostgreSQL、R2，再到备份和恢复。

## 系列导航

- 上一篇：[GitHub Actions、Checks 和 Ruleset 是怎样连起来的](/2026/08/04/kita-basics-github-actions-ruleset/)
- 下一篇：[从开发到恢复：Kita 的六层运行地图](/2026/08/04/kita-basics-runtime-layers/)
- 相关案例：[PostgreSQL 备份怎样进入 R2](/2026/08/04/kita-case-postgres-r2-backup/)
