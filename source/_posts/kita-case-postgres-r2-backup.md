---
title: 用 Backup Sidecar 把 PostgreSQL 备份到 R2
date: 2026-08-04 13:00:00
cover: /img/covers/postgres-r2-backup.webp
description: 在 Kita Compose 中加入最小权限 backup service，使用 pg_dump、pg_restore 和 rclone 把 PostgreSQL custom dump 上传到私有 R2。
tags:
  - PostgreSQL
  - Cloudflare R2
  - Backup
  - Docker Compose
categories:
  - Kita 工程案例
---

> 这是“Kita 工程案例”系列的第六篇。上一篇完成 Coolify 部署；这一篇把 PostgreSQL 备份从路线图变成可审计、可测试的 Compose sidecar。

## 为什么需要自己的 backup service

Kita 的 PostgreSQL 位于应用 `compose.yaml` 中，不是单独创建的 Coolify Database Resource。

因此不能看到 Coolify 有数据库备份界面，就默认当前 Compose 数据库已经受到保护。

最终方案是在发布单元中增加一个职责非常小的 `backup` service：

```text
PostgreSQL
  -> pg_dump custom archive
  -> pg_restore --list 检查
  -> rclone 上传
  -> 私有 Cloudflare R2 bucket
```

它不提供管理页面、不挂载数据库 data volume，也不在 Windows 安装 cron、PostgreSQL client 或 rclone。

## 第一步：创建独立私有 R2 bucket

准备：

```text
bucket     kita-postgres-backups
public     Disabled
token      只允许访问该 bucket
endpoint   https://<ACCOUNT_ID>.r2.cloudflarestorage.com
```

不要与公开 Media bucket 共用 token。备份对象包含数据库内容，应保持私有，也不配置公开 custom domain。

真实 access key 和 secret key 只进入 Coolify Production Environment Variables。

## 第二步：创建最小备份镜像

目录：

```text
docker/postgres-backup/
├── Dockerfile
├── backup.sh
├── README.md
└── tests/backup.test.sh
```

Dockerfile 只安装必要工具：

```dockerfile
FROM alpine:3.23

RUN apk add --no-cache \
      ca-certificates \
      postgresql16-client \
      rclone \
    && addgroup -S -g 65532 backup \
    && adduser -S -D -H -u 65532 -G backup backup

COPY backup.sh /usr/local/bin/postgres-r2-backup
RUN chmod 0755 /usr/local/bin/postgres-r2-backup

USER 65532:65532
ENV HOME=/tmp
ENTRYPOINT ["/usr/local/bin/postgres-r2-backup"]
```

固定 PostgreSQL 16 client，避免备份工具主版本与数据库基线脱节；运行用户不是 root。

## 第三步：在 Compose 中增加 sidecar

核心配置：

```yaml
backup:
  build:
    context: ./docker/postgres-backup
  environment:
    POSTGRES_BACKUP_ENABLED: ${POSTGRES_BACKUP_ENABLED:-false}
    POSTGRES_BACKUP_HOST: postgres
    POSTGRES_BACKUP_PORT: "5432"
    POSTGRES_BACKUP_INTERVAL_SECONDS: ${POSTGRES_BACKUP_INTERVAL_SECONDS:-86400}
    POSTGRES_BACKUP_RETRY_SECONDS: ${POSTGRES_BACKUP_RETRY_SECONDS:-3600}
    POSTGRES_BACKUP_WAIT_SECONDS: ${POSTGRES_BACKUP_WAIT_SECONDS:-120}
    POSTGRES_DB: ${POSTGRES_DB:-kita}
    POSTGRES_USER: ${POSTGRES_USER:-postgres}
    POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-postgres}
    POSTGRES_BACKUP_R2_ENDPOINT: ${POSTGRES_BACKUP_R2_ENDPOINT:-}
    POSTGRES_BACKUP_R2_BUCKET: ${POSTGRES_BACKUP_R2_BUCKET:-kita-postgres-backups}
    POSTGRES_BACKUP_R2_ACCESS_KEY_ID: ${POSTGRES_BACKUP_R2_ACCESS_KEY_ID:-}
    POSTGRES_BACKUP_R2_SECRET_ACCESS_KEY: ${POSTGRES_BACKUP_R2_SECRET_ACCESS_KEY:-}
  depends_on:
    postgres:
      condition: service_healthy
  init: true
  restart: unless-stopped
  read_only: true
  tmpfs:
    - /tmp:size=256m,mode=1777,noexec,nosuid,nodev
  security_opt:
    - no-new-privileges:true
  cap_drop:
    - ALL
```

它没有：

- `ports`；
- Docker socket；
- `postgres-data` volume；
- 长期 dump 目录。

备份通过 PostgreSQL 网络接口读取逻辑数据，临时文件只存在于受限 `/tmp`。

## 第四步：脚本默认必须关闭

```env
POSTGRES_BACKUP_ENABLED=false
```

