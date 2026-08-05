---
title: 从开发到恢复：Kita 的六层运行地图
date: 2026-08-04 16:55:00
cover: /img/covers/kita-runtime-layers.webp
description: 把源码、依赖、构建、运行、持久化数据和备份恢复放在一张地图上，说明一次改动如何走到生产。
tags:
  - Next.js
  - Docker
  - Coolify
  - 灾难恢复
  - 初学者
categories:
  - Kita 从零理解
series: Kita 从零理解
---

> 这是“从零读懂 Kita”系列的最后一篇。前十一篇分别解释文件和工具，这一篇回答更重要的问题：它们怎样组成同一个可维护系统？

## 我把项目分成六层

```text
1. 开发层：源码、Dev Container、Git 分支
        ↓
2. 依赖层：package.json、pnpm-lock.yaml、node_modules
        ↓
3. 构建层：Next.js build、Docker image、CI
        ↓
4. 运行层：container、entrypoint、Next.js server、Payload
        ↓
5. 数据层：PostgreSQL、R2、持久化 volume
        ↓
6. 恢复层：backup、校验、restore runbook
```

这些层不是六套项目，而是同一项目在不同阶段的责任边界。很多排错失败，正是因为我在错误的层寻找答案。

## 第一层：开发环境让源码可重建

我在 Windows 上打开仓库，但 Node、pnpm、Next.js 和辅助 Docker 服务都在 Dev Container 里运行。

这一层的权威内容包括：

- `src/` 和根配置文件；
- `.devcontainer/devcontainer.json`；
- `.gitignore`；
- 当前功能分支和 commit；
- 解释决策的 `docs/`。

如果换一台只有 Git、Docker、VS Code 和 Dev Containers 的电脑，仍能按仓库配置恢复开发环境，这一层才算成立。

## 第二层：依赖必须由声明重建

`package.json` 说明使用哪些包和 script，`pnpm-lock.yaml` 固定实际依赖解析。`node_modules` 只是安装结果，不应成为项目唯一真相。

```text
package.json + pnpm-lock.yaml
              ↓ pnpm install --frozen-lockfile
          node_modules
```

删除一个可重建的 `node_modules` 与删除数据库 volume 完全不是同等级操作：前者可由声明重新安装，后者可能包含唯一数据。

## 第三层：Build 把源码变成可运行产物

Pull Request 触发 GitHub Actions。CI 从干净环境安装依赖，运行 `check`、`test` 和 `build`。通过后，Ruleset 才允许合并 main。

生产部署时，Coolify 根据 Dockerfile 构建 image。image 是只读模板，包含应用代码和运行依赖；它还不是正在提供服务的进程。

```text
source commit
   ↓ Docker build
image
   ↓ docker run / Coolify deploy
container
```

“build 成功”只表示产物能生成，不表示运行时数据库、网络和密钥都正确。

## 第四层：运行时才接触真实环境

container 是 image 的一次运行实例。Kita 启动时大致经历：

1. entrypoint 读取运行时环境变量；
2. 连接 PostgreSQL；
3. 执行待运行 migration；
4. 启动 Next.js standalone server；
5. Payload Local API 为页面提供内容；
6. Cloudflare 和 Coolify 的网络入口把请求送进容器。

这也解释了为什么容器显示 running，站点仍可能返回 503：进程、健康检查、端口、反向代理、域名或应用依赖中的任一层仍可能失败。

## 第五层：数据不能只跟着 Container 活着

Kita 的持久内容主要分布在：

- PostgreSQL：Users、Games、Reviews、Tools、Media 元数据与关系；
- Cloudflare R2：上传图片的二进制对象；
- 持久化 volume：特定运行状态或本地服务数据，是否权威取决于用途。

container 可以替换，image 可以重新构建，但数据库和对象存储不能期待从源码重新生成。

```text
Payload Media document ── 元数据与关系 ── PostgreSQL
          │
          └── 对象 key ── 图片二进制 ── R2
```

只备份 PostgreSQL 会缺图片，只复制 R2 会缺内容关系。完整恢复必须同时考虑两边的一致性。

## 第六层：Backup 只有能 Restore 才有意义

备份不是终点。可靠性链路至少需要：

```text
定时生成
  ↓
传到独立位置
  ↓
校验文件和保留周期
  ↓
在隔离环境演练恢复
  ↓
记录耗时、缺口和负责人
```

