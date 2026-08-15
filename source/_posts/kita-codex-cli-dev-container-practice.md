---
title: 把 Codex CLI 接进 Kita：Dev Container 实践与踩坑
date: 2026-08-15 12:40:00
cover: /img/covers/kita-codex-cli-dev-container-practice.webp
description: 以 Kita 的 PR #22 为现场，记录 Codex CLI 进入 Dev Container 后遇到的凭据持久化、Linux sandbox、Windows Git 配置、named volume 和 Next.js 构建问题。
tags:
  - Codex CLI
  - Dev Container
  - Kita
  - AI Coding
  - Docker
  - 工程实践
categories:
  - Kita 工程案例
series: Kita 工程案例
notes_index: true
random: false
project: kita
project_type: case
project_order: 100
---

上一篇[《把 Codex CLI 放进 Dev Container：一套可复现的写码工作流基座》](/2026/08/13/codex-cli-dev-container-workflow/)讲的是最小模型：固定 CLI 版本、持久化 `~/.codex`、写一份简短的 `AGENTS.md`，然后让 Git、测试和人工审查继续充当最后一道门。

这套思路没有错。但真正接入 Kita 后，问题很快从“能不能运行 `codex`”变成了“它能不能在现有工程边界内可靠工作”。

Kita 同时包含 Next.js、Payload、PostgreSQL、Docker-in-Docker、migration、R2 和 backup。Codex 所处的环境也有多层嵌套：

```text
Windows
  ↓
Docker Desktop
  ↓
VS Code Dev Container
  ├── Node / pnpm / Next.js / Payload
  ├── Docker-in-Docker → PostgreSQL
  ├── node_modules 与 .next named volume
  └── Codex CLI → bubblewrap / seccomp sandbox
```

这篇文章记录 Kita PR #22 的实际落地过程：哪些设计可以直接复用，哪些问题只有 Rebuild、真实测试和生产构建才会暴露。

<!-- more -->

## 一、先确定不能破坏什么

开始改配置前，我先划定边界：

- Codex CLI 只安装在 Dev Container，不安装到 Windows，也不进入生产镜像；
- 登录凭据不能进入 Git、`.env`、PR 或文档；
- clone 仓库的人只能获得安装声明，不能获得我的登录状态；
- CLI 版本固定，升级需要单独验证；
- 不为了方便删除或重建本地 PostgreSQL volume；
- Coolify、Cloudflare、R2、生产数据库和 Git 历史仍需单独授权；
- 项目原有的非 root、测试、检查和构建流程不能被绕开。

这些边界决定了实现方式。重点不是少写几个文件，而是让安装、凭据、权限和项目守卫各自有明确位置。

## 二、最终改动由哪些文件组成

与 Codex CLI 直接相关的文件如下：

| 文件 | 职责 |
| --- | --- |
| `.devcontainer/Dockerfile` | 安装固定版本 Codex CLI 和 Linux `bubblewrap` |
| `.devcontainer/devcontainer.json` | 声明开发镜像、用户、named volume 和生命周期命令 |
| `.devcontainer/post-create.sh` | 首次创建时修正权限、写入默认配置并安装依赖 |
| `.devcontainer/normalize-git-config.sh` | 每次连接时清理 Linux 中无效的 Windows `safe.directory` |
| `.devcontainer/codex-config.toml` | 提供不含 secret 的保守默认配置 |
| `AGENTS.md` | 记录 Kita 长期遵守的安全与工作规则 |
| `scripts/assert-dev-workspace-user.mjs` | 项目命令执行前的 workspace 安全守卫 |
| `scripts/dev-workspace-inspection.mjs` | 用 Node API 检查文件所有权和 Next.js 进程 |
| `docs/codex-cli.md` | 解释安装、权限、维护和退出流程 |

文件看起来不少，但每个脚本只解决一个问题。相比把所有逻辑塞进 `devcontainer.json` 的一条长命令，这种拆分更容易审查，也更容易在出错时定位责任。

## 三、CLI 和 bubblewrap 只进入开发镜像

Kita 的 Dev Container 基于 Node 22 Bookworm。Dockerfile 中固定安装经过项目验证的 Codex CLI `0.147.0`，并显式安装 Debian 提供的 `bubblewrap`：

```dockerfile
FROM mcr.microsoft.com/devcontainers/javascript-node:1-22-bookworm

USER root

ARG CODEX_CLI_VERSION=0.147.0

RUN apt-get update \
  && apt-get install --yes --no-install-recommends bubblewrap \
  && rm -rf /var/lib/apt/lists/*

RUN npm install --global "@openai/codex@${CODEX_CLI_VERSION}" \
  && npm cache clean --force \
  && codex --version \
  && bwrap --version
```