本地开发不持有生产 R2 key，也不应该因为误执行完整 Compose 就不停产生失败日志。

脚本检测到 disabled 后记录一次状态，并安静等待。只有 Coolify Production 显式设置为 `true` 才开始调度。

生产启用：

```env
POSTGRES_BACKUP_ENABLED=true
POSTGRES_BACKUP_INTERVAL_SECONDS=86400
POSTGRES_BACKUP_RETRY_SECONDS=3600
POSTGRES_BACKUP_WAIT_SECONDS=120
```

不要在 Compose 解析阶段用“变量缺失立即终止”的写法强制 R2 key，否则本地即使只想启动 `postgres`，也可能因为生产备份变量为空而失败。

## 第五步：生成和验证 custom dump

核心命令是：

```bash
pg_dump \
  --host="$POSTGRES_BACKUP_HOST" \
  --port="$POSTGRES_BACKUP_PORT" \
  --username="$POSTGRES_USER" \
  --dbname="$POSTGRES_DB" \
  --format=custom \
  --compress=6 \
  --no-owner \
  --no-acl \
  --file="$current_dump"
```

使用 `pg_dump` 而不是复制正在运行的 volume，是因为 PostgreSQL 会持续修改内部数据文件，直接压缩 live volume 可能得到不一致状态。

生成后立即检查：

```bash
pg_restore --list "$current_dump"
```

再确认文件大小大于 0。这个检查不能证明所有业务数据都正确，却能阻止明显空文件或不可读 archive 被当成成功备份。

## 第六步：使用 rclone 上传

rclone 配置只通过进程环境创建，不在容器写长期配置文件。

对象路径按 UTC 组织：

```text
kita/postgres/2026/08/kita-20260804T120000Z.dump
```

使用 UTC 可以避免 VPS、Coolify、浏览器与本地时区混淆。

上传成功后日志记录 object key 与字节数，临时 dump 立即删除。日志不能打印数据库密码和 R2 secret。

## 第七步：处理停止、失败和重试

脚本捕获 `HUP`、`INT` 和 `TERM`：

```text
收到停止信号
  -> 中断当前 sleep
  -> 删除临时 dump
  -> 正常退出
```

配置错误或上传失败时使用较短 retry interval；成功后使用正常 backup interval。

每次运行前都重新验证：

- 数据库名、用户、密码非空；
- endpoint 必须是 Cloudflare R2 HTTPS endpoint；
- 时间参数为正整数；
- bucket 与两项凭据存在。

失败必须明确记录，不能在上传失败后输出“备份完成”。

## 第八步：先用 fake-command 测试失败路径

Kita 的 `pnpm test:backup` 使用假的 `pg_dump`、`pg_restore` 和 `rclone`，验证四类脚本行为，不连接真实生产数据库和 R2。

它主要检查：

- disabled 模式不会执行生产任务；
- 缺少变量时明确失败并重试；
- dump/validation/upload 任一步失败都不会误报成功；
- 成功路径会清理临时文件并记录目标对象。

fake-command test 不能替代真实生产 smoke，但适合进入 GitHub Actions，防止后续修改破坏 shell 控制流。

## 第九步：生产首次验证

启用后观察 Runtime Logs：

```text
backup enabled
  -> PostgreSQL ready
  -> Starting PostgreSQL backup
  -> Archive validated
  -> R2 upload completed
  -> Next backup attempt
```

然后在 R2 检查：

- bucket 正确；
- object key 正确；
- 文件大小合理；
- 时间戳与日志一致；
- public access 仍然关闭。

不要只看容器 Running。必须同时核对日志和真实对象。

## 回滚与凭据泄露处理

暂停备份只需将：

```env
POSTGRES_BACKUP_ENABLED=false
```

重新部署后确认 sidecar 进入 disabled 状态。不要为了暂停备份删除数据库 volume。

如果怀疑 R2 token 泄露：

1. 在 Cloudflare 撤销该 token；
2. 创建新的单 bucket 最小权限 token；
3. 更新 Coolify secret；
4. 重新部署 backup service；
5. 核对历史对象是否异常；
6. 不在博客或日志中粘贴真实值。

## “有备份”仍不等于“能恢复”

Kita 当前生产 sidecar 已连续成功，真实 R2 对象和日志均已核对。

但完整 PostgreSQL restore drill 仍未完成。`pg_restore --list` 只证明 archive 可读，不证明它能在空 PostgreSQL 16 中恢复并让 Kita 正常读取。

最后一篇工程案例会给出隔离恢复的操作顺序，并清楚标记哪些步骤已经演练、哪些仍然只是 Runbook。

## 系列导航

- 对应的决策文章：[从能部署到能恢复](/2026/08/03/kita-backup-recovery/)
- 上一篇：[从空白 VPS 到 Coolify 部署 Kita](/2026/08/04/kita-case-vps-coolify-deployment/)
- 下一篇：[为什么 Build 通过了，生产容器仍然 503](/2026/08/04/kita-case-production-runtime-dependency/)
