---
title: 从本地文件夹到 GitHub：第一次建仓库和 Push
date: 2026-08-04 16:35:00
cover: /img/covers/git-first-push.webp
description: 从 Git 与 GitHub 的区别开始，解释 git init、第一次 commit、remote、origin、认证与第一次 push。
tags:
  - Git
  - GitHub
  - 初学者
categories:
  - Kita 从零理解
series: Kita 从零理解
---

> 这是“从零读懂 Kita”系列的第八篇。这里不假设读者已经会 Git，而是从“我的电脑里有一个项目文件夹”开始。

## Git 和 GitHub 不是一件事

**Git** 是运行在本地的版本管理工具。即使断网，我也可以创建提交、查看差异和切换分支。

**GitHub** 是托管 Git 仓库的远程平台，同时提供 Pull Request、Actions、Ruleset 和协作界面。

```text
本地文件夹
  └─ Git 仓库：版本历史在本机
       └─ GitHub 仓库：远程副本与协作入口
```

所以“在 GitHub 新建了仓库”不会自动把本地文件上传；“运行了 `git init`”也不会自动创建 GitHub 页面。

## 第一步不是 `git add .`，而是检查边界

项目第一次进入版本管理前，我先准备 `.gitignore`，并检查这些内容不能提交：

- `.env` 和真实密钥；
- `node_modules/`、`.next/` 等可重新生成目录；
- 本地上传缓存和数据库 dump；
- 编辑器、操作系统产生的临时文件。

Kita 会提交 `.env.example`，因为它只说明变量名称和用途，不包含真实凭据。

## 场景一：项目先存在于本地

在项目根目录中初始化 Git：

```bash
git init -b main
git status
```

`-b main` 指定第一个分支叫 `main`。`git status` 用来确认 Git 看到哪些文件。

然后有选择地暂存并检查：

```bash
git add -- package.json pnpm-lock.yaml src .devcontainer .github
git diff --cached
git commit -m "chore: initialize project"
```

`git add` 只是把内容放入暂存区，不是上传；`git commit` 才会在本地历史中形成一个版本。第一次提交范围较大时，更应该先阅读 `git diff --cached`。

## 在 GitHub 创建空仓库

GitHub 官方建议：把已有本地项目导入时，远程仓库先不要自动生成 README、license 或 `.gitignore`，这样可以避免第一次推送前就出现两套无关历史。完整步骤见 [Adding locally hosted code to GitHub](https://docs.github.com/en/migrations/importing-source-code/using-the-command-line-to-import-source-code/adding-locally-hosted-code-to-github)。

远程空仓库建好后，在本地连接它：

```bash
git remote add origin https://github.com/<account>/<repository>.git
git remote -v
git push -u origin main
```

Kita 当前公开仓库的地址是：

```text
https://github.com/koharu4ever/Kita.git
```

## `origin`、`main` 和 `-u` 分别是什么

- `origin`：本地给这个远程仓库起的常用别名，不是 GitHub 的特殊账号；
- `main`：正在推送的本地分支；
- `-u`：把本地 `main` 与远程 `origin/main` 建立默认跟踪关系。

设置以后，Git 才知道当前分支默认应该从哪里 pull、向哪里 push。

## 第一次 Push 实际上传了什么

push 上传的是 Git commit 和它们指向的文件版本，不是把硬盘目录原样复制过去。

因此：

- 没有 commit 的改动不会被 push；
- 被 `.gitignore` 排除的文件通常不在 commit 中；
- 本地构建缓存不应该因为 push 出现在 GitHub；
- commit 一旦含有密钥，之后删文件并不能保证密钥从历史中消失，必须立刻轮换密钥。

## GitHub 认证不是输入账号密码

GitHub 的命令行认证通常通过浏览器凭据管理器、Personal Access Token、SSH key 或 GitHub CLI 完成。不要把 token 写进 remote URL、脚本、截图或文档。

认证失败时应先确认使用的是 HTTPS 还是 SSH，再检查对应凭据；不要通过关闭安全检查解决。

## 场景二：远程仓库已经有历史

如果 GitHub 上已经存在要保留的代码和提交，应当先 clone：

```bash
git clone https://github.com/<account>/<repository>.git
cd <repository>
```

然后在 clone 出来的目录中工作。不要在另一个文件夹里重新 `git init`，再强行覆盖远程历史。

这也是这个 Hexo 站迁移时必须保持谨慎的原因：旧线上仓库已经有需要审查的静态产物，不能把新源码骨架当作一个全新空仓库直接推上去。

## 地址填错了怎样修

不需要删除 `.git` 或重新初始化：

```bash
git remote -v
git remote set-url origin https://github.com/<account>/<correct-repository>.git
git remote -v
```

先核对，再修正，再核对。

## 第一次 Push 之后还缺什么

只有 `main` 和远程副本，还没有形成安全工作流。下一步要建立功能分支、Pull Request、自动检查和 main 保护规则，让“能上传”变成“能长期维护”。

## 系列导航

- 上一篇：[我一开始不懂 Migration](/2026/08/04/kita-basics-migrations/)
- 下一篇：[分支、Commit 和 Pull Request 到底各管哪一步](/2026/08/04/kita-basics-branch-commit-pr/)
- 工程案例起点：[在 Windows 上为 Next.js 配置 Dev Container](/2026/08/04/kita-case-devcontainer-setup/)
