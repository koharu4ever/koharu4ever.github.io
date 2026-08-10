---
title: 如何启动并使用这个博客项目
date: 2026-08-08 14:00:00
cover: /img/covers/publishing-writing-markdown.png
description: 从打开 Dev Container、启动本地预览，到写 Markdown、使用图片、检查并通过 GitHub Pages 发布，走一遍这个博客真正的日常使用流程。
tags:
  - Hexo
  - Markdown
  - Dev Container
  - GitHub Pages
  - 初学者
categories:
  - 建站记录
project: kral-publishing-system
project_type: guide
project_order: 10
notes_index: true
---

这个博客已经不只是“把 Markdown 丢给 Hexo”那么简单，但日常使用并没有因此变复杂。我平时真正会重复的事情只有几件：打开开发环境、写文章、选择图片、本地检查，然后把源码推到 GitHub。

这篇文章只走一遍这条主线。完整字段和 Project Database 的维护细节仍然放在仓库文档里，避免一篇入门文章变成会很快过时的配置手册。

## 先把项目跑起来

宿主机只需要 Git、Docker、VS Code 和 Dev Containers 扩展，不需要另外安装 Node.js、pnpm 或 Hexo。

用 VS Code 打开仓库后，执行：

```text
Dev Containers: Reopen in Container
```

第一次创建容器时，`.devcontainer/devcontainer.json` 会准备 Node、Corepack 和依赖。终端正常应以 `node` 用户运行，工作目录是：

```text
/workspaces/koharu-hexo
```

可以先确认一次：

```bash
whoami
pwd
pnpm --version
```

然后启动本地站点：

```bash
pnpm dev
```

浏览器打开 <http://localhost:4000/>。这个命令会先清理旧的 Hexo 产物，再启动包含草稿的本地预览。

如果提示 `EADDRINUSE :::4000`，通常只是另一个终端里的 Hexo Server 还没有停止。先找到并结束旧进程，不要因为端口占用再创建一个容器。

## 写一篇 Markdown 文章

文章都在：

```text
source/_posts/
```

可以直接创建文件，也可以在 Dev Container 中运行：

```bash
pnpm new:post my-article-slug
```

文件名最好使用小写英文和连字符。它会参与文章 URL，发布后不应该为了修改显示标题而反复重命名。

一篇普通文章至少要把这些内容填真实：

```yaml
---
title: 我真正想回答的问题
date: 2026-08-08 20:00:00
cover: /img/covers/my-article.webp
description: 用一两句话说明文章内容。
tags:
  - Hexo
  - Markdown
categories:
  - 建站记录
---
```

正文从 `##` 开始即可，页面主标题由 Butterfly 根据 Front Matter 生成。

`notes_index` 是可选的显式覆盖：`true` 强制加入 `/notes/`，`false` 明确排除；省略时，生成器会根据分类判断。要进入 Notes 画廊，文章还必须提供 `cover`，或用 `gallery_image` 单独指定画廊图片。

如果文章还要进入某个 Project Database record，可以增加：

```yaml
project: kral-publishing-system
project_type: guide
project_order: 10
```

这些字段只是声明内容关系，不负责设计页面。`project_order` 控制自动关联文章在 Engineering Notes 表中的顺序；项目页的共同外观由生成器和 CSS 统一维护。

Front Matter 的完整解释、`notes_index`、`random` 与项目关联规则见仓库里的 [AUTHORING.md](https://github.com/koharu4ever/koharu4ever.github.io/blob/main/AUTHORING.md)。

## 图片放在哪里

文章封面统一放在：

```text
source/img/covers/
```

Front Matter 中引用的是浏览器 URL：

```yaml
cover: /img/covers/my-article.webp
```

不要把图片放进 `public/img/`。`public/` 是每次构建都能重新生成的输出目录，不是素材源。

现在我也尽量让一篇文章拥有一张独立封面。新增或重命名前，可以先搜索图片是否已经被使用：

```bash
rg -n --glob '!public/**' --glob '!node_modules/**' "/img/covers/my-article\.webp" .
```

项目预览图和首页固定入口图分别位于 `source/img/projects/`、`source/img/start/`。目录按图片用途区分，不需要额外维护一份资源映射表。

## 预览和提交前检查

写完后先浏览文章本身，再看首页、Notes 和相关项目页是否符合预期。构建成功不代表链接、移动端和深浅色一定正确，页面检查仍然需要在浏览器里完成。

提交前运行：

```bash
pnpm check
git status --short
git diff --check
```

`pnpm check` 会检查格式和 JavaScript，并重新生成完整站点。如果 `hexo clean` 报 `public/atom.xml` 没有权限，先检查 `whoami` 和文件所有者；正常开发用户应是 `node`，不要用 root 在工作区生成文件。

## GitHub Pages 怎样更新页面

确认差异以后，只暂存这次真正需要的文件：

```bash
git add source/_posts/my-article-slug.md source/img/covers/my-article.webp
git commit -m "Add ..."
git push
```

推送到 `main` 后，`.github/workflows/pages.yml` 会在 GitHub 上安装依赖、运行 Hexo build、上传 `public/` artifact，再交给 GitHub Pages 部署。

所以这里不需要运行 `hexo deploy`，也不提交本地的 `public/`。如果源码已经推送但页面没有更新，应该去 Actions 查看 build 和 deploy 两个 job，而不是继续修改生成后的 HTML。

## 添加新项目时也不需要重画页面

Project Database 的事实源是：

```text
source/_data/projects.yml
```

新增项目时分配一个稳定的 `P-xxx` 和 slug，填写真实的状态、简介、启动条件、配置、架构、关系与历史，生成器就会把它加入 `/projects/` 和对应详情页。

完整示例及可选区块见 [PROJECT_DATABASE.md](https://github.com/koharu4ever/koharu4ever.github.io/blob/main/PROJECT_DATABASE.md)。普通写作者不需要复制 HTML，也不应该为每个项目再写一套 CSS。

## 我实际记住的流程

日常维护最终可以缩成这一条：

```text
Reopen in Container
  -> pnpm dev
  -> 编辑 Markdown / YAML / 图片
  -> 浏览器检查
  -> pnpm check
  -> commit + push
  -> 查看 GitHub Actions
```

理解每一步改变了什么，比记住更多 Hexo 命令有用。这个项目的界面可以继续变化，但只要源码、构建和发布之间的边界不混在一起，写下一篇文章仍然是一件很普通的事。