这里有三个选择：

1. 不使用 `latest`，避免 Rebuild 时隐式升级；
2. 在 image build 阶段安装，让网络或包版本问题尽早失败；
3. 只修改 `.devcontainer/Dockerfile`，不碰 Kita 的生产 Dockerfile。

最初 CLI 能使用 bundled bubblewrap 继续运行，但会显示 fallback 警告。既然这个环境要长期维护，显式安装系统包比依赖后备路径更清楚。

`.dockerignore` 继续排除 `.devcontainer`，所以 Coolify 构建的生产镜像不会包含 Codex，也不会增加对应的生产 attack surface。

## 四、登录持久化，但不进入仓库

Kita 使用 `node` 作为 Dev Container 用户，并把 Codex home 放进独立 named volume：

```jsonc
{
  "mounts": [
    "source=${devcontainerId}-node-modules,target=${containerWorkspaceFolder}/node_modules,type=volume",
    "source=${devcontainerId}-next-cache,target=${containerWorkspaceFolder}/.next,type=volume",
    "source=kita-codex-home,target=/home/node/.codex,type=volume"
  ],
  "containerEnv": {
    "CODEX_HOME": "/home/node/.codex"
  },
  "remoteUser": "node"
}
```

仓库只保存 mount 声明。另一个人 clone Kita 后，会在自己的 Docker engine 中得到一个新的空 volume，再自行执行 `codex login`。我的凭据不会经过 Git 传播。

Rebuild Container 会替换开发容器，但不会自动删除 `kita-codex-home`，因此登录、个人配置和本地会话可以保留。这个 volume 仍应被当作 credential store：不打印、不复制、不提交，也不交给不可信容器使用。

仓库提供的默认配置不含 token：

```toml
approval_policy = "untrusted"
sandbox_mode = "workspace-write"
cli_auth_credentials_store = "file"

[history]
persistence = "save-all"
max_bytes = 104857600

[sandbox_workspace_write]
network_access = false
```

`post-create.sh` 只在 `$CODEX_HOME/config.toml` 不存在时复制模板：

```bash
if [[ ! -f "$CODEX_HOME/config.toml" ]]; then
  umask 077
  install -m 0600 .devcontainer/codex-config.toml "$CODEX_HOME/config.toml"
fi
```

这样第一次创建有保守默认值，已经调整过个人设置的用户也不会在 Rebuild 后被覆盖。

## 五、AGENTS.md 和本地数据库边界

Kita 的 `AGENTS.md` 不是架构说明书，只记录每次任务都必须遵守的规则：

- Node、pnpm、Payload、test 和 build 只在 Dev Container 中运行；
- 正常项目命令使用 `node`，不用 root；
- 不读取、打印或提交 secret；
- schema 改动必须同时审查 migration 的 up/down；
- 功能分支使用 `codex/` 前缀并通过 PR 合并；
- 正常门禁是 test、check 和 build；
- 未经授权不操作 Coolify、R2、DNS、VPS 和生产数据。

其中最需要强调的是本地 PostgreSQL。它运行在 Dev Container 内的 Docker-in-Docker daemon 中，但包含手动复建的数据，并不是可以随手删除的缓存。

```text
允许：
  查看状态、使用已有服务、运行项目定义的启动命令

需要确认：
  migration、seed、restore、数据库写入、重建服务

默认禁止：
  down -v、volume prune、system prune、删除已有数据 volume
```

Dev Container 是隔离层，不代表里面的一切都可以丢弃。

## 六、Rebuild 后出现的两个环境问题

### VS Code Server 下载不是 Dockerfile 卡死

第一次执行 **Dev Containers: Rebuild Container** 时，界面长时间停在：

```text
Start: Downloading VS Code Server
```

日志显示 image 已经构建完成，VS Code 只是在为新容器下载匹配版本的 server。一次完整重建包含多个阶段：

```text
构建开发 image
  → 创建容器和挂载 volume
  → 下载并启动 VS Code Server
  → 执行 postCreateCommand
  → 连接终端与扩展
```

因此，界面没有打开不等于 Dockerfile 失败。先查看 Dev Containers 日志的最后一个步骤，比直接中断或删 volume 更安全。

### Windows safe.directory 被同步进 Linux

CLI 读取 Git 状态时还出现过：

```text
safe.directory 'C:/dev/koharu-hexo' not absolute
```

VS Code 会把主机上的部分 Git 配置带进容器。Windows 盘符路径到了 Linux 中不再是绝对路径，所以 Kita 增加了一个幂等脚本，只移除全局配置中的 `C:/...`、`D:/...` 或反斜杠形式的盘符路径。

