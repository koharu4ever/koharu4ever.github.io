---
title: 从备份文件到真正恢复：Kita Restore Drill 操作手册
date: 2026-08-04 15:00:00
cover: /img/home-sunset-field.jpg
description: 把 GitHub、Dev Container、PostgreSQL dump、R2 Media、Coolify、OpenList 和 DNS 串成一次隔离恢复演练，并标明 Kita 已完成与尚未完成的部分。
tags:
  - 灾难恢复
  - PostgreSQL
  - Restore Drill
  - 操作手册
categories:
  - Kita 工程案例
---

> 这是“Kita 工程案例”系列的第八篇。上一篇复盘运行时故障；最后这一篇不假装恢复已经完成，而是把恢复材料、操作顺序和当前证据写清楚。

## 先说明当前真实状态

Kita 已经完成：

- 在 C 盘全新 clone；
- 依据 `.env.example` 与密码管理器重建开发环境；
- Reopen in Container；
- `pnpm dev` 自动启动新 PostgreSQL；
- 页面、测试、检查和 build 通过；
- PostgreSQL custom dump 已定时上传 R2；
- Coolify SSH key 恢复材料已有加密副本和 checksum；
- 外部账户与关键 secret inventory 已建立。

仍未完成：

- 将真实 R2 dump 恢复到隔离 PostgreSQL 16；
- 完整恢复 Payload 内容并由应用读取；
- R2 Media 对象的独立恢复验证；
- Coolify 控制面完整 backup/restore；
- 新 VPS 端到端恢复；
- OpenList 最终 storage/data backup。

所以这篇是一份基于实际资产的操作手册，不是“完整恢复已经通过”的成功报告。

## 恢复前需要哪些资产

| 资产 | 正常位置 | 恢复用途 |
| --- | --- | --- |
| 源码、Dockerfile、migration | GitHub / git bundle | 重建应用与数据库版本基线 |
| 环境变量键名 | `.env.example` | 知道需要哪些配置 |
| 真实 secret | 密码管理器 | 重建开发与生产连接 |
| PostgreSQL dump | 私有 R2 | 恢复内容、用户、关系和 Media 元数据 |
| Payload Media 对象 | Media R2 bucket | 恢复真实图片 |
| Coolify 配置与 SSH keys | 加密恢复包 | 恢复或重建控制面 |
| OpenList data 与 provider 记录 | 独立备份/清单 | 恢复 archive |
| DNS 清单 | Cloudflare/离线记录 | 最后恢复正式流量 |

源码、secret 和 backup 不应该只存在于同一个故障域。

## 恢复原则

恢复时遵循几条硬规则：

1. 不在原生产数据库上试 restore；
2. 不删除或覆盖现有生产 volume；
3. 先复制和保护剩余副本，再做修复；
4. 使用与 dump 兼容的 PostgreSQL 16；
5. restore 目标必须是新建的隔离空数据库；
6. 不让恢复测试持有生产 R2 写入 token；
7. 正式 DNS 最后切换；
8. 每一步记录时间、warning 和验收结果。

## 阶段一：恢复身份控制

按顺序确认：

```text
主邮箱
  -> 密码管理器
  -> 域名注册商
  -> VPS provider
  -> GitHub
  -> Cloudflare
  -> 其他存储与网络账户
```

至少需要一种可用 2FA 设备或 recovery code。无法控制邮箱、域名和 Cloudflare 时，即使手里有源码也无法完整恢复生产入口。

## 阶段二：建立干净恢复工作站

在健康 SSD 上建立新目录，不覆盖故障工作区。

宿主机只准备：

- Git；
- Docker Desktop；
- WSL2；
- VS Code；
- Dev Containers 扩展。

然后：

```text
clone 已知良好 commit
  -> 对照 recovery manifest
  -> 根据 .env.example 重建本地 .env
  -> Reopen in Container
  -> 确认用户 node
  -> pnpm dev
```

本地 `.env` 只使用 Development secret 和本地数据库，不复制生产 URI 与 R2 write token。

## 阶段三：验证源码可以重建

执行：

```bash
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

再检查：

```text
/
/tools
/reviews
/games
/admin
```

这一步已经在 Kita 的 C 盘全新工作区完成。它证明 Git、开发配置和本地环境可重建，但不证明生产数据可以恢复。

## 阶段四：选择和检查 PostgreSQL dump

从私有 R2 下载一份 dump 的**副本**到恢复工作区，保留远端原对象不变。

记录：

- object key；
- UTC 时间；
- 文件大小；
- checksum；
- 对应或接近的 Git commit；
- 当时 migration 状态。

先执行只读 archive 检查：

```bash
pg_restore --list <dump-file>
```

这个命令成功只表示目录可读取，不能替代真正 restore。

## 阶段五：恢复到隔离 PostgreSQL 16

创建一个全新的临时 PostgreSQL 16 实例和空数据库。不要复用生产 volume，也不要让测试容器指向生产 host。

恢复使用 custom archive 对应的 `pg_restore`，目标为空数据库，并保留完整输出日志。

恢复后检查：

- 表是否存在；
- `payload_migrations` 是否可解释；
- Users、Tools、Reviews、Games 和 Media 记录数量；
- relationship 是否存在；
- 是否有 owner/ACL warning；
- 数据库版本是否兼容。

本文不提供带真实用户名、密码和路径的可复制 restore 命令，避免误操作生产。实际演练应先在 Runbook 中填写临时容器名、临时数据库名和 dump 副本路径，再由第二次检查确认目标不是 production。

## 阶段六：让 Kita 指向恢复库

使用恢复专用 `.env`：

```text
DATABASE_URI
  -> 只指向隔离 PostgreSQL

