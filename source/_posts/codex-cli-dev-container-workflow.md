---
title: 把 Codex CLI 放进 Dev Container：一套可复现的写码工作流基座
date: 2026-08-13 23:30:00
cover: /img/covers/codex-cli-dev-container-workflow.webp
description: 不把 Codex CLI 当成新的技术栈，而是把它安装进现有 Dev Container，并建立一套可复现、可验证、可审查和可回滚的日常写码工作流。
categories:
  - 开发笔记
tags:
  - Codex CLI
  - Dev Container
  - AI Coding
  - Docker
  - 开发环境
notes_index: true
random: false
---

Codex CLI 对我来说不是新的项目架构，也不是必须学习的一整套 Agent 平台。

它只是现有写码工作流里新增的一层：

```text
我定义任务和边界
        ↓
Codex 读取仓库、修改代码、运行工具
        ↓
测试、检查 diff、代码审查
        ↓
我决定是否接受并提交
```

这里所说的 **production-ready**，不是让 AI 直接操作生产服务器，而是让这套开发工作流满足几个基本条件：

- 容器重建后可以复现；
- 登录信息不会进入 Git；
- Codex 与项目使用同一套工具链；
- 每次修改都有明确的验证方式；
- 最终 diff 和 commit 仍由我负责。

<!-- more -->

## 一、让 Codex 运行在真实开发环境里

我的开发环境是：

```text
Windows Host
├── VS Code
├── Docker
└── Dev Container
    ├── 项目源码
    ├── Node / pnpm
    ├── Git
    ├── lint / typecheck / test
    └── Codex CLI
```

因此 Codex CLI 也应该安装在 Dev Container 里，而不是只安装在 Windows Host。

这样 Codex 运行的：

```bash
pnpm lint
pnpm typecheck
pnpm test
```

和我手动运行的是同一套命令、同一套依赖和同一个 Linux 环境。Codex CLI 本身就是围绕本地仓库设计的：读取文件、修改代码，并调用当前环境里已经安装的开发工具。

## 二、把 Codex 固定进 Dev Container

我的主力容器本来就有 Node.js，因此使用官方 npm 包安装 Codex，并固定版本，而不是每次重建都自动拉取不可预测的最新版。

在 `.devcontainer/Dockerfile` 中加入：

```dockerfile
ARG CODEX_VERSION

USER root

RUN test -n "${CODEX_VERSION}" \
    && npm install -g "@openai/codex@${CODEX_VERSION}" \
    && install -d -o vscode -g vscode /home/vscode/.codex \
    && codex --version

USER vscode
```

然后在 `.devcontainer/devcontainer.json` 中传入版本：

```jsonc
{
  "build": {
    "dockerfile": "Dockerfile",
    "args": {
      "CODEX_VERSION": "0.147.0"
    }
  },

  "remoteUser": "vscode",

  "mounts": [
    "source=codex-home-${devcontainerId},target=/home/vscode/.codex,type=volume"
  ]
}
```

截至 2026 年 8 月 13 日，npm 上 `@openai/codex` 的 `latest` 是 `0.147.0`，这里把它作为经过验证的固定版本。以后升级时只修改这一处，重新构建容器并完成一次实际任务验证，而不是让每次 Rebuild 都隐式升级。

本文假设容器用户是 `vscode`。如果基础镜像使用的是 `node`、`ubuntu` 或其他用户，需要相应修改用户名和 home 路径。

挂载独立的 `codex-home` volume，是为了在 Rebuild Container 后继续保留：

```text
~/.codex/
├── auth.json
├── config.toml
└── sessions / 其他本地状态
```

如果第一次创建 volume 后出现权限错误，可以在容器中执行一次：

```bash
sudo chown -R "$(id -u):$(id -g)" "$HOME/.codex"
```

也可以把这条命令合并进项目原有的 `postCreateCommand`。

## 三、登录与基础权限

重建并进入容器后：

```bash
codex --version
codex login
codex login status
```

如果 Dev Container 中的浏览器回调无法完成，改用 device code：

```bash
codex login --device-auth
```

登录凭据可能保存在 Codex home 的 `auth.json` 中，也可能由操作系统的 credential store 托管。使用文件存储时，`auth.json` 应当像密码一样处理：不要提交进仓库，不要复制到 issue，也不要放进项目环境变量文件。

我的基础配置只保留两项：

```toml
# ~/.codex/config.toml

approval_policy = "on-request"
sandbox_mode = "workspace-write"
```

这意味着 Codex 可以在当前 workspace 内正常读写和运行命令，越过边界或需要额外权限时再询问，而不是一开始就获得无限权限。进入 CLI 后可以用：

```text
/status
```

检查当前目录、模型、权限策略和 writable roots 是否符合预期。Codex 官方也建议新用户从默认、较严格的权限开始，而不是直接绕过 sandbox 和 approval。