它不会修改用户名、邮箱、credential helper、仓库级 `.git/config`，也不会碰 Windows 主机真正的配置。脚本同时用于 post-create 和 post-attach，因为 VS Code 可能在重新连接时再次同步配置。

## 七、最隐蔽的问题：Node 子进程在 sandbox 中失败

CLI 接入后，我让 Codex review 整个项目。原有测试通过，但 `pnpm check` 在 TypeScript 之前失败：

```text
[workspace-user-guard] Unable to verify .next ownership before running the command.
```

Kita 原有的 guard 使用 `spawnSync()` 调用外部 `find` 和 `ps`。这些命令在普通 Dev Container 终端里可以运行，但在 Codex Linux sandbox 中形成了另一层子进程：

```text
Codex sandbox
  → Node
    → find / ps
      → EPERM
```

这里不能捕获 `EPERM` 后直接放行，否则 guard 会在最需要它的时候失效。最终修复保留原有保护，只替换实现：

1. 继续拒绝 root 在 bind-mounted workspace 中运行项目命令；
2. 用 `lstatSync` 和 `readdirSync` 检查 `.next` owner；
3. 读取 `/proc/<pid>/comm` 与 `/proc/<pid>/cmdline`，判断 `next dev` 和 `next build` 是否冲突；
4. 为所有权和进程判断增加回归测试。

这不是为了绕过 sandbox 的临时补丁，而是把依赖外部进程的检查改成了可测试的 Node 实现。

## 八、workspace 可写，不代表内部 volume 都可写

严格执行 `codex sandbox pnpm test` 时，Vitest 还报过：

```text
EROFS: read-only file system,
open '/workspaces/Kita/node_modules/.vite-temp/...'
```

`node_modules` 和 `.next` 看起来位于 workspace 内，实际却是独立 Docker named volume：

```text
/workspaces/Kita
├── src/          Windows bind mount
├── docs/         Windows bind mount
├── node_modules  named volume
└── .next         named volume
```

因此，sandbox 可以允许 workspace 本体写入，同时把内部额外挂载视为只读。这不是 Vitest 的错误，也不意味着应该开启 full access。

日常交互中，我会为精确的 `pnpm test` 或 `pnpm check` 批准一次所需权限。批准的是一条已理解的项目命令，不是永久放开 Docker、网络和所有挂载。

## 九、生产构建保护不能为了 CLI 被删掉

`pnpm test` 和 `pnpm check` 通过后，第一次 `pnpm build` 在 page data 阶段失败：

```text
MEDIA_STORAGE_MODE must be r2 in production;
refusing ephemeral local media storage.
```

本地开发使用 `MEDIA_STORAGE_MODE=local`，生产必须使用 R2。Next.js build 进入 production mode 后，项目主动拒绝把上传文件写进临时文件系统。这是已有的安全保护，不是 Codex 引入的回归。

GitHub Actions 已为受控构建使用 `SKIP_ENV_VALIDATION=true`，所以本地 CI 等价验证也使用：

```bash
SKIP_ENV_VALIDATION=true pnpm build
```

它只跳过构建阶段无法提供的外部环境校验，不修改 `.env`，也不会削弱生产容器启动时的 R2 强制检查。

排查期间还有一次 build 被中断，内部 `next build` 进程没有随外层退出。下一次构建报告已有 build 正在运行。我先确认精确 PID、PPID 和命令行，只终止对应进程树，没有删除整个 `.next`，也没有重建容器。

这两个问题的处理原则相同：先识别失败发生在哪一层，再使用项目已有的安全出口或处理精确对象，而不是为了通过检查扩大权限或清空状态。

## 十、怎样证明接入真的完成了

只运行 `codex --version` 只能证明二进制存在。最终验收覆盖四层：

### CLI 与容器

```text
whoami       → node
codex        → 0.147.0
CODEX_HOME   → /home/node/.codex
bwrap        → PATH 中可用
```

### 凭据与 Git

```text
登录保存在 named volume
仓库不包含 auth.json 或 Codex token
clone 不会获得已有登录
Windows safe.directory 警告被幂等清理
```

### 项目门禁

```text
pnpm test
  → 50 / 50 Vitest
  → 4 / 4 backup shell 场景

pnpm check
  → Prettier / ESLint / TypeScript

SKIP_ENV_VALIDATION=true pnpm build
  → compile / TypeScript / page data / static generation
```

### GitHub

PR #22 的 required `quality` check 在全新 runner 中重新执行 frozen install、格式、lint、typecheck、测试和 production build。它于 2026 年 8 月 15 日合并，说明这套改动不只在当前 Dev Container 中偶然可用。

