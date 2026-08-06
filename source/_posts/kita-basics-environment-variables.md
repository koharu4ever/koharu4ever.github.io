---
title: 环境变量到底是什么：本地、生产、公开变量与 Secret
date: 2026-08-04 16:20:00
cover: /img/covers/environment-variables.webp
description: 用 Kita 的变量解释 .env、.env.example、NEXT_PUBLIC、Buildtime、Runtime、Secret、类型校验和 local/production 边界。
tags:
  - 环境变量
  - Next.js
  - 安全基础
  - 初学者
categories:
  - Kita 从零理解
series: 从零读懂 Kita
---

> 这是“从零读懂 Kita”系列的第五篇。上一篇解释代码放在哪里；这一篇解释同一份代码怎样在本地、CI 和生产使用不同配置。

## 环境变量不是项目里的普通常量

环境变量可以先理解为运行进程从外部得到的键值对：

```text
DATABASE_URI=postgres://...
MEDIA_STORAGE_MODE=local
ENABLE_DEV_SEED=false
```

同一份源码可以在不同环境获得不同值，而不需要把数据库密码、域名和模式硬编码到代码中。

在 Node 中，底层值通常来自：

```ts
process.env.DATABASE_URI
```

环境变量原始值是字符串或不存在，不会自动变成布尔值、数字或 URL。

## `.env` 与 `.env.example`

```text
.env
  当前电脑的真实本地值
  可能含 secret
  被 .gitignore 排除

.env.example
  项目需要哪些变量
  只含安全示例和占位符
  进入 Git
```

新电脑应根据 `.env.example` 创建自己的 `.env`，而不是向其他人索要整份生产配置。

Kita 还在 `.dockerignore` 中排除 `.env`，避免它意外进入 Docker build context。

## Server-only 与 `NEXT_PUBLIC_`

Next.js 默认让普通环境变量只在服务端使用。

只有带 `NEXT_PUBLIC_` 前缀的变量才表示允许进入浏览器 bundle，例如：

```env
NEXT_PUBLIC_SITE_URL=https://kita.example.com
```

