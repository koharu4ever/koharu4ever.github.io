# Kita 技术选择系列写作计划

> 建立日期：2026-08-04  
> 性质：内部编辑计划，不参与 Hexo 发布。  
> 目标：把 Kita 写成一条连续的个人技术选择史，而不是九篇彼此割裂的工具教程。

## 1. 系列的中心命题

这个系列不是为了证明 Kita 使用了多少技术，也不是在项目完成后倒推一份看起来完美的架构设计。

真正的主线是：

> 我先确定自己想要什么样的网站和开发方式，再寻找符合个人审美、维护能力与控制欲的工具；每遇到一个新问题，才在现有基座上增加一层能力，同时舍弃不适合的方案。

这里的“审美”不只指页面外观，也包括工程审美：

- 网站应该有自己的视觉性格，而不是通用 SaaS 模板；
- 开发环境应该干净、可重建，不依赖宿主机上的隐形配置；
- 生产环境和数据应该尽量由自己掌握；
- 工具的职责应该清楚，避免两套系统解决同一问题；
- 可以借鉴成熟项目，但不盲目复制整套技术栈；
- 复杂度应该集中在真正重要的部分；
- 没有真实需求的功能宁可不做；
- 当新证据出现时，允许替换早期方案。

因此，“拼技术栈”不是随意堆叠，而是有边界的组合：

```text
一个真实问题
  -> 寻找可选方案
  -> 选择符合项目性格的工具
  -> 说明它解决了什么
  -> 承认它带来的代价
  -> 与已有系统划清边界
  -> 在实际运行中继续修正
```

## 2. 三个原始思想来源

### 2.1 自己的 Next.js Starter

