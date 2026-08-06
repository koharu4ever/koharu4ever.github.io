---
title: Games 封面从源码枚举到 Payload Media + R2
date: 2026-08-03 09:00:00
cover: /img/covers/media-r2-migration.webp
description: Kita 的 Games 图片经历了枚举、静态路径和 Payload Media 三个阶段。这次迁移真正解决的是让内容变化不再等于代码发布。
tags:
  - Payload Media
  - Cloudflare R2
  - Sharp
  - 内容迁移
categories:
  - Kita 开发记录
series: Kita 技术选择
---

> 这是“Kita 技术选择”系列的第六篇。上一篇建立了 Payload 到页面的数据流；这一篇处理其中最容易被低估的一类内容：图片。

Kita 的 Games 页面以封面为中心。

如果封面加载失败，页面并不是少了一点装饰，而是失去了主要内容。因此图片从哪里来、怎样录入、如何迁移和备份，最终成了独立于普通文本字段的问题。

这个方案没有一步到位，而是经历了三个阶段。

## 第一阶段：`coverKey` 枚举

最初我使用类似 `coverKey` 的字段。每张已知封面对应一个枚举值，前端再把这个值映射到源码中的静态图片。

它在早期有几个明显优点：

- TypeScript 能检查允许的封面名称；
- 不会从后台输入任意错误路径；
- 静态图片可以跟随 Git 和应用一起部署；
- mock 数据和页面组件很容易建立对应关系。

当 Games 只有少量固定条目时，这个方案足够简单。

问题在新增内容时暴露出来。增加一张封面不只是上传文件，还需要修改枚举、映射、schema 或类型，再重新构建应用。

本来属于内容编辑的动作，被错误地变成了代码发布。

## 第二阶段：静态路径字段

为了先解除枚举限制，我把封面改成静态路径字段，例如指向 `public/games/covers` 下的文件。

这一步解决了“每张图片都要修改 TypeScript 枚举”的问题。后台或数据记录只需要保存路径，组件按路径显示图片。

但图片仍然位于 Git 仓库中：

- 新内容仍需先把文件加入源码；
- 应用镜像会携带全部封面；
- 删除和替换图片依赖代码部署；
- Admin 不能真正完成上传工作；
- 容器、Git 历史和内容生命周期仍然绑在一起。

静态路径是有用的过渡方案，却不是 Kita 最终想要的内容管理体验。

## 我真正想要的上传链路

最后我把目标写得更具体：

```text
在 Payload Admin 选择图片
  -> 创建 Media document
  -> 保存原图并生成展示尺寸
  -> Games 通过 relationship 引用 Media
  -> 页面得到稳定的 URL 与尺寸信息
```

这意味着封面不再是字符串约定，而是正式的内容关系。

Payload 已经负责 Admin、Collection 和 PostgreSQL，因此继续使用 Payload Media 比再接一套独立上传后台更自然。

## 为什么本地和生产使用不同存储

本地开发时，我希望上传流程简单、离线可用。Media 文件写入项目的开发目录 `.payload-media`，数据库保存对应元数据。

生产环境不能这样做。

Coolify 重新部署应用时，web 容器的本地文件系统可能被替换。即使增加 volume，也会让媒体跟某台 VPS 强绑定，并给迁移与备份增加另一套路径。

因此生产环境强制使用 Cloudflare R2：

```text
本地开发
  PostgreSQL 元数据 + .payload-media 文件

生产环境
  PostgreSQL 元数据 + Cloudflare R2 对象
```

环境变量明确决定媒体模式。生产缺少 R2 配置时应该失败，而不是悄悄退回容器本地存储，制造下一次部署后丢文件的风险。

## Sharp 在这条链路里解决什么

直接把所有原图用于封面墙，会浪费带宽和解码资源。Payload 配合 Sharp 生成不同用途的对象，例如 thumbnail 和 display 尺寸。

页面不需要每次下载最大原图，而可以根据位置选择合适尺寸。Next Image 继续负责页面中的优化与布局，Sharp 则在内容进入系统时准备衍生文件。

两者职责不同：

```text
Sharp
  上传阶段生成可复用的图片尺寸

Next Image
  页面请求与渲染阶段选择和优化图片
```