## 十一、三次提交对应三层问题

| Commit | 解决的问题 |
| --- | --- |
| `c14b456` | 安装固定版本 CLI、挂载 Codex home、增加默认配置与 `AGENTS.md` |
| `aa7b0c1` | 安装系统 bubblewrap、清理 Windows `safe.directory`、补充凭据 volume 边界 |
| `65061e1` | 让 workspace guard 不再依赖外部 `find`/`ps`，并增加回归测试 |

把接入、环境加固和 sandbox 兼容性拆开，比一个巨大的“Codex support”提交更容易理解和回滚。

## 十二、哪些内容值得复用

可以直接带到其他 Dev Container 项目的部分：

- 固定 CLI 版本，并在开发 image build 阶段安装；
- 使用发行版 `bubblewrap`；
- 用 named volume 持久化 `CODEX_HOME`；
- 保持非 root `remoteUser`；
- 只在首次创建时复制默认配置；
- 用简短 `AGENTS.md` 记录长期规则；
- 让 test、check、build 和 PR 成为升级门禁；
- 明确分离开发镜像与生产镜像。

下面这些则依赖具体环境：

| 范围 | 项目相关内容 |
| --- | --- |
| Windows + Dev Container | 清理同步到 Linux 的盘符形式 `safe.directory` |
| Next.js | `.next` 所有权、dev/build 并发与 cache volume 行为 |
| Kita | DIND PostgreSQL、Payload、R2、migration、backup、Coolify 和 `SKIP_ENV_VALIDATION` |

因此这套实现不是万能模板。它由一层通用 Dev Container 基座和一层 Kita 风险适配组成。

## 十三、日常使用与退出方式

现在进入 Kita Dev Container 后，日常入口仍然很短：

```bash
git status
codex
```

在 CLI 中先检查：

```text
/status
/permissions
```

任务开始前读取 `AGENTS.md` 和当前交接文档；完成后运行相应测试、检查 diff，并通过 `codex/<task>` 分支和 PR 进入 GitHub。遇到审批时，我先确认命令在哪个环境执行、会写哪些路径、是否涉及数据库或 volume，再决定是否只批准这一次。

如果以后不再使用，也可以完整退出：

1. 在容器中执行 `codex logout`；
2. 关闭 Dev Container；
3. 从开发 Dockerfile 删除 Codex 与 `bubblewrap`；
4. 从 `devcontainer.json` 删除 `CODEX_HOME` 和对应 mount；
5. 确认精确名称后，只删除 `kita-codex-home`；
6. Rebuild Container 并重新运行项目门禁。

删除这个 volume 会清除当前 Docker engine 中的 Codex 登录、配置和历史，但不会删除源码、PostgreSQL、`node_modules` 或 `.next`。仍然不应使用 `docker volume prune` 或 `docker system prune` 代替精确清理。

## 最后的判断

Kita 的接入工作最后解决了五件事：

```text
CLI 只存在于真实开发环境
凭据可持久化但不经过 Git
默认权限保守，敏感边界仍需人工批准
项目 guard 能在 sandbox 中正常工作
本地、构建和 CI 都完成验证
```

复杂度主要来自 Kita 已经存在的 Windows、DIND、named volume、Payload 和 R2 边界，而不是为了 Codex 重新搭建一套 Agent 平台。日常使用仍然只是：人定义目标和权限，Codex 调查、修改并验证，项目门禁和 CI 提供机器检查，最后由人审查和合并。

这就是我愿意保留这套实现的原因：Codex CLI 没有取代 Kita 的工程流程，只是成为其中一个受约束的执行者。

## 相关内容与参考资料

- 理论篇：[把 Codex CLI 放进 Dev Container：一套可复现的写码工作流基座](/2026/08/13/codex-cli-dev-container-workflow/)
- Kita Dev Container：[在 Windows 上为 Next.js 配置 Dev Container](/2026/08/04/kita-case-devcontainer-setup/)
- Kita 运行地图：[从开发到恢复：Kita 的六层运行地图](/2026/08/04/kita-basics-runtime-layers/)
- GitHub：[Kita PR #22](https://github.com/koharu4ever/Kita/pull/22)
- OpenAI：[Codex CLI](https://learn.chatgpt.com/docs/codex/cli)
- OpenAI：[Authentication](https://learn.chatgpt.com/docs/auth)
- OpenAI：[Agent approvals and security](https://learn.chatgpt.com/docs/agent-approvals-security)
- OpenAI：[Sandboxing](https://learn.chatgpt.com/docs/sandboxing)
- OpenAI：[AGENTS.md](https://learn.chatgpt.com/docs/agent-configuration/agents-md)
