# Kita 从零理解系列维护计划

> 建立日期：2026-08-04  
> 性质：内部编辑、事实来源与维护索引，不参与 Hexo 发布。  
> 目标：让第一次接触真实 Next.js 项目的读者，能够读懂 Kita 的目录、配置、数据、Git 流程和运行边界，再进入技术选择与工程案例系列。

## 1. 三套系列的分工

```text
Kita 技术选择
  回答为什么采用或放弃一种技术

Kita 工程案例
  回答一个具体任务修改什么、怎样验证和回滚

Kita 从零理解
  解释阅读前必需的术语、文件、命令和心智模型
```

基础系列不能写成通用术语词典。每篇必须使用 Kita 当前文件或真实工程变化举例，并链接到可以继续实操的工程案例。

## 2. 十二篇文章与事实来源

| 顺序 | 发布文件 | 核心内容 | 主要事实来源 | 状态 |
|---|---|---|---|---|
| 1 | `source/_posts/kita-basics-read-repository.md` | 阅读顺序、源码/生成物/数据 | 根目录、`.gitignore`、`docs/` | 已完成 |
| 2 | `source/_posts/kita-basics-package-json-pnpm.md` | package、script、依赖、lockfile | `package.json`、`pnpm-lock.yaml` | 已完成 |
| 3 | `source/_posts/kita-basics-config-files.md` | TypeScript、ESLint、Prettier、Next、ignore | 根配置文件 | 已完成 |
| 4 | `source/_posts/kita-basics-project-structure.md` | App Router、feature、server、Payload 边界 | `src/`、`project-structure.md` | 已完成 |
| 5 | `source/_posts/kita-basics-environment-variables.md` | 本地/构建/运行变量与 secret | `.env.example`、环境配置模块 | 已完成 |
| 6 | `source/_posts/kita-basics-payload-postgres.md` | CMS、Collection、CRUD、adapter、Local API | `payload.config.ts`、Collections、server 层 | 已完成 |
| 7 | `source/_posts/kita-basics-migrations.md` | schema、migration、seed、backup | `src/migrations/`、Media 迁移记录 | 已完成 |
| 8 | `source/_posts/kita-basics-git-github-first-push.md` | Git、GitHub、init、remote、first push | `.git/config`、GitHub 官方文档 | 已完成 |
| 9 | `source/_posts/kita-basics-branch-commit-pr.md` | 工作区、暂存区、分支、PR、main | Git/PR 工作流文档 | 已完成 |
| 10 | `source/_posts/kita-basics-github-actions-ruleset.md` | CI、workflow、check、ruleset | `.github/workflows/ci.yml`、测试指南 | 已完成 |
| 11 | `source/_posts/kita-basics-command-guide.md` | pnpm、Payload、Docker、Git 命令边界 | `package.json`、compose 与 scripts | 已完成 |
| 12 | `source/_posts/kita-basics-runtime-layers.md` | 开发、依赖、构建、运行、数据、恢复 | Docker/Coolify/backup 全链路文档 | 已完成 |

“已完成”表示文章已进入本地 Hexo 源码并可构建，不表示部署或远程发布。

## 3. 写作规则

- 第一次出现术语时用普通语言解释，再给英文原词；
- 先说明它解决的问题，再展示命令或文件；
- 命令必须标注只读、本地写入、数据写入或远程写入边界；
- 当前源码优先于早期计划文档，历史变化要明确使用过去时；
- 不假设读者已理解 Git、Docker、数据库或环境变量；
- 不把 destructive command 写成普通清理手段；
- 不发布真实 secret、VPS IP、数据库凭据和恢复凭据；
- 外部行为易变化时链接官方文档，不复制过长界面步骤；
- 每篇结尾连接上一篇、下一篇和至少一个真实案例。

## 4. 当前工程事实基线

文章完成时使用以下基线：

- Node 22、pnpm 10.28.2、Next.js 16.2.7、Payload 3.85.1、TypeScript 6.0.3；
- Dev Container 使用 DIND，并为 `node_modules` 与 `.next` 配置两个 targeted named volume；
- `src/migrations/` 当前有六个 migration；
- 当前自动测试基线为 47 个 unit cases 和 4 个 backup shell cases；
- Payload Media 已完成生产迁移，生产对象存储使用 R2；
- Coolify production Compose 已运行；
- PostgreSQL backup sidecar 已产生真实 R2 备份对象；
- PostgreSQL、R2 Media 与 VPS 的完整 restore drill 尚未闭环；
- 本系列引用的公开 Kita remote 为 `https://github.com/koharu4ever/Kita.git`。

这些数字和完成度属于时间快照。Kita 升级依赖、增加 migration 或完成恢复演练后，需要同步复核相关文章。

## 5. 发布前复核

```text
[ ] 十二篇 front matter 能被 Hexo 解析
[ ] 系列内链接全部指向实际 permalink
[ ] 外部文档只使用官方来源
[ ] 命令与当前 package.json scripts 一致
[ ] 没有真实 secret、IP、用户名或本地私人路径
[ ] 所有“已完成”状态可由当前源码或记录证明
[ ] pnpm build 在 Dev Container 中通过
[ ] 桌面和窄屏至少各抽查一篇长文
```

## 6. 后续维护方式

当 Kita 的技术或流程变化时，先更新权威配置和内部工程文档，再更新相关案例，最后复核基础文章中的事实。基础文章应当保持心智模型稳定，具体版本号、migration 数量、测试数量和完成状态则按事实更新。

