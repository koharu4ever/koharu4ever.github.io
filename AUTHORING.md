# Kral Publishing System authoring guide

这是一份仓库操作手册。Node、pnpm 和 Hexo 命令只在 Dev Container 中运行。

第一次使用可以先读博客中的《如何启动并使用这个博客项目》；本文继续保留完整字段和维护规则，避免入门文章承担全部参考手册内容。

## 新建文章

推荐使用小写、连字符且可长期保持稳定的 slug：

```bash
pnpm new:post my-article-slug
```

文章位于：

```text
source/_posts/my-article-slug.md
```

也可以直接创建 Markdown 文件。上线后尽量不要改文件名，因为默认永久链接包含它。

命令只会建立文章骨架。生成后必须填写真实的 `cover`、`description`、`tags` 和
`categories`，并检查标题与日期；不要把空字段当作可发布内容。

`scaffolds/*.md` 被刻意加入 `.prettierignore`。Hexo 使用 `{{ title }}`、`{{ date }}` 作为模板占位符，Markdown 格式化器会把这种语法错误地拆成 `{ { ... } }`，使新建命令失效。

## 普通文章 Front Matter

```yaml
---
title: 清楚、具体的文章标题
date: 2026-08-08 20:00:00
cover: /img/covers/my-article.webp
description: 用一两句话说明文章真正回答的问题。
tags:
  - Hexo
  - Markdown
categories:
  - 建站记录
authorship:
---
```

字段说明：

- `date`：发布日期；`_config.yml` 当前设置 `future: false`，未来日期不会生成。
- `cover`：使用 `/img/...` URL，对应 `source/img/...`。
- `categories`：宽泛归档主题。
- `tags`：横向检索词，避免堆叠近义词。
- `series`：确实有阅读顺序或共同叙事的文章组。
- `authorship`：写作来源声明。确认正文由作者独立撰写时填 `human`；AI 参与正文写作或整理时填 `ai_assisted`；尚未核对时留空。只有 `human` 会在文章卡片和详情页显示“手作”勋章，留空不代表任何结论。

`authorship` 是事实声明，不要根据文章语气、发布时间或结构自动推断，也不要为了让页面更好看而批量填写。

普通文章不需要为了适配索引页而填写 Project Database 字段。只有文章确实要进入 Notes 或关联某个项目时，才增加下面的可选字段。

### Notes 与发现页控制

```yaml
notes_index: true
random: false
```

- `notes_index: true`：明确加入 `/notes/`；`false` 明确排除。省略时，生成器会根据文章分类判断是否属于技术文章。
- 进入 `/notes/` 的文章必须有 `cover`；需要为画廊单独指定图片时也可以使用 `gallery_image`。
- `random: false`：不加入“随便逛逛”随机池。

### Project Database 关联

```yaml
project: kral-publishing-system
project_type: guide
project_order: 10
```

- `project`：Project Database slug；可以是字符串或数组。
- `project_type`：Engineering Notes 表中的 `guide`、`decision`、`case`、`incident`、`reference` 等类型。
- `project_order`：自动关联文章在 Engineering Notes 表中的顺序。
- `project_index: false`：只在不希望文章进入 Engineering Notes 表时使用；项目关联仍会保留。

正文从 `##` 开始；页面主标题由主题生成。代码使用带语言名的 fenced code block。

## 图片

```text
source/img/covers/    文章封面
source/img/projects/  Project Database 预览
source/img/start/     首页固定入口图
```

正文图片：

```markdown
![说明图片传达的信息](/img/covers/example.webp)
```

不要编辑或提交 `public/img/`。重命名、删除图片前先搜索引用：

```bash
rg -n --glob '!public/**' --glob '!node_modules/**' "/img/covers/example\.webp" .
```

## 本地预览

```bash
pnpm dev
```

打开 <http://localhost:4000/>。`pnpm dev` 已包含 `hexo clean`，并显示草稿。

结束服务器使用 `Ctrl+C`。若看到 `EADDRINUSE :::4000`，先确认旧的 `pnpm dev` 是否仍在其他终端运行，不要直接创建新容器。

## 提交前检查

```bash
pnpm check
git status --short
git diff --check
```

`pnpm check` 会检查 Prettier、ESLint，并重新生成完整站点。`public/`、`db.json` 和 `node_modules/` 不提交。

它不替代浏览器中的链接、响应式、深浅色和视觉检查，也不能证明 GitHub Pages 一定部署成功。

若 `hexo clean` 报 `EACCES ... public/atom.xml`，先运行 `whoami` 和 `stat` 检查是否曾由 root 生成文件。Dev Container 正常用户应为 `node`。

## 发布

确认本地变更后再提交和推送：

```bash
git add <明确的文件>
git commit -m "Add ..."
git push
```

推送到 `main` 后，`.github/workflows/pages.yml` 会使用 Node 22、pnpm 和 `pnpm build` 生成 Pages artifact。无需运行 `hexo deploy`，也不要把 `public/` 推到分支。

## 添加项目

Project Database 由 `source/_data/projects.yml` 驱动。新增项目不需要创建详情 Markdown、复制 HTML 或修改 CSS。

完整字段、文章关联和校验规则见 [PROJECT_DATABASE.md](./PROJECT_DATABASE.md)。最短流程：

1. 添加 `source/img/projects/<slug>.webp`；
2. 在 `projects.yml` 分配稳定 `P-xxx` 和 slug；
3. 填写真实状态、启动条件、配置、架构、关系和历史；
4. 文章加入 `project: <slug>`；
5. 运行 `pnpm check`；
6. 检查 `/projects/` 和 `/projects/<slug>/`。

## 修改边界

- 普通内容优先修改 Markdown 或 YAML。
- 主题原生能力优先修改 `_config.butterfly.yml`。
- 普通博客、首页、Notes 和 Resume 的视觉修改 `source/css/custom.css`。
- 独立 Project Database 的视觉修改 `source/css/project-database.css`，结构由 `scripts/project-database.js` 统一生成。
- 不要编辑 `node_modules/hexo-theme-butterfly`。
- 构建期结构位于 `scripts/`，浏览器增强位于 `source/js/`。
- 不在宿主机安装 Node、pnpm 或 Hexo。
- 不在未确认用户的情况下用 root 或临时容器写入工作区。