Kita 已经有 PostgreSQL 与 R2 的备份设计和 shell 测试，但“脚本存在”不等于灾难恢复已完成。只有成功把备份恢复成可登录、可读取、图片可访问的应用，才证明链路闭合。

## 一次真实改动怎样走完整条路

以 Games 封面迁移为例：

```text
功能分支修改 Payload Collection
  ↓
生成类型与 migration，补测试和文档
  ↓
本地 Dev Container 检查
  ↓
Push 功能分支并建立 PR
  ↓
GitHub Actions 通过，合并 main
  ↓
Coolify 构建新 image
  ↓
发布前确认 PostgreSQL + R2 备份
  ↓
新 container 启动并执行 migration
  ↓
Payload 读取 PostgreSQL，前端通过 Local API 渲染
  ↓
Media URL 指向 R2 对象
  ↓
健康检查与恢复材料继续被验证
```

任何一步失败，都应该先停在该层排查，而不是立刻重建整个 VPS。

## 本地与生产为什么既要相似、又不完全相同

| 方面 | 本地 | 生产 |
|---|---|---|
| Node 环境 | Dev Container | Docker image/container |
| 数据库 | 开发 PostgreSQL | 持久化生产 PostgreSQL |
| Schema 变化 | 可快速迭代 | 只运行审查过的 migration |
| Media | 可使用本地适配 | R2 是持久对象存储 |
| 密钥 | 本地 `.env` | Coolify/平台秘密配置 |
| 网络入口 | localhost | Cloudflare、域名、反向代理 |
| 数据价值 | 可重建样例为主 | 真实内容，必须备份 |

“开发生产一致”不是要求所有值相同，而是要求关键运行机制足够接近，同时把真实秘密和真实数据隔离开。

## 按症状定位层级

| 症状 | 先看哪一层 |
|---|---|
| import 找不到包 | 依赖层、路径与 lockfile |
| TypeScript 编译失败 | 源码与配置层 |
| CI 过、本地 build 失败 | 本地进程、缓存与环境层 |
| image 构建成功但 503 | 运行层、端口、健康检查、日志 |
| Admin 可用但图片 404 | Media 配置、R2、公开 URL |
| 新代码查询不存在的列 | migration 与目标数据库 |
| 容器重建后内容消失 | 持久化与数据层 |
| 有备份但无法上线 | restore 步骤与依赖不完整 |

## 四套系列分别解决什么

这套博客最终不是一份技术名词清单，而是四种互相补充的记录：

1. **Kita 技术选择**：我为什么寻找这些工具，又为什么舍弃另一些；
2. **Kita 工程案例**：Dev Container、R2、VPS、migration、backup 等具体任务怎样落地；
3. **Kita 从零理解**：初学者读代码前必须建立的 Git、配置、数据和运行模型；
4. **Kita 真实开发记录**：Git 时间线、真实故障、内容工作流、来源边界与尚未完成的事情。

读者不必按发布日期硬读完。想知道“为什么”进入技术选择，想照着做一个任务进入工程案例，看不懂术语时回到本系列；想确认项目真实发生过什么，则从开发记录进入。

## 我最后保留的判断方法

面对一个新工具或新需求，我会依次问：

1. 它解决哪个已经发生的问题？
2. 它属于六层中的哪一层？
3. 仓库里哪个文件是它的权威声明？
4. 本地、CI、生产分别怎样验证？
5. 它产生的数据能否重建，不能的话怎样备份与恢复？
6. 删除它时，系统是否会更清楚？

这比背诵“Next.js + Payload + PostgreSQL + R2 + Coolify”更接近 Kita 真正形成的过程：找到符合我审美和维护方式的工具，有意识地取舍，再把它们连接成可以理解、可以验证、可以恢复的系统。

## 系列导航

- 系列起点：[拿到一个陌生仓库，我应该先看什么](/2026/08/04/kita-basics-read-repository/)
- 上一篇：[Kita 常用命令手册](/2026/08/04/kita-basics-command-guide/)
- 技术选择系列：[为什么我重新做了 Kita，而不是继续修旧项目](/2026/08/02/rebuild-kita-not-kralgame/)
- 工程案例系列：[怎样把 Dev Container 配置成可重建开发基座](/2026/08/04/kita-case-devcontainer-setup/)
- 技术总览：[Kita 用了哪些技术，以及我刻意没有使用什么](/2026/08/03/kita-technology-tradeoffs/)
- 真实开发记录：[Kita 不是按路线图做出来的](/2026/08/04/kita-real-timeline/)
