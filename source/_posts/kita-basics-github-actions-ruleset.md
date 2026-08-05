---
title: GitHub Actions、Checks 和 Ruleset 是怎样连起来的
date: 2026-08-04 16:45:00
cover: /img/covers/github-actions-ruleset.webp
description: 从一次 Pull Request 出发，解释 CI、workflow、job、step、check 与 main 分支保护之间的关系。
tags:
  - GitHub Actions
  - CI
  - Ruleset
  - 初学者
categories:
  - Kita 从零理解
series: Kita 从零理解
---

> 这是“从零读懂 Kita”系列的第十篇。上一章把代码送进 Pull Request；这一章解释 PR 页面上的自动检查怎样产生，以及为什么检查失败时 main 可以拒绝合并。

## CI 解决的不是“我忘了点按钮”

CI 是 Continuous Integration，持续集成。它把项目约定的检查放进一个新的、可重复的环境中执行。

我本地运行过测试当然重要，但 GitHub Actions 还能验证：

- 仓库刚 clone 下来是否能安装；
- lockfile 是否真的完整；
- 没有依赖我电脑里的隐藏文件；
- Pull Request 中的 commit 是否通过相同检查；
- main 是否只接收满足规则的变化。

CI 不证明软件永远没有 bug。它只对 workflow 中明确执行的检查负责。

## 四个名词分别在哪一层

```text
.github/workflows/ci.yml
  └─ Workflow：什么时候运行整套流程
       └─ Job：在哪种机器上完成一组工作
            └─ Step：checkout、install、test、build……

Workflow 运行结果
  └─ Check：显示在 Commit 和 Pull Request 上

Ruleset
  └─ 要求指定 Check 通过，才允许进入 main
```

Actions 是执行平台，Checks 是结果表现，Ruleset 是合并门槛。三者相关，但不是同一个功能。

## Kita 的 Workflow 在做什么

Kita 的 `.github/workflows/ci.yml` 会在 Pull Request 和 main 的 push 上运行。它的核心过程可以理解为：

1. checkout 当前 commit；
2. 准备 Node 和 pnpm；
3. 按 lockfile 安装依赖；
4. 运行格式、lint、类型、单元测试和 build 等检查；
5. 把结果报告给 GitHub。

workflow 还会设置最小只读权限，并用 concurrency 取消同一分支上已经过期的旧运行。这样连续 push 修复时，不必让三份旧代码继续浪费时间。

## 为什么 CI 不连接生产数据库

Kita 的普通 PR 检查不应该持有生产数据库、R2 或 Payload 管理员凭据。

原因很直接：

- PR 代码还没有通过审查；
- 测试可能创建或删除数据；
- 日志和第三方 action 会扩大秘密暴露面；
- CI 的目标是验证代码，不是修改生产状态。

需要环境变量时，Kita 提供无权限、无生产价值的占位配置，让 import 和 build 能完成。真正需要数据库的集成测试应连接专用的短生命周期测试服务，而不是生产资源。

## 本地 Script 与 CI Step 的关系

`package.json` 中定义真正的项目命令，例如：

```bash
pnpm check
pnpm test
pnpm build
```

workflow 应该调用这些命令，而不是在 YAML 中复制另一套检查逻辑。这样本地和 GitHub 执行的是同一入口：

```text
本地开发者 ─┐
            ├─ package.json scripts ─ 检查代码
GitHub CI ──┘
```

如果 CI 失败，我可以先在 Dev Container 内运行同一 script，而不是猜 Actions 有什么神秘行为。

## Ruleset 为什么还需要配置

仅仅有 workflow，不代表它能阻止直接 push 或带着红色 check 合并。Ruleset 才负责保护目标分支。

Kita 对 main 的合理规则包括：

- 必须通过 Pull Request；
- 必须通过名为 `quality` 的 required check；
- 禁止删除 main；
- 禁止 force push；
- 单人项目可以把 required approvals 设为 0，但仍保留 PR 和 CI 门槛。

GitHub 的界面名称可能继续变化，官方规则能力以 [Available rules for rulesets](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/available-rules-for-rulesets) 为准。

## 为什么单人项目可以是 0 个 Approval

“必须 PR”与“必须另一个人批准”是两项不同规则。

Kita 现在主要由我维护。如果强制一名他人 approval，可能让所有小改动停住；设为 0 仍然可以获得完整 diff、CI 和 main 边界。以后有稳定协作者，再把 approval 提高到 1。

这是一种与项目现实相符的取舍，不是关闭审查。

## 一次红色 Check 应该怎样排查

1. 打开失败 job，找到第一条真正失败的 step；
2. 读错误前后的上下文，不只看最后一行 `exit code 1`；
3. 确认失败属于 format、lint、type、test、build 还是环境；
4. 在 Dev Container 运行相同命令；
5. 修复根因，提交新 commit，让同一个 PR 重新检查。

常见情况包括：

- `pnpm-lock.yaml` 没随依赖变化提交；
- 本地文件名大小写在 Linux runner 上不匹配；
- 代码依赖未提交的 `.env`；
- typecheck 发现浏览器与服务器边界错误；
- 测试使用了真实时间、网络或机器路径；
- build 与仍在运行的本地 dev 共用 `.next`，本地复现时互相影响。

## CI 通过后还不代表可以自动部署

绿色 Checks 表示规定的代码检查成功，不表示：

- production migration 已在真实数据副本中验证；
- R2、PostgreSQL、Cloudflare 和域名配置都正确；
- backup 已经成功且可以 restore；
- 这次改动的产品行为符合预期。

高风险发布仍然需要额外清单。自动化应该减少重复劳动，而不是隐藏责任边界。

## 建立规则时的安全顺序

1. 先让 workflow 在普通分支和 PR 上成功运行；
2. 在 GitHub 上确认 check 的准确名称；
3. 再建立针对 main 的 Ruleset；
4. 要求 PR 和该 check；
5. 最后用一个无风险文档 PR 验证流程。

如果先要求一个从未产生过的 check，仓库可能进入谁也无法正常合并的状态。

下一篇把 Kita 中经常出现的命令按目的重新整理。我不希望初学者背一长串命令，而是先知道哪些只读、哪些会写本地、哪些会影响远程或数据。

## 系列导航

- 上一篇：[分支、Commit 和 Pull Request 到底各管哪一步](/2026/08/04/kita-basics-branch-commit-pr/)
- 下一篇：[Kita 常用命令手册：先判断目的，再敲命令](/2026/08/04/kita-basics-command-guide/)
- 相关案例：[Windows、Next.js 与本地性能排错](/2026/08/04/kita-case-windows-nextjs-performance/)
