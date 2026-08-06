---
title: 从能部署到能恢复：PostgreSQL、R2 与灾难恢复
date: 2026-08-03 15:00:00
cover: /img/covers/backup-recovery.webp
description: 部署成功只证明当前容器能运行。Kita 怎样用质量门禁、migration、backup sidecar 和恢复清单逐步接近真正的可恢复状态。
tags:
  - PostgreSQL
  - 备份恢复
  - GitHub Actions
  - R2
categories:
  - Kita 开发记录
series: Kita 技术选择
---

> 这是“Kita 技术选择”系列的第八篇。上一篇把 OpenList 从 Kita 发布单元中分离；这一篇开始清点每个系统真正需要保护和恢复的资产。

第一次看到网站在线、Coolify 显示 Running 时，我很容易把它理解成“项目已经部署完成”。

但 Running 只描述此刻的进程状态。

它没有回答数据库能否导出、备份文件能否读取、R2 Media 是否完整、生产 schema 能否迁移，也没有回答 VPS 整体丢失以后需要从哪里重新开始。

Kita 后期最重要的变化，是把成功标准从“能上线”推进到“知道怎样验证、备份和恢复”。

## 第一层可靠性：进入 main 以前先证明代码可构建

Kita 把质量检查拆成几个独立门禁：

```text
format
  -> lint
  -> typecheck
  -> test
  -> build
```

它们回答不同问题。

- format 检查文件是否遵循统一排版；
- lint 检查可静态发现的 React、Next.js 和代码问题；
- typecheck 检查类型关系；
- test 验证 mapper、配置和关键逻辑；
- build 验证 Next.js 的真实生产构建路径。

GitHub Actions 使用只读权限和构建期占位配置，不应该访问生产 PostgreSQL 或持有真实 secret。main Ruleset 再要求通过 Pull Request 和检查后合并。

这些门禁不能证明线上一定成功，但能阻止一批已知错误进入部署入口。

## 为什么一次 `.next` 污染会影响这层信任

开发环境曾出现 root 写入 `.next` 的事故。构建失败时，错误表面指向生成类型和文件删除，实际是缓存所有权错误。

如果不先修复检查环境，我可能会继续修改正常源码来迎合一个已经污染的输出目录。

因此 Kita 增加用户、所有权和并发守卫。这不是单纯修一个 Docker 权限问题，而是在保护质量门禁本身的可信度。

只有当 `pnpm build` 的运行环境可以解释，它的成功或失败才有意义。

## 第二层可靠性：生产 schema 必须通过 migration 演进

Payload Collection 改动最终会影响 PostgreSQL。

开发环境可以快速试验 schema，生产环境不能依赖“启动时自动猜测并修改数据库”。Kita 使用明确 migration，让字段增加、关系变化和旧数据转换进入版本历史。

部署顺序因此包含：

```text
构建新镜像
  -> 连接生产 PostgreSQL
  -> 执行已提交 migration
  -> migration 成功后运行新应用
```

Games 封面迁移就是典型例子。先增加 Media 与兼容字段，迁移内容，再设为必填并删除旧字段。没有这个过程，新的应用 schema 可能在启动瞬间让旧数据失效。

migration 也带来责任：脚本必须可审查，生产执行前需要数据库备份，失败后的回滚或向前修复策略需要提前考虑。

## 为什么 Coolify 界面没有自动解决 PostgreSQL 备份

Kita 的 PostgreSQL 位于应用自己的 Compose 中，而不是单独创建的 Coolify Database resource。

这意味着不能只看到 Coolify 提供数据库备份功能，就假设当前 Compose 内的数据库已经被覆盖。

我最后为 Kita 增加了独立 backup sidecar。它与 web、postgres 同属发布单元，却只负责导出和上传，不参与公开请求。

## backup sidecar 实际做什么

备份流程是：

```text
pg_dump --format=custom
  -> pg_restore --list 验证目录可读
  -> rclone 上传私有 R2 bucket
  -> 清理本地临时文件
```

选择 custom format，是因为它便于使用 PostgreSQL 工具检查和选择性恢复。上传前先执行 `pg_restore --list`，至少能够发现完全不可读的 dump，而不是把一个空文件或明显损坏文件当作成功备份。

backup 容器还做了边界收缩：

- 不开放公网端口；
- 不挂载 PostgreSQL data volume；
- 使用只读 root filesystem 和 tmpfs；
- 删除不需要的 Linux capabilities；
- 使用独立、最小权限的 R2 token；
- 临时 dump 上传后清理。

