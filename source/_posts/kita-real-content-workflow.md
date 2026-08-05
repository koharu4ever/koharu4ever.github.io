---
title: 发布一条 Game 不是点一下 Save：Kita 现在的内容工作流
date: 2026-08-04 17:20:00
cover: /img/covers/kita-content-workflow.webp
description: 记录 Kita 当前真正可用的内容发布流程，也说明预览、重定向、软删除和版本历史还没有做到哪里。
tags:
  - Payload Admin
  - 内容工作流
  - Media
  - 发布
categories:
  - Kita 真实开发记录
series: Kita 真实开发记录
---

Kita 已经有 Payload Admin，但它还不是一套完整编辑部系统。

现在发布一条 Game 的真实流程，包含图片、URL、状态、正文、外链和上线后的检查。Payload 帮我省掉了管理后台和基础 CRUD，却没有替我决定内容应该怎样进入网站。

## 先准备图片，而不是先建 Game

Games.cover 是必填 Media relationship。创建 Game 前，我先在 Media 上传封面：

```text
选择原图
  -> 填写 alt
  -> Payload 检查文件类型和 10 MiB 上限
  -> Sharp 生成 thumbnail / display
  -> 本地写 .payload-media，生产写 R2
  -> PostgreSQL 保存 Media document
```

`alt` 描述可见画面，不写“图片”或文件名。它会同时服务无障碍、加载失败和后续复用。

Media 设置了 `disableDuplicate: true`。生产 6 条 Games 在迁移时已经复用了重复封面，而不是为相同图片不断建立副本。

## Slug 是 URL，不是随便的标题缩写

Game 的 slug 会直接进入：

```text
/games/<slug>
```

当前字段只有 required + unique，还没有格式验证，也没有自动 slug 或 redirect 系统。最安全的做法是手工使用稳定的 ASCII 小写连字符：

```text
white-album-2
```

发布后再改 slug，旧链接会变成 404。Kita 目前不会自动记录旧 slug，也不会生成 301。因此除非名称错误，已公开 URL 应当被视为长期标识。

## 两个 Status 不要填反

```text
playStatus
  我是否已经玩完：finished / playing / planned

publicationStatus
  网站是否公开：draft / published
```

它们互不替代。正在玩的条目可以公开，已经玩完的条目也可以先留在 draft。

公开 getter 还会额外写明 `publicationStatus = published`。不是只依赖 Admin 里看起来选中了某个状态。

## 正文与页面布局的边界

Admin 可以编辑：

- h2、h3、h4；
- 段落；
- 粗体、斜体；
- 有序和无序列表；
- 引用；
- 链接。

它不能修改 Tailwind class、导航颜色、WebGL 参数或详情页布局。Payload 管理内容，页面结构继续由 Git 中的代码负责。

这个限制是有意的。把视觉配置也交给 CMS，会让每次打开 Admin 都像在编辑一个低代码页面生成器，反而破坏 Kita 已有的视觉边界。

## Archive 链接现在有一条隐含约定

Games.links 可以添加多个普通链接。Kita 通过 label `Game archive` 找到 OpenList 入口。

```text
label: Game archive
href:  https://archive.kral-koharu.com/...
```

当前 schema 没有 `kind` 字段，也没有强制 `https:`。保存前必须人工打开目标 URL，确认它是访客可访问的具体目录，而不是管理页面、临时 provider 链接或私人根目录。

这个约定适合当前少量内容，但应该在字段说明中固定。链接类型增加后，再用 migration 把语义写进 schema。

## Save Draft 以后还看不到真正的前台预览

Kita 有手工 `draft/published` 状态，却没有启用 Payload Versions/Drafts，也没有配置前台 preview URL。

更具体地说：

- Admin 能保存一条 `publicationStatus = draft` 的 Game；
- 登录用户在 Payload Admin/API 中能读到它；
- `/games/[slug]` 的 getter 仍明确筛选 published；
- 因此前台没有“带登录态预览 draft 页面”的完整流程。

现在能做的是在 Admin 复核字段，或在本地复制内容并临时验证布局；它不等于成熟的 preview workflow。

只有当真实编辑频率提高、误发布开始成为问题时，Versions、Draft Preview 和恢复历史才值得进入项目。

## 发布动作之后还要做一次读路径检查

把 `publicationStatus` 改为 published 后，我至少验证：

```text
/games
/games/<slug>
封面 display URL
Rich Text 正文
metadata title / description
Game archive 外链
移动端 Lightbox
```

如果列表有条目、详情 404，先查 slug；如果详情 200、封面 404，先查 Media/R2；如果只有 archive 按钮消失，先查 link label。

这类检查比只看到 Admin 的 “Saved successfully” 更接近用户真正收到的结果。

## Reviews 和 Tools 不是同一套工作流

Reviews 也有 draft/published 和 Rich Text，但 `coverImage` 仍是手填文本 URL，`gameTitle` 也不是 relationship。发布 Review 时要额外检查封面 URL、评分、阅读时间和标题是否与 Game 一致。

Tools 没有 draft 字段。只要保存，公开 getter 就可能读到它。因此 Tools 更适合少量、确认后再录入的资源，而不是长时间在生产 Admin 中写半成品。

## 删除比发布更缺保护

当前项目没有启用 Trash，也没有为 Games、Reviews、Media 建立编辑版本历史。

所以删除前不能只问“这个 document 还要不要”，还要检查：

- Media 是否仍被其他 Game 引用；
- 外部文章或搜索结果是否引用旧 slug；
- OpenList URL 是否仍是公开入口；
- 最近一次 PostgreSQL 与 R2 备份是否存在；
- 恢复这条内容是否已经实际演练过。

备份是灾难恢复材料，不是顺手的 Undo 按钮。当前 restore drill 尚未完整闭环，删除操作应该比新增操作更保守。

## 现在适合使用的发布清单

```text
[ ] Media 已上传，alt 能独立描述画面
[ ] slug 为稳定的小写连字符，未占用旧 URL
[ ] playStatus 与 publicationStatus 含义正确
[ ] summary 适合作为详情页 description
[ ] Rich Text 没把页面结构当正文手工模拟
[ ] archive 使用公开 HTTPS 具体目录
[ ] draft 内容完成后再切 published
[ ] 列表、详情、图片和外链都从访客视角检查
```

以后内容增长后，这张清单应该逐步被 schema validation、preview 和自动 smoke 替代；现在它至少把尚未自动化的责任写出来。

下一篇转向这些入口背后的保护边界：[Kita 的门锁装在哪里](/2026/08/04/kita-real-security-boundaries/)。
