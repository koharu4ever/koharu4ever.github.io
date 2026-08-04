---
title: 从空白 VPS 到 Coolify 部署 Kita
date: 2026-08-04 12:00:00
cover: /img/home-rain-harbor.jpg
description: 以 Kita 的真实部署链路为例，整理 VPS 基线、Cloudflare DNS、GitHub、Coolify Compose、生产环境变量和上线验收。
tags:
  - VPS
  - Coolify
  - Docker Compose
  - 部署实操
categories:
  - Kita 工程案例
---

> 这是“Kita 工程案例”系列的第五篇。上一篇完成 Media + R2；这一篇把代码、PostgreSQL、域名和环境变量真正放到一台 VPS 上运行。

## 这篇不提供“一键上线脚本”

Coolify 的安装方式、受支持系统和安全建议会继续变化，所以安装命令应以部署当天的官方文档为准。

这篇记录的是 Kita 实际使用、更加稳定的部署顺序：先建立服务器和账户边界，再连接 GitHub 与 Compose，最后以最小数据闭环验收，而不是复制一条安装命令后直接暴露生产站。

最终结构是：

```text
GitHub main
  -> Coolify
  -> Kita Compose Application
       ├── web
       ├── postgres
       ├── backup
       └── postgres-data

Cloudflare
  -> DNS / HTTPS 入口
  -> Kita Media R2
  -> PostgreSQL Backup R2
```

## 第一阶段：先建立资产记录

创建 VPS 前，先确定这些信息保存在哪里：

- VPS provider 登录与恢复方式；
- 主邮箱、2FA 和 recovery codes；
- 域名注册商；
- Cloudflare 账户；
- GitHub 账户与仓库；
- 密码管理器中的生产环境变量目录；
- 恢复文档与离线副本。

真实 IP、密码、token 和密钥不进入 Git、博客、截图或聊天记录。仓库只保存变量名称和配置结构。

这一步看起来不像部署，却决定了服务器丢失时还能不能重建。

## 第二阶段：创建并检查 VPS

Kita 第一版按小型单人项目准备 VPS：受支持的 Ubuntu LTS、至少能够稳定运行 Coolify、Next.js、PostgreSQL 和备份容器的 CPU、内存与磁盘。

不要把示例规格理解成永久推荐。选型时需要查看 Coolify 当前最低要求，并为 Docker image、build cache、PostgreSQL 和日志预留空间。

第一次 SSH 登录只做事实确认：

```bash
whoami
uname -a
df -h
free -h
```

随后按当前官方流程完成：

- 系统安全更新；
- SSH key 登录；
- 防火墙；
- 时间与时区确认；
- Coolify 所需端口；
- 不必要端口关闭。

不要在首次连接时顺手安装项目 Node、pnpm 和 PostgreSQL。Kita 最终通过容器运行这些依赖，宿主机不应该重新变成手工应用服务器。

## 第三阶段：安装并保护 Coolify

使用 Coolify 官方当前安装文档在干净 VPS 上安装，完成后立即：

1. 创建管理员；
2. 设置强密码与可用的 2FA；
3. 为管理面板配置独立域名；
4. 检查公开端口；
5. 保存恢复所需的控制面信息；
6. 不在公开文档中记录真实密钥。

Kita 使用 Coolify 管理应用、生产变量、域名和部署历史，但不把 Coolify 当作唯一恢复副本。

## 第四阶段：配置 Cloudflare DNS

域名关系可以抽象为：

```text
kita.<你的域名>
  -> Cloudflare DNS
  -> VPS public IP
  -> Coolify proxy
  -> Kita web service
```

管理面板使用另一条记录，例如：

```text
coolify.<你的域名>
```

在切换正式流量前记录原 DNS，并确认：

- DNS 指向正确 VPS；
- SSL/TLS 模式与源站证书策略一致；
- 没有把数据库端口暴露到公网；
- 管理域名与公开站点域名分开；
- 必要时使用额外访问保护管理面板。

Kita 当前公开站点是 `https://kita.kral-koharu.com/`，OpenList 使用另一个独立应用和域名。

## 第五阶段：用 GitHub App 连接仓库

在 Coolify 中使用 GitHub App 连接 Kita 仓库，而不是把长期个人 access token 随意复制进多个位置。

部署源明确为：

```text
repository: koharu4ever/Kita
branch: main
deployment: repository compose.yaml
```

GitHub Actions 先在 Pull Request 和 main 上执行：

```text
install
format
lint
typecheck
test
build
```

通过 Ruleset 合并 main 后，Coolify 再开始生产构建。

CI 不拥有生产数据库和生产 secret；Coolify 也不替代代码质量门禁。

## 第六阶段：让 Compose 描述发布单元

Kita 没有把 web 和数据库分别手工创建，而是让仓库中的 `compose.yaml` 描述：

```text
web
  -> 根据根目录 Dockerfile 构建
  -> 等待 postgres healthy
  -> entrypoint 执行 migration
  -> 启动 Next standalone server

postgres
  -> PostgreSQL 16
  -> postgres-data volume

backup
  -> 默认关闭
  -> 生产显式启用后备份到私有 R2
```

