# Kita 工程案例系列维护计划

> 建立日期：2026-08-04  
> 性质：内部编辑与事实维护索引，不参与 Hexo 发布。  
> 目标：把 `C:\dev\Kita` 中已经实施或明确规划的工程记录，整理成可复用、可验证、不过度暴露生产信息的案例文章。

## 1. 与技术选择系列的分工

两套系列不能互相替代：

```text
Kita 技术选择
  回答为什么选择、有哪些舍取、项目怎样演进

Kita 工程案例
  回答修改哪些文件、配置怎样写、怎样验证、怎样失败、怎样回滚
```

技术选择文章保持相对稳定；工程案例会随着 Next.js、Payload、Coolify、Cloudflare 和当前源码变化而需要复核。

## 2. 八篇文章与事实来源

| 顺序 | 发布文件 | 核心事实来源 | 状态 |
| --- | --- | --- | --- |
| 1 | `source/_posts/kita-case-devcontainer-setup.md` | `.devcontainer/devcontainer.json`、`package.json`、`docker-devcontainer-project-explained.md` | 已完成 |
| 2 | `source/_posts/kita-case-devcontainer-dind-postgres.md` | `compose.yaml`、`compose.dev.yaml`、`package.json`、`development-production-alignment.md` | 已完成 |
| 3 | `source/_posts/kita-case-windows-nextjs-performance.md` | `local-development-performance-remediation-2026-07-14.md`、`assert-dev-workspace-user.mjs` | 已完成 |
| 4 | `source/_posts/kita-case-payload-media-r2.md` | `media-storage.ts`、`media.ts`、`payload.config.ts`、两份 Media migration、Media 评估文档 | 已完成 |
| 5 | `source/_posts/kita-case-vps-coolify-deployment.md` | `compose.yaml`、`Dockerfile`、`deployment-roadmap.md`、`CODEX_HANDOFF.md` | 已完成 |
| 6 | `source/_posts/kita-case-postgres-r2-backup.md` | `docker/postgres-backup`、`compose.yaml`、`postgres-r2-backup-workflow.md` | 已完成 |
| 7 | `source/_posts/kita-case-production-runtime-dependency.md` | `games-production-runtime-dependency-incident.md`、生产 Dockerfile/entrypoint 运行边界 | 已完成 |
| 8 | `source/_posts/kita-case-restore-drill.md` | 灾难恢复 Runbook、`current-project-status.md`、`CODEX_HANDOFF.md` | 已完成 |

“已完成”只表示文章已经进入 Hexo 源码并可本地预览，不表示部署，也不表示其中尚未执行的生产演练已经完成。

## 3. 每篇工程案例的固定结构

```text
问题与目标
  -> 当前架构或文件边界
  -> 前置条件
  -> 配置与代码片段
  -> 执行顺序
  -> 自动与人工验证
  -> 常见故障
  -> 回滚和安全边界
  -> 当前真实完成度
```

文章不能只复制完整配置文件。每段配置必须说明它解决什么问题，以及删除它会产生什么影响。

## 4. 安全规则

- 不发布真实 VPS IP、数据库密码、Payload secret、R2 access key、SSH key、recovery code 或密码管理器结构细节；
- 域名可以使用已经公开的站点地址，其他值使用明确占位符；
- 不把生产删除、volume 清理和 secret 轮换写成可以无检查复制的快捷命令；
- restore 必须明确使用隔离空数据库，不能把生产 URI 放进示例；
- 记录 Coolify 或 Cloudflare 操作时，区分平台界面事实与仓库配置事实；
- 软件界面和安装命令可能变化，发布前重新核对官方文档；
- 早期计划不能冒充当前实施状态。

## 5. 当前状态边界

写作时使用以下现状：

- Dev Container + DIND + 两个 targeted volume 已运行；
- `pnpm dev` 自动启动并等待 PostgreSQL；
- Coolify Compose Production 已运行；
- Payload Media + R2 已完成生产迁移与 redeploy smoke；
- PostgreSQL backup sidecar 已运行并产生真实 R2 对象；
- C 盘全新 clone 与开发环境重建已完成；
- PostgreSQL 真实 restore drill 尚未完成；
- R2 Media 独立恢复尚未完成；
- Coolify/VPS 端到端恢复尚未完成；
- OpenList 最终 storage/data backup 尚未定型。

## 6. 后续维护方式

当 `C:\dev\Kita` 出现相关变更时，按下面顺序更新：

1. 先更新 Kita 项目事实文档；
2. 再核对当前源码与生产已验证状态；
3. 判断变化属于决策、配置、故障还是恢复边界；
4. 只更新受影响的工程案例；
5. 在 Dev Container 中重新构建 Hexo；
6. 本地检查代码块、表格、内部链接和长页面宽度；
7. 未得到明确授权前不部署。

