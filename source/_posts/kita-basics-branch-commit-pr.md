---
title: 分支、Commit 和 Pull Request 到底各管哪一步
date: 2026-08-04 16:40:00
cover: /img/covers/git-branch-commit-pr.webp
description: 用 Kita 的真实开发流程解释工作区、暂存区、本地分支、远程分支、Pull Request 与 main。
tags:
  - Git
  - GitHub
  - Pull Request
  - 初学者
categories:
  - Kita 从零理解
series: 从零读懂 Kita
---

> 这是“从零读懂 Kita”系列的第九篇。第一次 push 只建立远程副本；真正的日常维护，需要先分清代码在 Git 流程中的位置。

## 我最初把六个位置混成了一件事

```text
工作区
  ↓ git add
暂存区
  ↓ git commit
本地功能分支
  ↓ git push
远程功能分支
  ↓ 创建 Pull Request
PR：审查 + 自动检查
  ↓ merge
远程 main
```

每个箭头都要主动执行。保存文件不会自动 commit，commit 不会自动 push，push 到功能分支也不会自动进入 main。

## 分支不是复制一份项目文件夹

branch 是一个指向提交历史位置的轻量引用。创建功能分支，意思是“从当前 main 的某个 commit 开始记录另一条变化”，不是手工复制整个目录。

Kita 的任务分支使用清楚、短小的名称，例如：

```text
codex/media-migration
codex/backup-docs
```

名称不是关键机制，但它应当让人一眼知道这条分支解决什么问题。

## 一次完整的小任务怎样开始

先更新对远程的认识，再从远程 main 创建新分支：

```bash
git fetch origin
git switch -c codex/short-task-name origin/main
```

`fetch` 只下载远程信息，不自动改我的工作文件；`switch -c` 创建并切换新分支。

完成一小段修改后先看证据：

```bash
git status
git diff
```

然后只暂存这次任务需要的文件：

```bash
git add -- src/path/to/file.ts docs/related-note.md
git diff --cached
git diff --check
git commit -m "feat: describe the actual change"
```

- `git diff` 看尚未暂存的改动；
- `git diff --cached` 看下一个 commit 会包含什么；
- `git diff --check` 检查多余空白等基础问题。

## Commit 应该表达一个可理解的变化

commit 不是存盘按钮，而是历史中的一个说明节点。

好的 commit 不要求极端小，但最好满足：

- 目的单一；
- 代码、测试和相关文档能一起解释；
- 消息描述结果，不写“update files”；
- 如果失败，可以单独定位或撤销。

## Push 功能分支

```bash
git push -u origin codex/short-task-name
```

这会创建远程功能分支，但 main 仍然没有变化。接着在 GitHub 创建 Pull Request：

```text
base: main
compare: codex/short-task-name
```

Pull Request 不是另一个 Git commit。它是围绕一组 commit 展示差异、说明目的、运行 checks、记录审查和决定是否合并的协作对象。GitHub 的官方入口在 [Managing pull requests](https://docs.github.com/en/pull-requests/reference/managing-and-standardizing-pull-requests)。

## 一个人开发，为什么还要 PR

Kita 的 Coolify 生产部署跟踪 `main`。如果我直接把试验代码推到 main，就把“保存远程副本”和“准备发布”混成了一个动作。

即使只有一个开发者，PR 仍然提供：

- 一页完整 diff；
- CI 检查结果；
- 设计和排错理由；
- main 的清晰边界；
- 合并前最后一次停止机会。

PR 的价值不是假装有一个团队，而是把我的操作从即时反应变成可审查流程。

## 合并以后怎样同步本地

```bash
git switch main
git pull --ff-only origin main
git branch -d codex/short-task-name
```

`--ff-only` 要求本地 main 没有偷偷分叉；如果不能快进，Git 会停下来让我先理解状态，而不是自动制造一次意外 merge。

远程功能分支可以在 PR 合并后由 GitHub 删除。本地分支确认已合并后再删除。

## 常见误解

- `git add` 不是添加新文件专用，它选择下一个 commit 的内容；
- `git commit` 只写入本地；
- `git push` 不一定推 main，它推当前指定分支；
- PR 不是 Git 的本地功能，它由 GitHub 承载；
- merge PR 后，本地 main 不会自动更新；
- 未跟踪文件不会出现在普通 `git diff` 中，要同时看 `git status`。

## 出错时怎样小步恢复

### 文件暂存错了

```bash
git restore --staged -- path/to/file
```

它只把文件移出暂存区，不删除工作区内容。

### Commit 后发现小问题

修正文件，重新检查，再创建一个清楚的新 commit。对已经 push、正在审查的分支，这通常比重写历史更容易理解。

### PR 方向或内容不对

先停止合并。可以继续向同一分支提交修复，也可以关闭 PR 后从正确基点重新开分支。

### 已经合并到 main

不要用强制 push 改写共享历史。先确认影响，再用 revert commit 撤销，保留事件记录。

## 我提交前的最小清单

```text
[ ] 当前分支不是 main
[ ] git status 的范围符合任务
[ ] git diff 和 git diff --cached 已阅读
[ ] 没有 .env、密钥或生成目录
[ ] 相关检查已运行
[ ] PR base 是 main
[ ] checks 通过后再 merge
```

下一篇继续解释 PR 页面上的绿色或红色 Checks 从哪里来，以及 Ruleset 为什么可以阻止绕过流程。

## 系列导航

- 上一篇：[从本地文件夹到 GitHub](/2026/08/04/kita-basics-git-github-first-push/)
- 下一篇：[GitHub Actions、Checks 和 Ruleset 是怎样连起来的](/2026/08/04/kita-basics-github-actions-ruleset/)
- 相关案例：[Dev Container、DIND 与 PostgreSQL](/2026/08/04/kita-case-devcontainer-dind-postgres/)
