# Kita 项目决策地图

> 整理日期：2026-08-03  
> 来源范围：`C:\dev\Kita\docs` 下全部 43 份 Markdown，以及当前源码、配置、迁移、Docker、Dev Container 和 CI 文件。  
> 用途：作为后续博客文章、项目介绍和面试表达的内部事实底稿，不参与 Hexo 发布。

## 1. 这份文档解决什么问题

Kita 的资料不是一份从头写到尾的最终设计，而是项目在不同阶段留下的方案、事故记录、评估和状态快照。早期文档中的建议，有些已经落地，有些被后来的实测推翻，还有一些仍然只是候选方向。

因此，理解 Kita 不能简单挑一篇文档照抄，而要同时回答四个问题：

1. 当时遇到的实际问题是什么；
2. 为什么选择这个方案；
3. 后来是否出现了新的证据；
4. 当前源码最终采用了什么。

事实优先级如下：

```text
当前源码与配置
  > CODEX_HANDOFF.md / current-project-status.md
  > 最新日期的专项评估和实施记录
  > 早期路线图、计划与学习笔记
```

## 2. 项目定位

Kita 不是论坛、下载站、通用 CMS 演示，也不是用来堆满流行技术的作品集模板。

它的产品定位是：

> 一个带有视觉小说氛围的个人内容站和私人游戏文化档案馆。

各页面的职责是：

| 页面或系统 | 职责 |
| --- | --- |
| Home | 用全屏背景、句子、导航和雨滴效果建立氛围 |
| About | 介绍站点、作者与项目，目前保持轻量 |
| Tools | 整理真正使用过的工具和资源 |
| Reviews | 承载主观观点、评分和富文本长文 |
| Games | 承载封面画廊、元数据、游玩状态、简要资料和外部入口 |
| Payload Admin | 负责内容录入和管理，不对普通访客开放 |
| OpenList | 独立的资源目录服务，只在用户明确寻找文件时出现 |

Reviews、Games 和 OpenList 的边界可以用三个问题区分：

```text
Reviews：我怎么看这部游戏？
Games：这是什么游戏，我整理了哪些资料？
OpenList：对应的公开文件在哪里？
```

## 3. 项目真正想证明什么

Kita 的工程价值不在于页面数量，而在于完成一条可解释、可验证的完整链路：

```text
页面与内容模型
  -> 管理后台
  -> 数据库
  -> 服务端读取与数据转换
  -> 测试和质量门禁
  -> 容器构建
  -> 生产部署
  -> 数据备份与恢复边界
```

它追求的是单人项目的可维护性，而不是商业平台的规模。项目不应该被描述成高并发系统、微服务架构或成熟社区产品。

### 3.1 最初的学习起点：自己的 Next.js Starter

Kita 的工程思路不是先从 Payload、Docker 或部署开始的。最初要解决的问题是：作为初学者，怎样得到一套自己能理解、能重复使用的 Next.js 开发基座。

主要参考是 Syntax / CJ 的视频：