它只通过数据库连接读取逻辑数据，不直接复制运行中的 data directory。

## 为什么备份放在 R2

如果 dump 只保存在同一台 VPS，即使定时任务一直成功，VPS 磁盘损坏或账户丢失时，数据库与备份会一起消失。

R2 提供了一个独立于服务器的数据位置，rclone 则让备份脚本使用明确的 S3-compatible 接口上传。

但“独立位置”不是绝对独立。如果 R2 账户、token 和域名都只记录在同一台服务器上，账户层事故仍然可能同时影响多个资产。

因此恢复清单还需要包含 Cloudflare 账号保护、token 来源和离线保存的必要信息。

## 数据库备份不是完整站点备份

Kita 的可恢复资产至少包括：

| 资产 | 当前主要位置 | 恢复时的作用 |
| --- | --- | --- |
| 源码与 migration | GitHub | 重建应用和数据库 schema |
| 生产 secret | Coolify / 独立密码管理 | 重新连接数据库、Payload 与存储 |
| PostgreSQL dump | 私有 R2 bucket | 恢复内容、用户、关系和 Media 元数据 |
| Payload Media 对象 | R2 Media bucket | 恢复封面与上传文件 |
| OpenList data | 独立应用 volume | 恢复文件目录配置和状态 |
| DNS 与域名 | Cloudflare / 注册商 | 恢复公网入口 |
| 服务器配置记录 | 文档与 Coolify | 重建 VPS 上的应用关系 |

少任何一项，都可能得到一个“能启动但内容不完整”的站点。

例如 PostgreSQL dump 恢复成功，而 Media bucket 丢失，Games relationship 仍然存在，封面对象却无法加载。

## “有备份”和“恢复通过”之间还有一段距离

定时任务产生对象，只能证明备份流程某一次走到了上传步骤。

真正的恢复验证至少需要：

1. 下载指定 dump；
2. 在空 PostgreSQL 实例中恢复；
3. 检查 migration 状态与关键表；
4. 启动应用并读取已发布内容；
5. 验证 Media relationship 与 R2 对象；
6. 记录耗时、权限和缺失步骤。

目前 Kita 已经验证本地源码可以在 C 盘重新建立，也已经运行 PostgreSQL 到 R2 的定时 backup。生产 PostgreSQL 的完整 restore drill、全新 VPS/Coolify 灾难恢复和 R2 Media 独立恢复验证仍未最终完成。

我不想把“备份已经存在”写成“灾难恢复已经完成”。后者必须通过实际演练证明。

## OpenList 也有自己的恢复边界

OpenList 是独立应用，因此 Kita 的 PostgreSQL backup 不包含它。

OpenList 的 data、管理员配置和最终 storage provider 必须独立记录和备份。这正是把它从 Kita Compose 分离后的代价：边界更清楚，但不能忘记为每个边界分别建立恢复办法。

松耦合减少故障传播，不会自动产生备份。

## 我现在怎样理解“生产就绪”

我不会把 Kita 描述成已经完成所有生产可靠性工作的系统。

它目前拥有：

- 可重复的格式、静态检查、类型、测试和 build；
- PR、CI 与 main 合并门禁；
- 明确的 PostgreSQL migration；
- Coolify Compose 部署；
- PostgreSQL 到 R2 的定时备份；
- 一份跨 GitHub、VPS、Cloudflare、数据库、Media 与 OpenList 的恢复清单。

它仍然缺少完整生产 restore drill 和全新服务器演练。

这种表达可能不如“生产级灾备”漂亮，却更符合项目真实状态。可靠性不是一个标签，而是一组不断被验证的能力。

## 最后一篇：回看整套技术栈

到这里，Kita 从代码基座走到了备份与恢复边界。

最后一篇不会再增加新工具，而会把所有选择放回问题中：每项技术到底解决了什么，它与相邻层怎样连接，我又为什么刻意没有采用某些常见方案。

## 相关工程案例

- [用 Backup Sidecar 把 PostgreSQL 备份到 R2](/2026/08/04/kita-case-postgres-r2-backup/)
- [从备份文件到真正恢复：Kita Restore Drill 操作手册](/2026/08/04/kita-case-restore-drill/)

## 系列导航

- 上一篇：[为什么 OpenList 是独立应用，而不是 Kita 的一个微服务](/2026/08/03/kita-openlist-boundary/)
- 下一篇：[Kita 用了哪些技术，以及我刻意没有使用什么](/2026/08/03/kita-technology-tradeoffs/)
