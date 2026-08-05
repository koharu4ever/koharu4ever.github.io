---
title: Kita 项目整体架构、数据流与边界审查
date: 2026-08-05 14:30:00
cover: /img/covers/kita-architecture-review.webp
description: 从整体架构、数据流、开发环境、部署和恢复边界出发，系统审查 Kita 项目当前的真实结构。
tags:
  - Kita
  - Next.js
  - Payload
  - 项目架构
categories:
  - Kita 工程案例
series: Kita 工程案例
toc: false
---

# Kita 项目整体架构、数据流与边界审查

> 审查日期：2026-08-05  
> 审查对象：[`koharu4ever/Kita`](https://github.com/koharu4ever/Kita)  
> 代码基线：`main` / `448220d1e3512627141fceab8084fde9551b65cb`  
> 基线提交：`Merge pull request #19 ... docs: explain media-only migration design`  
> 文档性质：项目解剖、架构说明、边界审查、问题清单与演进建议  
> 目标读者：项目所有者本人；假设读者会写 TypeScript/React，但还没有把 Kita 的全部运行链路装进脑子里

---

## 目录

- [0. 先给结论](#0-先给结论)
- [1. 审查范围、证据与限制](#1-审查范围证据与限制)
- [2. 为什么你会觉得自己只懂一半](#2-为什么你会觉得自己只懂一半)
- [3. Kita 到底是什么项目](#3-kita-到底是什么项目)
- [4. 一句话架构与系统全景](#4-一句话架构与系统全景)
- [5. Kita 是怎样自然长成现在这样的](#5-kita-是怎样自然长成现在这样的)
- [6. 生产运行拓扑](#6-生产运行拓扑)
- [7. 本地开发拓扑](#7-本地开发拓扑)
- [8. 代码目录与职责地图](#8-代码目录与职责地图)
- [9. 依赖方向：谁可以依赖谁](#9-依赖方向谁可以依赖谁)
- [10. 项目的事实源地图](#10-项目的事实源地图)
- [11. 一次公开页面读取到底发生了什么](#11-一次公开页面读取到底发生了什么)
- [12. 一次后台写入到底发生了什么](#12-一次后台写入到底发生了什么)
- [13. Payload Collection 为什么同时影响这么多层](#13-payload-collection-为什么同时影响这么多层)
- [14. Games Media 全链路解剖](#14-games-media-全链路解剖)
- [15. development fallback 与 seed 的真实角色](#15-development-fallback-与-seed-的真实角色)
- [16. migration 生命周期与 Games 封面演进案例](#16-migration-生命周期与-games-封面演进案例)
- [17. 构建、部署与启动流程](#17-构建部署与启动流程)
- [18. PostgreSQL 备份与恢复边界](#18-postgresql-备份与恢复边界)
- [19. OpenList 为什么是独立应用](#19-openlist-为什么是独立应用)
- [20. 前端产品层的架构](#20-前端产品层的架构)
- [21. 测试与 CI 到底保护了什么](#21-测试与-ci-到底保护了什么)
- [22. 安全模型](#22-安全模型)
- [23. 当前边界清晰度逐层评分](#23-当前边界清晰度逐层评分)
- [24. 当前最值得肯定的地方](#24-当前最值得肯定的地方)
- [25. 当前问题总表](#25-当前问题总表)
- [26. 第一类问题：理解入口与文档事实源](#26-第一类问题理解入口与文档事实源)
- [27. 第二类问题：开发环境存在双数据源](#27-第二类问题开发环境存在双数据源)
- [28. 第三类问题：运行职责有少量重复所有者](#28-第三类问题运行职责有少量重复所有者)
- [29. 第四类问题：查询形状与页面模型还不够精确](#29-第四类问题查询形状与页面模型还不够精确)
- [30. 第五类问题：内容模型还有历史痕迹](#30-第五类问题内容模型还有历史痕迹)
- [31. 第六类问题：公开 API 和权限意图可以更窄](#31-第六类问题公开-api-和权限意图可以更窄)
- [32. 第七类问题：真实集成测试仍然不足](#32-第七类问题真实集成测试仍然不足)
- [33. 第八类问题：局部 UI 与可访问性缺口](#33-第八类问题局部-ui-与可访问性缺口)
- [34. 第九类问题：恢复能力已建立但未闭环](#34-第九类问题恢复能力已建立但未闭环)
- [35. 哪些东西绝对不应该加入](#35-哪些东西绝对不应该加入)
- [36. 推荐的目标架构](#36-推荐的目标架构)
- [37. 分阶段改进路线](#37-分阶段改进路线)
- [38. 建议的文档重组方案](#38-建议的文档重组方案)
- [39. 建议的日常开发心智模型](#39-建议的日常开发心智模型)
- [40. 按文件阅读 Kita 的推荐顺序](#40-按文件阅读-kita-的推荐顺序)
- [41. 常用术语翻译成人话](#41-常用术语翻译成人话)
- [42. 最终评价](#42-最终评价)
- [附录 A：关键文件索引](#附录-a关键文件索引)
- [附录 B：建议拆分的具体 PR](#附录-b建议拆分的具体-pr)

---

## 0. 先给结论

Kita 不是一套随机堆起来的 JavaScript 工具集合，也不是一个已经失控的“全家桶”。

它当前最准确的定义是：

> **一个以 Next.js 为应用外壳、以 Payload 为内容后端、以 PostgreSQL 为持久化事实源、以 Docker/Coolify 为运行环境的单仓库全栈模块化单体。**

更通俗地说：

- 访客看到的页面由 Next.js 和 React 负责；
- 你录入内容的后台由 Payload Admin 负责；
- 内容真正存放在 PostgreSQL；
- 图片对象在本地开发时放在本地目录，生产放在 Cloudflare R2；
- 页面不直接碰数据库，而是通过服务端 getter 调用 Payload Local API；
- Payload 返回的 CMS 文档不会直接扔给 UI，而是经过 mapper 变成页面真正需要的形状；
- 生产应用、数据库和备份任务由同一个 Compose 管理；
- OpenList 不在这个运行内核里，只通过公开 URL 与 Games 连接；
- GitHub、migration、R2 dump、Coolify 配置和密码管理器共同构成恢复材料。

这套架构不是“先设计一张完美图，再照图实施”的结果。它是这样长出来的：

```text
先做视觉页面
  -> 需要后台录入
  -> 引入 Payload 与 PostgreSQL
  -> 需要生产可靠性
  -> 加 migration、Docker、Coolify
  -> 遇到 Windows bind mount / root ownership 问题
  -> 加 Dev Container guard 与 targeted volumes
  -> 内容开始有价值
  -> 加测试、CI、数据库备份与恢复清单
  -> Games 需要下载入口
  -> 把 OpenList 作为独立应用接进产品体系
  -> 图片不应继续跟随 Git 发布
  -> 引入 Payload Media 与 R2
  -> 生产内容迁移完成
  -> 删除旧封面字段，收敛为单一事实源
```

自然增长不等于没有架构。恰恰相反，Kita 的增长大多数发生在同一组稳定边界之内：

```text
route 负责路由与组合
feature 负责产品功能
server getter 负责服务端读取
Payload collection 负责内容 schema 与权限
PostgreSQL 负责持久化
mapper 负责 CMS document -> UI model
Docker/Coolify 负责运行
R2 负责异地对象
```

当前真正让你觉得“半懂不懂”的主要原因，不是代码层次太多，而是：

1. Payload 一个 Collection 同时影响后台表单、API、generated types、PostgreSQL schema 和 migration；
2. 本地开发、生产部署、备份恢复是三条不同生命周期；
3. `docs/` 保存了几乎完整的成长史，历史计划和当前事实同时存在；
4. development fallback、seed、fixture 三种“假数据”角色还没有完全分开；
5. 一些事故防护已经扩散到很多命令，让执行路径看上去比业务架构更复杂；
6. 你之前主要从“某个问题对应某个文件”的角度理解项目，还没有从“一个请求从头到尾经过哪些边界”的角度理解。

**整体评价：**

| 维度 | 评价 |
| --- | ---: |
| 产品与技术匹配 | 9.2 / 10 |
| 主架构一致性 | 9.0 / 10 |
| 代码边界清晰度 | 8.8 / 10 |
| 数据事实源清晰度 | 7.5 / 10 |
| 本地/生产可复现性 | 9.0 / 10 |
| 测试可信度 | 7.5 / 10 |
| 恢复准备度 | 8.0 / 10 |
| 文档可进入性 | 6.5 / 10 |
| 单人长期维护适配度 | 9.1 / 10 |
| 综合 | **8.5 / 10** |

这里最重要的判断是：

> **Kita 不需要重写，也不需要换栈。下一阶段应该做边界收缩、事实源收敛和产品内容，而不是继续扩建工程底座。**

---

## 1. 审查范围、证据与限制

本报告阅读了当前 `main` 上的主要运行代码、基础设施代码、测试和项目文档，重点包括：

```text
package.json
payload.config.ts
next.config.ts
tsconfig.json
eslint.config.mjs
vitest.config.ts

src/app/(site)
src/app/(payload)
src/app/api/dev
src/features
src/server
src/payload
src/config
src/migrations
src/testing

.devcontainer/devcontainer.json
Dockerfile
compose.yaml
compose.dev.yaml
docker-entrypoint.sh
docker/postgres-backup
.github/workflows/ci.yml

docs/current-project-status.md
docs/project-structure.md
docs/CODEX_HANDOFF.md
docs/development-production-alignment.md
docs/kita-technical-decisions-and-tradeoffs-2026-07-16.md
docs/kita-architecture-portability-review-2026-07-15.md
docs/kita-code-review-2026-07-09.md
docs/kita-disaster-recovery-inventory-and-rebuild-runbook-2026-07-16.md
docs/payload-media-and-content-capabilities-evaluation-2026-07-21.md
docs/openlist-kita-project-boundary-evaluation-2026-07-13.md
docs/postgres-r2-backup-workflow.md
以及一批早期计划和实施记录
```

同时还回看了 PR #1 到 PR #19 的演进顺序，以判断一项复杂度是：

- 预先设计出来的；
- 某个真实故障留下的；
- 某次功能迁移的临时兼容层；
- 还是已经完成使命但尚未删除的历史结构。

需要明确的限制：

1. 本报告是基于当前 GitHub `main` 的静态代码与文档审阅；
2. 没有连接你的生产 PostgreSQL、Coolify、R2、OpenList 或真实 secret；
3. 没有在本地重新执行 `pnpm test`、`pnpm check`、`pnpm build`；
4. 文档中所称的生产 smoke、47 个 Vitest、4 个 shell 场景、R2 对象和恢复演练状态，是仓库已有验证记录，不是本报告重新独立执行的结果；
5. 因此，报告可以高置信度判断架构和代码边界，但不能把仓库中的历史运行记录重新认证为今天此刻的生产状态。

这种边界非常重要：**代码审查能证明“系统被怎样设计”，运行验证才能证明“此刻环境仍按设计工作”。**

---

## 2. 为什么你会觉得自己只懂一半

### 2.1 你看到的是文件，系统运行的是链路

平时改代码时，你接触的通常是一个局部：

```text
改 Games 页面
改 Payload Collection
改 migration
改 Compose
修 .next ownership
加 R2
```

每个任务都能完成，但这些任务在脑中没有自动连成一张图。

真正的系统不是一堆文件，而是几条链路：

```text
公开读取链
后台写入链
schema 演进链
构建部署链
媒体存储链
备份恢复链
本地开发链
外部资源跳转链
```

只要把这些链路分开理解，Kita 会立刻简单很多。

---

### 2.2 Payload 不是单一职责库，而是一个内容平台

普通库通常只做一件事：

```text
Zod -> 校验
Vitest -> 测试
Tailwind -> 样式
PostgreSQL -> 存储
```

Payload 不一样。一个 Collection Config 同时定义：

- Admin 后台里出现什么表单；
- 文档有哪些字段；
- 谁可以读写；
- Local API/REST/GraphQL 暴露什么；
- generated TypeScript type 是什么；
- PostgreSQL 目标 schema 是什么；
- migration generator 要比较什么；
- relationship 如何展开；
- upload collection 如何生成尺寸和文件元数据。

所以你修改 `src/payload/collections/games.ts` 的一个字段时，看起来只改了一份 TypeScript，实际上是在改变多条系统契约。

这不是 Kita 设计错了，而是 Payload 本身就是一个高层内容平台。理解 Kita 的关键，是把 Payload 看成：

> **后台 + 内容 schema + 权限 + API + 数据库适配层的统一边界。**

---

### 2.3 文档把成长过程完整保留下来了

Kita 的代码主链并不大，但 `docs/` 中同时存在：

- 当前状态入口；
- 开发交接；
- 目录说明；
- 技术决策；
- 灾难恢复；
- 某次修复方案；
- 某次性能调查；
- 某次迁移计划；
- 已经完成的旧路线图；
- 当时尚未实施、后来已经实施的评估。

这让你从文档入口看项目时，容易产生一种错觉：

> “是不是每一份文档都代表一个仍然活跃的系统层？”

实际上不是。很多文档只是 Git commit 之外的“解释性历史”。

代码当前主干可以概括为十几个稳定位置；文档却保存了几十个历史阶段。**理解成本主要来自时间维度，而不是空间维度。**

---

### 2.4 本地和生产故意不完全一样

本地与生产共享：

- 同一个代码仓库；
- 同一个 PostgreSQL 主版本；
- 同一组 Collection；
- 同一组 migration；
- 同一组环境变量名称；
- 同一个 Docker/Compose 结构基础；
- 同一套质量检查。

但它们故意不共享：

- 数据；
- secret；
- 数据库 Volume；
- 媒体存储位置；
- 数据库连接 host；
- seed 开关；
- 备份任务是否启用。

因此，“本地和生产对齐”不是复制所有值，而是：

> **结构相同，责任相同，秘密和状态独立。**

如果误以为环境一致性等于“本地完全模拟生产每个细节”，就会觉得当前配置充满例外。实际上这些例外多数是正确边界。

---

### 2.5 运维问题留下了比业务问题更多的文档

业务代码很直接：

```text
getGames
mapGameDocumentToGameDetail
GamesPage
```

而 Windows、Docker Desktop、Dev Container、Docker-in-Docker、bind mount、Linux UID、`.next` ownership、Coolify、R2、PostgreSQL Volume、备份恢复这些问题，每一个都可能造成数据或环境损坏，所以文档写得很细。

结果是：

- 业务代码只有少量层次；
- 运维说明却非常长；
- 新读者会误以为业务架构也同样复杂。

需要把两者分开：

```text
业务复杂度：低到中
视觉实现复杂度：局部较高
运行环境复杂度：中
恢复责任复杂度：中到高
组织架构复杂度：低
```

---

### 2.6 你自然做对了很多事，却没有给它们命名

例如你已经有：

- 模块化单体；
- feature-first；
- application boundary；
- DTO/view model；
- anti-corruption mapping；
- fail-fast production；
- compatibility migration；
- two-phase data migration；
- sidecar backup；
- loose coupling；
- infrastructure as code；
- reproducible development environment。

但你不是先学习这些名词再照做，而是为了解决具体问题自然走到了这些形状。

这是一件好事。报告后面的任务，是给已经存在的结构命名，而不是重新给它套一层理论。

---

## 3. Kita 到底是什么项目

### 3.1 产品身份

Kita 不是传统博客模板，也不只是简历页。

它更像一个私人策展空间：

```text
Home
  负责第一印象、气氛和视觉身份

About
  负责解释站点与作者

Tools
  负责整理视觉小说相关工具与资源

Reviews
  负责较长的个人评论与阅读体验

Games
  负责作品封面、档案、状态、正文和外部资源入口

Payload Admin
  负责你自己的内容生产与维护

OpenList
  负责外部文件浏览与资源目录
```

它的核心价值不是用户注册、支付、实时协作或海量并发，而是：

- 视觉体验；
- 可持续录入内容；
- 数据由自己掌控；
- 站点可以长期维护；
- 重要内容可以备份和恢复；
- 每个功能可以按兴趣逐步增长。

---

### 3.2 技术身份

从技术上，Kita 是一个：

```text
单仓库
单主要 Web 进程
单 PostgreSQL 数据库
单管理后台
单人维护
容器化部署
内容驱动
带对象存储和备份
的模块化单体
```

“单体”不等于乱。

模块化单体的意思是：

- 最终作为一个主要应用一起构建和部署；
- 内部仍然有明确模块；
- 模块之间通过函数、类型和数据模型协作；
- 不需要通过网络把每个功能拆成独立服务。

Kita 的主要模块是：

```text
Home
About
Tools
Reviews
Games
Payload/CMS
Media
Infrastructure
Recovery
```

---

### 3.3 明确的非目标

当前 Kita 不需要成为：

- 多租户 SaaS；
- 面向公众的用户系统；
- 社交网络；
- 实时聊天室；
- 微服务平台；
- 通用 CMS 产品；
- 文件存储后端；
- 视频转码平台；
- 搜索引擎；
- 大型设计系统；
- 企业工作流系统；
- 数据分析平台；
- 多团队共享 monorepo。

这些非目标决定了很多“没有引入”的技术是正确缺席，而不是能力不足。

---

## 4. 一句话架构与系统全景

### 4.1 一句话版本

> **Next.js 负责路由和页面，Payload 负责内容后台、权限和数据访问，PostgreSQL 保存内容，R2 保存媒体和数据库异地备份，Docker/Coolify 负责运行，OpenList 通过公开 URL 提供独立文件体验。**

---

### 4.2 系统上下文图

{% mermaid %}
flowchart LR
  Visitor["访客浏览器"]
  Admin["站点管理员"]
  CF["Cloudflare / DNS / HTTPS"]
  Web["Kita Web\nNext.js + Payload"]
  DB["PostgreSQL 16"]
  Media["Cloudflare R2\nMedia Bucket"]
  Backup["Cloudflare R2\nPostgreSQL Backup Bucket"]
  OpenList["OpenList 独立应用"]
  GitHub["GitHub Repository"]
  Coolify["Coolify / VPS"]

  Visitor --> CF
  Admin --> CF
  CF --> Web

  Admin -->|"Payload Admin"| Web
  Web -->|"Payload Local API / DB Adapter"| DB
  Web -->|"图片上传"| Media
  Visitor -->|"公开图片 URL"| Media
  Visitor -->|"Games archive link"| OpenList

  GitHub --> Coolify
  Coolify --> Web
  Coolify --> DB
  DB -->|"pg_dump sidecar"| Backup
{% endmermaid %}

---

### 4.3 最重要的边界

Kita 中有五条非常关键的“不要跨过去”的边界：

#### 边界一：浏览器不接触 PostgreSQL

```text
Browser
  X PostgreSQL
```

浏览器只访问 Next.js 页面、Payload REST/GraphQL（若保留）和公开媒体 URL。

#### 边界二：页面组件不理解 Payload document

```text
Payload document
  -> mapper
  -> GameDetail / Review model / ToolkitItem
  -> UI
```

UI 应该看到页面模型，不应该知道 relationship 可能是 ID 或展开对象。

#### 边界三：生产媒体不依赖 Web 容器文件系统

```text
开发：.payload-media
生产：Cloudflare R2
```

因为 Web 容器可能重建，容器本地文件不是可靠持久化。

#### 边界四：OpenList 不属于 Kita 的启动依赖

```text
Kita 页面可以正常渲染
  即使 OpenList 暂时不可用
```

两者只通过一个普通 HTTPS URL 相连。

#### 边界五：代码恢复与数据恢复是两件事

```text
GitHub -> 恢复代码
R2 dump -> 恢复 PostgreSQL 内容
R2 Media -> 恢复图片对象
Bitwarden / recovery materials -> 恢复 secret 与平台控制权
```

只恢复 GitHub 不能恢复完整产品。

---

## 5. Kita 是怎样自然长成现在这样的

理解自然增长史，比死记目录更重要。每一层复杂度都对应一个真实问题。

### 5.1 第一阶段：工程地基

项目一开始确定了：

```text
Next.js App Router
TypeScript
Tailwind
ESLint
Prettier
typedRoutes
Dev Container
Docker
feature-oriented structure
```

而且第一天就预留了：

```text
src/app
src/features
src/server
src/shared
src/config
src/testing
```

这说明当前目录不是后期重构硬套上的，而是从一开始就明确：

- `app` 只做框架入口；
- `features` 放产品功能；
- `server` 放服务端能力；
- `shared` 只在真正复用后使用；
- 数据库和 Payload 不直接进入 UI。

---

### 5.2 第二阶段：第一条真实内容闭环

Tools 是最早跑通的完整闭环：

```text
Payload Admin 创建 Tool
  -> Payload Collection 校验
  -> PostgreSQL 保存
  -> /tools route
  -> getTools()
  -> Payload Local API
  -> mapper
  -> ToolkitItem
  -> ToolsPage
```

这一步把项目从“静态视觉页面”变成了真正的内容网站。

---

### 5.3 第三阶段：Reviews 与 Games 成为独立 feature

随后增加 Reviews 和 Games：

- 各自有 Collection；
- 各自有发布状态；
- 各自有 getter；
- 各自有 mapper；
- 各自有列表和详情页；
- Rich Text 存在 PostgreSQL JSONB 中；
- 公开访客只能看到 published；
- 后台登录用户可以看到草稿。

这时 feature-first 结构开始真正发挥作用：新功能不是继续堆到首页，而是拥有自己的垂直目录。

---

### 5.4 第四阶段：本地与生产对齐

项目开始真实部署后，必须解决：

- PostgreSQL 何时 ready；
- 本地为什么需要暴露 5432；
- 生产为什么不应暴露 5432；
- Buildtime 和 Runtime secret 如何分开；
- production migration 如何执行；
- Docker image 如何包含 Payload migration CLI 所需文件；
- 本地和生产为什么不能共享密码；
- 空数据库和数据库错误在生产中应该怎样表现。

于是形成：

```text
compose.yaml
  -> 生产/基础定义

compose.dev.yaml
  -> 只添加本地端口暴露

docker-entrypoint.sh
  -> migration 后再启动 Next

.env.example
  -> 变量结构说明

src/config/env.ts
  -> 应用环境校验
```

---

### 5.5 第五阶段：测试、CI 与受保护的 main

当项目有真实数据和部署后，“我本机能跑”不再足够，于是增加：

- Vitest；
- getter mock tests；
- mapper pure tests；
- env semantics tests；
- seed behavior tests；
- access helper tests；
- backup shell failure-path tests；
- GitHub Actions；
- main Ruleset；
- PR 合并流程。

这一步让项目从个人脚本变成一个有自动质量门禁的长期仓库。

---

### 5.6 第六阶段：Windows / Dev Container 性能与权限事故

Windows bind mount、Docker Desktop、Dev Container 和 `.next` 高频小文件操作带来了：

- 冷编译慢；
- root 与 node 用户写入混杂；
- `.next` ownership 异常；
- dev/build 同时写缓存；
- 自动化工具可能以 root 进入容器。

于是增加：

```text
node_modules named volume
.next named volume
remoteUser: node
workspace user guard
.next ownership check
dev/build conflict check
```

这些不是业务架构，而是环境事故的防护层。

---

### 5.7 第七阶段：数据库备份与灾难恢复

内容开始有价值后，项目不能再只依赖一个 VPS Volume。

于是增加：

```text
backup sidecar
  -> pg_dump custom format
  -> pg_restore --list 验证
  -> rclone 上传 R2
  -> 清理临时文件
  -> 失败重试

recovery inventory
  -> GitHub
  -> Bitwarden
  -> R2
  -> 离线材料
  -> Coolify / Cloudflare / VPS / OpenList 资产清单
```

关键变化是：项目开始承担“丢失后怎么回来”的责任。

---

### 5.8 第八阶段：OpenList 作为产品邻居，而不是内部模块

Games 需要提供外部文件入口。

最容易过度设计的方案是：

- 把 OpenList 放进 Kita Compose；
- 共享数据库；
- 让 Kita 调 OpenList API；
- 写一套自己的文件浏览 UI；
- 建立内部 token、CORS、同步任务。

Kita 最终选择了更小的契约：

```text
Games.links[].href
  -> https://archive.../specific-folder
```

这使 OpenList 成为同一产品体系中的独立应用，而不是 Kita 内核的一部分。

---

### 5.9 第九阶段：Media/R2 两阶段迁移

Games 封面最初经历了：

```text
固定 coverKey enum
  -> 显式静态路径、alt、宽高
  -> 新增可空 Media relationship + 旧字段 fallback
  -> 生产内容手工关联 Media
  -> 验证 R2 / 页面 / Redeploy
  -> cover 变必填
  -> 删除四个旧字段
```

这是整个项目中最成熟的一次数据演进：

- 没有第一次上线就破坏旧数据；
- 新旧路径短期共存；
- 先迁移内容，再收紧 schema；
- 删除字段前有数据库 guard；
- down migration 可以重建旧代码需要的字段；
- UI 的 `GameDetail.cover` 契约没有变化。

这段历史证明，Kita 的自然增长并不等于粗暴打补丁；它已经形成了一套谨慎迁移习惯。

---

## 6. 生产运行拓扑

### 6.1 Kita Compose 内部

当前生产核心可以看成三个 service：

{% mermaid %}
flowchart TB
  Proxy["Coolify Proxy / HTTPS"]
  Web["web\nNext.js standalone + Payload"]
  Postgres["postgres\nPostgreSQL 16"]
  Volume["postgres-data\nDocker named volume"]
  Backup["backup\npg_dump + rclone"]
  R2Backup["Cloudflare R2\nprivate backup bucket"]
  R2Media["Cloudflare R2\npublic media bucket"]

  Proxy --> Web
  Web --> Postgres
  Postgres --> Volume
  Backup --> Postgres
  Backup --> R2Backup
  Web --> R2Media
{% endmermaid %}

#### `web`

负责：

- Next.js 页面；
- React Server Components；
- Client Components；
- Payload Admin；
- Payload REST；
- Payload GraphQL（当前仍存在）；
- Payload Local API；
- migration CLI；
- Sharp 图片处理；
- 连接 PostgreSQL；
- 连接 R2 Media。

#### `postgres`

负责：

- 内容文档；
- Payload 用户与 session；
- Tools/Reviews/Games；
- Media metadata；
- relationship；
- Rich Text JSON；
- Payload 内部表；
- migration history。

#### `backup`

负责：

- 等待 PostgreSQL；
- 创建 custom-format dump；
- 用 `pg_restore --list` 验证 archive；
- 上传到私有 R2；
- 清理临时文件；
- 成功后等待下一周期；
- 失败后按 retry interval 重试。

它不负责：

- 直接复制 PostgreSQL Volume；
- 修改数据库；
- 恢复数据库；
- 管理 R2 生命周期；
- 判断备份是否太旧并发报警。

---

### 6.2 OpenList 不在这个 Compose 里

OpenList 是独立 Coolify Application：

```text
Coolify Project: Kita
  |
  +-- Kita Compose Application
  |     web
  |     postgres
  |     backup
  |
  +-- OpenList Application
        official image
        independent data volume
        independent config
        independent storage credentials
```

“同一个 Coolify Project”只是管理分组，不代表运行耦合。

---

### 6.3 生产请求路径

公开页面请求：

```text
Browser
  -> Cloudflare / DNS / HTTPS
  -> Coolify proxy
  -> web container
  -> Next.js route
  -> getter
  -> Payload Local API
  -> PostgreSQL
  -> mapper
  -> React render
  -> HTML response
```

图片请求：

```text
Browser
  -> media custom domain
  -> Cloudflare R2
```

下载目录请求：

```text
Browser
  -> archive custom domain
  -> OpenList Application
```

这里有一个重要区别：

> Kita 服务器不会为了渲染 Games 页面去调用 OpenList；只有用户点击链接后，浏览器才访问 OpenList。

因此 OpenList 故障不会阻止 Kita 的页面读取 PostgreSQL 和渲染。

---

## 7. 本地开发拓扑

### 7.1 物理与容器层次

{% mermaid %}
flowchart TB
  Windows["Windows 文件系统\nC:\\dev\\Kita"]
  DockerDesktop["Docker Desktop / WSL2"]
  Dev["VS Code Dev Container\nNode 22 + pnpm + Next + Payload"]
  Dind["Docker-in-Docker daemon"]
  LocalPG["PostgreSQL 16 container"]
  PGVolume["postgres-data volume"]
  NodeModules["node_modules named volume"]
  NextCache[".next named volume"]

  Windows -->|"bind mount source"| Dev
  DockerDesktop --> Dev
  Dev --> Dind
  Dind --> LocalPG
  LocalPG --> PGVolume
  Dev --> NodeModules
  Dev --> NextCache
{% endmermaid %}

---

### 7.2 为什么有 Docker-in-Docker

Dev Container 本身是一个容器。

你又希望在这个开发环境中运行：

```bash
docker compose ...
```

并让 PostgreSQL 生命周期由仓库命令管理。

因此 Dev Container 内部有自己的 Docker daemon，PostgreSQL 运行在这个内层 daemon 中。

优点：

- 宿主机不安装 PostgreSQL；
- 项目命令在一致的 Linux 环境中执行；
- Compose 版本和行为更统一；
- 数据库 Volume 与项目开发环境绑定；
- 自动化工具可以在容器内完成完整开发流程。

代价：

- 容器层级更难理解；
- `docker ps` 在宿主和 Dev Container 内可能看到不同世界；
- 端口路径是“内层 PostgreSQL -> Dev Container localhost”；
- 用户与文件 ownership 更容易产生问题；
- 排查时必须先确认自己在哪一层。

---

### 7.3 为什么源码仍是 bind mount

源码位于 Windows：

```text
C:\dev\Kita
```

并映射到：

```text
/workspaces/Kita
```

这样：

- Git 工作区是真实本地文件；
- VS Code 可以正常编辑；
- 项目不被锁在一个匿名 Docker Volume 中；
- 换工具或退出 Dev Container 后源码仍可直接访问。

但 Windows 到 Linux 的 bind mount 对大量小文件不友好，所以只把两个高频目录移动到 named volume：

```text
node_modules
.next
```

这是一项有实测依据的局部例外，不是“所有目录都应该放 Volume”。

---

### 7.4 `pnpm dev` 的真实行为

当前 `pnpm dev` 不是单纯执行 `next dev`。

它大致是：

```text
workspace guard
  -> 检查当前不是 root
  -> 检查 .next ownership
  -> 检查没有冲突的 next build
  -> pnpm dev:services
       -> docker compose base + dev override
       -> 启动并等待 postgres healthy
  -> next dev
```

因此 `pnpm dev` 是一个开发编排入口。

---

### 7.5 本地与生产差异矩阵

| 维度 | 本地开发 | 生产 |
| --- | --- | --- |
| Next 运行 | `next dev` | standalone `node server.js` |
| PostgreSQL host | `localhost` | `postgres` |
| PostgreSQL 数据 | 本地 Volume，可重建 | 生产 Volume，关键资产 |
| Media | `.payload-media` | Cloudflare R2 |
| R2 Media credentials | 不需要 | 必须 |
| seed | 临时可开启 | 必须关闭 |
| backup | 默认关闭 | 显式开启 |
| schema 开发 | Payload development push | migration |
| secret | 本地独立 | 生产独立且稳定 |
| 端口 5432 | 通过 dev override 暴露给 Dev Container | 不发布到宿主机 |
| 错误 fallback | 当前允许静态数据 | fail-fast / 空结果 |
| 构建校验 | 可运行 `pnpm build` | 镜像构建时执行 |
| 数据恢复责任 | 低 | 高 |

这张表是理解 Kita 环境配置的核心。

---

## 8. 代码目录与职责地图

### 8.1 顶层

```text
.github/
  GitHub Actions

.devcontainer/
  开发容器定义

docker/
  项目专用容器辅助代码
  当前是 PostgreSQL backup image

docs/
  当前事实、技术决策、历史实施记录、恢复手册

public/
  仍由 Git 管理的静态视觉资源

scripts/
  workspace / .next / process guard

src/
  应用代码

Dockerfile
  生产 Web image

compose.yaml
  生产/基础服务定义

compose.dev.yaml
  本地开发 override

docker-entrypoint.sh
  生产 migration + start

payload.config.ts
  Payload 总配置

next.config.ts
  Next 总配置

package.json
  所有开发入口与依赖
```

---

### 8.2 `src/app`

职责：

- route；
- layout；
- metadata；
- route handler；
- Payload route group；
- `loading/error/not-found` 等 Next 边界；
- 组装 getter 和 feature component。

当前前台 route 的理想形状已经实现：

```tsx
export default async function GamesPage() {
  const games = await getGames();
  return <GamesFeaturePage games={games} />;
}
```

它不应该负责：

- 编写 Payload 查询；
- 处理 relationship；
- 把 CMS document 转成页面模型；
- 定义数据库 schema；
- 放几百行页面实现；
- 直接读取 `process.env`。

---

### 8.3 `src/features`

按产品功能分组：

```text
features/
  home/
  about/
  tools/
  reviews/
  games/
```

每个 feature 可以拥有：

```text
components/
data/
types/
utils/
hooks/
lib/
__tests__/
```

这里放：

- feature UI；
- feature view model；
- mapper；
- 纯函数；
- 局部 hooks；
- development fallback；
- 与实现相邻的测试。

`features` 的意义不是目录整齐，而是让一个功能的改变尽量停留在自己内部。

---

### 8.4 `src/server`

当前按资源分组：

```text
server/
  payload/
  tools/
  reviews/
  games/
```

职责：

- 初始化 Payload；
- 调用 Local API；
- 写 where/sort/limit/depth；
- 指定 access 语义；
- 处理 production/development 错误策略；
- 调用 mapper；
- 编排 seed。

它相当于页面与 CMS 之间的应用服务边界，但非常轻，不是传统企业 service layer。

---

### 8.5 `src/payload`

```text
payload/
  access/
  collections/
  payload-types.ts
```

职责：

- Collection schema；
- Admin UI 配置；
- access control；
- upload 配置；
- generated types。

注意：

```text
payload-types.ts
```

是生成产物，不是手写领域模型。

它表达的是 Payload 文档形状，不等于页面最终需要的形状。

---

### 8.6 `src/migrations`

职责：

- 记录生产数据库 schema 的演进历史；
- 承载数据搬迁与 guard；
- 让旧数据库升级到当前 Collection 所要求的形状；
- 在必要时提供受限的 down 路径。

migration 不是“当前 schema 的另一个手写副本”。

当前 schema 的目标状态来自 Collection；migration 记录如何从过去走到现在。

---

### 8.7 `src/config`

当前主要有：

```text
env.ts
media-storage.ts
```

职责：

- 把自由字符串环境变量变成受控配置；
- 明确 server/client 变量；
- 把 R2 配置组合成 discriminated union；
- 生产中拒绝本地媒体；
- 统一构建公共媒体 URL。

这是一个很好的显式边界：业务代码不应该在任意位置解释环境变量。

---

### 8.8 `src/testing`

只放跨多个测试共享的 fixture。

测试与实现相邻，而不是把所有测试塞进一个全局目录，这与 feature-first 一致。

---

### 8.9 `src/shared`

当前保持精简是正确的。

`shared` 不应该成为：

```text
不知道放哪
  -> 全扔 shared
```

只有已经被多个 feature 稳定复用的东西，才应该移入这里。



## 9. 依赖方向：谁可以依赖谁

Kita 当前最值得保留的结构，不是目录名字，而是依赖方向。

### 9.1 当前主方向

{% mermaid %}
flowchart LR
  App["src/app"]
  Server["src/server"]
  Feature["src/features"]
  Payload["src/payload"]
  Config["src/config"]
  Migrations["src/migrations"]

  App --> Server
  App --> Feature
  Server --> Payload
  Server --> Feature
  Server --> Config
  Feature --> Payload
  Payload --> Config
  Migrations -. schema history .-> Payload
{% endmermaid %}

这里需要解释几个看起来“不够纯”的地方。

#### `server -> feature`

`getGames()` 会依赖：

- `GameDetail`；
- `mapGameDocumentToGameDetail`；
- development fallback。

这意味着 server 层知道 feature 的页面模型。

对当前单人、中小规模项目，这是合理的。因为 getter 的目的就是为这个 feature 提供数据，不需要为了“纯架构”再制造：

```text
server DTO
application DTO
domain DTO
view DTO
```

未来某个 feature 很大时，可以把它的 server query 移入：

```text
features/games/server/
```

但现在搬迁不会增加实际清晰度。

#### `feature -> payload generated type`

mapper 会 import：

```text
Game
Review
Tool
```

这些 generated type 用于描述输入。

只要 Payload type 不直接扩散进组件 props，这个依赖是可控的。

---

### 9.2 应该避免的方向

```text
Payload Collection
  X import feature component

React Client Component
  X import getPayloadClient

UI component
  X import process.env

migration
  X import current feature fallback

backup shell
  X import application business logic

OpenList
  X become internal server dependency
```

---

### 9.3 当前没有出现的坏味道

代码中没有看到：

- 全局巨型 `services/`；
- 全局巨型 `components/`；
- repository interface 套娃；
- 每个函数一个 class；
- controller/service/repository 三层复制；
- 独立 Express/Nest 后端；
- Prisma 与 Payload 双 schema；
- 循环依赖驱动的重构压力；
- monorepo package 之间的版本管理；
- 业务代码直接操作 Docker；
- React 组件里直接写 SQL。

这说明当前架构复杂度被控制住了。

---

## 10. 项目的事实源地图

“事实源”是理解 Kita 最重要的概念之一。

事实源指：

> 某类信息最终以哪里为准；其他地方只是派生、缓存、备份、模板或历史记录。

### 10.1 源码事实源

```text
GitHub main
```

负责：

- 应用源码；
- Collection；
- migration；
- Dockerfile；
- Compose；
- CI；
- 无 secret 文档；
- `.env.example`；
- backup 脚本。

本地未提交工作在提交前不属于远程事实源，因此本地磁盘损坏仍可能丢失。

---

### 10.2 当前内容事实源

生产内容：

```text
PostgreSQL
```

负责：

- Tools；
- Reviews；
- Games；
- Users；
- Media metadata；
- relationship；
- Rich Text；
- timestamps；
- Payload 内部状态。

生产页面不应把静态 fallback 当事实源。

---

### 10.3 媒体事实源

生产图片对象：

```text
Cloudflare R2 Media Bucket
```

PostgreSQL 只保存：

- URL；
- filename；
- MIME；
- width/height；
- generated sizes；
- relationship；
- alt；
- 其他 metadata。

图片字节本身在 R2。

这意味着完整恢复 Games 图片需要：

```text
PostgreSQL dump + R2 Media objects
```

只有其中一边不够。

---

### 10.4 开发媒体事实源

本地开发：

```text
.payload-media/
```

这是可重建开发状态，不进入 Git。

开发 seed 又会从 `public/games/covers/...` 读取一张 Git 管理的图片，创建本地 Media document。这说明当前还存在：

```text
public seed source image
  -> local Payload Media
```

它是 seed 输入，不是生产 Media 事实源。

---

### 10.5 数据库备份事实源

异地备份：

```text
private R2 backup bucket
```

注意，backup object 不是在线内容事实源；它是恢复材料。

```text
在线事实源：PostgreSQL Volume
恢复副本：R2 dump
```

---

### 10.6 生产配置事实源

当前生产配置主要在：

```text
Coolify Application configuration
Coolify environment variables
Cloudflare DNS/R2 configuration
VPS state
```

仓库只保存变量键名和结构，不保存真实值。

---

### 10.7 secret 事实源

真实 secret 应在：

```text
Bitwarden / 等价密码管理器
```

而不是：

- GitHub；
- Markdown；
- 截图；
- AI 对话；
- public R2；
- Dockerfile；
- `.env.example`。

---

### 10.8 OpenList 事实源

OpenList 自己的状态：

```text
OpenList data Volume
OpenList config
OpenList storage provider
OpenList credentials
```

Kita 只保存公开 URL。

---

### 10.9 文档事实源

这是目前最模糊的一层。

当前文档试图通过以下文件建立权威顺序：

```text
CODEX_HANDOFF.md
current-project-status.md
project-structure.md
development-production-alignment.md
recovery runbook
```

但它们彼此仍有重复信息，而且状态、提交号、测试数量会变。

因此当前“文档事实源”并不是一份文件，而是一组文件。这正是理解成本的重要来源。

---

## 11. 一次公开页面读取到底发生了什么

以 `/games` 为例。

### 11.1 路由入口

```text
src/app/(site)/games/page.tsx
```

做三件事：

1. 声明动态渲染；
2. 调用 `getGames()`；
3. 把结果传给 `GamesPage`。

它不理解数据库或 Payload。

---

### 11.2 getter

```text
src/server/games/get-games.ts
```

执行：

```ts
payload.find({
  collection: "games",
  depth: 1,
  limit: 100,
  overrideAccess: false,
  sort: "title",
  where: {
    publicationStatus: {
      equals: "published",
    },
  },
});
```

每个选项都有明确含义。

#### `collection: "games"`

查询 Games Collection。

#### `depth: 1`

Games 的 `cover` 是 upload relationship。

`depth: 0` 时，可能只得到：

```ts
cover: 42
```

`depth: 1` 时，得到展开后的 Media document：

```ts
cover: {
  id: 42,
  alt: "...",
  url: "...",
  width: ...,
  sizes: {
    display: ...
  }
}
```

mapper 需要展开对象，因此 depth 1 是业务契约的一部分。

#### `limit: 100`

当前内容量很小，100 足够。

但它仍然是一个隐式产品限制：超过 100 条后，页面不会展示全部结果，而且当前没有分页 UI。

#### `overrideAccess: false`

Payload Local API 默认会跳过 access control。

这里显式设为 false，意味着查询要尊重 Games Collection 的 `read` 规则。

这是一个非常重要的安全与语义选择。

#### `where publicationStatus = published`

Collection access 已经会对匿名请求过滤 published，getter 又显式写了一次。

这属于防御性重复：

- access rule 表达“匿名用户最多能读什么”；
- getter 表达“这个页面主动只要 published”。

两者方向一致，不是严重问题。

#### `sort: "title"`

排序交给数据库。

---

### 11.3 Payload Local API

`getPayloadClient()` 很薄：

```text
载入 payload.config
  -> getPayload({ config })
```

Local API 的关键特点：

- 在同一个 Node 进程内调用；
- 不通过 HTTP；
- 不需要序列化成 REST 请求；
- 自动使用 generated types；
- 仍然经过 Payload 的数据库 adapter、hooks、field processing；
- access 是否执行取决于 `overrideAccess`。

因此它不是“直接 SQL”，也不是“远程 API”。

---

### 11.4 PostgreSQL 查询

Payload 的 Postgres adapter 根据 Collection schema 和查询参数读取：

- `games`；
- `games_tags`；
- `games_links`；
- `media` relationship；
- 可能的 Payload 内部关系结构。

页面代码不需要知道这些表名。

---

### 11.5 mapper

```text
mapGameDocumentToGameDetail
```

它把 Payload document 转成 UI model。

最重要的是 `cover`：

```text
优先 Media.sizes.display
  -> 有 URL、宽、高
否则 Media original
  -> 有 URL、宽、高
否则
  -> throw
```

这一步完成两种隔离：

#### 隔离一：relationship 形态

Payload type 允许：

```ts
cover: number | Media
```

UI 只允许：

```ts
cover: {
  src: string;
  alt: string;
  width: number;
  height: number;
}
```

#### 隔离二：存储实现

UI 不知道图片来自：

- `.payload-media`；
- R2；
- custom domain；
- original；
- display WebP。

UI 只知道一个可用图片模型。

---

### 11.6 feature component

`GamesPage` 和 `GamesGallery` 接收 `GameDetail[]`。

它们：

- 不调用 Payload；
- 不检查 production；
- 不解释 Media；
- 不读取 env；
- 不处理数据库错误；
- 只负责视觉表达和交互。

这是清晰边界的直接证据。

---

### 11.7 development 与 production 的分支

当前 getter 还有一层：

```text
Payload 有数据
  -> 返回真实数据

Payload 返回空
  -> production: []
  -> development: 静态 fallback

Payload 抛错
  -> production: 记录并重新抛出
  -> development: warning + 静态 fallback
```

生产语义是正确的：

- 空数据就是空；
- 数据库错误就是错误；
- 不用 demo 数据伪装成功。

开发语义曾经很方便，但现在是主要边界问题之一，后文单独分析。

---

### 11.8 Reviews 和 Tools 读取链

Reviews：

```text
/reviews
  -> getReviews()
  -> Payload reviews
  -> published
  -> -publishedAt
  -> mapper
  -> ReviewPreview
  -> ReviewsPage
```

Tools：

```text
/tools
  -> getTools()
  -> Payload tools
  -> sortOrder
  -> mapper
  -> ToolkitItem
  -> ToolsPage
```

它们都遵循同一模板，这证明项目已经形成稳定模式，而不是每个页面各写一套。

---

## 12. 一次后台写入到底发生了什么

以在 Payload Admin 中新建 Game 为例。

### 12.1 登录

```text
/admin
  -> Users auth Collection
  -> Payload authentication
  -> session/token
```

Users Collection 当前非常小：

```ts
{
  slug: "users",
  auth: true,
  fields: []
}
```

它只服务后台身份，不是公开用户系统。

---

### 12.2 Admin 表单来自 Collection Config

Games Collection 的字段定义会变成 Admin 表单：

```text
title
slug
originalTitle
developer
releaseDate
playStatus
publicationStatus
summary
body
cover
tags
links
```

字段的：

- required；
- select options；
- unique；
- index；
- rich-text features；
- relationship；
- admin description；

都会影响后台编辑体验。

---

### 12.3 access control

Games `read`：

```text
有 req.user
  -> true

无用户
  -> publicationStatus == published
```

写权限当前没有显式列出，因此依赖 Payload 默认的认证保护语义。

行为当前并不是匿名可写，但意图不够显式；后文建议把 create/update/delete 写出来。

---

### 12.4 Payload 处理字段

当你保存：

- 校验 required；
- 校验 select value；
- 处理 Rich Text JSON；
- 处理 array child rows；
- 检查 relationship；
- 运行 Collection/field hooks（当前较少）；
- 通过 DB adapter 写入 PostgreSQL；
- 返回完整 document。

---

### 12.5 图片写入是双存储操作

创建 Media 时会发生：

```text
Media document metadata
  -> PostgreSQL

Original image + generated variants
  -> local .payload-media 或 R2
```

生产 S3 adapter 还会：

- 上传 original；
- 上传 thumbnail；
- 上传 display；
- 生成 public custom-domain URL；
- 把 URL/filename/size 等字段写入 Media document。

因此 Media 创建不是单一数据库 insert。

---

### 12.6 更新内容后前台如何看到

当前页面全部 `force-dynamic`，没有复杂 ISR/tag invalidation。

下次请求：

```text
重新查询 PostgreSQL
  -> mapper
  -> 渲染最新 published 内容
```

这降低了缓存心智负担。

代价是每次请求都会访问应用和数据库；对当前个人站规模完全可接受。

---

## 13. Payload Collection 为什么同时影响这么多层

修改 Collection 时，影响链如下：

{% mermaid %}
flowchart TB
  Collection["Collection Config"]
  Admin["Admin Form"]
  API["Local / REST / GraphQL shape"]
  Types["payload-types.ts"]
  Schema["目标 DB schema"]
  Migration["migration diff"]
  Getter["getter query"]
  Mapper["mapper input"]
  Seed["seed data"]
  Tests["fixtures/tests"]
  UI["UI model / render"]

  Collection --> Admin
  Collection --> API
  Collection --> Types
  Collection --> Schema
  Schema --> Migration
  Types --> Getter
  Types --> Mapper
  Types --> Seed
  Types --> Tests
  Mapper --> UI
{% endmermaid %}

这解释了为什么 PR #18 删除 Games 四个旧封面字段时，需要同步改：

- Collection；
- generated types；
- mapper；
- fixture；
- seed；
- migration；
- tests；
- docs。

不是因为代码耦合失控，而是因为这确实是一项跨 schema 生命周期的改变。

一个好的 Collection 修改流程应该是：

```text
明确产品字段变化
  -> 改 Collection
  -> 生成 types
  -> 生成 migration
  -> 人工审查 migration
  -> 改 mapper / query / seed / tests
  -> disposable DB 验证
  -> check/build
  -> 部署前备份
  -> production migration
  -> smoke
```

---

## 14. Games Media 全链路解剖

### 14.1 Media Collection

Media 负责：

- 公开读取；
- 认证创建、更新、删除；
- 必填 alt；
- 文件类型限制；
- 单文件上限；
- thumbnail；
- display；
- local static directory；
- Admin preview。

当前尺寸：

```text
thumbnail: width 400, WebP
display: width 1600, WebP
original: 保留原文件
```

---

### 14.2 本地模式

```text
MEDIA_STORAGE_MODE=local
```

S3 plugin disabled，Payload 使用：

```text
.payload-media/
```

这个目录被 `.gitignore` 和 `.dockerignore` 排除。

---

### 14.3 生产模式

```text
MEDIA_STORAGE_MODE=r2
```

必须提供：

```text
MEDIA_R2_BUCKET
MEDIA_R2_ENDPOINT
MEDIA_R2_PUBLIC_URL
MEDIA_R2_ACCESS_KEY_ID
MEDIA_R2_SECRET_ACCESS_KEY
```

`resolveMediaStorageConfig` 会：

- 校验 mode；
- 要求 HTTPS endpoint/public URL；
- 要求所有凭据；
- 去掉 public URL 尾部 `/`；
- production 遇到 local 时拒绝启动。

这是一个很好的 fail-fast 设计。

---

### 14.4 为什么有两个 URL

```text
R2 endpoint
  -> 上传 API
  -> account.r2.cloudflarestorage.com

R2 public URL
  -> 浏览器读取
  -> media custom domain
```

上传 endpoint 不应该成为前台图片地址。

---

### 14.5 `disablePayloadAccessControl: true` 的真实含义

这一配置用于让文件 URL 直接指向公开 R2，而不是由 Payload 作为文件代理。

它适合当前 Media Collection，因为：

```text
Media.read = public
```

但这不等于“匿名用户可以创建 Media”。

Collection 的 create/update/delete access 仍然是认证要求。

---

### 14.6 `alwaysInsertFields`

S3 plugin 只在 production R2 模式启用，但 schema/migration 不能因为环境不同而消失字段。

`alwaysInsertFields: true` 让相关字段即使插件暂时 disabled 也出现在 schema 中，从而减小本地与生产 schema 差异。

---

### 14.7 Next Image 远程域名

`next.config.ts` 根据 `MEDIA_R2_PUBLIC_URL` 创建 remote pattern。

它还要求 HTTPS。

这意味着：

```text
生产 build
  必须知道允许哪个图片域名
```

所以 Media public URL 同时有 Buildtime 和 Runtime 关注点。

---

### 14.8 图片展示模型为什么稳定

Games UI 不使用 Payload Media type，而使用：

```ts
cover: {
  src;
  alt;
  width;
  height;
}
```

这使以下变化都不必重写 UI：

- 静态 public 路径；
- R2 URL；
- display WebP；
- original fallback；
- custom domain；
- Media schema 清理。

这是 mapper 边界的价值。

---

### 14.9 Media 当前还没有完全覆盖 Reviews

Games 已经 Media-only。

Reviews 仍然是：

```text
coverImage: text
```

这意味着 Reviews 图片仍然依赖一个字符串路径，而不是统一 Media 生命周期。

它不是当前故障，但构成下一项自然的数据模型收敛。

---

## 15. development fallback 与 seed 的真实角色

这是当前最需要你真正理解的部分。

### 15.1 三种不同概念

#### fallback

应用运行时读取失败或空数据时，直接向页面返回静态对象。

当前：

```text
gameItems
reviewItems
toolkitItems
```

#### seed

把初始数据真正写入 PostgreSQL。

当前通过开发 Route Handler + curl 执行。

#### test fixture

只在测试中构造 Payload document 或输入。

当前在：

```text
src/testing/fixtures/
```

这三者本应是不同责任。

---

### 15.2 当前为什么粘在一起

Games 的 `game-items.ts` 同时用于：

- development 页面 fallback；
- `getGameBySlug` fallback；
- 提供 `createGameBody` 给 seed route；
- 表达示例数据；
- 间接成为内容模板。

Reviews 的 `review-items.ts` 甚至还定义了：

```ts
ReviewPreview
```

因此静态数据文件同时成为：

- 运行时数据源；
- 类型定义位置；
- demo content；
- Rich Text builder；
- 开发兜底。

这正是“半懂不懂”感的来源之一：文件名叫 data，但它到底是生产模型、测试模型还是开发演示，不够明确。

---

### 15.3 fallback 早期为什么合理

在 Payload 尚未接通时，fallback 可以：

- 先搭 UI；
- 不依赖数据库；
- 测试图片比例；
- 让开发服务器在 DB 未就绪时仍展示页面；
- 保持 feature component 与数据源解耦。

这是自然增长中的合理脚手架。

---

### 15.4 现在为什么开始有害

#### 它掩盖本地故障

```text
PostgreSQL 没启动
migration 错
Payload 初始化失败
query 错
```

页面仍然可能显示静态数据。

#### 它制造双事实源

例如 WHITE ALBUM2 同时存在于：

- `game-items.ts`；
- seed template；
- 开发 PostgreSQL；
- 可能的生产 PostgreSQL。

#### 它让“空数据”和“系统故障”表现相似

两者都可能回到 fallback。

#### 它增加测试维护

多项测试只是在保护 fallback 行为。

#### 它让页面模型依赖 demo 文件

`ReviewPreview` 定义在静态数据文件中。

---

### 15.5 推荐的目标语义

```text
数据库正常且有数据
  -> 返回数据

数据库正常但为空
  -> 返回空列表 / notFound

数据库失败
  -> 抛错 -> error boundary

开发初始内容
  -> 显式 seed 到 PostgreSQL

测试输入
  -> fixture

纯前端 Story/demo
  -> 单独 demo fixture，不进入正常 runtime
```

---

### 15.6 seed 本身的优点

Games seed 已经：

- 按 slug upsert；
- 不删除其他内容；
- 先查找/创建 Media；
- 受 `NODE_ENV !== production` 与 `ENABLE_DEV_SEED` 双保护；
- 有纯 upsert 单元测试；
- client type 根本不提供 delete。

这是很谨慎的 seed。

问题不在 seed 行为，而在入口和数据定义位置。

---

### 15.7 推荐改成 CLI seed

当前流程：

```text
启动 Next dev server
  -> 开 ENABLE_DEV_SEED
  -> curl POST /api/dev/seed-games
  -> 关闭开关
```

更直接的目标：

```bash
pnpm db:seed
```

由 standalone TypeScript script：

- 载入 Payload config；
- 拒绝 production；
- 直接调用 Local API；
- 写入 PostgreSQL；
- 不暴露临时 HTTP endpoint；
- 不要求先启动 Next；
- 完成后退出。

这样 seed 属于开发工具，不属于应用路由。

---

## 16. migration 生命周期与 Games 封面演进案例

### 16.1 当前 migration 列表

当前 index 注册六个 migration：

```text
20260614_112311_init
20260628_133544
20260702_161526
20260703_132233
20260721_131302_add_media_and_game_cover
20260722_172809
```

大致对应：

1. Users、Tools 与 Payload 基础表；
2. Reviews；
3. Games；
4. coverKey -> 显式静态图片字段；
5. Media + nullable Games cover；
6. cover required + 删除旧字段。

---

### 16.2 Collection 与 migration 的关系

Collection 描述：

```text
现在应该是什么
```

migration 描述：

```text
过去怎样走到现在
```

不要把 migration 当作当前业务代码。

---

### 16.3 development push

Payload Postgres 默认在 development 使用 Drizzle push，把 Collection 改动自动同步到本地 sandbox DB。

这不是当前项目的错误，也不是必须关闭的“魔法”。

官方推荐的常见流程正是：

```text
本地 development push 快速迭代
  -> 功能稳定
  -> migrate:create
  -> 生产只跑 migration
```

真正需要注意的是：

> 不要在同一个长期开发数据库里一会儿依赖 push、一会儿又手工跑同一批 migration，造成 schema history 认知混乱。

如果需要验证 migration 全链，应使用一次性空数据库，而不是把本地日常 sandbox 强行变成生产模式。

---

### 16.4 生产 migration 当前有两个执行所有者

当前同时存在：

```text
payload.config.ts
  -> prodMigrations: migrations
```

以及：

```text
docker-entrypoint.sh
  -> payload migrate --use-swc
  -> node server.js
```

两者都会尝试执行未运行 migration。

migration history 表通常能避免同一 migration 被重复应用，但架构问题是：

> 到底谁负责生产 schema 升级？

这会影响：

- 日志理解；
- 失败点；
- 本地复现；
- 将来多实例启动；
- 运维手册；
- 回滚步骤。

推荐只保留一个明确所有者。

对当前 Coolify 单实例 Compose，我更倾向于：

```text
保留 entrypoint 显式 migrate
删除 prodMigrations
```

理由：

- schema 失败时应用不启动；
- 部署日志有明确阶段；
- migration 与 Next 初始化解耦；
- CLI 与手工诊断方式一致；
- `exec node server.js` 保持 PID/信号正确。

另一个方案也能成立：

```text
删除 entrypoint migrate
只依赖 prodMigrations
```

但必须同步改文档和 Docker runner。

关键不是选哪一个，而是只选一个。

---

### 16.5 Games 封面 migration 为什么值得学习

#### 初始状态

```text
cover_key enum
```

它把业务内容和仓库静态图片选择绑定在一起。

#### 第一次解耦

新增：

```text
cover_src
cover_alt
cover_width
cover_height
```

migration 用 CASE 把旧 enum 转成显式数据，并在未知 key 时抛错。

这把“代码里的图片映射”变成“数据库中的内容数据”。

#### Media 兼容阶段

新增：

```text
cover_id nullable
```

保留四个旧字段。

mapper：

```text
Media 可用 -> Media
否则 -> legacy
```

这是 expand-and-contract 的 expand 阶段。

#### 真实内容迁移

在生产 Admin：

- 上传图片；
- 生成 R2 对象；
- 将六条 Game 关联 Media；
- 验证页面；
- 验证重新部署持久性。

#### 收缩阶段

最后 migration：

```text
先查 cover_id 是否有 NULL
  -> 有：抛错，不删字段
  -> 无：cover_id NOT NULL
  -> 删除四个 legacy 字段
```

mapper 删除 fallback。

这是 contract 阶段。

---

### 16.6 down migration 的真实意义

最后一个 down 会从当前 Media metadata 重建：

```text
cover_src
cover_alt
cover_width
cover_height
```

它恢复的是：

```text
旧代码可运行所需的 schema 契约
```

不是：

```text
历史某一时刻的逐字数据快照
```

精确历史恢复仍然依赖匹配时间点的 PostgreSQL dump。

这个区分非常成熟。

---

## 17. 构建、部署与启动流程

### 17.1 CI 构建

```text
checkout
  -> pnpm from packageManager
  -> Node 22
  -> pnpm install --frozen-lockfile
  -> format
  -> lint
  -> typecheck
  -> test
  -> production build
```

它不使用 production secret。

`SKIP_ENV_VALIDATION=true` 只用于特殊构建路径。

---

### 17.2 Docker 多阶段构建

#### `base`

- Node 22 bookworm slim；
- Corepack；
- PNPM_HOME；
- `/app`。

#### `deps`

- 复制 `package.json` 和 lockfile；
- frozen install。

#### `builder`

- 复制依赖；
- 复制源码；
- 注入非秘密媒体 build args；
- 设置 build-only env skip；
- 验证 R2 模式必须有 public URL；
- `pnpm build`。

#### `runner`

- production；
- 创建非 root `nextjs`；
- 复制 full `node_modules`；
- 复制 package、config、migration、public；
- 复制 standalone server；
- 使用 entrypoint；
- 以非 root 运行。

---

### 17.3 为什么 runner 仍复制 full `node_modules`

纯 Next standalone 通常可以更小。

但当前容器启动前要执行：

```text
Payload migration CLI + SWC
```

因此 runner 不只是运行 `server.js`，还要具备：

- Payload CLI；
- config loader；
- adapter；
- migration imports；
- SWC runtime。

所以 full `node_modules` 是当前明确功能换来的镜像体积，不是无意识浪费。

只有在：

- migration 被移到独立 job/image；
- 或部署平台先执行 migration；
- 或实测 image size/startup 成为问题；

之后才值得优化。

---

### 17.4 启动顺序

```text
postgres container start
  -> healthcheck 通过
  -> web start
  -> entrypoint 执行 migration
  -> migration 成功
  -> exec node server.js
  -> Next/Payload 对外服务
```

migration 失败时，`set -eu` 会终止启动。

这是正确的 fail-fast。

---

### 17.5 Compose build/runtime 默认值不完全一致

当前 `web.build.args`：

```text
MEDIA_STORAGE_MODE default local
```

runtime environment：

```text
MEDIA_STORAGE_MODE default r2
```

真实生产环境会显式覆盖，但配置文件自身表达了两种默认意图。

这不会立刻造成故障，却增加理解成本。

推荐生产关键值显式 required，开发默认放 `.env.example` 或 dev override。

---

## 18. PostgreSQL 备份与恢复边界

### 18.1 在线数据在哪里

```text
postgres-data named volume
```

这是当前生产在线状态。

---

### 18.2 为什么不用复制 Volume

PostgreSQL 运行时会持续写数据文件。

直接复制活跃 Volume 可能得到不一致的物理状态。

当前使用：

```text
pg_dump --format=custom --no-owner --no-acl
```

这是更适合当前项目的逻辑备份。

---

### 18.3 backup.sh 流程

```text
检查 enabled
  -> 校验变量
  -> 等待 pg_isready
  -> 创建 UTC 文件名
  -> pg_dump
  -> 检查非空
  -> pg_restore --list
  -> rclone copyto R2
  -> 删除临时文件
  -> sleep interval
```

失败时：

```text
记录失败
  -> cleanup
  -> sleep retry
  -> 再尝试
```

---

### 18.4 安全限制

backup container：

- 非 root；
- read-only root filesystem；
- `/tmp` tmpfs；
- `no-new-privileges`；
- drop all capabilities；
- 不暴露端口；
- 不挂 Docker socket；
- 不挂 PostgreSQL data Volume；
- 只通过 Compose network 连接数据库；
- secret 不写日志。

这个 sidecar 的边界非常清楚。

---

### 18.5 shell tests 保护了什么

使用 fake command 验证：

- `pg_dump` 失败不能上传；
- archive validation 失败不能上传；
- upload 失败不能打印成功；
- 成功路径只打印成功；
- secret 不进入日志；
- 临时 dump 会清理。

它测试的是控制流可靠性，而不是 PostgreSQL 内容正确性。

---

### 18.6 当前仍未证明的事情

```text
R2 上的某个真实 dump
  -> 下载
  -> 在隔离 PostgreSQL 16 创建空库
  -> pg_restore
  -> Payload 启动
  -> 内容数量/关系/Media metadata 正确
  -> 页面 smoke
```

在这条链实际跑通前：

```text
自动备份正在运行
```

不等于：

```text
数据库恢复已闭环
```

仓库文档对此保持诚实，是优点。



## 19. OpenList 为什么是独立应用

### 19.1 产品连接

Kita 保存：

```text
https://archive.kral-koharu.com/path/to/game
```

用户点击后进入 OpenList。

这个 URL 同时表达：

- 当前是哪一个 Game；
- 应该进入哪个目录；
- 底层资源入口是什么。

---

### 19.2 没有发生的事情

当前没有：

- Kita server -> OpenList API；
- 共享数据库；
- 共享 session；
- 共享 Volume；
- 共享 secret；
- 内部 service hostname；
- CORS 集成；
- 同步任务；
- OpenList client SDK；
- OpenList 前端 fork。

因此两者的故障域是分开的。

---

### 19.3 为什么不放入 Kita Compose

Kita Compose 中的服务属于同一发布单元：

```text
web 依赖 postgres
backup 专门服务 postgres
```

OpenList：

- 不依赖 Kita PostgreSQL；
- 有自己的版本节奏；
- 有自己的数据 Volume；
- 有自己的 storage credentials；
- Kita 发布不应重启它；
- 它升级不应触发 Kita migration。

放进同一 Compose 只会制造部署耦合，不会改善用户体验。

---

### 19.4 当前隐式契约

Lightbox 通过：

```ts
link.label === "Game archive"
```

找到下载入口。

这意味着产品语义藏在可编辑文案中。

当前只有你一个管理员、内容量很小，所以它能工作。

未来出现以下情况时应结构化：

- 多语言 label；
- label 被改成 Download / Archive；
- 一个 Game 有多个下载源；
- UI 需要区分 VNDB/Wikipedia/Archive；
- OpenList link 需要自动检查；
- 需要统一统计或迁移。

目标可以是：

```ts
links: [
  {
    kind: "archive" | "reference" | "official" | "wiki",
    label: string,
    href: string
  }
]
```

或者单独：

```ts
archiveUrl
```

不需要现在就为了理论一致性改，但应知道这里是契约。

---

## 20. 前端产品层的架构

Kita 的前端不是一套统一组件库风格，而是不同 feature 有不同视觉语言。

这对个人策展站是优点，不是“不统一”。

### 20.1 Home：视觉体验模块

Home 的结构：

```text
HomePage
  -> static content
  -> HomeExperience client component
       -> SceneBackground
       -> navigation
       -> rotating index hook
       -> scroll threshold hook
       -> RainWaterLayer
       -> VersePanel
```

`HomePage` 负责准备静态内容。

`HomeExperience` 是 client boundary，因为它需要：

- state；
- effect；
- scroll；
- rotation；
- browser API；
- WebGL。

这使 client-only 复杂度被局部限制在 Home feature 内，没有把整个站点改成 Client App。

---

### 20.2 RainWaterLayer 生命周期

它处理：

- 桌面能力判断；
- pointer 类型；
- reduced motion；
- DPR 上限；
- 图片加载；
- canvas 尺寸；
- ResizeObserver；
- resize debounce；
- requestAnimationFrame；
- document visibility；
- pointer parallax；
- scene destroy；
- fallback overlay。

这是一段确实复杂的代码，但复杂度有直接产品价值。

它不是“架构层过度设计”，而是一个高复杂度视觉组件。

---

### 20.3 RainRenderer 的局部资源缺口

`RainRenderer.destroy()` 当前删除：

```text
WebGL program
position buffer
```

但 `init()` 创建四个 texture，却没有保存引用和删除。

Resize 或 wallpaper 变化会重建 scene。

因此可能出现 GPU texture 生命周期不完整。

正确修复是：

```text
RainRenderer 保存 textures[]
destroy 时逐个 gl.deleteTexture
必要时 unbind
```

这是局部性能修复，不需要重写 Home 或删除雨效。

---

### 20.4 Games：URL 驱动的画廊

Games gallery 用：

```text
/games?photo=slug
```

控制 Lightbox。

优点：

- 刷新仍能打开指定图片；
- 后退键自然关闭/切换；
- URL 可分享；
- modal state 不只存在于内存；
- route 与 UI 状态有清晰映射。

`Suspense` 包住读取 search params 的 Client Component，也符合 App Router 边界。

---

### 20.5 Games Lightbox 的状态

它支持：

- Escape；
- 左右方向键；
- 上一张/下一张；
- 点击背景关闭；
- body scroll lock；
- 详情链接；
- archive link；
- thumbnail strip。

缺口：

- 打开时没有把焦点移入 dialog；
- 没有 focus trap；
- 关闭时没有恢复到原卡片；
- 多个按钮使用 `focus:outline-none`，没有替代可见 focus ring；
- 背景内容虽然视觉被遮住，但未使用 inert；
- dialog 缺少更完整的标题关联。

这属于可访问性收口，不是核心架构问题。

---

### 20.6 Games 列表模型过重

Gallery 只需要：

```text
slug
title
cover
links 中 archive（若 Lightbox 需要）
```

但它接收完整 `GameDetail`：

```text
body
summary
developer
releaseDate
tags
all links
```

意味着列表查询读取并处理了不需要的 Rich Text 与详情字段。

当前 6 条数据影响很小，但模型语义不精确。

---

### 20.7 Reviews：列表与详情共享同一模型

`ReviewPreview` 同时用于：

- ReviewCard；
- ReviewsPage；
- ReviewDetailPage。

它包含：

```text
body
```

因此“Preview”并不真的是 preview。

更清晰的是：

```text
ReviewCardModel
ReviewDetail
```

---

### 20.8 Tools：最小数据映射

Tools 的 mapper 把 Payload Tool 转成：

```text
ToolkitItem
```

并把 category 变成展示 label，把 createdAt 格式化成 postedOn。

这说明即使是简单 Collection，也没有直接把 Payload document 交给组件。

问题是页面 footer 仍显示：

```text
STATIC FRONT-END DRAFT
```

与真实架构冲突。

---

### 20.9 About：产品文案落后于架构

About 仍写着：

- current text is placeholder；
- CMS layer later；
- content written directly in component。

但 Payload 已经完全接入。

这种文案会让：

- 访客误以为站点未完成；
- 维护者误判当前功能；
- 文档和页面产生矛盾。

这是高价值、低成本的产品修复。

---

### 20.10 全局 metadata 仍是工程占位

Site layout 的 description：

```text
Personal website engineering base.
```

它描述的是脚手架，不是 Kita 现在的产品。

应改成真实站点定位，并增加：

- title template；
- canonical base；
- Open Graph；
- favicon/manifest（按需要）；
- Games/Reviews 的图片 metadata（后续）。

---

## 21. 测试与 CI 到底保护了什么

### 21.1 当前测试层次

#### 纯函数测试

- mapper；
- format；
- archive link；
- media URL；
- access helper。

#### 服务编排单元测试

- getter 查询参数；
- development/production 分支；
- empty/error 行为；
- seed upsert。

#### 配置语义测试

- `SKIP_ENV_VALIDATION` 只有字符串 `"true"` 才跳过；
- production local media 会拒绝；
- R2 配置完整性；
- public URL normalization。

#### shell 控制流测试

- backup failure paths；
- cleanup；
- secret redaction；
- success log。

#### 构建级检查

- format；
- lint；
- typecheck；
- Next production build。

---

### 21.2 测试很有价值的地方

环境变量测试保护了一个真实 JavaScript 陷阱：

```ts
Boolean("false") === true
```

Media mapper 测试保护了：

- display 优先；
- original fallback；
- relationship 只有 ID 时必须失败；
- metadata 不完整必须失败。

Seed 测试保护了：

- update existing；
- create missing；
- no delete capability。

这些都是高价值测试，不是为了数量。

---

### 21.3 当前测试不能证明什么

getter tests mock：

```text
getPayloadClient()
```

所以不能证明：

- Payload 真实生成的 SQL；
- PostgreSQL schema 是否和 Collection 一致；
- migration 从空库能否跑全；
- published access rule 在真实 Local API 中生效；
- Media relationship 的真实展开对象一定符合 fixture；
- Rich Text 的真实数据库 roundtrip；
- REST/GraphQL 路由真实权限；
- Docker image 中 migration CLI 的所有 runtime import 完整；
- `/games` 的真实 HTTP 响应；
- Lightbox 的键盘焦点；
- R2 upload。

---

### 21.4 推荐的测试金字塔

```text
大量纯函数单元测试
  + 少量 getter/service 单元测试
  + 4~6 个真实 PostgreSQL/Payload 集成测试
  + 3 个 Playwright smoke
```

不需要追求大量 E2E。

---

### 21.5 第一批真实集成测试

建议用 CI PostgreSQL service 或 disposable Compose DB：

#### 测试一：空库 migration

```text
创建空 PostgreSQL 16
  -> 执行全部 migration
  -> Payload 初始化
  -> migration status clean
```

#### 测试二：published access

```text
创建 draft + published Review/Game
  -> anonymous Local API overrideAccess false
  -> 只返回 published
```

#### 测试三：Media relationship

```text
创建 Media metadata / 测试图片
  -> 创建 Game cover relation
  -> depth 1 查询
  -> mapper 成功
```

#### 测试四：写权限

```text
anonymous create/update/delete
  -> denied

authenticated
  -> allowed
```

#### 测试五：production error policy

在真实 Payload client 下模拟不可用 DB 较困难，可保留现有单元测试。

---

### 21.6 第一批 Playwright smoke

```text
/                -> 页面主标题/导航可见
/games           -> seed Game 可见
/admin           -> 登录页可见
```

后续再加：

```text
打开/关闭 Lightbox
键盘 Escape
Reviews detail
```

---

### 21.7 CI 当前的优点

- 最小 permissions；
- PR/main push；
- concurrency cancel；
- timeout；
- frozen lockfile；
- 不注入 production secret；
- test + build 同时要求；
- main Ruleset 强制 quality。

对个人项目，这已经很强。

---

## 22. 安全模型

### 22.1 攻击面概览

公开入口：

```text
Next pages
Payload REST
Payload GraphQL
Payload auth/admin
public R2 media
OpenList public UI
```

内部入口：

```text
PostgreSQL Compose network
backup container
Coolify admin
VPS SSH
R2 S3 APIs
```

---

### 22.2 数据库隔离

生产 PostgreSQL 不发布宿主机 5432。

只有同 Compose network 的：

- web；
- backup；

可以连接。

这是正确的最小暴露。

---

### 22.3 Secret 分离

Buildtime 不应拿：

- DATABASE_URI；
- PAYLOAD_SECRET；
- DB password；
- R2 write secret。

Runtime 才需要。

当前 Docker builder 使用 placeholder + explicit validation skip，这避免 secret 进入 image layer。

---

### 22.4 Media 上传

Media：

- MIME allowlist；
- 单文件 10 MiB；
- files 1；
- 认证写；
- 公开读；
- production direct R2 URL。

因为媒体公开读，`disablePayloadAccessControl` 是合理的。

---

### 22.5 Local API access

公开 getter 显式：

```text
overrideAccess: false
```

这是必要的，因为 Local API 默认跳过 access。

---

### 22.6 Collection 写权限

Games、Reviews、Tools 只显式写了 read。

Payload 默认保护未显式开放的写操作，因此当前不是匿名写漏洞。

但安全审查应尽量从代码直接得到结论，而不是依赖读者记住框架默认值。

推荐统一：

```ts
access: {
  create: isAuthenticated,
  read: publishedOrAuthenticated,
  update: isAuthenticated,
  delete: isAuthenticated,
}
```

---

### 22.7 GraphQL

项目显式注册了：

```text
/api/graphql
```

但前台读取不使用 GraphQL。

如果没有外部客户端，保留它意味着：

- 多一个公开 API；
- 多一份 schema；
- 多一种查询复杂度；
- 多一条需要审计的权限路径。

最简单的安全与复杂度减法：

```ts
graphQL: {
  disable: true,
}
```

并删除 GraphQL route。

---

### 22.8 查询深度

Payload 关系展开深度有成本。

当前业务只需要：

```text
depth 1
```

建议设置较小全局 `maxDepth`，例如 2 或 3，并按真实需求验证。

这不是为了性能微优化，而是限制公开 API 的可组合复杂度。

---

### 22.9 Admin 登录保护

可以检查/显式设置：

- max login attempts；
- lock time；
- Cloudflare Access 是否适合 `/admin`；
- Coolify/VPS 管理入口是否单独保护；
- 2FA 与 recovery codes。

这属于外部平台安全，不应全部塞进应用代码。

---

## 23. 当前边界清晰度逐层评分

| 边界 | 分数 | 评价 |
| --- | ---: | --- |
| Route -> Feature | 9.5 | route 很薄，职责明确 |
| Route -> Server getter | 9.2 | 调用方式一致 |
| Getter -> Payload | 9.0 | 查询集中，access 明确 |
| Payload -> PostgreSQL | 8.8 | 由 adapter 管理，migration 清楚 |
| Payload document -> UI model | 9.2 | Games mapper 尤其优秀 |
| Feature 内部 UI | 8.5 | 清晰，但部分组件较大 |
| Development data boundary | 6.5 | fallback/seed/type/demo 粘连 |
| Local -> Production | 8.7 | 结构对齐，少量默认值含混 |
| Migration ownership | 6.8 | entrypoint 与 prodMigrations 重复 |
| Media metadata -> object storage | 9.0 | 本地/R2边界清楚 |
| Kita -> OpenList | 9.5 | URL-only 松耦合 |
| Online data -> backup | 8.8 | sidecar 单责明确 |
| Backup -> restore | 6.8 | dump 有验证，restore drill 未闭环 |
| Code -> Documentation | 6.7 | 代码清楚，文档层级过多 |
| Tests -> Real runtime | 7.2 | 单测扎实，集成缺口明显 |
| Product copy -> Actual state | 6.0 | About/Tools/metadata 仍是旧阶段 |
| Overall | **8.5** | 核心边界清楚，外围历史层需要收缩 |

---

## 24. 当前最值得肯定的地方

### 24.1 没有重复后端

Payload 已经负责 CMS、CRUD、权限、API 和 DB schema。

项目没有再加：

- NestJS；
- Express service；
- Prisma；
- tRPC；
- 第二套 auth；
- 独立 Admin。

这是整个栈最重要的克制。

---

### 24.2 mapper 真正承担了边界价值

Games 封面从静态字段迁到 Media/R2 时，UI 基本不用改。

这证明 mapper 不是“为了架构增加一层”，而是稳定产品模型的有效边界。

---

### 24.3 production fail-fast

生产数据库错误会抛出。

生产 local media 会拒绝。

migration 失败会阻止应用启动。

Media relation 不可解析会报错。

备份步骤失败不会打印成功。

这是非常一致的错误哲学。

---

### 24.4 复杂度集中而不是扩散

- WebGL 只在 Home；
- Lightbox client state 只在 Games；
- backup shell 只在 `docker/postgres-backup`；
- Payload schema 只在 `src/payload`；
- migration 只在 `src/migrations`；
- env 解释只在 config；
- OpenList 完全独立。

---

### 24.5 迁移具有真实安全意识

Games Media migration 的两阶段设计、NULL guard 和 down 兼容性，比很多小项目成熟得多。

---

### 24.6 Dev Container 符合你的开发偏好

项目运行时、依赖、PostgreSQL、CLI 都在容器内。

宿主机只保留通用工具。

这让 VS Code + CLI-first 成为真实主路径，而不是文档口号。

---

### 24.7 没有为了未来提前拆服务

即使已经有 R2、backup、OpenList，项目仍没有被改造成微服务网。

每个独立组件都因为拥有不同生命周期才被拆开：

```text
backup -> sidecar
OpenList -> independent app
R2 -> external storage
```

这是一种有证据的拆分，而不是架构时尚。

---

## 25. 当前问题总表

| 优先级 | 问题 | 主要影响 | 建议 |
| --- | --- | --- | --- |
| P1 | 无根目录 README / 文档入口过多 | 进入项目困难 | 建立单一 README 与 docs index |
| P1 | runtime fallback 形成开发双事实源 | 掩盖 DB 故障、重复数据 | 改 CLI seed，移除正常 runtime fallback |
| P1 | 生产 migration 双所有者 | 执行责任含混 | entrypoint / prodMigrations 二选一 |
| P1 | 没有真实 PostgreSQL 集成 gate | mock 无法证明整链 | 增加 disposable DB tests |
| P1 | 未完成 restore drill | 备份不等于可恢复 | 隔离 PG16 restore 演练 |
| P1-产品 | About/Tools/metadata 仍是 placeholder | 公开产品与真实状态不符 | 优先替换 |
| P2 | 列表查询读取完整 body | 模型和查询过重 | list/detail model + select |
| P2 | Review 类型定义在 demo data 文件 | 类型/数据职责混合 | 移到 types |
| P2 | Reviews cover 仍是 text | 两套媒体生命周期 | 迁移到 Media |
| P2 | detail metadata/page 重复 getter | 同请求重复 DB 工作 | React `cache` |
| P2 | GraphQL 未使用仍暴露 | 增加 API 面 | 禁用并删除 route |
| P2 | write access 依赖默认值 | 审计意图不直观 | 显式 create/update/delete |
| P2 | max depth 未收紧 | 公开查询复杂度 | 设置合理 maxDepth |
| P2 | Compose 有生产弱默认值 | 漏配置时不够 fail-fast | 生产关键变量 required |
| P2 | build/runtime media 默认不一致 | 配置语义含混 | 显式统一 |
| P2 | workspace guard 作用面过广 | 所有命令认知成本 | 只保护相关命令 |
| P2 | root guard 重复 | 两处职责 | 保留一个 |
| P2 | Payload/React 耦合包使用 caret | 升级 PR 可能漂移 | 同组精确版本或严格升级流程 |
| P2 | link label 承担 archive 语义 | 文案成为协议 | 内容增大后加 kind |
| P2 | slug/URL 缺少明确格式校验 | 错误内容可入库 | field validation |
| P2 | Lexical config 重复 | 漂移风险 | 抽共享 editor config |
| P2 | readingTime 是显示字符串 | 数据与文案耦合 | number/derived |
| P2 | releaseDate 是自由 text | 日期语义不确定 | 按精度显式建模 |
| P2 | Lightbox focus 不完整 | 键盘/读屏体验 | focus trap/restore/ring |
| P2 | WebGL texture 未释放 | 重建时 GPU 资源风险 | 保存并 deleteTexture |
| P2 | 无显式 empty/error UX | 框架默认体验 | feature empty + app error |
| P3 | Docker runner 复制 full node_modules | 镜像偏大 | 有测量后再优化 |
| P3 | backup 无 last-success alert | 静默长期失败风险 | freshness check/notification |
| P3 | OpenList backup 尚未定型 | 外部资源恢复不完整 | provider 稳定后处理 |

---

## 26. 第一类问题：理解入口与文档事实源

### 26.1 根目录没有 README

一个第一次打开仓库的人，最需要知道：

```text
这是什么
怎么启动
架构主链是什么
当前权威文档在哪里
常用命令是什么
哪些事情不能做
```

现在这些信息分散在多份长文档中。

没有 README 会导致读者一开始就进入历史深处。

---

### 26.2 当前事实文档也有重复

`CODEX_HANDOFF`、`current-project-status`、`project-structure`、`development-production-alignment` 都会重复：

- 技术栈；
- 开发命令；
- 环境变量；
- Compose；
- 测试数量；
- 恢复状态；
- 注意事项。

重复越多，更新时漂移概率越高。

---

### 26.3 带日期文档有不同权威级别

有些是：

- 当时评估，后来已实施；
- 当时计划，后来部分改变；
- 事故复盘；
- 当前仍有效的技术原理；
- 固定基线证据。

但文件名并没有直接表示：

```text
CURRENT
DECISION
RUNBOOK
HISTORICAL
ARCHIVED
```

---

### 26.4 文档中的 commit/test count 很快过期

把某个 commit 叫“当前 main”只在写文档那天成立。

更稳妥的写法：

```text
最后核对日期：...
核对基线：...
当前 HEAD：以 Git 为准
```

---

### 26.5 推荐修复

根目录：

```text
README.md
```

只保留：

- 产品简介；
- 一张架构图；
- 技术栈；
- `pnpm dev/test/check/build`；
- 文档导航；
- 当前限制。

`docs/` 收敛：

```text
ARCHITECTURE.md
DEVELOPMENT.md
OPERATIONS.md
RECOVERY.md
adr/
archive/
```

---

## 27. 第二类问题：开发环境存在双数据源

### 27.1 这是当前最重要的代码边界问题

生产只有 PostgreSQL。

开发却可能来自：

```text
PostgreSQL
或静态 fallback
```

并且页面本身不告诉你现在是哪一个。

---

### 27.2 可能出现的误判

```text
PostgreSQL 挂了
  -> 页面仍显示

migration 没跑对
  -> 页面仍显示

数据库没有 WHITE ALBUM2
  -> 页面仍显示

Media relation 坏了
  -> 可能回 fallback

你以为正在验证真实链路
  -> 实际验证了静态对象
```

---

### 27.3 推荐的收敛方式

#### 方案 A：完全移除 runtime fallback

最符合当前成熟度。

#### 方案 B：保留显式 demo mode

例如：

```text
DATA_MODE=demo
```

只有明确设置时才用静态数据。

不要根据“查询为空或报错”自动切换。

#### 方案 C：只在 Storybook/测试中保留

当前没有 Storybook，也没必要为此引入。

因此首选 A。

---

### 27.4 拆分数据文件责任

```text
features/games/types/
  game.ts

scripts/seed/data/
  games.ts

testing/fixtures/
  games.ts
```

不再让 `game-items.ts` 同时承担所有角色。

---

## 28. 第三类问题：运行职责有少量重复所有者

### 28.1 migration 双入口

前文已分析，应二选一。

---

### 28.2 root guard 双位置

当前：

```text
scripts/assert-dev-workspace-user.mjs
next.config.ts
```

都会拒绝 bind-mounted workspace 中 root 运行。

推荐：

- guard script 是命令入口，保留；
- Next config 删除重复 root 检查；
- 或反过来，但 package scripts 已广泛使用 guard，前者更自然。

---

### 28.3 guard 作用于几乎所有命令

目前连：

```text
format
lint
typecheck
test
payload:types
```

都要先执行 workspace guard。

其中只有部分命令真正关心：

- `.next` ownership；
- dev/build 并发；
- root 写 bind mount。

可以拆成：

```text
dev/build/start
  -> full guard

其他会写源码/生成文件的命令
  -> only non-root check

纯读取命令
  -> direct
```

甚至仅保留一个简单：

```text
predev
prebuild
```

不要让一次历史事故成为所有工具永久共同前置框架。

---

### 28.4 两套 env 解析

`src/config/env.ts` 使用 T3 env。

`payload.config.ts` 又单独用 Zod 解析：

```text
DATABASE_URI
PAYLOAD_SECRET
```

这是因为 Payload config 在 Next build/CLI 生命周期中有特殊加载需求，不能简单视为无意义重复。

但需要在文档中明确：

```text
env.ts
  -> 应用运行配置

payload.config.ts minimal env
  -> Payload config 初始化所需核心变量
```

否则读者会以为存在两个互相竞争的配置系统。



## 29. 第四类问题：查询形状与页面模型还不够精确

### 29.1 Games 列表不需要完整 GameDetail

当前列表与详情共享：

```ts
GameDetail
```

其中包含完整 `body`。

Gallery 实际使用：

```text
slug
title
cover
可能的 archive link
```

推荐：

```ts
type GameCard = {
  slug: string;
  title: string;
  cover: ImageAsset;
  archiveLink?: Link;
};

type GameDetail = {
  ...GameCard;
  originalTitle?;
  developer;
  releaseDate;
  status;
  summary;
  body;
  tags;
  links;
};
```

---

### 29.2 Reviews 同样需要列表/详情分开

```ts
ReviewCardModel
ReviewDetail
```

列表不读取 Rich Text。

详情才读取 body。

---

### 29.3 使用 Payload `select`

Payload 默认返回完整字段。

列表 getter 可以：

```ts
payload.find({
  collection: "reviews",
  select: {
    slug: true,
    title: true,
    gameTitle: true,
    publishedAt: true,
    excerpt: true,
    coverImage: true,
    rating: true,
    tags: true,
  },
});
```

Games 还可通过 `populate` 精确选择 Media 字段。

收益：

- DB 处理更少字段；
- field hooks 更少；
- 返回对象更小；
- mapper 输入更准确；
- 类型名称更诚实；
- 未来内容增大时不需要再重构。

---

### 29.4 唯一 slug 查询可关闭分页统计

当前 `limit: 1` 会返回 paginated result。

对 unique slug，可考虑：

```text
pagination: false
```

或使用更适合的 API。

这不是当前性能瓶颈，只是查询意图优化。

---

### 29.5 metadata 与页面重复查询

Games/Reviews 详情：

```text
generateMetadata -> getBySlug
Page -> getBySlug
```

因为不是 `fetch`，不应假设 Next 自动去重。

推荐：

```ts
import { cache } from "react";

export const getGameBySlug = cache(async (slug: string) => {
  ...
});
```

React cache 在单次 Server Component 请求/渲染范围内共享结果，不等于跨请求持久缓存。

它不会引入 Redis、ISR 或复杂 invalidation。

---

### 29.6 当前不需要全站缓存架构

不要因此立即加入：

- Redis；
- cache tags；
- Payload hooks revalidation；
- background regeneration；
- CDN content graph；
- distributed cache。

先做请求内去重和精确 select。

---

## 30. 第五类问题：内容模型还有历史痕迹

### 30.1 Reviews 封面

当前：

```text
coverImage: text
```

目标：

```text
cover: upload relationship -> Media
```

迁移建议复用 Games 的两阶段经验：

```text
新增 nullable cover
  -> mapper 优先 Media，旧 text fallback
  -> 生产内容迁移
  -> 验证
  -> cover required
  -> 删除 coverImage
```

---

### 30.2 readingTime

当前：

```text
"6 min read"
```

这是展示文案，不是领域数据。

目标之一：

```ts
readingMinutes: number
```

UI 根据语言格式化。

或者从 Rich Text 纯文本动态计算。

对于小站，保存数字最直接。

---

### 30.3 releaseDate

当前是 text。

如果所有内容都有完整日期：

```text
Payload date field
```

如果作品日期可能只有年/月：

```ts
releaseDate?: string;
releaseYear?: number;
releasePrecision: "day" | "month" | "year" | "unknown";
```

不要用一个自由字符串同时表示多个语义而不说明。

---

### 30.4 slug validation

当前 required + unique，但缺少格式约束。

建议：

```text
lowercase
a-z / 0-9 / hyphen
不允许首尾 hyphen
```

可在 `validate` 或 hook 中实现。

---

### 30.5 URL validation

Tools.url、Games.links.href 当前是 text。

至少要求：

```text
http:
https:
```

避免：

- 拼写错误；
- 非 URL；
- 不期望的 scheme；
- 前台点击失败。

---

### 30.6 link kind

前文已述。

内容量小可以延期，但要把它记录成“已知隐式契约”，而不是偶然字符串。

---

### 30.7 Rich Text editor config 重复

Games 与 Reviews 重复同一组 Lexical feature。

提取：

```text
src/payload/fields/content-editor.ts
```

只抽取这一个已经稳定重复的配置。

不要继续抽象成通用 Collection builder。

---

## 31. 第六类问题：公开 API 和权限意图可以更窄

### 31.1 禁用未使用 GraphQL

当前有 route，前台无使用证据。

建议禁用。

---

### 31.2 设置全局 maxDepth

当前公开 API 的默认最大深度比业务实际需要更大。

建议根据：

```text
Games cover -> 1
未来关系 -> 2
```

设为 2 或 3。

---

### 31.3 显式写权限

统一 helper：

```ts
export const isAuthenticated: Access = ({ req }) =>
  Boolean(req.user);
```

所有内容 Collection 写出：

```text
create
update
delete
```

Media 已经是正确示例。

---

### 31.4 REST 是否保留

Payload Admin 和外部调试可能依赖 REST。

因此不建议盲目关闭 REST。

但可以明确：

```text
站内页面：Local API
后台：Payload internal/Admin
对外 REST：保留的原因是什么
GraphQL：无需求则关闭
```

---

### 31.5 CORS/CSRF

当前应用与 Admin 同源。

没有外部前端时，应保持允许 origin 尽可能小。

具体配置应根据当前 Payload defaults 和实际 custom domain 验证，不应为了“安全清单”随意添加错误规则。

---

## 32. 第七类问题：真实集成测试仍然不足

这项不需要再展开很多理论，核心是：

> 当前测试证明了模块，尚未证明全部模块组合。

优先顺序：

```text
fresh migration
published access
Media relationship
auth write
HTTP smoke
```

不需要一次引入 Testcontainers、Playwright、MSW、contract testing、visual regression 全家桶。

CI 已经有 PostgreSQL 相关 shell image/Compose经验，先使用 GitHub Actions service 最简单。

---

## 33. 第八类问题：局部 UI 与可访问性缺口

### 33.1 Lightbox

优先修复：

- initial focus；
- focus trap；
- restore focus；
- `focus-visible` ring；
- background inert；
- close/next/previous 的可见键盘状态。

---

### 33.2 Empty state

当前 Production DB 空时返回 `[]`。

页面可能只显示标题或空网格。

每个 feature 应有自己的空状态：

```text
No games published yet.
No reviews published yet.
No tools available yet.
```

这不是错误。

---

### 33.3 Error boundary

数据库失败应进入明确错误页，而不是 Next 默认开发/生产边界。

可以在 route segment 增加：

```text
error.tsx
```

提供：

- 简洁说明；
- retry；
- 返回首页；
- 不泄露内部错误。

---

### 33.4 not-found

详情已有 `notFound()`，但可以增加 feature 风格的 `not-found.tsx`。

---

### 33.5 WebGL texture

前文已述，做小 PR。

---

### 33.6 Product copy

最高性价比：

- About 真文案；
- Tools 去掉 static draft；
- 全局 description；
- demo Review 内容替换；
- Games 真内容；
- 导航语言一致。

这些会让项目“完成度”提升远高于再加一层基础设施。

---

## 34. 第九类问题：恢复能力已建立但未闭环

### 34.1 已经完成

- GitHub 代码远端；
- C SSD clean clone/rebuild 历史演练；
- secret inventory；
- encrypted SSH materials；
- PostgreSQL -> R2 自动 dump；
- backup failure-path tests；
- Media R2；
- OpenList deployment inventory；
- 恢复文档。

---

### 34.2 未完成

- 真实 PostgreSQL restore drill；
- VPS/Coolify 从零重建；
- R2 recovery package roundtrip；
- 密码库离线导出；
- OpenList data/storage backup；
- backup freshness alert；
- 多平台同时失效情景。

---

### 34.3 正确优先级

第一项：

```text
在隔离 PostgreSQL 16 中恢复最近 dump
```

而不是先设计更复杂备份系统。

随后：

```text
记录 RTO/RPO
```

例如：

- RPO：最多丢 24 小时内容；
- RTO：若 VPS 完全丢失，目标多少小时恢复；
- Media 是否有独立对象备份/版本控制；
- OpenList 当前是否可重建而非必须恢复。

---

## 35. 哪些东西绝对不应该加入

当前不要加入：

- NestJS；
- Express 独立后端；
- Prisma；
- 第二个 Drizzle schema；
- tRPC；
- Redux；
- Zustand；
- TanStack Query 用于当前 server-rendered 内容页；
- Redis；
- MQ；
- Kafka；
- Elasticsearch；
- 微服务；
- Kubernetes；
- Turborepo；
- monorepo packages；
- generic repository；
- service interface for every function；
- CQRS；
- event bus；
- GraphQL client；
- 自建 Auth；
- fork Payload；
- fork OpenList 前端；
- 大型组件库；
- Storybook，仅为当前 fallback 找归宿；
- 为了测试而一次加入 Testcontainers + Playwright + MSW 全套；
- 为了镜像小而拆 migration platform；
- 为了“领域驱动”创建大量 entity/value object；
- 把所有文档继续留在 docs 根目录。

这些技术不是永远错误，而是当前没有问题证据。

---

## 36. 推荐的目标架构

目标不是换架构，而是把现有架构收敛成更容易理解的版本。

{% mermaid %}
flowchart LR
  Route["Next route\nthin composition"]
  Query["feature/server query\ncached per request"]
  Payload["Payload Local API"]
  DB["PostgreSQL"]
  Mapper["explicit mapper"]
  Model["list/detail view model"]
  UI["feature UI"]

  Route --> Query
  Query --> Payload
  Payload --> DB
  Query --> Mapper
  Mapper --> Model
  Model --> UI
{% endmermaid %}

内容写入：

```text
Admin
  -> explicit Collection access
  -> PostgreSQL
  -> Media to R2
```

开发数据：

```text
CLI seed
  -> PostgreSQL

normal runtime
  X fallback
```

生产启动：

```text
one migration owner
  -> Next start
```

公开 API：

```text
Local API for site
REST only where needed
GraphQL disabled
maxDepth limited
```

文档：

```text
README
ARCHITECTURE
DEVELOPMENT
OPERATIONS
RECOVERY
ADR
archive
```

测试：

```text
unit
+ 4 real Payload/Postgres integration tests
+ 3 Playwright smoke
```

---

## 37. 分阶段改进路线

### Phase 0：先让你能读懂项目

目标：不改变运行行为。

1. 加根 README；
2. 把本报告放入 `docs/architecture-review-2026-08-05.md` 或作为新 `ARCHITECTURE.md` 素材；
3. 增加 `docs/README.md`，标记 Current / Decision / Historical；
4. About、Tools、metadata 去 placeholder；
5. 不做任何 schema 改动。

完成标准：

```text
新电脑 clone 后
  -> 5 分钟内知道项目是什么
  -> 知道执行哪些命令
  -> 知道先读哪三份文档
```

---

### Phase 1：收敛开发数据事实源

目标：PostgreSQL 成为正常开发唯一 runtime 数据源。

1. 提取 `src/seed` 或 `scripts/seed`；
2. 新增 CLI seed；
3. 迁移 game/review/tool seed data；
4. 将 view model type 移出 demo data 文件；
5. 删除 getter 自动 fallback；
6. 空 DB 显示 empty state；
7. DB 错误进入 error boundary；
8. 删除 `/api/dev/seed-*`；
9. 更新测试；
10. 更新文档。

完成标准：

```text
关掉 PostgreSQL
  -> 页面明确失败

空 PostgreSQL
  -> 页面明确为空

运行 seed
  -> 页面显示真实 DB 内容
```

---

### Phase 2：收敛执行所有权

1. migration 双入口二选一；
2. root guard 去重；
3. 缩小 workspace guard；
4. Compose production key fail-fast；
5. 统一 media build/runtime 必需值；
6. 给 `package.json` 增加统一 `verify`：

```json
"verify": "pnpm check && pnpm test && pnpm build"
```

7. 审查 Payload/React/Next 同组版本升级策略。

完成标准：

```text
任何人都能一句话回答：
生产 migration 在哪里执行？
```

---

### Phase 3：精确数据契约

1. GameCard/GameDetail；
2. ReviewCardModel/ReviewDetail；
3. 列表 query `select`；
4. detail getter React `cache`；
5. slug/URL validation；
6. 显式写 access；
7. shared Lexical config；
8. GraphQL disable；
9. maxDepth；
10. archive kind 是否需要结构化，按实际内容决定。

---

### Phase 4：统一 Media

1. Reviews nullable Media cover；
2. mapper compatibility；
3. 生产迁移；
4. 验证；
5. required；
6. 删除 `coverImage`；
7. 清理不再引用的 public images。

完全复用 Games 的 expand/contract 模式，不要一次破坏性切换。

---

### Phase 5：整链信心

1. fresh migration integration；
2. published access integration；
3. Media relationship integration；
4. auth write integration；
5. Playwright `/` `/games` `/admin`；
6. 在 CI 增加独立 integration job；
7. 不让 integration test 使用 production secret。

---

### Phase 6：恢复闭环

1. 下载最近真实 dump；
2. 隔离 PG16 restore；
3. 运行当前 Payload；
4. 内容统计与页面 smoke；
5. 记录步骤与耗时；
6. 确认 dump retention；
7. 加 backup last-success freshness；
8. 再评估 OpenList backup。

---

### Phase 7：产品与内容

这是最终目的：

- 真 About；
- 真 Reviews；
- 真 Games；
- Tools 分类和真实资源；
- Empty/error 文案；
- Lightbox accessibility；
- metadata；
- 视觉细节；
- 内容录入节奏。

---

## 38. 建议的文档重组方案

### 38.1 根目录

```text
README.md
```

建议结构：

```text
Kita 是什么
Live URLs
Architecture in one diagram
Stack
Quick start
Core commands
Docs map
Safety notes
Current limitations
```

---

### 38.2 当前文档

```text
docs/
  README.md
  ARCHITECTURE.md
  DEVELOPMENT.md
  OPERATIONS.md
  RECOVERY.md
  adr/
  archive/
```

#### `ARCHITECTURE.md`

- 产品边界；
- 模块；
- 依赖方向；
- 数据流；
- Media；
- OpenList；
- source of truth。

#### `DEVELOPMENT.md`

- Dev Container；
- pnpm dev；
- env；
- seed；
- migration workflow；
- tests；
- Git/PR。

#### `OPERATIONS.md`

- Docker；
- Compose；
- Coolify；
- startup；
- backup；
- media；
- production env。

#### `RECOVERY.md`

- 资产清单；
- restore；
- external accounts；
- RTO/RPO；
- drill status。

#### ADR

```text
0001-use-payload.md
0002-use-postgresql.md
0003-feature-oriented-monolith.md
0004-openlist-url-boundary.md
0005-r2-media.md
0006-postgres-r2-backup.md
```

ADR 只记录长期决策，不记录每次执行过程。

---

### 38.3 archive

把已经完成的：

- plan；
- remediation；
- dated review；
- migration implementation diary；

移入：

```text
docs/archive/2026/
```

文件顶部明确：

```text
Status: Historical
Current source: ../ARCHITECTURE.md
```

不要删除有恢复/事故价值的证据，但不要让它们和当前说明平级。

---

## 39. 建议的日常开发心智模型

以后接到一个需求，先问它属于哪条链。

### 39.1 改页面样式

```text
src/features/<feature>/components
```

通常不碰 Payload、migration、Docker。

---

### 39.2 改页面需要的数据形状

```text
view model
mapper
getter select
component
tests
```

未必需要改 Collection。

---

### 39.3 新增内容字段

```text
Collection
generated types
migration
getter/select
mapper
seed/fixture
UI
tests
```

这是 schema change。

---

### 39.4 新增图片能力

```text
Media Collection / upload relationship
storage config
Next image pattern
migration
mapper
R2
deployment env
```

不要直接在 UI 中拼 R2 endpoint。

---

### 39.5 新增外部服务

先问：

```text
Kita 启动是否必须依赖它？
是否共享数据事务？
是否需要同一次发布？
是否有自己的状态与 secret？
普通 URL 能否满足？
```

OpenList 证明很多集成不需要内部 API。

---

### 39.6 改基础设施

先区分：

```text
开发环境
构建阶段
生产 runtime
数据持久化
备份
恢复
```

不要用一个 Compose 默认值同时解决所有环境。

---

### 39.7 遇到错误

先判断属于：

```text
代码错误
数据库 schema 错误
环境变量错误
容器层错误
文件 ownership
外部平台
数据内容错误
```

不要直接删除 Volume 或 `.next` 之外的状态。

---

## 40. 按文件阅读 Kita 的推荐顺序

这部分是给你真正“重新认识项目”用的。

### 第一轮：只理解主链

1. `package.json`
2. `src/app/(site)/games/page.tsx`
3. `src/server/games/get-games.ts`
4. `src/features/games/utils/map-game-document-to-game-detail.ts`
5. `src/features/games/types/game-detail.ts`
6. `src/features/games/components/games-page.tsx`
7. `src/payload/collections/games.ts`
8. `src/payload/collections/media.ts`
9. `payload.config.ts`

读完后，应该能复述：

```text
一个 Game 怎样从 PostgreSQL 变成页面
```

---

### 第二轮：理解写入和 schema

1. `src/payload/collections/users.ts`
2. `src/payload/collections/reviews.ts`
3. `src/payload/collections/tools.ts`
4. `src/migrations/index.ts`
5. 六个 migration，按时间读
6. `src/payload/payload-types.ts` 只浏览生成结构
7. seed route/service

读完后，应该能复述：

```text
改一个 Collection 字段后为什么需要 migration
```

---

### 第三轮：理解环境

1. `.env.example`
2. `src/config/env.ts`
3. `src/config/media-storage.ts`
4. `next.config.ts`
5. `.devcontainer/devcontainer.json`
6. `compose.yaml`
7. `compose.dev.yaml`
8. `Dockerfile`
9. `docker-entrypoint.sh`
10. `scripts/assert-dev-workspace-user.mjs`

读完后，应该能复述：

```text
pnpm dev 与生产部署分别怎样启动
```

---

### 第四轮：理解恢复

1. `docker/postgres-backup/backup.sh`
2. backup tests
3. backup README
4. recovery runbook
5. OpenList boundary doc
6. media evaluation doc

读完后，应该能复述：

```text
代码、数据库、图片、secret、OpenList 分别怎样恢复
```

---

### 第五轮：理解产品实现

1. HomeExperience
2. RainWaterLayer
3. RainRenderer
4. GamesGallery
5. GameLightbox
6. GameSharedModal
7. ReviewCard/Detail
8. ToolsPage
9. AboutPage

这时才读视觉细节，避免一开始被组件代码淹没。

---

## 41. 常用术语翻译成人话

### App Router

Next.js 用文件夹和 `page.tsx` 表达 URL 的系统。

---

### Route Group

`(site)`、`(payload)` 这样的括号目录用于组织，不进入 URL。

---

### Server Component

默认在服务器执行的 React 组件，可以直接调用服务端函数，不把所有代码发给浏览器。

---

### Client Component

带 `"use client"`，需要浏览器 state/effect/event API。

---

### Payload Collection

一种同时定义后台内容类型、字段、权限和 API 形状的配置。

---

### Local API

在同一个 Node 进程里直接调用 Payload，不走 HTTP。

---

### REST API

通过 `/api/...` 进行 HTTP 数据操作。

---

### GraphQL

客户端自行选择字段的查询接口；当前 Kita 没有实际使用必要。

---

### Access Control

决定谁能 create/read/update/delete。

---

### `overrideAccess: false`

告诉 Local API：不要以服务器身份绕过权限，要执行 Collection access。

---

### relationship / upload relationship

数据库文档之间的引用。Games.cover 指向一个 Media document。

---

### depth

查询 relationship 时展开几层。

---

### generated type

Payload 根据 Collection 自动生成的 TypeScript 类型。

---

### mapper

把 CMS/数据库形状转成页面形状的纯函数。

---

### view model / DTO

页面真正需要的数据结构，不等于数据库表。

---

### migration

把旧数据库升级到新 schema 的可执行历史步骤。

---

### development push

Payload 在开发环境自动把 Collection schema 变化同步到本地 sandbox DB。

---

### Docker image

应用运行所需文件和系统依赖的只读模板。

---

### Container

由 image 启动的运行实例。

---

### Volume

容器之外的持久状态。

---

### Sidecar

与主应用一起部署、但只做一个辅助职责的独立容器。backup 是 sidecar。

---

### Object storage

以对象/文件 key 存储数据。R2 用于图片和 dump。

---

### Fail-fast

配置或数据不合法时立刻失败，不用假数据或默认值伪装成功。

---

### Modular monolith

一个应用一起部署，但内部按功能模块组织，不是巨型混乱单体。

---

### Loose coupling

系统之间只依赖很小稳定契约。Kita 与 OpenList 的契约就是 URL。

---

### Expand and contract migration

先增加新结构并兼容旧结构，迁移数据后再删除旧结构。

---

### Smoke test

不穷举细节，只确认关键链路能启动和访问。

---

### Restore drill

真的把备份恢复到隔离环境，而不是只确认文件存在。

---

## 42. 最终评价

### 42.1 这套架构是不是自然增长得太乱了

没有。

更准确的说法是：

> **核心代码沿稳定边界自然增长，外围文档和事故防护积累得比核心代码更快。**

核心主链始终相当一致：

```text
Next route
  -> server getter
  -> Payload Local API
  -> PostgreSQL
  -> mapper
  -> feature UI
```

真正发生变化的是：

- 内容种类；
- 生产可靠性；
- 媒体存储；
- 备份；
- 外部资源；
- 环境防护。

---

### 42.2 这套架构符合你的审美吗

符合，而且比表面上更符合。

它的低魔法不是：

```text
完全不用高层框架
```

而是：

```text
只在 Payload 这个高价值边界接受集中魔法
其他地方保持普通 TypeScript
```

它的显式性体现在：

- route 薄；
- mapper 显式；
- production fail-fast；
- migration 可审查；
- env 集中；
- Compose 可见；
- OpenList URL-only；
- backup shell 可审计；
- 没有重复 ORM/后端。

---

### 42.3 当前最大的技术债是什么

不是 JavaScript，不是 Next.js，也不是 Payload。

当前最大的技术债按顺序是：

1. 文档权威层级；
2. development fallback 双事实源；
3. production migration 双所有者；
4. 真实集成测试缺失；
5. restore drill 未完成；
6. 产品文案仍停在脚手架阶段。

---

### 42.4 当前最应该停止做什么

停止继续扩建工程底座。

暂时不要再发明：

- 新层；
- 新框架；
- 新服务；
- 新测试体系；
- 新部署平台；
- 新文档类型。

先收敛已有边界，再录入内容。

---

### 42.5 当前最应该开始做什么

用小 PR 做以下事情：

```text
README
真实 About/metadata
CLI seed + 移除 runtime fallback
migration 单一所有者
list/detail query shape
PostgreSQL integration smoke
restore drill
Reviews Media
Lightbox accessibility
真实内容
```

---

### 42.6 最终一句话

> **Kita 已经是一套成熟度明显高于普通个人站的模块化全栈内容系统；它现在不缺架构，缺的是把成长留下的临时双轨和文档历史收拢起来，然后让真实内容成为项目的主角。**

---

## 附录 A：关键文件索引

### 应用入口

- [`package.json`](https://github.com/koharu4ever/Kita/blob/main/package.json)
- [`payload.config.ts`](https://github.com/koharu4ever/Kita/blob/main/payload.config.ts)
- [`next.config.ts`](https://github.com/koharu4ever/Kita/blob/main/next.config.ts)

### 路由

- [`src/app/(site)/games/page.tsx`](https://github.com/koharu4ever/Kita/blob/main/src/app/%28site%29/games/page.tsx)
- [`src/app/(site)/games/[slug]/page.tsx`](https://github.com/koharu4ever/Kita/blob/main/src/app/%28site%29/games/%5Bslug%5D/page.tsx)
- [`src/app/(payload)/layout.tsx`](https://github.com/koharu4ever/Kita/blob/main/src/app/%28payload%29/layout.tsx)
- [`src/app/(payload)/api/[...slug]/route.ts`](https://github.com/koharu4ever/Kita/blob/main/src/app/%28payload%29/api/%5B...slug%5D/route.ts)
- [`src/app/(payload)/api/graphql/route.ts`](https://github.com/koharu4ever/Kita/blob/main/src/app/%28payload%29/api/graphql/route.ts)

### 服务端读取

- [`src/server/payload/get-payload.ts`](https://github.com/koharu4ever/Kita/blob/main/src/server/payload/get-payload.ts)
- [`src/server/games/get-games.ts`](https://github.com/koharu4ever/Kita/blob/main/src/server/games/get-games.ts)
- [`src/server/reviews/get-reviews.ts`](https://github.com/koharu4ever/Kita/blob/main/src/server/reviews/get-reviews.ts)
- [`src/server/tools/get-tools.ts`](https://github.com/koharu4ever/Kita/blob/main/src/server/tools/get-tools.ts)

### Payload

- [`src/payload/collections/games.ts`](https://github.com/koharu4ever/Kita/blob/main/src/payload/collections/games.ts)
- [`src/payload/collections/reviews.ts`](https://github.com/koharu4ever/Kita/blob/main/src/payload/collections/reviews.ts)
- [`src/payload/collections/tools.ts`](https://github.com/koharu4ever/Kita/blob/main/src/payload/collections/tools.ts)
- [`src/payload/collections/media.ts`](https://github.com/koharu4ever/Kita/blob/main/src/payload/collections/media.ts)
- [`src/payload/collections/users.ts`](https://github.com/koharu4ever/Kita/blob/main/src/payload/collections/users.ts)

### Mapper / model

- [`map-game-document-to-game-detail.ts`](https://github.com/koharu4ever/Kita/blob/main/src/features/games/utils/map-game-document-to-game-detail.ts)
- [`game-detail.ts`](https://github.com/koharu4ever/Kita/blob/main/src/features/games/types/game-detail.ts)
- [`map-review-document-to-review-preview.ts`](https://github.com/koharu4ever/Kita/blob/main/src/features/reviews/utils/map-review-document-to-review-preview.ts)
- [`map-tool-document-to-toolkit-item.ts`](https://github.com/koharu4ever/Kita/blob/main/src/features/tools/utils/map-tool-document-to-toolkit-item.ts)

### Media 与配置

- [`src/config/env.ts`](https://github.com/koharu4ever/Kita/blob/main/src/config/env.ts)
- [`src/config/media-storage.ts`](https://github.com/koharu4ever/Kita/blob/main/src/config/media-storage.ts)
- [`.env.example`](https://github.com/koharu4ever/Kita/blob/main/.env.example)

### Migration

- [`src/migrations/index.ts`](https://github.com/koharu4ever/Kita/blob/main/src/migrations/index.ts)
- [`20260721_131302_add_media_and_game_cover.ts`](https://github.com/koharu4ever/Kita/blob/main/src/migrations/20260721_131302_add_media_and_game_cover.ts)
- [`20260722_172809.ts`](https://github.com/koharu4ever/Kita/blob/main/src/migrations/20260722_172809.ts)

### 基础设施

- [`.devcontainer/devcontainer.json`](https://github.com/koharu4ever/Kita/blob/main/.devcontainer/devcontainer.json)
- [`Dockerfile`](https://github.com/koharu4ever/Kita/blob/main/Dockerfile)
- [`compose.yaml`](https://github.com/koharu4ever/Kita/blob/main/compose.yaml)
- [`compose.dev.yaml`](https://github.com/koharu4ever/Kita/blob/main/compose.dev.yaml)
- [`docker-entrypoint.sh`](https://github.com/koharu4ever/Kita/blob/main/docker-entrypoint.sh)
- [`scripts/assert-dev-workspace-user.mjs`](https://github.com/koharu4ever/Kita/blob/main/scripts/assert-dev-workspace-user.mjs)
- [`.github/workflows/ci.yml`](https://github.com/koharu4ever/Kita/blob/main/.github/workflows/ci.yml)

### Backup

- [`docker/postgres-backup/backup.sh`](https://github.com/koharu4ever/Kita/blob/main/docker/postgres-backup/backup.sh)
- [`docker/postgres-backup/tests/backup.test.sh`](https://github.com/koharu4ever/Kita/blob/main/docker/postgres-backup/tests/backup.test.sh)
- [`docker/postgres-backup/README.md`](https://github.com/koharu4ever/Kita/blob/main/docker/postgres-backup/README.md)

### 当前事实文档

- [`docs/current-project-status.md`](https://github.com/koharu4ever/Kita/blob/main/docs/current-project-status.md)
- [`docs/project-structure.md`](https://github.com/koharu4ever/Kita/blob/main/docs/project-structure.md)
- [`docs/CODEX_HANDOFF.md`](https://github.com/koharu4ever/Kita/blob/main/docs/CODEX_HANDOFF.md)
- [`docs/development-production-alignment.md`](https://github.com/koharu4ever/Kita/blob/main/docs/development-production-alignment.md)
- [`docs/kita-technical-decisions-and-tradeoffs-2026-07-16.md`](https://github.com/koharu4ever/Kita/blob/main/docs/kita-technical-decisions-and-tradeoffs-2026-07-16.md)
- [`docs/kita-disaster-recovery-inventory-and-rebuild-runbook-2026-07-16.md`](https://github.com/koharu4ever/Kita/blob/main/docs/kita-disaster-recovery-inventory-and-rebuild-runbook-2026-07-16.md)

### 关键官方参考

- [Payload Local API](https://payloadcms.com/docs/local-api/overview)
- [Payload Local API Access Control](https://payloadcms.com/docs/local-api/access-control)
- [Payload Migrations](https://payloadcms.com/docs/database/migrations)
- [Payload Postgres](https://payloadcms.com/docs/database/postgres)
- [Payload Select](https://payloadcms.com/docs/queries/select)
- [Payload Depth](https://payloadcms.com/docs/queries/depth)
- [Payload Production API Abuse Prevention](https://payloadcms.com/docs/production/preventing-abuse)
- [Payload Storage Adapters](https://payloadcms.com/docs/upload/storage-adapters)
- [Next.js Metadata and Request Memoization](https://nextjs.org/docs/app/getting-started/metadata-and-og-images)
- [React `cache`](https://react.dev/reference/react/cache)

---

## 附录 B：建议拆分的具体 PR

### PR 1：docs: add repository entry point

```text
README.md
docs/README.md
标记 current/historical
不改运行代码
```

### PR 2：content: replace scaffold copy

```text
About 真文案
Tools footer
site metadata
空状态
```

### PR 3：refactor: make development data explicit

```text
CLI seed
seed data 独立
类型移出 data
移除 runtime fallback
删除 dev seed HTTP route
```

### PR 4：refactor: make migration ownership explicit

```text
entrypoint / prodMigrations 二选一
同步 Docker/docs/tests
```

### PR 5：refactor: split list and detail queries

```text
GameCard
ReviewCardModel
Payload select/populate
React cache
```

### PR 6：security: narrow Payload public surface

```text
explicit writes
GraphQL disable
maxDepth
slug/URL validation
shared Lexical config
```

### PR 7：test: add PostgreSQL/Payload integration smoke

```text
fresh migration
published read
Media relation
auth write
```

### PR 8：ops: verify PostgreSQL restore

```text
无生产修改
下载一份备份
隔离 PG16 restore
验证并记录
```

### PR 9：feat: migrate Reviews cover to Media

```text
兼容阶段
生产内容迁移
清理阶段
```

### PR 10：fix: close visual lifecycle gaps

```text
Lightbox focus
WebGL texture cleanup
页面 error/not-found
```

---

**报告结束。**
