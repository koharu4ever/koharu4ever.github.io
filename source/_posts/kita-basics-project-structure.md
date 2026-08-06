---
title: Kita 的目录结构从哪里来：App、Feature、Server 与 Payload
date: 2026-08-04 16:15:00
cover: /img/covers/project-structure.webp
description: Kita 没有凭空设计目录，也没有照抄企业模板；它组合了 create-next-app、App Router、Bulletproof React feature boundary 和 Payload 约定。
tags:
  - 项目结构
  - Next.js
  - Payload CMS
  - Bulletproof React
categories:
  - Kita 从零理解
series: 从零读懂 Kita
---

> 这是“从零读懂 Kita”系列的第四篇。上一篇解释根目录配置；这一篇进入 `src`，回答每类代码为什么放在这里。

## 目录结构不是越多越专业

我刚开始研究 Starter 时，很容易被大型项目的目录吸引：`domain`、`service`、`repository`、`use-case`、`adapter`、`shared`、`core`，看起来每层都很正式。

问题是，如果项目还没有对应复杂度，这些目录只会把一次修改拆散到更多位置。

Kita 的原则是：

```text
先使用框架已经定义的入口
  -> 再按真实业务聚合代码
  -> 只为明确边界增加层
  -> 不提前复制大型模板的全部抽象
```

## 第一部分来自 `create-next-app`

项目最初使用 App Router、TypeScript、Tailwind、`src/` 和 `@/*` alias。

它自然提供：

```text
src/app
public
next.config.ts
tsconfig.json
package.json
```

所以 `src/app` 不是 Kita 自创的目录，而是 Next.js App Router 的路由入口。

## 第二部分来自 Next.js App Router

Kita 的路由分成：

```text
src/app/(site)
src/app/(payload)
```

括号目录是 route group，只用于组织代码，不会成为 URL 的一段。

```text
src/app/(site)/games/page.tsx
  -> /games

src/app/(payload)/admin/...
  -> /admin
```

这样公开站点布局和 Payload Admin/API 集成可以在同一个 Next.js 应用中保持不同组织边界。

`src/app` 只负责：

- page、layout、metadata；
- error、loading、not-found；
- Payload Admin/REST/GraphQL route；
- 组合 server getter 与 feature component。

它不适合堆大段查询、数据转换和复杂 UI。

## 第三部分借鉴 Bulletproof React

我没有复制 Bulletproof React 的完整企业结构，只吸收 feature boundary：

```text
src/features/home
src/features/about
src/features/tools
src/features/reviews
src/features/games
```

每个业务功能拥有相邻的：

```text
components/
types/
utils/
data/
__tests__/
```

修改 Games 时，大多数相关组件、view model 和 mapper 都在 `features/games` 中，不需要从全局 `components`、`types` 和 `utils` 三个大仓库来回寻找。

这就是“按功能聚合”而不是“按文件类型聚合”。

## `src/server` 为什么单独存在

公开页面需要读取 Payload，但浏览器组件不应该直接获得数据库连接和服务端 secret。

因此：

```text
src/server/payload
src/server/tools
src/server/reviews
src/server/games
```

这里负责：

- 初始化 Payload client；
- 调用 Local API；
- 查询和排序；
- published 过滤；
- development fallback 与 production fail-fast；
- 调用 feature mapper。

数据流是：

```text
app route
  -> server getter
  -> Payload Local API
  -> mapper
  -> feature component
```

route 因此可以保持很薄。

## `src/payload` 为什么不是普通后端目录

```text
src/payload/collections
src/payload/access
src/payload/payload-types.ts
```

Collections 定义 CMS 字段、关系、Admin 行为和访问控制，是内容 schema 的事实来源。

`payload-types.ts` 由 Payload 生成。业务字段不应手工维护在这个文件中；修改 Collection 后重新生成类型。

Kita 没有再创建 Express controllers、Prisma schema 和第二套 CRUD，因为 Payload 已经提供当前需要的后台能力。

## `src/migrations` 为什么必须独立可见

Collection 表达“当前希望数据库长什么样”，migration 表达“旧数据库怎样走到当前结构”。

它们不能混成同一个概念。

```text
src/payload/collections
  当前 schema

src/migrations
  schema 的历史演进步骤
```

生产部署需要 migration 文件，所以它们进入 Git，也被 Docker runner 明确复制。

## `src/config` 放什么

Kita 当前主要放：

- 类型安全环境变量；
- Media local/R2 模式解析。

配置层不应该逐渐变成所有常量的垃圾桶。只有跨运行阶段、需要集中验证的配置才适合进入这里。

## 测试为什么靠近实现

TypeScript 单元测试通常和实现相邻：

```text
src/features/*/utils/__tests__
src/server/*/__tests__
```

跨功能 fixture 放：

```text
src/testing/fixtures
```

备份脚本不是 TypeScript 业务代码，因此 shell tests 留在：

```text
docker/postgres-backup/tests
```

测试位置跟随被测试对象，而不是为了统一外观把所有测试塞进一个巨大目录。

## 基础设施为什么留在根目录

```text
.devcontainer
.github/workflows
docker
compose.yaml
compose.dev.yaml
Dockerfile
docker-entrypoint.sh
```

这些文件描述开发、检查、构建和生产运行，不属于某个 Games 或 Reviews feature。

它们放在根目录或明确的基础设施目录，可以让部署工具直接找到，也让职责与 `src` 业务代码分开。

## 新代码应该放在哪里

可以按问题判断：

| 新内容 | 推荐位置 |
| --- | --- |
| 新路由和 metadata | `src/app` |
| Games 页面组件 | `src/features/games` |
| Payload 查询 | `src/server/games` |
| CMS 字段与权限 | `src/payload/collections` |
| 数据库结构演进 | `src/migrations` |
| 环境模式验证 | `src/config` |
| 多个 feature 真正共用的纯代码 | `src/shared` |
| Docker/备份实现 | `docker` 或根目录基础设施文件 |

如果一个 helper 目前只被 Games 使用，就先留在 Games。不要因为“以后可能复用”提前放进 shared。

## 写一个 CMS 功能的推荐顺序

```text
明确内容模型
  -> Collection
  -> Admin 中验证 CRUD
  -> 生成类型和 migration
  -> server getter
  -> mapper
  -> feature component
  -> app route
  -> test / check / build
```

这条顺序能让问题一次集中在一层，而不是同时修改 UI、数据库、Docker 和部署。

## 结构什么时候需要改变

只有出现真实信号时：

- feature 太大，内部需要再分模块；
- 多个 feature 重复同一稳定逻辑；
- server 与 feature 产生循环依赖；
- 出现不适合 Payload 的独立业务表；
- 测试难以隔离当前边界。

目录结构是为修改服务，不是为了满足某张标准架构图。

下一篇解释贯穿所有这些目录的环境变量：它们从哪里来，为什么有些可以进入浏览器，有些绝对不行。

## 系列导航

- 上一篇：[tsconfig、ESLint、Prettier 与 next.config 分别负责什么](/2026/08/04/kita-basics-config-files/)
- 下一篇：[环境变量到底是什么：本地、生产、公开变量与 Secret](/2026/08/04/kita-basics-environment-variables/)
