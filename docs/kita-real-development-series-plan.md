# Kita 真实开发与维护系列计划

> 建立日期：2026-08-04  
> 性质：内部事实索引，不参与 Hexo 发布。  
> 写作基线：`C:\dev\Kita` 的 clean `main`，HEAD `448220d`（2026-07-23，PR #19）。  
> 目标：用提交、源码、故障日志和未完成状态纠正前三套系列过于规整的“教程感”。

## 1. 系列定位

```text
技术选择系列
  为什么选择与舍弃

工程案例系列
  一个任务怎样配置、执行、验证、回滚

从零理解系列
  初学者需要的概念、文件和命令

真实开发与维护系列
  实际什么时候发生、哪里失败、现在还缺什么
```

本系列不把建议写成现状，不虚构项目所有者当时的情绪和错误尝试。能由 commit、源码、生产记录或状态文档证明的事实才使用确定语气；其余内容明确标记为判断、建议或未知。

## 2. 十篇文章

| 顺序 | 文件 | 主要证据 | 状态 |
|---|---|---|---|
| 1 | `source/_posts/kita-real-timeline.md` | Git log、关键 commit stats、当前状态 | 已完成 |
| 2 | `source/_posts/kita-real-503-incident.md` | `games-production-runtime-dependency-incident.md`、Dockerfile、entrypoint | 已完成 |
| 3 | `source/_posts/kita-real-data-model.md` | 五个当前 Collection、getter、mapper、Media 评估 | 已完成 |
| 4 | `source/_posts/kita-real-request-path.md` | Games route/getter/mapper、Payload config、Compose | 已完成 |
| 5 | `source/_posts/kita-real-content-workflow.md` | Media/Games schema、Admin 迁移记录、当前内容待办 | 已完成 |
| 6 | `source/_posts/kita-real-security-boundaries.md` | access config、env、Compose、backup hardening、官方 Payload 文档 | 已完成 |
| 7 | `source/_posts/kita-real-upgrade-maintenance.md` | package、lockfile、CI、Dev Container、Dockerfile、OpenList 边界 | 已完成 |
| 8 | `source/_posts/kita-real-cost-and-resources.md` | Compose、Coolify/OpenList/DR 文档；不含虚构账单 | 已完成 |
| 9 | `source/_posts/kita-real-sources-and-licenses.md` | Git tree、RainEffect 实施记录、Starter/Bulletproof/OpenList 官方仓库 | 已完成 |
| 10 | `source/_posts/kita-real-unfinished-work.md` | `current-project-status.md`、architecture review、DR runbook | 已完成 |

“已完成”只表示 Markdown 已进入本地 Hexo 源码，不表示部署或发布。

## 3. 关键事实基线

- Git 历史从 `cd3aa03`（2026-06-13）开始，当前 HEAD 为 `448220d`；
- 当前 Collections：Users、Media、Tools、Reviews、Games；
- Games.cover 已是必填 Media relationship，生产 6 条 Games 已完成 Media-only 迁移；
- Reviews.coverImage 仍是 text，Reviews.gameTitle 仍不是 relationship；
- Local API getter 使用 `overrideAccess: false` 并显式筛选 published；
- Payload 默认 write access 要求认证，但 Games/Reviews/Tools 尚未显式声明 create/update/delete；
- 当前 6 个 production migrations；
- 当前 47 个 Vitest + 4 个 backup shell cases；
- PostgreSQL backup sidecar 已产生真实 R2 dump；
- PostgreSQL restore、R2 Media restore、Coolify/VPS 端到端恢复尚未闭环；
- OpenList 是独立 Coolify Application，Kita 只保存公开 URL；
- 根目录当前没有 README、LICENSE、NOTICE 或完整素材来源 inventory；
- Codrops RainEffect 的改造代码与最小贴图已经进入 Kita，需要对外第三方说明；
- VPS 规格和真实月账单没有记录，成本文章不能给出数字结论。

## 4. 写作约束

- 不统一套用“概念—优点—缺点—总结”模板；
- 尽量用 commit、路径、日志和数据状态开篇；
- 不伪造“我当时先尝试了某命令”之类没有证据的经历；
- 历史文档与当前源码冲突时，明确区分当时方案和现在实现；
- 对 Secret、账号、VPS、账单和私人恢复材料只写边界，不写真实值；
- 安全和许可证使用官方来源，并保留“不是法律意见”等适当限制；
- 对未完成事项使用现在时，不把建议冒充完成状态；
- 文章可以长度不同，也可以没有相同导航结构。

## 5. 外部来源核对

- Payload Access Control：`https://payloadcms.com/docs/access-control/overview`
- Payload Local API access：`https://payloadcms.com/docs/local-api/access-control`
- w3cj/next-start：GitHub 标注 MIT；
- alan2207/bulletproof-react：MIT；
- Codrops/RainEffect：README 的 Codrops custom license，允许集成/改造但限制原样再发布；
- OpenListTeam/OpenList：AGPL-3.0；
- AdingApkgg/blog 与 home：当前文章只视作视觉参考，没有在无法核对 LICENSE 时声称可复制。

## 6. 后续更新方式

本系列记录时间点，不把历史文章不断改写成最新状态。重大状态变化采用：

```text
原文保留当时事实
  -> 在相关章节增加带日期的实施更新
  -> 同步 current status 类文章
  -> 不删除当时的失败和未完成记录
```

需要重点回访的触发事件：restore drill 完成、Secret 轮换、Reviews Media 迁移、OpenList storage 定型、根 LICENSE/NOTICE 决策、VPS 拆分或实际成本发生明显变化。

