---
title: 从零启动 Kral Publishing System：Dev Container、本地预览与故障排查
date: 2026-08-08 14:00:00
cover: /img/covers/publishing-writing-markdown.png
description: 面向第一次接触这个仓库的人，从安装宿主工具、克隆源码和打开 Dev Container 开始，直到本地站点可以访问，并说明端口、权限和依赖问题怎样判断。
tags:
  - Hexo
  - Dev Container
  - Docker
  - pnpm
  - 初学者
categories:
  - 建站记录
project: kral-publishing-system
project_type: guide
project_order: 10
notes_index: true
---

这篇文章只解决一件事：在一台新电脑上把这个仓库可靠地运行起来。

完成以后，浏览器应该能打开 <http://localhost:4000/>，首页、技术札记、Project Database 和普通文章都能正常访问。本文暂时不讲 Front Matter、图片和项目数据；站点跑起来以后，下一篇再处理写作和发布。

## 先认识几个会反复出现的词

如果以前没有接触过 Git、容器或静态站点，可以先记住下面这几个最小定义：

| 名称 | 在这个项目里指什么 |
| --- | --- |
| Repository / 仓库 | Git 管理的项目目录，里面保存文章、配置、图片和构建脚本 |
| Dev Container | VS Code 连接的一套 Linux 开发环境；Node、pnpm 和 Hexo 都在这里运行 |
| 宿主机 | 实际使用的 Windows 电脑，只负责 Git、Docker 和 VS Code |
| `source/` | 可编辑的内容和静态资源 |
| `public/` | Hexo 生成的网页产物，可以删除后重新生成，不是日常编辑区 |
| Build / 构建 | 把 Markdown、YAML、配置和图片转换成最终网页 |

这里最重要的边界是：**宿主机不需要另外安装 Node.js、pnpm 或 Hexo。** 它们由 Dev Container 提供。这样换一台电脑或重建容器时，使用的工具链仍然来自仓库，而不是依赖某台电脑碰巧装了什么。

## 第一次开始前，需要准备什么

宿主机需要安装并能正常打开：

1. Git；
2. Docker Desktop；
3. Visual Studio Code；
4. VS Code 的 Dev Containers 扩展。

这个项目需要 Linux container。Windows 上推荐使用 Docker Desktop 的 WSL 2 后端；如果使用其他受支持的 Linux container 后端，也要先确认 Docker Engine 正常运行。否则 VS Code 只能看到 Dev Container 配置，却没有容器引擎可以执行它。

GitHub 上的仓库是公开的，所以读取和克隆源码不要求仓库写权限；最后要向 `main` 推送时，才需要自己的 GitHub 身份和写权限。

## 克隆源码并打开正确目录

在 PowerShell、Git Bash 或 VS Code 终端中运行：

```bash
git clone https://github.com/koharu4ever/koharu4ever.github.io.git koharu-hexo
cd koharu-hexo
```

本文推荐使用 `koharu-hexo` 作为本地目录名，它正好匹配当前 Dev Container 的 Git 安全目录设置。换成其他名称也能运行，但若 Git 报目录不受信任，需要在容器中登记实际仓库路径。

接下来用 VS Code 打开这个目录。可以运行：

```bash
code .
```

也可以在 VS Code 中选择 **File → Open Folder**，然后选择刚才的 `koharu-hexo`。

打开以后先确认窗口根目录中能看到这些文件：

```text
.devcontainer/
package.json
pnpm-lock.yaml
source/
```

如果 VS Code 打开的是它的上一级目录，Dev Containers 可能找不到配置，后面的命令也可能在错误位置运行。不要看到一个终端就立刻输入命令，先确认现在打开的是仓库根目录。

## 第一次打开 Dev Container

按 `Ctrl+Shift+P` 打开 VS Code 命令面板，执行：

```text
Dev Containers: Reopen in Container
```

第一次创建时，VS Code 会做几件实际工作：

- 拉取 Node 22 Bookworm 的 Dev Container 镜像；
- 把仓库挂载到容器中的 `/workspaces/`；
- 以非 root 的 `node` 用户打开工作区；
- 启用 Corepack；
- 根据 `pnpm-lock.yaml` 安装依赖；
- 转发本地预览需要的 4000 和 4001 端口。

这个阶段需要网络，也可能持续几分钟。应先等 VS Code 的创建日志和 `postCreateCommand` 完成，不要同时在宿主机安装另一套 Node 或 pnpm 来“补救”。那只会产生两套不同环境。

