# Kral personal site source

这是 Kral 个人站点重新建立的 Hexo + Butterfly 源码。

线上旧站位于 <https://koharu4ever.github.io/>。当前 GitHub 仓库的 `main`
分支仍然保存旧 Hexo 项目生成的静态文件；本地源码不能直接覆盖该分支。

## 仓库安全边界

- 可编辑源码计划保存在 `source` 分支；
- `main` 暂时保留旧站静态产物，不修改、不强制推送；
- 当前没有 GitHub Actions、Hexo deployer 或其他自动部署配置；
- 在旧站完成备份和上线检查以前，不启用 GitHub Pages 自动部署。

旧站的 `note1`–`note4` 和默认 `Hello World` 已决定不迁移。它们的正文和旧
URL 不属于新站需要恢复的内容；旧 `main` 仍会保留原始版本，直到未来明确执行
站点切换。

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
