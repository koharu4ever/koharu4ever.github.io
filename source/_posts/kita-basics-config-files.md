---
title: tsconfig、ESLint、Prettier 与 next.config 分别负责什么
date: 2026-08-04 16:10:00
cover: /img/home-rain-harbor.jpg
description: 用 Kita 根目录的真实配置理解类型检查、静态分析、格式化、框架行为、测试、Git 忽略和 Docker 构建边界。
tags:
  - TypeScript
  - ESLint
  - Prettier
  - Next.js
categories:
  - Kita 从零理解
---

> 这是“从零读懂 Kita”系列的第三篇。上一篇解释了 package.json；这一篇处理根目录中数量最多、也最容易混在一起的配置文件。

## 为什么一个项目需要这么多配置文件

初学时我容易觉得：这些工具都在“检查代码”，为什么不能只留一个？

实际上它们负责不同问题：

```text
tsconfig.json
  TypeScript 怎样理解代码和类型

eslint.config.mjs
  哪些代码写法应该报告问题

prettier.config.mjs
  代码最终怎样排版

next.config.ts
  Next.js 构建和运行采用哪些框架行为

vitest.config.ts
  测试怎样发现文件和解析模块
```

配置文件多不一定说明项目复杂；关键是每个文件有没有清楚职责。

## `tsconfig.json`：TypeScript 的阅读规则

Kita 开启：

```json
{
  "compilerOptions": {
    "strict": true,
    "noEmit": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "paths": {
      "@payload-config": ["./payload.config.ts"],
      "@/*": ["./src/*"]
    }
  }
}
```

### `strict`

让 TypeScript 使用更严格的空值、函数参数和类型关系检查。它不会证明业务逻辑正确，但能减少很多隐式假设。

### `noEmit`

运行 `tsc --noEmit` 时只做类型检查，不另外输出 JavaScript。Next.js 负责实际构建。

### `paths`

```ts
import { env } from "@/config/env";
```

这里的 `@/` 指向 `src/`，避免大量 `../../../`。alias 必须同时被 TypeScript、Next.js、测试和某些 CLI 正确理解。

### `include` 与 `exclude`

它们决定 TypeScript 检查哪些文件。Kita 包含 Next 生成类型和 `payload.config.ts`，排除 `node_modules` 与参考目录。

## `next-env.d.ts` 为什么不要手工编辑

这是 Next.js 自动生成的类型声明入口，让 TypeScript 认识 Next.js 提供的类型。

它属于工具生成文件。Kita 将它忽略，不把业务类型写进去。需要自己的声明时应创建独立 `.d.ts`，不要等待下一次 Next.js 启动把手工修改覆盖。

## ESLint：发现可静态判断的代码问题

Kita 的 ESLint 组合：

```text
Next Core Web Vitals
Next TypeScript rules
unused-imports plugin
项目自己的限制
```

例如：

```js
"unused-imports/no-unused-imports": "error"
```

未使用 import 会导致检查失败。

项目还限制普通源码直接读取：

```ts
process.env
```

并提示使用类型安全的 `@/config/env`。只有真正负责建立环境变量边界的 `env.ts` 和 `payload.config.ts` 允许直接读取。

ESLint 不负责把代码排成统一缩进，也不会连接数据库验证数据。

## Prettier：消除排版争论

Prettier 负责：

- 缩进；
- 换行；
- 引号；
- 尾随逗号；
- Tailwind class 顺序。

它不判断一个 React Hook 是否使用错误，也不理解业务权限。

Kita 的 `.prettierignore` 排除：

```text
node_modules
.next
coverage
pnpm-lock.yaml
Payload importMap
migration JSON
generated payload-types
```

原因是这些内容来自依赖、构建或代码生成，不应该每次被普通格式化重写。

常用命令：

```bash
pnpm format:check
pnpm format
```

前者只检查，后者会写文件。执行写入命令后需要审查 diff。

## `next.config.ts`：框架行为

Kita 当前设置：

```ts
const nextConfig: NextConfig = {
  images: {
    remotePatterns: mediaPublicURL
      ? [createMediaRemotePattern(mediaPublicURL)]
      : [],
  },
  output: "standalone",
  typedRoutes: true,
};
```

### `images.remotePatterns`

只允许来自生产 Media custom domain 的远程图片。它不是 R2 凭据，也不负责上传。

### `output: standalone`

让 Next.js 为容器生成较独立的生产运行输出，供多阶段 Dockerfile 复制到 runner。

### `typedRoutes`

让一部分内部路由字符串进入类型检查，减少拼写错误。

配置文件还拒绝在 bind-mounted Dev Container 中以 root 运行 Next.js。

## `postcss.config.mjs` 与样式工具

PostCSS 是 CSS 转换管线。Tailwind v4 的 PostCSS 插件通过这个配置参与构建。

它不等于 Tailwind 配色表，也不是组件库。Kita 仍然可以同时使用全局 CSS 和 CSS Modules。

## `vitest.config.ts`：测试环境

Vitest 配置决定：

- 测试运行环境；
- alias；
- 包含和排除哪些测试；
- setup 文件；
- coverage 行为。

它只影响测试 runner，不会自动让生产代码安全。测试仍然需要由具体 `*.test.ts` 提供断言。

## `.gitignore` 与 `.dockerignore` 不一样

`.gitignore` 决定哪些本地文件不进入 Git。

`.dockerignore` 决定 Docker build context 不发送哪些内容给构建器。

例如 `.env` 同时应该从两者排除：既不进入版本历史，也不应该无意进入镜像构建上下文。

`.git` 本身会被 `.dockerignore` 排除，因为生产镜像不需要整个仓库历史。

## 修改配置后应该运行什么

| 修改内容 | 最低检查 |
| --- | --- |
| TypeScript 配置 | `pnpm typecheck`、`pnpm build` |
| ESLint 规则 | `pnpm lint` |
| Prettier 配置 | `pnpm format:check` |
| Next 配置 | 停止 dev 后 `pnpm build` |
| Vitest 配置 | `pnpm test:unit` |
| Docker ignore / Dockerfile | 生产镜像构建 |
| Dev Container 配置 | Rebuild Container 后完整健康检查 |

不能只因为配置文件本身没有语法错误，就认为它的下游行为正确。

## 一个实用分类

以后看到陌生配置，可以先问：

```text
它在编辑时使用？
安装时使用？
构建时使用？
测试时使用？
容器创建时使用？
还是生产启动时使用？
```

同一个项目出现在多个阶段，正是配置文件不能全部合并的原因。

下一篇进入 `src`，解释 Kita 的目录结构从哪些来源学来，以及为什么没有照抄完整大型模板。

## 系列导航

- 上一篇：[package.json、pnpm-lock.yaml 和 scripts 到底是什么](/2026/08/04/kita-basics-package-json-pnpm/)
- 下一篇：[Kita 的目录结构从哪里来：App、Feature、Server 与 Payload](/2026/08/04/kita-basics-project-structure/)

