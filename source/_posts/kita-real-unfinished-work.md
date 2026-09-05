---
title: Kita 还没有完成：我现在明确保留的技术债
date: 2026-08-04 17:45:00
cover: /img/covers/kita-unfinished-work.webp
description: 把 Kita 当前没有闭环的内容、恢复、安全、测试和体验问题公开列出来，并区分真正下一步与暂时不做。
tags:
  - 技术债
  - 项目状态
  - 灾难恢复
  - 路线图
categories:
  - Kita 真实开发记录
series: Kita 真实开发记录
---

> 2026-09-05 更新：Kita 的第一版已经收尾，后续见[《Kita 的第一版，终于可以收尾了》](/2026/09/05/kita-v1-wrap-up/)。下文保留 8 月 4 日的判断；其中部分功能缺口已有后续，恢复等维护问题并未因 v1 收尾而全部关闭。

Kita 已经能运行、能部署、能编辑内容，也有 CI 和自动备份。

它还没有完成。

我想把这句话保留在系列最后，因为“架构已经搭好”很容易制造一种错觉：剩下的只是继续填内容。当前源码和状态文档里，还有一些不能用绿色 build 掩盖的缺口。

## 本地可以重建，生产还不能证明完整恢复

已经验证过的是：

- 在 C 盘从 GitHub 全新 clone；
- 重建 `.env`、Dev Container 和 PostgreSQL；
- 页面、test、check、build 通过；
- Coolify SSH 恢复材料已经加密保存并核对 checksum；
- PostgreSQL backup sidecar 已经向 R2 上传真实 custom dump。

没有完成的是：

- 把真实 dump 恢复到隔离 PostgreSQL 16；
- 用恢复数据启动 Payload 并检查内容；
- 单独恢复 R2 Media；
- 从 VPS 全毁的状态重建 Coolify、Kita 和域名入口；
- 验证 PostgreSQL 与 Media 在恢复时间点上一致；
- 从私有 R2 下载 SSH 恢复归档并完成 round-trip。

所以当前准确表述是“自动备份正在运行，本地复建已验证”，不是“灾难恢复完成”。

## OpenList 仍有一块故意延期的数据

OpenList 已经作为独立 Application 运行，固定版本和应用边界已经记录。它的最终 storage provider、data volume backup 和逐挂载恢复清单仍未定型。

当前测试挂载被当作可丢弃状态。这是一种有意接受的风险，但随着公开目录真正承载重要文件，它必须重新进入优先级。

Kita 只保存 URL，因此不会因为 OpenList 数据丢失而破坏数据库；用户点进去仍然会遇到失效目录。这属于产品可用性，不是架构图上的“完全解耦”可以消除的问题。

## Secret 轮换仍然欠着

早期截图曾让生产 Payload Secret 和数据库凭据离开秘密存储边界。轮换步骤已经写清楚，但项目所有者当前决定暂缓。

这件事不能因为时间过去而自动关闭。它需要一次带备份、数据库内部密码修改、Coolify 同步和重新登录验证的维护窗口。

## 内容模型还有几个过渡点

当前最具体的是：

- Games/Reviews slug 没有格式验证；
- Games links 没有限制 HTTPS，也用 label 字符串识别 archive；
- Games/Reviews/Tools 写权限依赖 Payload 默认认证检查，尚未显式声明；
- Reviews.coverImage 仍是文本 URL；
- Reviews.gameTitle 仍是文本，不是 Games relationship；
- Games 与 Reviews 重复定义 Lexical features；
- Tools 的 CMS 与静态 fallback 归属尚未最终决定。

这些都适合小 PR，不应该和下一次大版本升级绑在一起。

## 真正的内容仍然比技术少

状态文档仍把这些列为待办：

- About 替换 placeholder；
- Reviews 录入和清理真实内容；
- Games 清理演示与 implementation 文案；
- Tools 决定最终内容来源；
- 删除访客不需要看到的开发说明。

生产已经有 6 条 Games 并完成 Media 迁移，不代表内容表达已经完成。能通过 API 返回 document，和这些页面值得别人阅读，是两套验收标准。

这是当前最应该投入时间的地方。继续添加数据库和服务，不会自动把 placeholder 变成个人作品。

## 测试覆盖了边界，还没有覆盖完整应用

当前有 47 个 Vitest 和 4 个 backup shell cases，覆盖 mapper、getter、seed、Media 配置、环境变量和备份失败路径。

仍然缺少：

- 临时 PostgreSQL 运行全部 6 个 migration；
- published/draft 权限的真实数据库集成测试；
- 首页、Games、Reviews 和 Admin 的 Playwright smoke；
- production runner 中 Payload config/migration loading 的持续检查；
- 专用 health endpoint；
- backup last-success health/alert。

这些测试的目的不是提高覆盖率数字，而是保护曾经出过问题、或者恢复时最昂贵的路径。

## 页面体验还有具体问题

当前代码审查已经记录：

- Games/Reviews 详情 metadata 与页面可能重复查询；
- WebGL renderer 创建的 texture 没有全部显式释放；
- Lightbox 有 dialog 语义和键盘操作，但没有 focus trap、打开焦点和关闭后焦点恢复；
- 首页大图仍值得做格式与预载策略测量；
- 通用 error boundary 和真实空状态还不完整。

它们不是“以后优化性能”这种没有边界的口号。每项都有具体文件、症状和验证方法，可以独立处理。

## 仓库入口和来源说明也没有完成

Kita 根目录仍缺：

- 面向第一次 clone 的 README；
- 对外明确的项目许可证决定；
- Codrops 等第三方来源清单；
- 图片和素材版权 inventory。

内部 docs 很丰富，但第一次进入仓库的人不应该先猜哪一份 1000 行历史计划还是当前事实。

## 我现在不会做的事情

未完成清单很长，不代表每项都要立刻变成需求。

当前明确不做：

- 不引入 React 之外的新前端框架；
- 不增加 Express、Prisma、Redis 或消息队列；
- 不把 OpenList 加入 Kita Compose；
- 不为单管理员提前做复杂 RBAC；
- 不因为“现代”就拆分托管数据库和多台 VPS；
- 不追求测试覆盖率百分比；
- 不同时重构前端、数据库和生产基础设施。

刻意不做也是维护边界的一部分。

## 下一阶段怎样才算有进展

我更愿意看到下面几件事完成，而不是技术栈继续变长：

1. 完成 About、Reviews 和 Games 的真实内容；
2. 用一个小 PR 补 slug/URL validation、显式写权限和共用 Rich Text 配置；
3. 跑一次隔离 PostgreSQL 16 restore drill；
4. 给最关键公开页面补浏览器 smoke；
5. 建立 README、第三方 attribution 和素材来源表；
6. 在合适维护窗口轮换已经越界的生产 Secret。

这些任务完成后，Kita 会更可靠、更像我的网站，却不会多出一个可以放进技术栈图标墙的新产品。

## 四套文章应该怎样读

- 想知道选择从哪里来：[Kita 技术选择系列](/2026/08/01/kita-project-notes/)
- 想照着完成一个具体任务：[Kita 工程案例系列](/2026/08/04/kita-case-devcontainer-setup/)
- 看不懂文件、Git、migration 和环境变量：[从零读懂 Kita](/2026/08/04/kita-basics-read-repository/)
- 想看真实时间线、事故和缺口：[从本系列第一篇开始](/2026/08/04/kita-real-timeline/)

如果以后这些“未完成”项目真的关闭，我希望文章保留当时状态，再补一条带日期的实施结果，而不是改写成项目从来没有遇到过问题。