它不是 secret。根据 [Next.js 环境变量文档](https://nextjs.org/docs/app/guides/environment-variables)，公开变量通常会在构建时内联到发送给浏览器的 JavaScript 中。

下面这些绝不能加 `NEXT_PUBLIC_`：

```text
PAYLOAD_SECRET
POSTGRES_PASSWORD
DATABASE_URI
R2 access key
R2 secret access key
```

前缀不是为了命名美观，而是一个安全边界。

## Buildtime 与 Runtime

有些值在 `next build` 时就影响输出，例如公开站点 URL或允许的远程图片域名。

有些值只在容器启动和处理请求时使用，例如生产数据库连接与 Payload secret。

```text
Buildtime
  生成应用产物时读取

Runtime
  已构建应用启动或处理请求时读取
```

Kita 不把生产数据库 secret 注入 GitHub Actions build。CI 使用 `SKIP_ENV_VALIDATION=true` 和安全占位环境，只验证代码能够构建。

Coolify Production 再在 Runtime 提供真实数据库与 Payload 配置。

## Kita 的变量分组

### 应用地址

```env
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

本地和生产不同，因为浏览器实际访问地址不同。

### Payload

```env
PAYLOAD_SECRET=<至少 32 字符>
```

它用于 Payload 的安全能力和会话相关行为，不是 PostgreSQL 密码。生产值需要稳定，不能每次部署随机生成，否则现有 Admin session 会失效。

### 本地 Seed 开关

```env
ENABLE_DEV_SEED=false
```

只有明确需要开发种子数据时才临时设为 `true`，生产必须保持 `false`。

### PostgreSQL

```env
POSTGRES_DB=kita
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
DATABASE_URI=postgres://postgres:postgres@localhost:5432/kita
```

前三项初始化数据库 service，`DATABASE_URI` 让应用连接数据库。同一环境内部的用户名、密码和数据库名必须匹配。

本地 host 是 `localhost`，生产 Compose 中是 `postgres`。

### Payload Media

```env
MEDIA_STORAGE_MODE=local
MEDIA_R2_BUCKET=
MEDIA_R2_ENDPOINT=
MEDIA_R2_PUBLIC_URL=
MEDIA_R2_ACCESS_KEY_ID=
MEDIA_R2_SECRET_ACCESS_KEY=
```

本地 `local` 不需要 Cloudflare secret；生产必须使用 `r2` 并提供完整配置。

### PostgreSQL Backup

```env
POSTGRES_BACKUP_ENABLED=false
POSTGRES_BACKUP_INTERVAL_SECONDS=86400
POSTGRES_BACKUP_R2_BUCKET=kita-postgres-backups
```

本地默认关闭。生产显式启用，并使用独立于 Media 的私有 bucket 与 token。

## 为什么环境变量需要类型校验

Kita 使用 Zod 与 `@t3-oss/env-nextjs`：

```ts
MEDIA_STORAGE_MODE: z.enum(["local", "r2"]).default("local"),
PAYLOAD_SECRET: z.string().min(32),
DATABASE_URI: z.string().url(),
```

目标不是只获得自动补全，而是让配置错误尽早失败：

- 数据库 URI 不是 URL；
- Payload secret 太短；
- storage mode 拼写错误；
- 生产选择 R2 却缺少 bucket；
- 公共 URL 不是 HTTPS。

如果没有校验，这些错误可能等到用户访问某个页面或上传图片才出现。

## `Boolean("false")` 为什么是 `true`

环境变量是字符串：

```ts
Boolean("false") === true;
```

只要字符串非空，JavaScript 就认为它是真值。

Kita 使用：

```ts
z.enum(["true", "false"]).transform((value) => value === "true")
```

先限制允许值，再显式转换。

## 空字符串与不存在不一样

`.env.example` 常写：

```env
MEDIA_R2_BUCKET=
```

这在原始环境中是空字符串，不是 `undefined`。Kita 开启 `emptyStringAsUndefined`，让可选变量的空值更符合“未提供”的语义。

但生产选择 `r2` 后，这些字段不再是可选，resolver 会强制完整。

## `DATABASE_URI` 怎么读

```text
postgres://user:password@host:port/database
```

拆开：

| 部分 | Kita 本地示例 |
| --- | --- |
| 协议 | `postgres` |
| 用户 | `postgres` |
| 密码 | 本地开发密码 |
| host | `localhost` |
| port | `5432` |
| database | `kita` |

真实生产密码可能包含需要 URL 编码的字符，不能简单拼接后假设连接串一定正确。

## Secret 应该保存在哪里

```text
本地 Development secret
  -> 被忽略的 .env / 密码管理器

Production secret
  -> Coolify Runtime Variables / 密码管理器

变量键名与占位符
  -> .env.example / 文档
```

不要把真实值放进：

- Git；
- Markdown；
- issue 或 PR 描述；
- 截图；
- 浏览器客户端代码；
- GitHub Actions 日志。

## 常见错误

- 把 `.env.example` 改成真实生产值并提交；
- 给 secret 添加 `NEXT_PUBLIC_`；
- 本地直接复用生产 R2 write token；
- 在生产把 `DATABASE_URI` host 写成 localhost；
- 只修改 Coolify `POSTGRES_PASSWORD`，却没有改变已有数据库内部密码；
- 把 build 成功当作 runtime 配置已经验证；
- 遇到缺变量就使用假默认值掩盖生产错误。

下一篇解释这些变量最终连接的 Payload、PostgreSQL、Collection、CRUD 和 Adapter 是什么关系。

## 系列导航

- 上一篇：[Kita 的目录结构从哪里来](/2026/08/04/kita-basics-project-structure/)
- 下一篇：[Payload、PostgreSQL、Collection、CRUD 和 Adapter 的关系](/2026/08/04/kita-basics-payload-postgres/)
- 相关案例：[从 Payload Media 到 Cloudflare R2 的完整配置](/2026/08/04/kita-case-payload-media-r2/)
