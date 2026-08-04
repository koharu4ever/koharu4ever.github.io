# Kral personal site source

这是 Kral 个人站点重新建立的 Hexo + Butterfly 源码。

线上站点位于 <https://koharu4ever.github.io/>。GitHub 仓库的 `main` 分支保存
可编辑的 Hexo 源码，GitHub Pages 工作流负责构建和发布站点。

## 仓库边界

- `main` 是唯一的源码分支；
- `public/`、Hexo 缓存和依赖目录不提交；
- `.github/workflows/pages.yml` 使用 Node 22 和 pnpm 构建 `public/`；
- GitHub Pages 只接收工作流上传的临时 artifact，仓库不保存生成后的站点文件。

旧站的 `note1`–`note4` 和默认 `Hello World` 已决定不迁移。它们的正文和旧
URL 不属于新站需要恢复的内容。

## 宿主机要求

只需要：

- Git
- Docker
- VS Code
- Dev Containers 扩展

不需要在宿主机安装 Node.js、pnpm 或 Hexo。

## 启动

1. 用 VS Code 打开此目录。
2. 执行 **Dev Containers: Reopen in Container**。
3. 容器创建完成后运行：

```bash
pnpm dev
```

4. 打开自动转发的 `http://localhost:4000`。

## 编辑位置

- 简历：`source/resume/index.md`
- 文章：`source/_posts/`
- 主题设置：`_config.butterfly.yml`
- 自定义样式：`source/css/custom.css`

## 构建

```bash
pnpm build
```

生成结果位于 `public/`，不提交到源码分支。

## 提交前检查

在 Dev Container 中运行：

```bash
pnpm check
```

它会依次检查配置与代码格式、运行 ESLint，并重新生成站点。博客正文和系列规划
属于长篇内容，不交给 Prettier 自动改写。

## 发布

推送到 `main` 后，GitHub Pages 工作流会在 GitHub 上重新执行 `pnpm build`，
并发布 `public/`。也可以在仓库的 Actions 页面手动运行同一个工作流。

生成产物只作为 Pages artifact 使用，不写回 Git 分支。