来源：Syntax / CJ 的 [Create your own Next.js Starter Template](https://www.youtube.com/watch?v=dLRKV-bajS4)。

它带来的不是一份必须照抄的模板，而是最初的选择方法：先看清 Next.js 生态有哪些 CLI Generator、Starter、SaaS Starter 和 Toolkit，再逐项决定代码规范、编辑器、目录、UI、认证和数据库。

它成为 Kita 的代码基座思想来源。

### 2.2 Dev Container

来源：Syntax / CJ 的 [you should be using dev containers](https://www.youtube.com/watch?v=kPMA9cnpScU)。

视频展示了：

- container 与开发容器的区别；
- Dev Container spec；
- templates；
- features；
- Docker-in-Docker feature；
- editor customization；
- 把开发工具放进隔离环境。

它触发了 Kita 的第二层想法：不只源码需要版本管理，开发环境本身也应该成为项目的一部分。

### 2.3 Self-host 与 Coolify

来源：Syntax / CJ 的 [Coolify Crash Course | Self Host 101 | Secure Set up](https://www.youtube.com/watch?v=taJlPG82Ucw)。

视频把以下内容串成了一条完整路线：

- 选择 VPS；
- 安装与保护 Coolify；
- 域名和 HTTPS；
- firewall 与 2FA；
- GitHub 自动部署；
- Next.js 与 PostgreSQL；
- Dockerfile 和 Docker Compose；
- S3-compatible storage；
- 数据库备份。

它成为 Kita 的生产路线思想来源：不把项目局限在本地或平台的一键部署，而是理解服务器、容器、域名、数据和备份怎样组成自己的运行环境。

## 3. 整个系列的时间线

```text
想做一个符合自己审美的 Galgame / 个人内容站
  ↓
学习怎样建立自己的 Next.js Starter
  ↓
把代码规范、类型、编辑器和目录变成开发基座
  ↓
决定用 Dev Container 固定并隔离开发环境
  ↓
决定 Self-host，并用 Coolify 管理自己的生产应用
  ↓
从 Kralgame 的混乱中提取视觉和内容目标
  ↓
重新建立 Kita，而不是继续修补旧代码
  ↓
静态页面需要真实内容管理
  ↓
加入 Payload、PostgreSQL、Local API 和 mapper
  ↓
图片不能继续跟随源码枚举和 Git 部署
  ↓
加入 Payload Media、Sharp 和 Cloudflare R2
  ↓
Games 需要独立资源目录，但不应变成下载站
  ↓
将 OpenList 作为独立应用，以公开 URL 连接
  ↓
项目上线后需要可靠的检查、迁移、备份和恢复
  ↓
形成 CI、Coolify Compose、R2 backup 与灾难恢复边界
```

## 4. 系列文章顺序

### 第一篇：从一个视频开始：我怎样为 Kita 搭起 Next.js 开发基座

核心问题：`create-next-app` 之后，一个能长期开发的项目还缺少什么？

主要内容：

- Starter、CLI Generator、SaaS Starter 与 Toolkit 的区别；
- TypeScript、ESLint、Prettier 分别解决什么；
- VS Code Workspace 为什么属于项目；
- 打开错误根目录导致配置失效的真实踩坑；
- Bulletproof React 只借鉴 feature boundary；
- Typed Routes 与 typesafe env；
- 为什么没有照抄 NextUI、NextAuth、Drizzle 和 Guestbook。

文章状态：已完成，文件为 `source/_posts/kita-project-notes.md`。

### 第二篇：为什么我一直使用 Dev Container：开发环境也应该写进仓库

核心问题：源码能复制，为什么换电脑、换终端或加入自动化工具以后，项目仍然会坏？

主要内容：

- Dev Container 视频带来的启发；
- 容器、开发容器、镜像和 Compose 的区别；
- 为什么宿主机只保留 Git、Docker、VS Code 和浏览器；
- `devcontainer.json`、Feature、remoteUser 和生命周期命令；
- 为什么 Kita 使用 Docker-in-Docker；
- root 污染 `.next` 的真实事故；
- Windows 9P 性能问题与两个 targeted named volume；
- 为什么最终把入口收敛为 `pnpm dev`；
- Dev Container 解决了什么，又增加了哪些复杂度。

主要事实来源：

- `C:\dev\Kita\docs\docker-dev-container-notes.md`
- `C:\dev\Kita\docs\docker-devcontainer-project-explained.md`
- `C:\dev\Kita\docs\development-environment-architecture-review.md`
- `C:\dev\Kita\docs\first-priority-next-build-gate-remediation-2026-07-10.md`
- `C:\dev\Kita\docs\local-development-performance-remediation-2026-07-14.md`

### 第三篇：为什么 Kita 要 Self-host：我怎样从 VPS 走到 Coolify

核心问题：网站写完以后，我希望谁掌握它的运行环境、数据和发布方式？

主要内容：

- Self Host 101 / Coolify 视频带来的方向；
- 为什么从一开始就考虑 VPS、域名和 GitHub；
- Self-host 不是拒绝自动化，而是理解自动化下面发生什么；
- Dockerfile、Compose、Coolify 分别负责什么；
- Cloudflare DNS、HTTPS 与 R2 的职责；
- GitHub main、CI 与自动部署之间的关系；
- 为什么没有直接依赖 Vercel 的平台特性；
- 自己维护 VPS 得到了什么控制权，也承担了哪些责任。

主要事实来源：

- 旧站 `note1`；
- `C:\dev\Kita\docs\deployment-roadmap.md`
- `C:\dev\Kita\docs\development-production-alignment.md`
- `C:\dev\Kita\docs\technical-stack-skeleton.md`

### 第四篇：为什么我重新做了 Kita，而不是继续修旧项目

核心问题：旧项目已经有页面和部分后端，为什么不继续打补丁？

主要内容：

- Kralgame 真正留下的价值；
- 想保留的视觉、内容模型和页面气质；
- mock、硬编码 URL、Cloudinary 和混合职责；
- “恢复旧代码”与“恢复项目意图”的区别；
- 为什么先做静态视觉，再重新接真实数据；
- 第一版为什么放弃论坛、公开用户和大而全功能。

主要事实来源：

- `C:\dev\Kita\docs\old-project-mental-model.md`
- `C:\dev\Kita\docs\kralgame-to-kita-migration-notes.md`
- `C:\dev\Kita\docs\kita-v1-project-assessment.md`
- `C:\dev\Kita\docs\home-frontend-notes.md`

### 第五篇：从静态页面到 Payload Local API：Kita 的数据流怎么形成

核心问题：页面效果确定后，真实内容应该存在哪里、怎样安全地进入页面？

主要内容：

- mock 为什么适合验证 UI，却不能成为生产数据；
- 为什么选择 Payload，而不是再写 Express 后端；
- 为什么使用 PostgreSQL；
- Payload Local API 为什么适合同一个 Next.js 应用；
- server getter、mapper 和 view model 解决什么；
- 开发 fallback 与生产 fail-fast；
- Tools、Reviews、Games 三条数据链怎样逐步落地；
- 为什么目前不需要 Prisma、Drizzle 或 repository 抽象。

### 第六篇：Games 封面从源码枚举到 Payload Media + R2

核心问题：为什么一张内容图片不应该要求修改源码、schema 和部署应用？

主要内容：

- `coverKey` 枚举的初衷和局限；
- 静态路径字段解决了什么；
- 为什么最终需要 Payload Media；
- 本地 `.payload-media` 与生产 R2；
- Sharp 的 thumbnail/display；
- 分阶段迁移生产内容；
- 为什么没有使用 Vercel Blob 或 Cloudflare Images；
- PostgreSQL 元数据与 R2 对象的恢复边界。

### 第七篇：为什么 OpenList 是独立应用，而不是 Kita 的一个微服务

核心问题：Games 需要资源目录时，为什么不直接把文件系统和 API 塞进 Kita？

主要内容：

- Games、Reviews、OpenList 的产品职责；
- 为什么独立 Coolify Application；
- 为什么不共享数据库、Volume、secret 和发布流程；
- 为什么第一版只保存公开 URL；
- 为什么没有 fork SolidJS 前端或深度调用 API；
- 用户体验上的紧密与系统架构上的松耦合；
- 下载站气质、版权与存储风险。

### 第八篇：从能部署到能恢复：PostgreSQL、R2 与灾难恢复

核心问题：网站显示 200、容器处于 Running，为什么仍然不能说明项目安全？

主要内容：

- format、lint、typecheck、test、build 的门禁；
- GitHub Actions 与 main Ruleset；
- schema push 与 production migration；
- Coolify Compose 内 PostgreSQL 的备份限制；
- backup sidecar、`pg_dump`、`pg_restore --list` 和 rclone；
- GitHub、Bitwarden、R2、VPS、OpenList 等资产的恢复边界；
- “已有备份”与“恢复演练通过”的区别；
- 当前尚未完成的完整生产 restore drill。

### 第九篇：Kita 用了哪些技术，以及我刻意没有使用什么

核心问题：经过所有真实选择以后，这套技术栈为什么最终长成现在这样？

这不是简单列依赖，而是系列总结：

- 每项技术解决的问题；
- 每项技术与相邻层的边界；
- 哪些来自最初的 Starter；
- 哪些来自 Dev Container 和 Self-host 思想；
- 哪些是在上线和迁移中后来增加；
- 为什么没有 Express、Prisma、Drizzle、NextAuth、Redis、tRPC、大型 UI 库和微服务；
- 哪些选择未来仍可能改变。

## 4.1 实际发布文件与完成状态

截至 2026-08-04，九篇正文均已形成可预览版本：

| 顺序 | 文章文件 | 状态 |
| --- | --- | --- |
| 1 | `source/_posts/kita-project-notes.md` | 已完成 |
| 2 | `source/_posts/kita-dev-container.md` | 已完成 |
| 3 | `source/_posts/kita-self-host-coolify.md` | 已完成 |
| 4 | `source/_posts/rebuild-kita-not-kralgame.md` | 已完成 |
| 5 | `source/_posts/kita-payload-local-api.md` | 已完成 |
| 6 | `source/_posts/kita-media-r2.md` | 已完成 |
| 7 | `source/_posts/kita-openlist-boundary.md` | 已完成 |
| 8 | `source/_posts/kita-backup-recovery.md` | 已完成 |
| 9 | `source/_posts/kita-technology-tradeoffs.md` | 已完成 |

这些状态表示文章已经写入 Hexo 源码并可进行本地预览，不表示已经发布或部署。后续仍可根据真实项目变化逐篇修订。

## 5. 每篇文章必须使用的写法

每篇文章都遵循同一结构：

```text
1. 当时我遇到了什么问题
2. 作为初学者，我一开始怎样理解它
3. 哪个视频、教程、项目或事故让我注意到这个方向
4. 我看到了哪些可选方案
5. 最后为什么选择这个工具
6. 它具体解决了什么
7. 它带来了什么代价或新问题
8. 我后来怎样修改最初方案
9. 今天它在 Kita 中处于什么状态
```

不能使用下面的写法：

- 先列一长串依赖，再为每个依赖补一句定义；
- 把当前架构写成项目第一天就完整设计好的结果；
- 把视频或 AI 的总结伪装成自己的原始判断；
- 把个人项目描述成高并发商业平台；
- 只写成功结果，不写踩坑、替换和未完成边界；
- 为了显得专业而滥用“企业级”“最佳实践”“生产就绪”；
- 把没有采用的技术写成技术本身不好。

## 6. 系列文章之间怎样连接

每篇开头用一句话说明它在整个演进中的位置：

```text
上一篇解决了什么
  -> 这一篇为什么自然出现
```

每篇结尾不使用泛泛的“未来继续努力”，而是引出下一层真实问题：

```text
代码基座稳定了
  -> 但开发环境仍依赖宿主机

开发环境固定了
  -> 但网站最终要在哪里运行

生产路线明确了
  -> 但旧项目本身无法直接迁移

静态页面重新建立了
  -> 但真实内容需要数据库和后台
```

这样九篇文章共同构成一条连续叙事，而不是九篇独立的技术百科。

## 7. 第一人称表达原则

- 保留“我当时并不懂”“我最初理解错了”“这个配置让我排查了两个晚上”等真实视角；
- 技术定义只写到理解当前选择所需的程度；
- 引用视频时说明它带来了什么思路，不逐字转录教程；
- 使用“我选择”“我没有选择”“后来实测改变了判断”；
- 允许表达个人偏好，例如视觉、控制权、可维护性和对宿主机整洁的要求；
- 把舍取写清楚，因为舍取本身就是这个系列最重要的内容。