容器准备完毕后，VS Code 左下角会显示它已经连接到 `koharu-hexo` Dev Container。重新打开一个 VS Code 终端，后面的命令都在这个终端执行。

## 验收开发环境

先不要启动 Hexo。运行以下命令：

```bash
whoami
pwd
node --version
pnpm --version
test -f package.json && echo "repository root: ok"
```

正常结果应满足：

- `whoami` 输出 `node`；
- `pwd` 位于当前仓库，一般是 `/workspaces/koharu-hexo`；
- Node 版本是 `22.x`；
- pnpm 版本是 `10.28.2`；
- 最后一行输出 `repository root: ok`。

`pwd` 的完整字符串可能随本地目录名变化，真正要确认的是当前目录中存在 `package.json`，而不是死记一条路径。

如果 `whoami` 输出 `root`，先停止。这个项目的日常命令应由 `node` 用户执行。过去出现过 root 写入 `public/` 后，普通用户无法清理 `atom.xml` 的问题；继续用 root 虽然暂时能绕过权限错误，却会把更多文件变成 root 所有。

## 第一次启动站点

在 Dev Container 终端中运行：

```bash
pnpm dev
```

这个脚本实际执行：

```text
hexo clean
  -> hexo server --draft --host 0.0.0.0
```

也就是说，它先清理旧生成物，再启动本地 Hexo Server。终端应该保持运行，不要在看到日志以后立刻关闭它。

等待终端显示服务已经监听后，打开：

- 页面：<http://localhost:4000/>；
- 4001 端口只给浏览器自动刷新连接使用，不是另一个网站。

Dev Container 配置通常会自动转发 4000 并打开浏览器。如果没有自动打开，手动输入上述地址即可。

文章和 `source/_data/` 中的内容通常会触发 Hexo 重新生成。保存文件后等终端完成一轮构建，再刷新浏览器，不需要每改一段文字就重新运行 `pnpm dev`。如果修改了 `_config.yml`、`_config.butterfly.yml`、根目录 `scripts/` 或依赖，停止并重新启动 `pnpm dev` 更可靠。

要正常停止本地服务器，在运行它的终端按：

```text
Ctrl+C
```

## 第一次应该检查哪些页面

站点能打开不等于所有生成器都正常。第一次至少访问：

1. 首页：<http://localhost:4000/>；
2. 技术札记：<http://localhost:4000/notes/>；
3. Project Database：<http://localhost:4000/projects/>；
4. 任意一篇普通文章；
5. 任意一个项目详情，例如 <http://localhost:4000/projects/kita/>。

这一轮检查能同时覆盖 Butterfly 普通页面、Notes 自定义索引和独立 Project Database。只检查首页，无法发现项目生成器或技术札记是否出错。

`pnpm dev` 带有 `--draft`，所以 `source/_drafts/` 中的 Hexo 草稿会在本地出现。它不会把 `source/_posts/` 中的文章自动变成草稿，也不会无视未来日期设置。站点当前 `future: false`，时区是 `Asia/Tokyo`；文章日期晚于构建时刻时，仍可能不生成。

## 以后每天怎样重新进入项目

第一次环境完成后，日常启动可以缩短成：

1. 启动 Docker Desktop；
2. 用 VS Code 打开 `koharu-hexo`；
3. 如果窗口还在宿主环境，执行 `Dev Containers: Reopen in Container`；
4. 打开终端并确认提示符来自容器；
5. 运行 `pnpm dev`；
6. 打开 <http://localhost:4000/>。

不需要每天执行 `pnpm install`。只有依赖清单发生变化、容器首次创建，或依赖目录确实损坏时才需要重新安装。

## 环境健康检查

停止正在运行的 `pnpm dev`，然后执行：

```bash
pnpm check
```

停止开发服务器再检查，是为了避免 Hexo Server 和生产构建同时清理、写入 `public/`。

当前 `pnpm check` 会依次运行：

```text
Prettier check
  -> ESLint
  -> clean production build
```

它可以证明当前源码能通过格式、JavaScript 和完整构建门禁，但不能证明：

- 文章内容没有错字；
- 所有外链仍然有效；
- 每张图片都没有重复；
- 手机和桌面视觉一定正确；
- GitHub Pages 一定能完成部署。

另外，`source/_posts/` 和 `source/img/` 被排除在自动格式化之外，长篇文章和图片仍需要人工检查。

## 常见问题怎样判断

### Docker 或 Dev Container 无法启动

