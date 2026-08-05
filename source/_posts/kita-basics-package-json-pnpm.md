---
title: package.json、pnpm-lock.yaml 和 scripts 到底是什么
date: 2026-08-04 16:05:00
cover: /img/covers/package-json-pnpm.webp
description: 用 Kita 的真实 package.json 解释项目身份、ESM、包管理器、scripts、dependencies、devDependencies 和 lockfile。
tags:
  - package.json
  - pnpm
  - Node.js
  - 初学者
categories:
  - Kita 从零理解
---

> 这是“从零读懂 Kita”系列的第二篇。上一篇先画仓库地图；这一篇阅读 Node 项目最重要的入口文件之一。

## `package.json` 不是依赖清单而已

我最初看到 `package.json`，只会在 `dependencies` 中找框架版本。

实际上它同时回答：

```text
项目叫什么
  -> 是否允许发布成 npm 包
  -> 使用哪种模块系统
  -> 使用哪个包管理器版本
  -> 有哪些标准命令
  -> 运行时需要哪些包
  -> 开发时需要哪些工具
```

Kita 的开头是：

```json
{
  "name": "kita",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "packageManager": "pnpm@10.28.2"
}
```

## `name`、`version` 和 `private`

```json
"name": "kita",
"version": "0.1.0",
"private": true
```

`name` 和 `version` 描述项目身份。`private: true` 阻止把这个应用误发布到 npm registry。

Kita 是应用仓库，不是准备给其他项目安装的 npm library，因此 `private` 是一条有用的防误操作边界。

## `type: module` 是什么

```json
"type": "module"
```

它表示项目默认使用 ECMAScript Modules，也就是常见的：

```ts
import something from "some-package";
export function example() {}
```

而不是旧式 CommonJS 的：

```js
const something = require("some-package");
module.exports = {};
```

这会影响 `.js` 文件怎样解释，也会影响配置和辅助脚本。它不是单纯的代码风格开关。

## `packageManager` 为什么要固定版本

```json
"packageManager": "pnpm@10.28.2"
```

这个字段告诉 Corepack 和协作者：项目不是泛泛地“使用 pnpm”，而是以哪个版本作为基线。

Dev Container 创建时执行 Corepack，再运行：

```bash
pnpm install --frozen-lockfile
```

这样新电脑不会因为使用另一个 pnpm 主版本而得到不同 lockfile 行为。

## scripts 是项目的公共命令入口

Kita 的 scripts 分成几组。

### 开发与服务

```json
"dev": "... && pnpm dev:services && next dev",
"dev:services": "... docker compose ... up -d --wait postgres",
"dev:services:stop": "... docker compose ... stop postgres"
```

外部使用者只需要记住：

```bash
pnpm dev
```

脚本内部负责用户检查、数据库启动和 Next.js。脚本的价值就是把已经确认的顺序写进仓库。

### 质量检查

```json
"format:check": "... prettier . --check",
"lint": "... eslint .",
"typecheck": "... tsc --noEmit",
"check": "... pnpm format:check && pnpm lint && pnpm typecheck"
```

`pnpm check` 不是测试业务行为，而是组合格式、静态检查和类型检查。

### 测试与构建

```json
"test": "pnpm test:unit && pnpm test:backup",
"test:unit": "... vitest run",
"test:backup": "... sh docker/postgres-backup/tests/backup.test.sh",
"build": "... next build"
```

每个脚本都代表一种验证。`build` 不能替代 test，test 也不能证明生产镜像的 entrypoint 一定正常。

### Payload 与 Migration

```json
"payload:types": "... payload generate:types --use-swc",
"payload:migrate:create": "... payload migrate:create --use-swc",
"payload:migrate": "... payload migrate --use-swc",
"payload:migrate:status": "... payload migrate:status --use-swc"
```

这些脚本把较长的 CLI 调用变成项目统一入口，并确保先执行 workspace 用户守卫。

## 怎样查看全部 scripts

在项目目录执行：

```bash
pnpm run
```

运行某个脚本可以写：

```bash
pnpm run typecheck
```

pnpm 也允许省略 `run`：

```bash
pnpm typecheck
```

命令来自仓库，不要求把 Next、Payload、Vitest 或 ESLint 全局安装到宿主机。

## `dependencies` 与 `devDependencies`

Kita 的运行依赖包括：

```text
next / react
payload
@payloadcms/db-postgres
@payloadcms/storage-s3
sharp
zod
```

它们参与应用运行、构建或生产功能。

开发依赖包括：

```text
typescript
eslint
prettier
vitest
类型声明
Tailwind/PostCSS 工具
```

简单理解：

```text
dependencies
  应用功能或生产构建所依赖的包

devDependencies
  编写、检查和测试项目所需的工具
```

这个边界不是绝对由“浏览器是否直接使用”决定。某些构建工具虽然不在最终 server 中运行，仍可能因为部署安装策略而需要谨慎放置。

## 版本符号 `^` 是什么

例如：

```json
"next": "^16.2.7"
```

`^` 表示允许在语义化版本规则下接受兼容范围内的更新。真正安装的完整版本组合记录在 lockfile 中。

因此不能只看 `package.json` 判断某次构建安装了什么，还要一起看 `pnpm-lock.yaml`。

## `pnpm-lock.yaml` 解决什么

`package.json` 说明允许的依赖范围，lockfile 记录解析后的具体依赖图，包括间接依赖与完整性信息。

```text
package.json
  表达项目想要什么范围

pnpm-lock.yaml
  记录这次解析最终得到什么
```

它应该进入 Git。新环境使用 `--frozen-lockfile` 时，如果 `package.json` 与 lockfile 不一致，安装会失败，而不是自动生成另一套结果。

不要手工大段编辑 lockfile。依赖变化应通过 pnpm 命令产生，再审查 package 和 lockfile 的 diff。

## 全局安装与项目依赖的区别

不推荐在 Windows 全局安装：

```text
next
payload
eslint
typescript
```

否则终端执行的版本可能与项目依赖不同。

项目脚本会优先使用当前 `node_modules` 中的工具。Dev Container、packageManager 和 lockfile 合在一起，才能让编辑器、本地命令和 CI 接近同一套版本。

## 安装一个新包前先问什么

```text
它解决什么真实问题？
现有依赖是否已经提供？
运行时需要还是只在开发时需要？
是否与当前 Payload/Next 版本线兼容？
会不会增加第二套相同职责？
```

安装后至少检查：

```bash
git diff -- package.json pnpm-lock.yaml
pnpm check
pnpm test
pnpm build
```

## 常见误解

- 修改 `package.json` 不等于依赖已经安装；
- 删除 `node_modules` 不会删除 package 声明，但会影响当前工作环境；
- lockfile 不是缓存文件；
- `pnpm dev` 是脚本入口，不是 pnpm 内置的 Next.js 功能；
- dependency 数量多不等于项目更完整；
- CI 能安装依赖依赖于 package 与 lockfile 一致。

下一篇继续解释项目根目录中其他看似零散的配置文件各自负责什么。

## 系列导航

- 上一篇：[拿到一个项目后，应该先看哪些文件](/2026/08/04/kita-basics-read-repository/)
- 下一篇：[tsconfig、ESLint、Prettier 与 next.config 分别负责什么](/2026/08/04/kita-basics-config-files/)