- [Create your own Next.js Starter Template](https://www.youtube.com/watch?v=dLRKV-bajS4)
- [视频配套的 Next.js Starters 分类清单](https://gist.github.com/w3cj/4fa5180fec37ececf0fceec0e3fcc8ab)
- [CJ 在视频中逐步形成的 next-start 仓库](https://github.com/w3cj/next-start)

这段学习经历提供的不是一份必须照抄的最终技术栈，而是一套选择方法：

```text
先区分哪些能力由 Next.js 开箱提供
  -> 再找出项目必须自己决定的部分
  -> 比较 CLI Generator、Starter、SaaS Starter 和 Toolkit
  -> 逐项选择工具
  -> 让这些工具形成一套可重复的开发基座
```

视频中与 Kita 初始基座关系最直接的章节包括：

- Code Style / Editor Settings；
- Generate Next.js App；
- Prettier；
- ESLint rules；
- VS Code Format / Lint on Save；
- import 与 Tailwind class 排序；
- Bulletproof React 的目录原则；
- unused imports；
- 项目自己的 TypeScript 版本；
- Next.js Typed Routes；
- typesafe env。

视频后半还演示了 NextUI、next-themes、NextAuth、Google OAuth、Drizzle、Docker PostgreSQL、Server Actions 和 Guestbook。Kita 没有照抄这些选择：

- UI 最终保持 Tailwind 与定制 CSS，没有使用 NextUI；
- 没有公开用户系统，因此没有采用 NextAuth 和 Google OAuth；
- 内容后台与数据模型由 Payload 管理，因此没有采用 Drizzle；
- 没有 Guestbook 需求，因此没有为了跟完教程而添加这个业务。

真正继承的是“工具必须对应一个问题”的决策方法。

### 3.2 开发基座中的工具—问题对应关系

| 当时需要解决的问题 | 选择或思路 | 最终解决什么 |
| --- | --- | --- |
| 不想手工从零配置 Next.js | `create-next-app`、App Router、`src/`、alias | 得到官方维护的最小应用结构 |
| 不同文件和写法格式混乱 | Prettier、Tailwind Prettier plugin | 让排版和 class 顺序由工具统一 |
| 错误只能等运行后才发现 | ESLint、Next ESLint config、unused imports | 提前发现静态错误和无效代码 |
| 自动格式化只存在于个人电脑 | `.vscode/settings.json` | 让编辑器行为跟随仓库，而不是跟随记忆 |
| 编辑器可能使用另一套 TypeScript | workspace `typescript.tsdk` | 编辑器与项目编译器保持一致 |
| 路由字符串容易拼错 | Next.js `typedRoutes` | 在编译期检查内部路由 |
| 项目增长后文件无处安放 | 借鉴 Bulletproof React 的 feature boundary | 按功能组织代码，但不复制企业级全部层次 |
| 环境变量缺失或布尔值误判 | Zod、`@t3-oss/env-nextjs` | 启动和构建时尽早失败，区分 server/client 变量 |
| 换机器后依赖版本漂移 | pnpm、Corepack、lockfile、frozen install | 固定包管理器和依赖解析结果 |
| 宿主机环境难以重建 | Dev Container、Docker-in-Docker | 把 Node、pnpm 和数据库环境写进仓库 |
| 只在本地检查，提交后仍可能坏 | package scripts、Vitest、GitHub Actions | 把格式、lint、类型、测试和 build 变成合并门禁 |

后续文章必须先解释这些问题，再介绍技术名称。不能把当前技术栈倒过来伪装成项目一开始就完成的总体设计。

### 3.3 三个视频来源，对应三层基座

Kita 的技术栈不是从一份模板整体复制出来的。最重要的三个外部启发分别解决不同层次的问题：

| 思路来源 | 最初解决的问题 | Kita 最终吸收的部分 |
| --- | --- | --- |
| [Create your own Next.js Starter Template](https://www.youtube.com/watch?v=dLRKV-bajS4) | 一个 Next.js 项目应该怎样开始，怎样选择基础库 | `create-next-app`、TypeScript、ESLint、Prettier、VS Code workspace、feature boundary、Typed Routes、typesafe env 的选择方法 |
| [you should be using dev containers](https://www.youtube.com/watch?v=kPMA9cnpScU) | 怎样把开发工具、容器能力和编辑器配置一起放进可复现环境 | Dev Container spec、模板/feature 思路、Docker-in-Docker、编辑器扩展与项目环境一体化 |
| [Coolify Crash Course / Self Host 101](https://www.youtube.com/watch?v=taJlPG82Ucw) | 怎样拥有自己的部署路径，而不是只会在托管平台点 Deploy | VPS、HTTPS、应用隔离、GitHub 自动部署、Docker Compose、PostgreSQL、S3 兼容存储和备份意识 |

这三段内容不是 Kita 的“标准答案”。最终工程有明确舍取：

- Starter 视频使用过 NextUI、NextAuth、Google OAuth、Drizzle 和 Guestbook，Kita 没有照搬；
- Dev Container 视频展示了很多可选 feature，Kita 只选择 Node 环境、Docker-in-Docker 和必要的编辑器配置；
- Coolify 视频演示 Hetzner、Nixpacks、MinIO、Supabase 等路径，Kita 最终使用自己的 VPS 选择、多阶段 Dockerfile、Compose、Cloudflare R2 和 Payload；
- Coolify 负责部署管理，但应用的数据模型、备份脚本和恢复边界仍然由 Kita 仓库明确记录；
- Self-host 不等于拒绝所有云服务。Cloudflare DNS、HTTPS 和 R2 在边界清楚时仍然是合适的组合。

### 3.4 “适合审美”不仅指页面外观

Kita 的技术审美包括两部分。

视觉审美是：

- 全屏图片和安静的视觉小说氛围；
- 定制页面，而不是通用 SaaS dashboard；
- 复杂效果集中在真正有辨识度的首页和 Games；
- 内容、封面和文字始终比组件数量重要。

工程审美是：

- 代码和配置能够被自己解释；
- 开发环境跟随仓库，不依赖宿主机记忆；
- 生产应用运行在自己管理的 VPS；
- 数据、文件和外部服务之间有清楚边界；
- 可以使用成熟工具，但不接受没有需求的全家桶；
- 每个组件都能回答“它解决了什么问题、如果不用它会怎样”；
- 组合可以有多个来源，但接口必须简单，不能形成无法拆开的拼贴。

因此“拼出自己的技术栈”不是随机堆库，而是：

```text
找到符合目标的思路
  -> 理解它解决的原始问题
  -> 判断是否适合自己的内容、审美和维护能力
  -> 只吸收需要的部分
  -> 用明确边界把各部分连接起来
  -> 在真实使用中继续替换和修正
```

## 4. 从 Kralgame 到 Kita

### 4.1 旧项目留下的价值

Kralgame 已经探索过以下方向：

- Galgame / visual novel 的视觉气质；
- Games、Reviews、Wallpapers、Verses、About、Media、Users 等内容概念；
- Next.js 前端与 Payload 后端；
- 全屏图片、暗色遮罩、随机句子和雨滴玻璃效果；
- 游戏条目、测评和个人内容站的组合。

这些内容证明了“想做什么”，因此应该保留页面意图、视觉方向和内容模型经验。

### 4.2 旧项目不应直接复制的部分

旧项目同时存在：

- mock 数据和真实请求混用；
- 硬编码 localhost 与不稳定 URL；
- Cloudinary、静态资源和上传方案没有统一；
- 前端组件知道过多后端查询细节；
- 依赖、配置和学习注释互相纠缠；
- 原始环境、数据库和部署事实难以重建。

因此 Kita 的迁移原则是：

> 继承 Kralgame 的气质和经验，不继承它的混乱。

Kita 不是旧代码的修补版，而是依据已经明确的产品方向重新搭建的工程。

## 5. 范围为什么收缩

最初曾把“使用全栈技术”理解成“必须做论坛、登录和很多用户功能”。后来的判断是：一个个人内容站同样可以具备完整的工程链路，不需要为了证明全栈能力先制造社区需求。

第一版明确不做：

- 公开用户注册；
- 评论、关注、收藏和社交关系；
- 支付、订阅和商业后台；
- 为了架构感而拆分微服务；
- 暂无真实需求的角色系统、邮件、任务队列和搜索基础设施；
- 大型通用 UI 组件库。

这不是放弃完整性，而是把完整性的定义从“功能多”改成“每条已选择的链路真正闭环”。

## 6. 当前技术栈

以下版本以 2026-08-03 的当前 `package.json` 和配置为准。

### 6.1 应用层

| 技术 | 当前版本或状态 | 作用 |
| --- | --- | --- |
| Next.js | 16.2.7 | App Router、路由、服务端组件、构建与 standalone 输出 |
| React | 19.2.7 | 页面与交互组件 |
| TypeScript | 6.0.3 | 类型边界和编译期检查 |
| Tailwind CSS | 4.3.0 | 通用布局和样式工具 |
| CSS Modules / Global CSS | 使用中 | 复杂视觉组件和全局基础样式 |
| Next typed routes | 已开启 | 路由类型检查 |
| Next Image | 使用中 | 本地与 R2 图片优化 |

### 6.2 内容与数据层

| 技术 | 当前版本或状态 | 作用 |
| --- | --- | --- |
| Payload CMS | 3.85.1 | Admin、Collections、认证、访问控制、API、上传和迁移 |
| Payload PostgreSQL adapter | 3.85.1 | Payload 与 PostgreSQL 连接 |
| PostgreSQL | 16 | 内容、用户、关系和媒体元数据 |
| Payload Lexical | 3.85.1 | Games 与 Reviews 富文本 |
| Payload S3 storage adapter | 3.85.1 | 生产 Media 上传到 Cloudflare R2 |
| Sharp | 0.35.0 | 图片处理和尺寸生成 |
| Zod | 4.4.3 | 配置与环境变量校验 |
| `@t3-oss/env-nextjs` | 0.13.11 | server/client 环境变量边界 |

### 6.3 开发和质量层

| 技术 | 状态 | 作用 |
| --- | --- | --- |
| Node.js | 22.16.0 文档基线，生产镜像为 Node 22 | JavaScript 运行时 |
| pnpm | 10.28.2 | 锁定依赖与脚本入口 |
| Corepack | 使用中 | 提供固定 pnpm 版本 |
| ESLint | 9.39.4 | 静态检查 |
| Prettier | 3.8.3 | 格式检查 |
| Vitest | 4.0.18 | 单元测试 |
| GitHub Actions | 使用中 | format、lint、typecheck、test、build |
| GitHub Ruleset / PR | 使用中 | main 合并门禁和历史记录 |

### 6.4 容器与生产层

| 技术 | 状态 | 作用 |
| --- | --- | --- |
| Dev Container | Node 22 Bookworm | 统一本地开发环境 |
| Docker-in-Docker | 使用中 | 在 Dev Container 内管理 PostgreSQL Compose |
| Docker Compose | 使用中 | web、postgres、backup 服务 |
| 多阶段 Dockerfile | 使用中 | deps、builder、runner 分层 |
| Next standalone | 使用中 | 生产运行输出 |
| 非 root runner | `nextjs` 用户 | 降低生产容器权限 |
| Coolify | 使用中 | VPS 上的构建、环境变量和应用管理 |
| Cloudflare | 使用中 | DNS、HTTPS 和 R2 |
| OpenList | 4.2.2 | 独立文件索引应用 |
| rclone | backup 容器使用 | PostgreSQL dump 上传到 R2 |

## 7. 当前源码结构

Kita 采用 feature-oriented 结构，借鉴了 bulletproof-react 的边界思想，但没有复制完整企业级模板。

```text
src/app
  路由、布局、Payload Admin/API 入口

src/features
  about / home / games / reviews / tools
  每个功能拥有自己的组件、数据类型和 mapper

src/server
  Payload client、服务端查询、seed

src/payload
  Collections、access、生成类型

src/config
  环境变量和媒体存储模式

src/migrations
  PostgreSQL 生产迁移

src/testing
  共享测试 fixture
```

选择这种结构的理由是：

- 页面路由保持薄；
- 功能代码按业务聚合，而不是按 React 文件类型散落；
- server-only 数据访问不会进入客户端组件；
- Payload schema 与 UI 模型之间有转换层；
- 结构足够清楚，但没有 repository、service、use case 等当前并不需要的层级。

## 8. 数据流为什么这样设计

当前主要数据流为：

```text
Payload Admin
  -> Collection
  -> PostgreSQL
  -> Payload Local API
  -> server getter
  -> mapper
  -> view model
  -> feature component
  -> app route
```

### 8.1 为什么使用 Payload Local API

Next.js 和 Payload 运行在同一个 Node 应用中。服务端页面无需为了读取自己的 CMS 再发起一次 HTTP 请求，因此直接使用 Local API：

- 少一次网络和序列化边界；
- 不需要在服务端硬编码 API URL；
- Payload 类型和访问控制仍然可用；
- 查询逻辑集中在 `src/server`。

Payload 仍然提供 REST、GraphQL 和 Admin 路由，但公开站点的服务端读取不依赖 REST。

### 8.2 为什么保留 mapper

Payload 生成的 document 包含 CMS 字段、关系、可空类型和内部元数据。页面只需要稳定的展示模型。

mapper 的作用是：

- 解析媒体关系；
- 提供明确的前端字段；
- 隔离 Payload 自动生成类型；
- 让组件测试不必启动数据库；
- 将来修改 CMS 字段时减少 UI 改动范围。

### 8.3 为什么没有再加 Express、Prisma 或 Drizzle

Payload 已经提供：

- Admin；
- CRUD；
- Auth；
- Access control；
- PostgreSQL schema；
- migration；
- upload；
- REST、GraphQL 和 Local API；
- TypeScript 类型生成。

当前需求下再增加第二套后端或 ORM，只会形成两套 schema 和重复职责。如果将来出现不适合 CMS 的复杂业务表，再单独评估 Drizzle，而不是预先引入。

## 9. 页面和视觉选择

### 9.1 首页

首页坚持全屏视觉，而不是普通博客 Hero：

- 单一背景源；
- 背景轮换；
- 低干扰的导航和句子；
- Canvas 2D 生成雨滴纹理；
- WebGL shader 进行折射和水层合成；
- `prefers-reduced-motion`、设备能力和 WebGL 失败时降级；
- 控制 DPR，监听尺寸与页面可见状态。

雨滴效果参考 Codrops RainEffect 的底层思路，但没有复制完整 demo、GSAP 或其页面结构，也没有引入 Three.js。原因是当前效果本质上是一个 2D shader，不需要通用 3D 引擎的体积和抽象。

### 9.2 Games

Games 参考了 Vercel Image Gallery Starter 的图片列布局和 lightbox 交互，但保留 Kita 自己的数据、路由和组件结构，没有引入 Vercel Blob 或整套模板依赖。

当前体验包括：

- CSS columns 封面墙；
- URL query 驱动的 lightbox；
- 键盘切换、缩略图和关闭操作；
- 内部游戏详情；
- 外部 archive 入口；
- Payload Lexical 正文。

## 10. Games 图片方案为什么变了三次

### 第一阶段：`coverKey` 枚举

优点是类型明确，但每新增一张内容图片都要修改源码枚举、映射和 schema。内容变化被错误地变成了代码发布。

### 第二阶段：静态路径字段

使用 `public/games/covers` 与 `coverSrc` 等字段，将图片内容从枚举中解耦。这个方案简单稳定，但图片仍需要进入 Git 并随应用部署。

### 第三阶段：Payload Media + Cloudflare R2

最终方案使用 Media relationship：

- 本地开发写入 `.payload-media`；
- 生产环境强制使用 R2，拒绝易失的容器本地存储；
- Payload/Sharp 生成 original、thumbnail 和 display 对象；
- Games 的 `cover` 是必填 Media 关系；
- 旧 cover 字段已通过分阶段迁移删除。

迁移没有一步完成。先增加兼容字段和 Media、迁移生产内容，再把关系设为必填并删除旧字段。这样避免生产数据在 schema 切换时失效。

## 11. 开发环境为什么选择 Dev Container + DIND

目标是让宿主机只保留 Git、Docker、VS Code 和浏览器，不要求全局安装 Node、pnpm、Payload 或 PostgreSQL。

Docker-in-Docker 的代价是容器层次和权限模型更复杂，但带来了：

- 开发命令统一在一个 Linux 环境中执行；
- PostgreSQL 不依赖宿主机安装；
- Windows 与 Linux 的依赖目录不会混用；
- 项目能够依据仓库配置在新机器上重建。

### 11.1 `.next` root 污染事故

项目曾经出现 root 创建的 `.next` 文件：

- TypeScript 读到残缺生成文件；
- `next build` 无法删除旧文件；
- 无法区分源码错误和缓存污染。

处理方式不是仅执行 `chown`，而是在核对路径和进程后删除可再生的 `.next`，由 `node` 用户重新生成，并增加：

- workspace 用户守卫；
- `.next` 所有权检查；
- dev/build 并行检查；
- `next.config.ts` 第二层 root 防护。

这个事故确立了一条原则：质量检查本身必须可信，才能继续判断其他问题。

### 11.2 为什么后来又加入 named volume

修复 root 污染时，文档曾不建议增加 volume，因为当时首要问题是身份边界而非性能。

后来的实测显示 Windows 9P 让 `.next` 和 `node_modules` 的高频 I/O 极慢，因此最终只为这两个目录使用 named volume：

```text
源码              -> Windows bind mount，保持可编辑
node_modules       -> Docker named volume
.next              -> Docker named volume
PostgreSQL data    -> 独立 Compose volume
```

这不是前后矛盾，而是新证据改变了优化判断。修复前后首屏编译从分钟级下降到秒级。

### 11.3 当前开发入口

当前正常入口是：

```bash
pnpm dev
```

该脚本会启动并等待 PostgreSQL，然后运行 Next。`pnpm dev:services` 仍是内部脚本，但不再要求开发者每天手动按两步启动。

## 12. 生产部署和数据安全

### 12.1 部署路径

```text
本地分支
  -> GitHub Pull Request
  -> GitHub Actions
  -> main Ruleset
  -> merge
  -> Coolify
  -> Docker build
  -> migration
  -> Next/Payload 运行
```

CI 使用只读权限和构建期环境变量，不连接生产数据库，也不持有生产 secret。

### 12.2 Compose 边界

Kita 生产发布单元包含：

```text
web
postgres
backup
postgres-data
```

`web` 等待 PostgreSQL healthcheck；生产 runner 使用非 root 用户；本地和生产使用相同的结构与迁移机制，但不共享 secret 和数据。

### 12.3 PostgreSQL 备份

由于 PostgreSQL 是 Kita Compose 内的服务，不能直接依赖 Coolify 独立数据库资源的备份界面，因此增加 backup sidecar：

```text
pg_dump --format=custom
  -> pg_restore --list 验证
  -> rclone 上传私有 R2 bucket
  -> 清理临时文件
```

backup 容器：

- 不开放端口；
- 不挂载 PostgreSQL data volume；
- 使用只读 root filesystem 和 tmpfs；
- 删除 Linux capabilities；
- 使用独立、最小权限的 R2 token。

需要注意：备份对象存在不等于恢复已通过。目前本地源码重建已经验证，但生产 PostgreSQL 完整恢复和全新 VPS/Coolify 灾难恢复仍未完成最终演练。

## 13. 为什么 OpenList 必须独立

OpenList 最初被讨论为 Games 的文件资源能力。最终判断是：它不应该成为 Payload 内部的 Go 服务，也不应该加入 Kita Compose。

当前结构：

```text
Kita Application
  Next.js + Payload + PostgreSQL + backup
  https://kita.kral-koharu.com

OpenList Application
  官方完整镜像 + 自己的 UI + data volume
  https://archive.kral-koharu.com

唯一连接
  Payload Games.links 中的一条公开 HTTPS URL
```

这样做的原因：

- OpenList 有自己的管理员、SQLite/data、存储凭据和发布节奏；
- Kita 不需要 OpenList 才能启动和展示 Games；
- 两边可以独立升级、回滚和备份；
- Kita 不保存 OpenList 管理 token 或 provider secret；
- 将来更换文件服务，只需更新公开 URL；
- 不必维护额外的 SolidJS 前端 fork。

产品上它们连接紧密：用户从一张游戏封面直接进入对应目录。工程上它们保持松耦合：OpenList 故障不会拖垮 Kita。

## 14. 有意没有采用的技术

| 没有采用 | 原因 |
| --- | --- |
| Express / Hono / Fastify | Payload 已提供当前需要的服务端能力 |
| Prisma / Drizzle | 当前内容数据由 Payload schema 和 adapter 管理 |
| Auth.js / NextAuth | 没有公开用户登录需求，Payload Admin auth 已足够 |
| Redis / 队列 /微服务 | 没有相应规模和异步业务需求 |
| tRPC | Server Components + Local API 已覆盖内部类型化数据读取 |
| MUI / Ant Design / Chakra / HeroUI | 通用组件风格不适合 Kita 的定制视觉 |
| Three.js | 雨滴效果只需要较小的 WebGL shader 层 |
| Vercel Blob | 图片最终由 Payload Media + R2 管理 |
| Cloudflare Images | 当前 R2 + Sharp 已覆盖需求，避免增加第二套图片产品 |
| OpenList API 深度集成 | URL 已能完成产品任务，API 会带来 token、缓存和故障耦合 |
| OpenList 前端 fork | 官方前端已够用，不值得承担版本配对和 AGPL 维护成本 |

## 15. 文档中发生过的状态变化

后续写作时必须避免把这些早期快照写成现状：

| 早期记录 | 当前事实 |
| --- | --- |
| 项目位于 D 盘 | 当前路径为 `C:\dev\Kita` |
| PostgreSQL 需要手动启动 | `pnpm dev` 自动启动并等待数据库 |
| 不使用 named volume | `.next` 和 `node_modules` 使用两个 targeted volume |
| Games 使用 mock/静态数据 | Games 已由 Payload + PostgreSQL 提供 |
| Games 使用 `coverKey` | 当前为必填 Payload Media relationship |
| Payload Media 暂缓 | Media + Cloudflare R2 已在生产落地 |
| OpenList 只是评估 | 独立 OpenList Application 已上线 |
| 备份仍是计划 | PostgreSQL 到 R2 的定时备份已运行 |
| build 被 `.next` 权限阻断 | 已修复并增加用户与并发守卫 |
| 没有测试 | 当前文档基线为 47 个单元测试和 4 个 backup shell 场景 |
| Games 可以继续重复 Reviews | 当前明确拆分为资料馆藏与主观评论 |

## 16. 当前已经完成的闭环

- Next.js + Payload 单体应用结构；
- PostgreSQL 16 与六个迁移；
- Tools、Reviews、Games 服务端读取；
- Games/Reviews 公开发布状态过滤；
- 生产失败时不使用本地假数据掩盖错误；
- Games Payload Media 必填封面；
- 本地 Media 与生产 R2 双模式；
- Games 画廊、lightbox、详情和富文本；
- 独立 OpenList archive 链接；
- 首页背景轮换与 WebGL 雨滴；
- Dev Container + DIND + 两个性能 volume；
- `pnpm dev` 单入口；
- 格式、lint、类型、测试和生产 build CI；
- GitHub PR/Ruleset 工作流；
- Coolify Compose 生产部署；
- PostgreSQL 到 R2 的 backup sidecar；
- 本地 C 盘源码重建验证。

## 17. 仍然没有完成的边界

这些内容应诚实描述为待办、候选或尚未演练：

- Games/Reviews slug 和外部 URL 的更严格校验；
- Collections create/update/delete 权限进一步显式统一；
- Games 与 Reviews 共享 Lexical 配置；
- Reviews 封面迁移到 Media；
- Games `releaseDate` 从文本迁移为日期字段的评估；
- About/Home 是否值得迁到 Payload Global；
- 使用真实 PostgreSQL 的 migration/published 内容集成测试；
- Playwright 端到端测试；
- WebGL texture 等资源释放细节；
- lightbox 可访问性进一步完善；
- 生产 PostgreSQL 完整 restore drill；
- 全新 VPS/Coolify 灾难恢复演练；
- R2 Media 对象的独立恢复验证；
- OpenList 最终 storage provider 与 data backup；
- 只有出现真实用户找回密码需求时再配置 email adapter。

## 18. 适合拆成的文章系列

Kita 不适合被压缩成一篇依赖列表。后续可以按决策和真实问题拆分：

1. 从一个视频开始：我怎样为 Kita 搭起 Next.js 开发基座；
2. 为什么我一直使用 Dev Container：开发环境也应该写进仓库；
3. 为什么 Kita 要 Self-host：我怎样从 VPS 走到 Coolify；
4. 为什么重新做 Kita，而不是继续修 Kralgame；
5. 从静态页面到 Payload Local API 的数据流；
6. Games 图片从枚举、静态路径到 Payload Media + R2；
7. 为什么 OpenList 是独立应用，而不是 Kita 微服务；
8. PostgreSQL、R2 backup 与诚实的灾难恢复边界；
9. Kita 使用了什么，以及刻意没有采用什么。

文章应遵守以下表达原则：

- 从问题和取舍开始，不从安装命令开始；
- 区分“曾经考虑”“后来替换”“当前使用”；
- 用真实事故和测量结果解释工程选择；
- 不把个人项目包装成高并发商业系统；
- 不隐藏尚未完成的恢复和测试边界；
- 技术服务于内容与维护，而不是成为文章主角。

每篇文章统一沿用下面的叙事顺序：

```text
当时遇到了什么问题
  -> 作为初学者最初怎样理解它
  -> 看到了哪些可选工具或方案
  -> 最后选择了什么
  -> 它具体解决了什么
  -> 引入了什么代价或新问题
  -> 今天是否仍然使用，还是已经被替换
```

完整的文章边界、原始视频来源、前后衔接和写作禁区见：

- `C:\dev\koharu-hexo\docs\kita-blog-series-plan.md`

系列整体还应重复说明三个层次，避免把来源混在一起：

```text
代码基座
  Next.js Starter 思路

开发环境基座
  Dev Container + Docker-in-Docker

生产运行基座
  Self-host + Coolify + Compose + Cloudflare
```

## 19. 主要本地事实来源

- `C:\dev\Kita\docs\CODEX_HANDOFF.md`
- `C:\dev\Kita\docs\current-project-status.md`
- `C:\dev\Kita\docs\project-structure.md`
- `C:\dev\Kita\docs\kita-technical-decisions-and-tradeoffs-2026-07-16.md`
- `C:\dev\Kita\docs\kita-architecture-portability-review-2026-07-15.md`
- `C:\dev\Kita\docs\kita-code-review-2026-07-09.md`
- `C:\dev\Kita\docs\development-production-alignment.md`
- `C:\dev\Kita\docs\local-development-performance-remediation-2026-07-14.md`
- `C:\dev\Kita\docs\payload-media-and-content-capabilities-evaluation-2026-07-21.md`
- `C:\dev\Kita\docs\kita-disaster-recovery-inventory-and-rebuild-runbook-2026-07-16.md`
- `C:\dev\Kita\docs\openlist-kita-project-boundary-evaluation-2026-07-13.md`
- `C:\dev\Kita\docs\postgres-r2-backup-workflow.md`
