---
title: 从 Payload Media 到 Cloudflare R2 的完整配置
date: 2026-08-04 11:00:00
cover: /img/covers/payload-media-r2.webp
description: 创建独立 R2 bucket、custom domain 和最小权限 token，并让 Payload 在本地使用目录、生产使用 R2，同时安全迁移 Games 封面。
tags:
  - Payload Media
  - Cloudflare R2
  - Sharp
  - 实操案例
categories:
  - Kita 工程案例
---

> 这是“Kita 工程案例”系列的第四篇。前三篇建立并修复本地开发环境；这一篇把 Games 图片从应用文件系统迁移到 Payload Media 与 Cloudflare R2。

## 最终架构

Kita 当前的图片链路是：

```text
Payload Admin
  -> Media Collection
       -> PostgreSQL：元数据、尺寸和关系
       -> 本地开发：.payload-media
       -> 生产环境：Cloudflare R2
  -> Games.cover relationship
  -> Local API / mapper
  -> Gallery / Lightbox / Detail
```

本地开发不需要生产 R2 secret，生产环境又必须拒绝使用易失的容器本地文件。

## 第一步：在 Cloudflare 创建独立资源

生产侧准备：

```text
独立 bucket       kita-media
公开 custom domain media.<你的域名>
S3 API endpoint   https://<ACCOUNT_ID>.r2.cloudflarestorage.com
API token         只允许访问 kita-media
```

必须区分两个 URL：

| 配置 | 用途 |
| --- | --- |
| S3 API endpoint | Payload 服务端上传、删除对象 |
| public custom domain | 浏览器和 Next Image 读取图片 |

不要把 API endpoint 当成公开图片地址，也不要复用 PostgreSQL backup bucket 或 backup token。

R2 bucket 默认不是公开站点。生产图片使用 custom domain；开发用途的 `r2.dev` 不作为最终公开 URL。

## 第二步：声明环境变量边界

`.env.example` 只保存键名：

```env
MEDIA_STORAGE_MODE=local
MEDIA_R2_BUCKET=
MEDIA_R2_ENDPOINT=
MEDIA_R2_PUBLIC_URL=
MEDIA_R2_ACCESS_KEY_ID=
MEDIA_R2_SECRET_ACCESS_KEY=
```

本地 `.env`：

```env
MEDIA_STORAGE_MODE=local
```

Coolify Production：

```env
MEDIA_STORAGE_MODE=r2
MEDIA_R2_BUCKET=kita-media
MEDIA_R2_ENDPOINT=https://<ACCOUNT_ID>.r2.cloudflarestorage.com
MEDIA_R2_PUBLIC_URL=https://media.<你的域名>
MEDIA_R2_ACCESS_KEY_ID=<secret>
MEDIA_R2_SECRET_ACCESS_KEY=<secret>
```

真实 key 只进入 Coolify 的生产变量，不进入 Git、文档、日志或截图。

## 第三步：建立 Media Collection

Kita 的 `Media` Collection 保持字段少而明确：

```ts
export const Media: CollectionConfig = {
  slug: "media",
  access: {
    create: isAuthenticated,
    delete: isAuthenticated,
    read: () => true,
    update: isAuthenticated,
  },
  fields: [
    {
      name: "alt",
      type: "text",
      minLength: 3,
      maxLength: 240,
      required: true,
    },
  ],
  upload: {
    adminThumbnail: "thumbnail",
    imageSizes: [
      { name: "thumbnail", width: 400, withoutEnlargement: true },
      { name: "display", width: 1600, withoutEnlargement: true },
    ],
    mimeTypes: ["image/jpeg", "image/png", "image/webp", "image/avif"],
    staticDir: path.resolve(process.cwd(), ".payload-media"),
  },
};
```

实际配置还把两个衍生尺寸输出为 WebP，并设置质量参数。

权限边界是：公开访客可以读取公开图片，只有已登录管理员可以创建、更新和删除。

`alt` 放在 Media document 中，因为当前主要是一张封面对应一个游戏，不需要提前增加 Games 局部覆盖字段。

## 第四步：配置文件大小与 Sharp

Payload 主配置加入 Sharp，并设置上传上限：

```ts
export default buildConfig({
  sharp,
  upload: {
    abortOnLimit: true,
    limits: {
      fileSize: 10 * 1024 * 1024,
      files: 1,
    },
  },
});
```

Sharp 在上传阶段生成 thumbnail 和 display；Next Image 在页面请求阶段选择和优化图片。两者不是重复功能。

第一版没有生成很多相近尺寸。只有真实测量证明 1600px display 浪费明显时，才值得继续增加规格。

## 第五步：让生产模式 fail-fast

Kita 使用独立 resolver 检查媒体模式：

```ts
if (mode === "local" && runtimeEnv.NODE_ENV === "production") {
  throw new Error(
    "MEDIA_STORAGE_MODE must be r2 in production; refusing ephemeral local media storage.",
  );
}
```

