# Repository instructions

This repository is the newly reconstructed Hexo source for:

- Site: https://koharu4ever.github.io/
- Existing repository: https://github.com/koharu4ever/koharu4ever.github.io

## Important migration context

The existing GitHub `main` branch mainly contains generated static files from
an older Hexo project.

The original editable Hexo source is currently missing.

This local repository is a new source skeleton and cannot yet reproduce the
existing website completely.

Do not overwrite or deploy to the existing GitHub Pages site until the old
content, URLs and assets have been reviewed.

## Environment

Do not require Node.js, pnpm or Hexo on the host machine.

All development commands must run inside the Dev Container.

The host should only need:

- Git
- Docker
- VS Code
- Dev Containers extension

## Commands

- `pnpm dev` — run Hexo locally on port 4000
- `pnpm build` — generate `public/`
- `pnpm clean` — remove generated files

## Content

- Blog posts: `source/_posts/`
- Resume: `source/resume/index.md`
- Hexo configuration: `_config.yml`
- Butterfly configuration: `_config.butterfly.yml`
- Custom CSS: `source/css/custom.css`

## Project goals

- Keep Hexo and Butterfly.
- Add a simple `/resume/` page.
- Keep the blog.
- Restore only valuable old content.
- Preserve important old URLs where practical.
- Prefer Markdown and configuration over custom code.
- Keep the project small and understandable.
- Do not introduce React, Next.js or another site framework.

## Safety rules

- Do not deploy without explicit approval.
- Do not modify the remote repository without explicit approval.
- Do not delete or replace the old static site yet.
- Do not create large amounts of placeholder content.
- Show a plan and proposed file changes before major edits.
