---
title: 我一开始不懂 Migration：数据库为什么不能跟着代码自动变
date: 2026-08-04 16:30:00
cover: /img/covers/database-migrations.webp
description: 用 Kita 的 Media 改造解释 schema、migration、内容迁移、seed、backup 与生产发布之间的区别。
tags:
  - Payload CMS
  - Migration
  - PostgreSQL
  - 初学者
categories:
  - Kita 从零理解
---

> 这是“从零读懂 Kita”系列的第七篇。上一章说明 Payload 如何把内容存进 PostgreSQL；这一章处理我最晚才真正理解、也最容易误操作的部分：migration。

## 先用装修理解 Migration

假设代码里的 Collection 配置是一张最新装修图，数据库则是一间已经住人的房子。

我在图纸上新增一个柜子很容易，但现实里的房子不会因为图纸保存了就自动施工。更重要的是，房间里已经有家具和物品，施工时还要决定它们怎样移动、能否回退，以及失败后怎样恢复。

数据库 migration 就是这份**有顺序、可审查、能重复执行的施工说明**。

```text
Collection 配置变化
        ↓
生成并审查 migration
        ↓
先改测试数据库
        ↓
备份生产数据
        ↓
发布时按顺序执行
```

所以，“代码能编译”与“已有数据库能安全升级”是两个问题。

## 四个很像、但不能混用的概念

### Schema

Schema 是数据库现在应该具有的结构，例如表、列、类型、约束和关系。Payload 的 Collection 配置会参与描述目标结构，但配置文件本身不是历史变更记录。

### Schema Migration

它负责改变结构，例如新增 `media_id`、建立外键、把字段改成 `NOT NULL`，或删除旧列。

### Content Migration

它负责搬运或改写已有内容。例如先根据旧的封面 URL 建立 Media document，再把新 document 的 ID 写回 Games。

### Seed 与 Backup

Seed 是为了开发或测试写入一组已知样例；backup 是把真实数据保存到可恢复的位置。它们都不能代替 migration。

| 名称 | 回答的问题 |
|---|---|
| Schema | 数据库现在应该长什么样 |
| Migration | 已有数据库怎样安全变成新结构 |
| Seed | 新开发环境怎样获得样例数据 |
| Backup | 真实数据损坏后怎样恢复 |

## 为什么本地看起来可以“自动跟上”

Payload 的 PostgreSQL adapter 在开发阶段可以通过 push 模式帮助同步结构，这对快速试验很方便。但生产环境不能把不可控的结构变化交给一次启动。

Payload 的官方文档也把本地开发的 push mode 与正式 migration workflow 分开说明：[Payload Migrations](https://payloadcms.com/docs/database/migrations)、[Payload Postgres Adapter](https://payloadcms.com/docs/database/postgres)。

我的理解是：本地自动同步解决“让我尽快继续开发”，migration 解决“让我知道生产数据库将发生什么”。

## Kita 现在的 Migration 工作流

当 Collection 字段发生结构变化时，我按下面的顺序处理：

```bash
pnpm payload:types
pnpm payload:migrate:create
```

第一条重新生成 TypeScript 类型；第二条根据差异创建 migration 文件。生成以后不能直接提交，我还要阅读里面的 `up` 和 `down`。

然后运行项目检查：

```bash
pnpm check
pnpm test
pnpm build
pnpm payload:migrate:status
```

运行 build 前需要先停止占用相同工作目录的开发服务器，避免 `.next` 互相覆盖。Kita 当前的 `src/migrations/` 中有六个 migration，它们必须按文件记录的顺序执行。

## `up` 和 `down` 到底是什么

- `up`：把数据库从上一个已知状态推进到新状态；
- `down`：撤销这一批结构变化，为排错提供一条受控路径。

`down` 不等于时光机。它只能撤销编写者明确实现的操作，也不能保证找回已经丢失的真实内容。

Kita 的 Media 清理 migration 可以根据 Media 元数据恢复部分旧字段，这是因为我们特意保留了映射依据；它不是数据库的历史快照。真正重要的数据仍然需要备份。

## Games 封面迁移为什么分成两段

Kita 最初把封面信息直接放在 Games 字段里，后来改成 Payload Media + R2。安全做法不是一次把旧字段删掉，而是分阶段：

1. 新建 Media Collection，并给 Games 增加暂时可空的 `cover` 关系；
2. 在 Admin 中执行内容迁移，把旧封面变成 Media document 并回填关系；
3. 检查所有 Games 都已有封面；
4. 再执行 cleanup migration，把关系改为必填并删除旧字段。

```text
旧字段仍在 + 新字段可空
        ↓ 搬运内容并核验
旧字段仍在 + 新字段完整
        ↓ cleanup migration
只保留新字段 + 约束生效
```

这叫“两阶段迁移”：先兼容和搬运，再收紧约束。它把一次高风险切换拆成几个可观察的小步骤。

## 为什么生产启动脚本要先跑 Migration

Coolify 启动新镜像时，Kita 的 entrypoint 会先执行待运行的 migration，再启动 Next.js server。

这是为了避免新代码先访问旧结构。但这不表示发布完全没有风险：如果 migration 失败，服务就不应该假装正常启动；如果 migration 会删除字段，发布前更必须有可验证的备份。

## 怎样测试完整 Migration 链

不要拿装有日常开发数据的数据库反复试初始 migration。更可靠的方法是：

1. 启动一个空的临时 PostgreSQL；
2. 从第一份 migration 执行到最新；
3. 检查最终 schema；
4. 运行应用测试和 build；
5. 测完后只删除明确识别出的临时资源。

这样验证的是“一个全新环境能否从零重建”，而不是“我的旧开发库碰巧还能运行”。

## Migration 失败时先做什么

1. 停止继续发布，不要连续重试破坏性步骤；
2. 记录失败的是哪一个 migration 和哪条 SQL；
3. 判断数据库是否已经完成了一部分操作；
4. 在副本或临时数据库中验证修复；
5. 如果涉及真实内容，先确认备份可用，再决定向前修复还是回滚。

我不会把 `fresh`、`reset` 或删除 volume 当成普通修复命令。它们解决的是“重新开始”，不是“保住现有数据”。

## 我现在怎样判断一次 Migration 是否准备好了

- 变更目的能够用一句话解释；
- `up` 和 `down` 都读过；
- 结构迁移与内容搬运的顺序明确；
- 空数据库可以执行完整链；
- 旧数据路径经过验证；
- 生产发布前有备份；
- 失败时知道停在哪里，而不是临场猜测。

下一篇回到更早的一步：一个本地项目究竟怎样成为 GitHub 仓库，以及第一次 push 到底做了什么。

## 系列导航

- 上一篇：[Payload、PostgreSQL、Collection、CRUD 和 Adapter 的关系](/2026/08/04/kita-basics-payload-postgres/)
- 下一篇：[从本地文件夹到 GitHub：第一次建仓库和 Push](/2026/08/04/kita-basics-git-github-first-push/)
- 相关案例：[Games 封面从源码枚举迁移到 Payload Media + R2](/2026/08/04/kita-case-payload-media-r2/)