`r2` 模式还要求 bucket、endpoint、public URL 和两项凭据全部存在，并要求 URL 使用 HTTPS。

这条规则非常重要。生产配置不完整时，应用应该明确失败，不能悄悄把上传写进 web 容器，再在下一次 redeploy 后丢失。

## 第六步：接入 Payload S3 Adapter

Kita 使用 `@payloadcms/storage-s3` 连接 R2 的 S3-compatible API：

```ts
s3Storage({
  enabled: mediaStorage.mode === "r2",
  bucket: mediaStorage.mode === "r2" ? mediaStorage.bucket : "disabled",
  collections: {
    media: {
      disablePayloadAccessControl: true,
      prefix: "media",
      generateFileURL: ({ filename, prefix }) =>
        buildMediaPublicURL(mediaStorage.publicURL, filename, prefix),
    },
  },
  config: {
    credentials: {
      accessKeyId: mediaStorage.accessKeyId,
      secretAccessKey: mediaStorage.secretAccessKey,
    },
    endpoint: mediaStorage.endpoint,
    forcePathStyle: true,
    region: "auto",
  },
});
```

这里的 `disablePayloadAccessControl` 只适用于当前公开 Media。未来私密文件必须使用另一套 collection/bucket 和访问方式。

## 第七步：允许 Next Image 读取精确域名

`next.config.ts` 根据 `MEDIA_R2_PUBLIC_URL` 生成 `remotePatterns`：

```ts
const nextConfig: NextConfig = {
  images: {
    remotePatterns: mediaPublicURL
      ? [createMediaRemotePattern(mediaPublicURL)]
      : [],
  },
  output: "standalone",
  typedRoutes: true,
};
```

只允许实际媒体域名，不使用宽泛的任意远程图片规则。构建生产镜像时还要提供公开 URL，因为 Next.js 图片配置属于构建结果的一部分。

## 第八步：分两次迁移 Games 封面

第一次迁移只增加 Media 表和可空的 `games.cover_id`。代码同时保留旧 `coverSrc` 等字段：

```text
有完整 Media relationship
  -> 使用 Media display/original

尚未迁移
  -> 使用 legacy coverSrc/coverAlt/width/height
```

部署兼容版本后，在 Payload Admin 中：

1. 上传现有封面；
2. 检查 thumbnail 与公开 URL；
3. 为每个 Game 绑定 `cover`；
4. 检查画廊、Lightbox 和详情页；
5. redeploy 一次，证明图片不依赖旧 web 容器。

全部内容完成后，第二个 migration 才执行：

```text
检查是否仍有 cover_id 为空
  -> 有：立即中止
  -> 没有：设为 NOT NULL，删除四个旧字段
```

这样清理 migration 不会在生产内容尚未迁完时静默破坏页面。

## 本地验证

使用 `MEDIA_STORAGE_MODE=local` 启动：

```bash
pnpm dev
```

在 `/admin`：

1. 上传一张小型测试图；
2. 填写 alt；
3. 确认 thumbnail/display 生成；
4. 将图片绑定到测试 Game；
5. 检查 `/games`、Lightbox 和详情页；
6. 删除测试内容。

本地 smoke 只能证明 Payload upload 和页面链路，不能证明 R2 正确。

## 生产验证

生产部署后：

```text
/admin 登录
  -> 上传测试图片
  -> R2 bucket 出现 media/ 对象
  -> URL 使用 custom domain
  -> 绑定一个 Game
  -> 前台图片正常
  -> redeploy web
  -> 图片仍然正常
```

最后一次 redeploy 是关键证据：它证明文件不在旧 web 容器本地。

## 回滚方式

兼容阶段保留旧字段和旧图片，因此 R2 链路失败时可以回滚应用，mapper 继续读取 legacy 数据。

完成 Media-only 清理后，旧镜像如果仍依赖旧字段，就不能直接启动。需要先按 migration 设计执行 `down` 恢复兼容字段，再回滚代码。

不要删除 R2 对象或旧 public 图片来“测试回滚”。先验证数据与代码版本关系。

## 当前结果与未完成边界

Kita 生产 6 条 Games 已全部绑定必填 Media，旧封面字段已删除；生产上传、custom domain、页面显示和 redeploy 持久性均已验证。

但 PostgreSQL dump 不包含 R2 图片二进制。数据库恢复与 Media bucket 恢复仍然是两件事，完整 R2 Media 恢复演练尚未完成。

下一篇进入服务器：怎样从一台空白 VPS 整理出 Coolify、DNS、Compose、环境变量和最小上线闭环。

## 系列导航

- 对应的决策文章：[Games 封面从源码枚举到 Payload Media + R2](/2026/08/03/kita-media-r2/)
- 上一篇：[修复 Windows 9P 导致的 Next.js 编译缓慢](/2026/08/04/kita-case-windows-nextjs-performance/)
- 下一篇：[从空白 VPS 到 Coolify 部署 Kita](/2026/08/04/kita-case-vps-coolify-deployment/)