Coolify Production 只读取基础 `compose.yaml`。本地才叠加 `compose.dev.yaml` 暴露 5432。

OpenList 不加入这份 Compose，它有独立管理员、数据 volume 和发布节奏。

## 第七阶段：配置生产环境变量

生产变量分四组。

### 应用与 Payload

```env
NEXT_PUBLIC_SITE_URL=https://kita.<你的域名>
PAYLOAD_SECRET=<至少 32 字符的生产 secret>
ENABLE_DEV_SEED=false
```

### PostgreSQL

```env
POSTGRES_DB=kita
POSTGRES_USER=<production-user>
POSTGRES_PASSWORD=<production-password>
DATABASE_URI=postgres://<production-user>:<production-password>@postgres:5432/kita
```

生产 host 是 Compose service name `postgres`，不是 localhost。

### Payload Media R2

```env
MEDIA_STORAGE_MODE=r2
MEDIA_R2_BUCKET=<media-bucket>
MEDIA_R2_ENDPOINT=https://<ACCOUNT_ID>.r2.cloudflarestorage.com
MEDIA_R2_PUBLIC_URL=https://media.<你的域名>
MEDIA_R2_ACCESS_KEY_ID=<secret>
MEDIA_R2_SECRET_ACCESS_KEY=<secret>
```

### PostgreSQL Backup R2

```env
POSTGRES_BACKUP_ENABLED=true
POSTGRES_BACKUP_R2_ENDPOINT=https://<ACCOUNT_ID>.r2.cloudflarestorage.com
POSTGRES_BACKUP_R2_BUCKET=<private-backup-bucket>
POSTGRES_BACKUP_R2_ACCESS_KEY_ID=<secret>
POSTGRES_BACKUP_R2_SECRET_ACCESS_KEY=<secret>
```

Media 与 backup 使用独立 bucket 和独立最小权限 token。

Coolify 自动生成的 service URL 等内部变量不复制回本地 `.env`。

## 第八阶段：第一次部署只验证最小闭环

第一次部署不要同时迁移全部内容和打开所有功能。先检查：

```text
Build Logs
  -> Dockerfile deps/builder/runner 是否成功

Runtime Logs
  -> migration 是否成功
  -> Next server 是否真正启动

Services
  -> postgres 是否 healthy
  -> web 是否持续运行
```

再打开 `/admin` 创建第一个生产管理员。管理员账号只在生产 Admin 中创建，不写进 seed、代码或文档。

最小数据闭环可以只创建一两条 Tools：

```text
Admin 写入
  -> PostgreSQL 持久化
  -> /tools 使用 Local API 读取
```

这条链路通过后，再继续迁移 Games、Reviews 和 Media。

## 第九阶段：页面与重部署验收

检查：

```text
/
/about
/tools
/reviews
/games
/admin
/api/games?limit=1
```

验收不只看 HTTP 200：

- Admin 能登录和写入；
- 公开访客只能看到 published 内容；
- 生产错误不会回退到本地 mock；
- Media 使用 custom domain；
- migration 状态可解释；
- redeploy 后 PostgreSQL 数据和 R2 图片仍存在；
- backup 容器有真实成功日志和对象。

## 常见故障顺序

排错时按阶段判断：

```text
仓库拉取失败
  -> GitHub App / 权限

依赖安装失败
  -> package / lockfile / 网络

镜像构建失败
  -> Next.js / TypeScript / Dockerfile

镜像成功但容器退出
  -> entrypoint / migration / 环境变量 / 数据库

容器运行但域名失败
  -> proxy / DNS / TLS
```

不要因为最终看到 503，就反复修改前端页面。先找失败发生在哪一段。

## 回滚与安全边界

部署前保留可解释的上一版镜像、migration 状态和数据库备份。

仅修改 Coolify 中的 `POSTGRES_PASSWORD` 不会自动改变已有 PostgreSQL volume 内的数据库密码。secret 轮换必须按数据库内部修改、应用变量更新和连接验证的正确顺序执行。

不要在没有备份与明确授权时删除 volume、重建生产数据库或清空 R2。

## 当前结果

Kita 当前的 Coolify Compose Production 已运行，Payload Media + R2、六条 Games、PostgreSQL backup 和 main 自动部署均通过真实验证。

完整 VPS/Coolify 灾难恢复仍未演练，因此“部署完成”不能写成“服务器丢失后已证明能够恢复”。

下一篇会拆开 backup service，说明它怎样生成 custom dump、验证、上传，以及为什么本地默认不会运行。

## 系列导航

- 对应的决策文章：[为什么 Kita 要 Self-host](/2026/08/02/kita-self-host-coolify/)
- 上一篇：[从 Payload Media 到 Cloudflare R2 的完整配置](/2026/08/04/kita-case-payload-media-r2/)
- 下一篇：[用 Backup Sidecar 把 PostgreSQL 备份到 R2](/2026/08/04/kita-case-postgres-r2-backup/)