先确认 Docker Desktop 已启动，而不是只确认图标存在。若创建日志停在拉取镜像或安装依赖，先检查网络和 Dev Containers 日志。

如果容器已经打开，但依赖安装中断，可以在容器终端中运行：

```bash
sudo corepack enable
pnpm install --frozen-lockfile
```

这仍然是在容器内恢复仓库声明的环境，不是在 Windows 上另装工具链。

### 终端提示 `pnpm: command not found`

先看 VS Code 左下角是否真的显示正在连接 Dev Container，再运行：

```bash
whoami
node --version
```

如果当前终端来自 Windows 宿主机，关闭它，重新在 Dev Container 窗口中新建终端。不要因为这一条提示就在宿主机安装 pnpm。

### Git 提示仓库目录不安全

当前容器创建脚本会信任默认的 `/workspaces/koharu-hexo`。如果使用了其他本地目录名，Git 可能提示 `potentially unsafe` 或 `dubious ownership`。

先确认当前目录中存在 `package.json`，再在 Dev Container 中登记当前仓库本身：

```bash
test -f package.json && git config --global --add safe.directory "$(pwd)"
git status --short
```

这个设置只解决 Git 对挂载目录的信任，不会改变文件所有者，也不应当用来掩盖 root 写文件的问题。

### 端口 4000 已被占用

典型错误是：

```text
EADDRINUSE :::4000
```

最常见的原因是另一个终端中已经运行了一份 `pnpm dev`。回到旧终端按 `Ctrl+C`，确认它停止后再启动。这里不需要新建第二个容器，也不应该把 VS Code 的 Dev Container 当作占用端口的“业务容器”随意删除。

如果旧终端已经找不到，可以先只查看容器里的 Hexo 进程：

```bash
ps -ef | grep '[h]exo'
```

确认命令行确实是这个仓库的 `hexo server` 后，只结束输出中对应的 PID：

```bash
kill <PID>
```

不要为了释放一个端口而使用覆盖所有 Node 进程的命令。

### `hexo clean` 无法删除 `public/atom.xml`

如果错误包含 `EACCES`，先检查当前用户和目标文件：

```bash
whoami
ls -ld public
ls -l public/atom.xml
```

正常用户应是 `node`。如果文件确实由以前的 root 进程写入，应先确认当前目录就是仓库根目录，再只修复这个仓库的生成目录所有权；不要对 `/workspaces`、用户主目录或更大的路径做递归修改。以后也不要使用 `sudo pnpm dev` 或 `sudo pnpm build`。

确认下面的检查都通过以后，可以修复当前仓库中可重新生成的 `public/`：

```bash
test -f package.json && echo "repository root: ok"
sudo chown -R node:node public
pnpm clean
```

然后以普通 `node` 用户重新运行 `pnpm dev`。

### 页面能打开，但看起来还是旧内容

先看终端是否仍然是当前仓库的那一份 Hexo Server，并确认保存文件后出现了重新生成日志。`pnpm dev` 已经包含 `hexo clean`，一般不需要手动反复清理。

如果修改了构建脚本本身，或数据变化没有触发预期更新，可以按 `Ctrl+C` 后重新运行一次 `pnpm dev`。日常文章写作通常不需要这样做。

### 4000 没有自动转发

在 VS Code 的 **Ports** 面板确认 4000 已转发。也可以手动添加 4000，然后访问 <http://localhost:4000/>。4001 只用于自动刷新；即使自动刷新连接失败，4000 上的静态页面仍应能打开。

## 到这里，什么才算真正完成

可以用下面这张清单收尾：

- [ ] Docker Desktop 正常运行；
- [ ] VS Code 已连接 Dev Container；
- [ ] `whoami` 是 `node`；
- [ ] Node 为 22.x，pnpm 为 10.28.2；
- [ ] `pnpm dev` 可以启动；
- [ ] 首页、`/notes/`、`/projects/` 和文章页可以访问；
- [ ] 停止开发服务器后，`pnpm check` 可以通过；
- [ ] 没有在宿主机额外安装 Hexo，也没有使用 root 生成工作区文件。

完成这些以后，环境部分就结束了。接下来要做的不是学习更多容器命令，而是维护真正的内容。下一篇会从一篇普通 Markdown 开始，说明它怎样进入首页、Notes 和项目记录，以及怎样新增项目而不手写 HTML、JavaScript 或 CSS：

[这个博客的内容架构：只维护 Markdown 和 YAML](/2026/08/08/kral-publishing-system-architecture/)
