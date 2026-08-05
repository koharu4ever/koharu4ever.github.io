---
title: Self-host 不是免费：Kita 的资源、成本与单点故障
date: 2026-08-04 17:35:00
cover: /img/covers/kita-cost-resources.webp
description: 不虚构账单数字，只根据当前部署拓扑盘点 Kita 实际消耗的机器、存储、域名、维护时间和故障风险。
tags:
  - Self-host
  - VPS
  - Coolify
  - 成本
categories:
  - Kita 真实开发记录
---

“Next.js、Payload、PostgreSQL 和 OpenList 都是开源软件”，不等于 Kita 免费运行。

开源解决的是软件使用和修改边界，不会替我支付 VPS、域名、对象存储，也不会在凌晨自动判断一个失败的 restore 到底能不能继续。

先说明一个事实：Kita 仓库没有记录 VPS 的 CPU、内存、磁盘规格和实际月账单。我不能根据 Compose 文件编一个“每月只要几美元”的结论。这篇文章只盘点已经能由源码和部署文档证明的资源。

## 当前真正运行了什么

Kita 的生产单元是：

```text
Coolify Compose Application: Kita
  ├─ web
  ├─ postgres
  ├─ backup
  └─ postgres-data volume

Coolify Application: OpenList
  ├─ official pinned image
  └─ openlist-data volume
```

外部还依赖：

```text
Cloudflare / DNS / TLS
Media R2 bucket
PostgreSQL backup R2 bucket
域名与子域名
GitHub repository / Actions
密码管理器中的恢复材料
```

OpenList 虽然是独立 Application，但如果它与 Kita 位于同一台 VPS，那么机器宕机会让两个域名一起失效。应用边界清楚，不等于硬件故障域已经分开。

## 金钱只是其中一种成本

我现在把成本分成四类。

### 固定基础设施

- VPS 套餐；
- 主域名续费；
- 可能存在的 Coolify、备份或监控服务费用。

这些费用和访问量关系不大，即使一个月没有访客也会继续发生。

### 随使用增长

- R2 Media 存储；
- PostgreSQL dump 的保留数量；
- 图片和下载流量；
- GitHub Actions、日志和其他平台额度。

实际计费应以提供商当前价格和自己的账单为准，不在文章里固化容易过期的数字。Cloudflare 的当前规则可以从 [R2 Pricing](https://developers.cloudflare.com/r2/pricing/) 核对。

### 维护时间

- VPS 与基础镜像更新；
- Next/Payload/OpenList 安全更新；
- PostgreSQL backup 检查；
- 域名和证书异常；
- Secret 轮换；
- restore 演练；
- 文档和真实配置同步。

对个人项目来说，这往往比 R2 存储费更贵。它消耗的不是账单余额，而是周末和注意力。

### 复杂度利息

每增加一个服务，都会新增：

```text
版本
Secret
网络入口
数据位置
备份方式
升级方式
故障日志
恢复顺序
```

所以我没有把 OpenList API、Redis、Prisma、队列和独立搜索服务一起放进 Kita。不是这些技术不好，而是它们会持续产生维护利息。

## 为什么现在仍然选择一台 VPS

当前业务是个人内容站，访问量、写入频率和管理员数量都很小。在同一 VPS 上运行 Web、PostgreSQL 和 OpenList，有很现实的优势：

- 账单和平台入口少；
- Compose 网络容易理解；
- 不需要管理跨公网数据库连接；
- Coolify 可以统一看日志和部署；
- 单人恢复时需要记住的机器更少。

代价也同样明确：

- Web 高负载可能影响 PostgreSQL；
- OpenList 资源占用可能影响 Kita；
- VPS 磁盘、内存或网络故障会扩大影响；
- 平台配置丢失时，需要同时重建多个应用。

当前把应用拆成独立发布单元、把备份传到 R2，是在不增加第二台服务器的情况下减少耦合；它没有消除单 VPS 故障域。

## R2 解决了什么，没有解决什么

Media 放进 R2 后，重新部署 Web container 不会删除图片。PostgreSQL dump 上传 R2 后，VPS 磁盘损坏也不一定同时失去备份。

但 R2 不自动解决：

- PostgreSQL 与 Media 的时间点一致性；
- 误删对象后的保留策略；
- Cloudflare 账号本身失去访问；
- token 泄露；
- dump 是否能成功 restore；
- custom domain、bucket policy 和 DNS 的重建。

“离开 VPS”降低了一类风险，不等于“已经有灾难恢复”。

## 当前的单点故障清单

| 单点 | 丢失时的影响 | 当前缓解 |
|---|---|---|
| VPS | Kita 与同机 OpenList 同时不可用 | 源码、Compose、外部 backup |
| PostgreSQL volume | 内容和关系丢失 | R2 custom dump，但 restore 未完整演练 |
| Media R2 | Games 封面丢失 | 数据与对象 inventory，独立恢复未闭环 |
| Coolify 配置 | 域名、变量、部署状态需重建 | Bitwarden inventory 与恢复文档 |
| Cloudflare 账号 | DNS、Media、backup 同时受影响 | Secret inventory；账号级替代方案未验证 |
| 管理员账号 | 无法维护 Payload 内容 | 恢复材料；邮件找回尚未配置 |
| 域名 | 所有公开入口变化 | 续费责任与 DNS inventory |

这张表比“用了 Cloudflare 所以稳定”更接近真实风险。

## 什么时候才值得拆机器或托管数据库

我不会用“生产环境就应该分离数据库”作为理由。真正的触发条件应该能观察：

- VPS 内存持续不足或频繁 OOM；
- PostgreSQL I/O 被 Web/OpenList 明显干扰；
- 数据价值已经高到需要独立备份与可用性承诺；
- 多个维护者需要不同权限；
- 数据库升级和应用部署必须独立安排；
- 实际恢复目标无法在单机方案中达到。

在这些证据出现前，先监测和记录资源，而不是提前复制一套云架构。

## 仓库里还缺一份真实成本清单

长期维护时，我希望补的不是价格比较文章，而是一张私有 inventory：

```text
服务 / 提供商
用途
规格或额度
月付/年付
续费日期
账号归属
数据位置
备份位置
取消服务前的迁移步骤
```

这份清单不应该公开包含账号和账单信息，但应该存在于可靠的私人记录中。否则“低成本 Self-host”很容易变成一堆忘记续费、无法迁移的订阅。

Kita 当前的选择不是最便宜，也不是最稳健。它是在单人维护、少量内容和希望掌握完整链路之间取得的阶段性平衡。

下一篇处理另一个经常被“GitHub 上能看到”掩盖的问题：[Kita 的参考、改造与许可证](/2026/08/04/kita-real-sources-and-licenses/)。