ENABLE_DEV_SEED
  -> false

MEDIA_STORAGE_MODE
  -> 根据演练目标选择 local 或只读验证方案
```

启动应用后验证：

- Admin 可以读取恢复数据；
- Tools、Reviews、Games 数量符合预期；
- published 过滤正常；
- production getter 不使用 fallback；
- migration 状态与选定代码兼容；
- 可以创建并删除一条临时测试记录。

这一步才接近“数据库备份能够恢复业务”。

## 阶段七：单独验证 R2 Media

PostgreSQL 只保存 Media document 与关系，图片二进制在 R2。

需要确认：

```text
恢复后的 Media filename/prefix
  -> 对应 R2 对象存在
  -> thumbnail/display/original 可读取
  -> custom domain URL 正确
  -> Games 页面没有 404
```

如果测试需要写入，使用独立测试 bucket 和测试 token，不要对生产 Media bucket执行删除或覆盖操作。

数据库恢复成功但图片全部 404，不能算完整内容恢复。

## 阶段八：重建 VPS 与 Coolify

最严重场景中，顺序应为：

```text
新 VPS
  -> 系统与 SSH 安全
  -> Docker / Coolify
  -> 恢复或重建 Coolify 控制面
  -> 录入生产变量
  -> 恢复 PostgreSQL
  -> 部署 Kita 到临时域名
  -> 恢复 OpenList
  -> 验证
  -> 最后切换 DNS
```

如果 Coolify backup、APP_KEY 和 SSH keys 可用，按官方兼容版本恢复；如果不可用，就根据 inventory 手工重建 Application、domain、volume 和变量。

任何路径都先使用临时域名或 hosts 验证，不要让未完成的恢复直接接管正式流量。

## 阶段九：恢复 OpenList

OpenList 是独立 Application，不包含在 Kita PostgreSQL dump 中。

需要独立恢复：

- 固定 image/tag；
- data volume；
- 管理员；
- storage provider 和凭据；
- guest 权限；
- `/ping`；
- Games 中的真实 archive URL。

当前 OpenList 最终 storage provider 尚未定型，测试挂载可视为可丢弃状态。因此这部分不能标记为闭环。

## 阶段十：切换 DNS 与重新启用备份

只有 Kita、Media 和 OpenList 均通过临时验收后，才更新正式 DNS。

切换后：

1. 从外部网络验证 HTTPS；
2. 检查没有 mixed content 和证书循环；
3. 创建新的最小权限 R2 token；
4. 启用 PostgreSQL backup sidecar；
5. 确认新环境产生第一份 backup；
6. 更新 recovery manifest；
7. 撤销旧 VPS token、SSH key 和失效凭据。

## 怎样记录一次 Restore Drill

每次演练记录：

```text
日期与操作者
故障假设
使用的 Git commit
使用的 dump object/checksum
开始与结束时间
实际 RTO
dump 对应时间与故障时间差
实际 RPO
成功步骤
失败步骤
warning
缺失材料
需要更新的 Runbook
```

RTO 是恢复服务花了多久，RPO 是最多会丢失多少时间范围的数据。个人项目不需要假装拥有商业 SLA，但仍可以通过演练得到真实数字。

## 完成标准

```text
GitHub / Bundle 能恢复代码
+ 密码管理器能重建配置
+ Dev Container 能重建工具
+ PostgreSQL dump 能恢复内容
+ R2 Media 能恢复图片
+ Coolify inventory 能重建生产
+ OpenList inventory 能恢复归档入口
= 完整恢复闭环
```

Kita 当前只完成了其中一部分。下一次真正的进展不是再写一份“备份成功”文档，而是在隔离 PostgreSQL 16 中执行真实 restore，并把结果、耗时和失败点写回来。

## 系列导航

- 对应的决策文章：[从能部署到能恢复](/2026/08/03/kita-backup-recovery/)
- 上一篇：[为什么 Build 通过了，生产容器仍然 503](/2026/08/04/kita-case-production-runtime-dependency/)
- 从头阅读：[在 Windows 上为 Next.js 配置 Dev Container](/2026/08/04/kita-case-devcontainer-setup/)