我没有为了图片处理再增加 Cloudflare Images。当前 R2 + Sharp 已经覆盖上传、对象保存和尺寸生成，第二套图片产品会增加 URL、计费和恢复边界。

## 为什么没有使用 Vercel Blob

Kita 的 Games 画廊参考过 Vercel Image Gallery Starter 的布局和 lightbox，但我没有因此采用它的全部存储选择。

图片交互和对象存储是两个不同决策。

Kita 已经使用 Cloudflare 处理 DNS，并计划让 PostgreSQL backup 进入 R2。Payload 也提供 S3-compatible storage adapter，所以 R2 能以较少的新概念接入现有 Self-host 架构。

Vercel Blob 对部署在 Vercel 的应用可能很合适，但 Kita 的 web、数据库和备份都由自己的 Coolify 环境管理。选择 R2 是为了贴合这条路线，而不是判断另一个产品的普遍优劣。

## 生产迁移为什么必须分阶段

如果直接把 `coverKey` 删除，再把 `cover` relationship 设为必填，已有生产数据会在新 schema 下立即失效。

因此迁移按阶段进行：

1. 先增加 Media Collection 和兼容字段；
2. 接通本地上传与生产 R2；
3. 为现有 Games 创建或上传 Media；
4. 把旧封面数据迁移为 relationship；
5. 确认页面能够读取新关系；
6. 再把 `cover` 设为必填；
7. 最后删除旧字段和兼容逻辑。

这段过程比一次 schema 修改麻烦，却保护了已有内容。

它也让我更具体地理解 migration：migration 不是让数据库“追上最新代码”的仪式，而是明确描述旧数据怎样变成新数据。

## mapper 在 Media 关系中再次发挥作用

Payload relationship 在类型上可能是 Media ID，也可能是已经展开的 Media document；某些尺寸也可能暂时不存在。

Games 组件不应该理解这些后台细节。mapper 把关系转换成页面需要的 `src`、宽高、alt 和展示尺寸，并为异常状态提供明确处理。

因此页面仍然只消费稳定 view model，Media schema 的变化集中在数据转换层。

这也是上一篇保留 mapper 的实际例子。

## PostgreSQL 和 R2 必须一起理解

使用对象存储以后，完整内容被分成两部分：

```text
PostgreSQL
  Media document、文件名、尺寸、Games relationship、正文元数据

R2
  原图、thumbnail、display 等真实对象
```

只有 PostgreSQL dump，没有 R2 对象，页面知道应该显示哪张图，却找不到文件。

只有 R2 对象，没有 PostgreSQL，文件仍然存在，却失去了内容关系和后台记录。

所以“数据库已经备份”不能等同于“Games 内容已经完整恢复”。当前 PostgreSQL 定时备份已经运行，R2 Media 的独立恢复验证仍然是灾难恢复中需要继续完成的边界。

## 这次选择带来了什么代价

Payload Media + R2 解决了内容上传与部署解耦，也带来新的责任：

- 需要管理 bucket、endpoint 和最小权限 token；
- 需要允许 Next Image 读取生产远程域名；
- schema 修改必须考虑 Media relationship；
- 删除 document 与删除对象之间要保持一致；
- 恢复时需要同时处理数据库和对象存储；
- 本地文件模式与生产 R2 模式都需要测试。

这些复杂度对应的是一个真实收益：以后新增 Games 封面可以在 Admin 完成，而不需要修改源码和重新发布应用。

## 下一层问题：封面下面的资源放在哪里

Games 解决了馆藏、封面、介绍和外部入口，但有些条目还需要关联公开资源目录。

我没有把文件索引能力继续塞进 Payload，也没有让 Kita 直接管理存储 provider。最终选择是把 OpenList 作为另一个独立应用，只通过公开 URL 与 Games 连接。

下一篇会解释为什么这种“产品上靠近、工程上分开”的关系更适合 Kita。

## 相关工程案例

- [从 Payload Media 到 Cloudflare R2 的完整配置](/2026/08/04/kita-case-payload-media-r2/)

## 系列导航

- 上一篇：[从静态页面到 Payload Local API：Kita 的数据流怎么形成](/2026/08/02/kita-payload-local-api/)
- 下一篇：[为什么 OpenList 是独立应用，而不是 Kita 的一个微服务](/2026/08/03/kita-openlist-boundary/)