需要注意：Docker 有时会阻止 Codex 在 Linux 中启动内部 sandbox。遇到这种情况，不应该直接使用 `--yolo`。

更合理的处理顺序是：

1. 先确认普通 `workspace-write` 是否真的无法工作；
2. 再决定是否参考官方 secure Dev Container 配置启用嵌套 sandbox；
3. 或者明确把 Dev Container 当作外层隔离边界。

如果容器挂载了宿主机 Docker socket、敏感目录，或者运行在 privileged 模式下，就不能简单认为“进入容器以后 full access 也没关系”。

## 四、给仓库一份短 `AGENTS.md`

Codex 需要知道这个项目长期遵守什么规则。

在仓库根目录运行：

```text
/init
```

然后把自动生成的内容删减成一份短而真实的 `AGENTS.md`：

```md
# AGENTS.md

## Working agreement

- Use pnpm and preserve the existing lockfile.
- Keep changes scoped to the current task.
- Do not perform unrelated refactors.
- Prefer existing project patterns before adding abstractions.
- Ask before adding a new production dependency.
- Do not edit generated files manually.
- After code changes, run lint, typecheck, and relevant tests.
- Never delete or weaken checks merely to make them pass.
- Before finishing, inspect the diff and report remaining risks.
```

`AGENTS.md` 不是第二份架构文档，也不是越长越好。它只应该记录那些每次都希望 Codex 遵守的仓库规则，例如目录边界、运行命令、验证方式和禁止事项。OpenAI 当前也建议保持它简短、准确，并在真实问题反复出现后再增加规则。

## 五、我的日常使用循环

开始任务之前：

```bash
git status
git switch -c task/<task-name>
codex
```

然后先执行：

```text
/status
```

确认 Codex 正在正确的仓库和权限范围内。

给 Codex 的任务不需要复杂的 prompt engineering，只需要五部分：

```text
目标：
这次要得到什么结果。

范围：
允许修改哪些目录或功能。

约束：
哪些行为不能改变，不要做哪些额外重构。

验证：
需要运行哪些 lint、typecheck、test 或 build。

完成条件：
什么状态下可以停止。
```

例如：

```text
目标：
统一登录完成后的 redirect 行为。

范围：
只修改 auth、middleware 和相关测试。

约束：
保持现有公开 API 不变。
不要顺手重构其他 feature。
不要增加新的生产依赖。

验证：
运行 lint、typecheck 和 auth 相关测试。

完成条件：
所有检查通过，不再存在重复的 redirect 实现，
并总结修改内容和剩余风险。
```

任务模式只保留三种：

```text
方向清楚的小中型任务
→ 直接描述任务

实现方式不清楚或涉及架构
→ /plan

方向已经确定、任务较长且有明确完成条件
→ /goal
```

`/plan` 用来先调查和制定执行方案；`/goal` 用来给较长任务设置持续存在的目标和停止条件。它们是可选工具，而不是每个任务都必须举行的仪式。

Codex 完成修改后：

```text
/diff
/review
```

`/diff` 用来查看 staged、unstaged 和 untracked changes；`/review` 让 Codex从 reviewer 视角检查行为变化、潜在回归和缺失测试。

最后退出 Codex，由我自己完成：

```bash
git diff
git status

git add <reviewed-files>
git commit
```

我的原则是：

> Codex 可以修改代码、运行验证和审查 diff，但代码什么时候进入 Git history，仍然由我决定。

## 六、暂时不加入基座的东西

第一版工作流不需要：

```text
MCP
Skills
Plugins
Subagents
Hooks
codex exec
CI 自动化
自动 commit
Full access
```

这些功能并不是 Codex CLI 的必修课。

只有当现有工作流出现明确限制时，才增加新的概念。例如，真的需要读取仓库外的动态数据时再考虑 MCP；某个流程已经稳定重复很多次时，再考虑 Skill 或自动化。

## 最终基座

这套工作流最后只有五个核心部分：

```text
固定版本的 Codex CLI
        +
持久化的 ~/.codex
        +
简短准确的 AGENTS.md
        +
默认受控的权限
        +
Git、测试、diff 和人工 commit
```

因此，我不是把项目交给 Codex，也没有为了使用 AI 再建立一套比项目本身更复杂的 Agent 架构。

我只是把 Codex CLI 放进原有 Dev Container，让它成为写码循环中的一个执行者：

```text
理解任务
→ 修改
→ 验证
→ 审查
→ 人工接受
```

这就是我需要的第一版 production-ready Codex CLI 基座。

## 参考资料

- [Codex CLI commands](https://learn.chatgpt.com/docs/developer-commands?surface=cli)
- [Codex configuration reference](https://learn.chatgpt.com/docs/config-file/config-reference)
- [Authentication](https://learn.chatgpt.com/docs/auth)
- [AGENTS.md](https://learn.chatgpt.com/docs/agent-configuration/agents-md)
