---
title: 我为什么最终选择这套 C#/.NET 后端栈：EF Core-first，SQL/Npgsql-local
date: 2026-08-04 23:00:00
cover: /img/home-rain-harbor.jpg
description: 从把 C# 误解为“微软版 Java”，到选择 .NET 10、ASP.NET Core、EF Core、Npgsql 和 PostgreSQL：一套面向单人中等规模项目的克制后端方案。
tags:
  - C#
  - .NET
  - ASP.NET Core
  - EF Core
  - PostgreSQL
categories:
  - 开发笔记
---

我以前对 C# 有一个非常简单，也非常不准确的印象：它像是微软版本的 Java。

既然我已经要面对静态类型、class、ORM 和企业后端生态，为什么不直接学 Java？如果 C# 只是 Java 的一个 subset，我看不出绕到 .NET 的必要。

后来我才发现，我真正关心的问题并不是“谁拥有更多功能”，而是这些功能怎样被组织在一起。C# 和 .NET 最吸引我的地方，不是某一项技术绝对领先，而是语言、Web 框架、依赖注入、配置、日志、JSON、数据库访问、迁移、测试和命令行工具之间，有一种非常克制的连续性。

它不像 Go 那么小，但有一点我喜欢的 Go 式气质：主路径相对统一，官方平台愿意把常见问题直接解决，不需要先从十种历史方案中拼出一套能工作的组合。

因此，我为接下来的个人项目确定了这套 C# 后端栈：

> **C# 14 + .NET 10 LTS + ASP.NET Core Minimal APIs + PostgreSQL + Npgsql + EF Core。**

数据访问策略是：

> **EF Core-first，SQL/Npgsql-local。**

更完整的规则是：

> **普通读写使用 EF Core + LINQ；复杂查询及时退回 SQL；第一版不安装 Dapper，只有手写 SQL 映射真的形成持续痛点后才允许加入。**

我把最后这一条称为：

> **Dapper-on-proof。**

这篇文章不是要证明 EF Core 永远优于 SQL，也不是要把 .NET 官方模板当作不可质疑的最佳实践。它要解释的是：一个以 TypeScript/JavaScript 为主要背景、偏爱 Go 的直接感、拒绝企业级仪式的开发者，为什么最终愿意把 C#/.NET 作为下一个真正完成的后端项目。

<!-- more -->

## 我需要的不是“另一种 Java”，而是一条更统一的后端主路

我的项目边界很清楚：

- 一个人开发；
- 最大预计中等规模；
- 需要长期维护；
- 以 PostgreSQL 为核心数据存储；
- 有普通 CRUD，也有状态变化、搜索、统计和复杂查询；
- 使用 VS Code；
- 使用 Dev Container；
- 不主动进入微服务、CQRS 或重型 Clean Architecture；
- 项目必须有真实使用价值，而不是技术演示。

对这种项目来说，最危险的不是能力不够，而是选择过多。

.NET 生态当然也有大量框架和模式：MediatR、AutoMapper、FluentValidation、Dapper、MassTransit、Marten、Hangfire、Serilog、Aspire，以及各种 Clean Architecture 模板。它们都有适合自己的问题，但如果把它们当作“成熟 .NET 项目应该有的东西”一次性加入，C# 很快也会变成我不喜欢的企业 Java。

所以我不会问：

> 一个完整的 .NET 后端最多可以装多少东西？

我会问：

> 在 ASP.NET Core 和 .NET 本身已经提供大量基础能力之后，我还剩下哪些真实问题没有被解决？

这两个问题会得到完全不同的项目。

## 我的技术审美：克制不是功能贫乏，而是默认路径清楚

我希望一套技术栈具备以下特征。

### 代码读起来应该接近执行顺序

我希望 endpoint、validation、application operation、database call 和 response 之间的关系能从普通调用链看出来，而不是必须理解一套 bus、pipeline behavior、reflection mapping 和 annotation convention 才能追踪。

### 框架可以替我处理机制，但不能替我隐藏业务

依赖注入、配置绑定、HTTP routing、JSON serialization、validation 和 change tracking 都可以由框架处理，因为这些是重复机制。

“用户为什么不能执行这次操作”“这个状态为什么允许变化”“这条 SQL 为什么需要这个 join”则必须留在明确代码里。

### 少写代码不是唯一目标，可预测性才是

EF Core 可以让我少写很多 insert/update，但我仍然需要知道 tracking 是否开启、何时执行 SQL、生成了什么查询、事务在哪里，以及 concurrency conflict 怎样处理。

我接受抽象，前提是抽象有清楚边界，并且我可以在必要时看到底层。

### 数据库能力不应该被最低公分母抹平

我选择 PostgreSQL，就会使用它适合产品的问题：full-text search、JSONB、数组、range、窗口函数、CTE、`RETURNING` 和丰富索引。

“以后可能换数据库”不是牺牲当前系统表达力的充分理由。

### IDE 是加速器，不是项目的一部分

我使用 VS Code，但所有关键工作必须通过 `dotnet` CLI 完成。换一台机器、进入 Dev Container、运行命令，就应该能还原项目。

Visual Studio 的设计器或某个扩展可以提高效率，却不能成为只有它知道的构建步骤。

### 架构只为已经存在的变化服务

我不会为了想象中的十人团队，提前把一个 feature 拆成 API、Application、Domain、Infrastructure 四个 project。等到依赖、发布或者所有权真的需要物理边界时再拆。

一个人的中等规模项目，清楚通常比“看起来可扩展”更重要。

## 最终的 C#/.NET 技术栈

第一版采用下面这套组合：

| 领域 | 选择 | 它在项目中的职责 |
|---|---|---|
| SDK 与运行时 | .NET 10 LTS 当前补丁版本 | 统一运行时、基础类库、构建和部署工具链 |
| 语言 | C# 14 | 现代、表达力强、静态类型的主要开发语言 |
| SDK 固定 | `global.json` | 固定项目使用的 .NET SDK feature band |
| Web | ASP.NET Core Minimal APIs | HTTP routing、hosting、中间件和 endpoint 基础 |
| Endpoint 组织 | Route groups + named handlers + typed results | 防止 `Program.cs` 变成巨大脚本 |
| JSON | System.Text.Json | 平台内置 JSON 契约处理 |
| 输入验证 | .NET 10 Minimal API validation + DataAnnotations | 入口结构验证，不另加验证框架 |
| 错误响应 | ASP.NET Core Problem Details | 统一机器可读的 HTTP 错误格式 |
| 数据库 | PostgreSQL | 关系数据、事务、约束、搜索和复杂查询 |
| 驱动 | Npgsql | .NET 与 PostgreSQL 的原生边界 |
| 默认数据访问 | EF Core 10 + Npgsql provider | LINQ 查询、change tracking、关系映射和写入 |
| Schema 演进 | EF Core Migrations | 数据库结构的唯一版本历史 |
| 复杂查询 | EF raw SQL 或直接 Npgsql | LINQ 不自然时的明确逃生路径 |
| Dapper | 第一版不安装 | 只有大量稳定手写 SQL 的映射成本被证明后才加入 |
| 测试 | xUnit v3 | 单元测试和集成测试基础 |
| 应用集成测试 | WebApplicationFactory | 以真实 ASP.NET Core 应用入口验证 HTTP 边界 |
| 数据库集成测试 | Testcontainers PostgreSQL | 使用真实 PostgreSQL 验证迁移、LINQ translation 和 SQL |
| 日志 | `ILogger` + 内置 console/JSON provider | 默认结构化日志入口 |
| 运行状态 | ASP.NET Core Health Checks | 基础健康检查 |
| 可观测性 | 先使用内置 `Activity`、`Meter`、logging 基础 | 第一版不安装完整 OpenTelemetry 导出栈 |
| 开发环境 | VS Code + Dev Container + Docker | 可复现、宿主机无 SDK 的开发环境 |
| CI | GitHub Actions + `dotnet` CLI | 重复本地已经成立的构建和测试流程 |
| 架构 | Feature-first modular monolith | 一个部署单元，按业务功能形成清楚边界 |

与 Java 方案相比，这张表里更多组件来自同一个平台。对我来说，这种一致性是 C# 最大的优势之一。

## .NET 10 LTS：平台版本就是项目基线

我会使用 .NET 10 LTS 的当前补丁版本，并通过 `global.json` 固定 SDK。

```json
{
  "sdk": {
    "version": "10.0.100",
    "rollForward": "latestFeature"
  }
}
```

上面的版本只是结构示例，实际项目应该固定创建时经过验证的当前 SDK feature band，并持续升级安全和服务补丁。

选择 LTS 的目的不是保守，而是把升级节奏变成可计划的维护工作。个人项目没有专门的平台团队，我需要知道：

- 当前运行时是否仍在支持期；
- 何时需要升级下一代；
- CI、开发容器和生产镜像使用什么版本；
- 本地是否意外使用了另一套 SDK。

`.NET SDK` 同时承担 restore、build、test、publish、tool 和 migration 入口，这种统一对我的工作流很重要。

核心命令应该保持普通：

```bash
dotnet restore
dotnet build --no-restore
dotnet test --no-build
dotnet publish -c Release
```

项目不应该只有打开 Visual Studio 后才能运行的隐藏状态。

## C# 14：表达力是为了减少噪音，不是展示语言技巧

我喜欢 C# 的原因之一，是它能在保持静态类型的同时，用相对少的仪式表达业务代码。

我会自然使用：

- records 作为 request、response 和不可变值；
- pattern matching 表达有限状态；
- nullable reference types 区分可能缺失的值；
- async/await 处理 I/O；
- LINQ 组合集合与数据库查询；
- primary constructors 或普通 constructor，按可读性选择；
- `required` member 只在它真的改善模型时使用。

但我不会把每个新语法都当作风格要求。语言特性应该消除重复和非法状态，而不是让读者先解谜。

基础项目配置会明确开启 nullable：

```xml
<PropertyGroup>
  <TargetFramework>net10.0</TargetFramework>
  <Nullable>enable</Nullable>
  <ImplicitUsings>enable</ImplicitUsings>
</PropertyGroup>
```

对真正的 CI build，我也倾向让 compiler warning 保持严格，但不会为了零 warning 安装大量互相冲突的 analyzer 套装。平台自带分析能力先满足第一版。

## ASP.NET Core：一套完整但不过度规定架构的平台

ASP.NET Core 提供了后端服务真正需要的基础设施：

- hosting；
- HTTP server；
- middleware；
- routing；
- dependency injection；
- configuration；
- logging；
- authentication/authorization 基础；
- JSON；
- health checks；
- testing host。

这些能力属于同一平台，因此不需要像拼装独立库那样处理大量生命周期和适配问题。

我不会因此把 ASP.NET Core 看成绝对正确的世界观。它仍然有 conventions、DI container 行为、middleware 顺序和 framework magic，需要学习和约束。

但它的默认路径通常可以从普通 C# 代码和官方 API 看出来，这比我在 Java 生态里面对多代方案共存时更接近自己的审美。

## Minimal APIs：减少 ceremony，不是把项目写成一个文件

我会选择 Minimal APIs，而不是 MVC Controller。

原因并不是 Controller 已经过时，而是对一个人的 JSON 后端，Minimal APIs 可以更直接地表达 endpoint：

```csharp
public static class PostEndpoints
{
    public static IEndpointRouteBuilder MapPostEndpoints(
        this IEndpointRouteBuilder endpoints)
    {
        var group = endpoints
            .MapGroup("/api/posts")
            .WithTags("Posts");

        group.MapGet("/", ListPosts);
        group.MapGet("/{slug}", GetPost);
        group.MapPost("/", CreatePost);
        group.MapPost("/{id:guid}/publish", PublishPost);

        return endpoints;
    }

    private static async Task<Ok<IReadOnlyList<PostSummary>>> ListPosts(
        PostQueries queries,
        CancellationToken cancellationToken)
    {
        var posts = await queries.ListPublished(cancellationToken);
        return TypedResults.Ok(posts);
    }
}
```

但 Minimal APIs 最常见的失败方式，就是把整个应用写进 `Program.cs`：

```text
500 行 MapGet/MapPost
+ inline SQL
+ inline authorization
+ inline mapping
+ inline business logic
```

那不是简洁，只是没有文件边界。

我的 `Program.cs` 应该主要负责 composition root：

```csharp
var builder = WebApplication.CreateBuilder(args);

builder.Services.AddProblemDetails();
builder.Services.AddValidation();
builder.Services.AddPostgres(builder.Configuration);
builder.Services.AddFeatures();
builder.Services.AddHealthChecks();

var app = builder.Build();

app.UseExceptionHandler();
app.MapHealthChecks("/health");
app.MapPostEndpoints();
app.MapCollectionEndpoints();
app.MapCommentEndpoints();

app.Run();
```

endpoint 仍然按 feature 拆分，复杂业务进入 application service。Minimal 指的是 HTTP ceremony 更少，不是 architecture 消失。

## Route groups、named handlers 和 typed results：给 Minimal APIs 建立可读边界

我不会大量使用匿名 lambda 把所有逻辑塞在 routing 语句里。

具名 handler 有几个直接好处：

- stack trace 可读；
- 导航和测试更清楚；
- 参数绑定一目了然；
- endpoint metadata 可以集中设置；
- OpenAPI 契约更容易审查；
- feature 文件不会被 framework boilerplate 淹没。

typed results 则让成功响应类型更明确。对复杂错误，我会使用 Problem Details，而不是给整个项目发明一个自定义 `Result<T>` 宇宙。

简单 endpoint 可以很短；复杂 endpoint 可以调用 application operation。结构根据问题增长，不要求所有 endpoint 都复制同一模板。

## System.Text.Json：先使用平台默认，不安装第二套 JSON 体系

System.Text.Json 已经是 ASP.NET Core 的默认 JSON 主路。

我的使用规则和 Java 方案类似：

- request/response 使用明确 contract；
- 不把 EF entity 直接暴露给外部；
- 日期、枚举、nullable 和命名策略有统一约定；
- 只为确有需要的类型写 converter；
- 不为了“自动 mapping”让内部对象和 API 契约被迫同形。

对于一个中等规模个人 API，平台默认足以覆盖绝大多数需求。只有明确存在兼容问题时，才考虑 Newtonsoft.Json 或其他替代，不因为旧教程仍然使用就提前加入。

## 内置 validation：第一版不需要 FluentValidation

.NET 10 的 Minimal APIs 已经提供基于 DataAnnotations 的内置 validation。对 HTTP 入口常见的结构约束，这已经足够：

```csharp
public sealed record CreatePostRequest(
    [property: Required, StringLength(160)] string Title,
    [property: Required] string Body,
    IReadOnlyList<string>? Tags);
```

在注册 validation 后，无效输入可以直接得到标准错误响应。

这类 validation 适合：

- required；
- string length；
- range；
- email/URL 格式；
- 集合大小；
- request shape。

它不适合替代需要数据库和业务状态的规则。

例如“只有 collection owner 可以把 private item 设为 public”不应该被塞进 validation attribute。它属于 application operation 和 authorization。

FluentValidation 是成熟工具，但第一版加入它只会建立第二套规则语言、DI registration 和 testing style。等 DataAnnotations 真正变得笨拙时再评估，而不是因为很多模板默认安装就跟随。

## Problem Details：错误响应使用标准，不发明新的 envelope

API 错误需要稳定、机器可读，但不需要每个 response 都套一层：

```json
{
  "success": false,
  "code": 123,
  "message": "...",
  "data": null
}
```

我会使用 ASP.NET Core 的 Problem Details 处理：

- validation failure；
- not found；
- authorization failure；
- optimistic concurrency conflict；
- domain/application conflict；
- unexpected server error。

业务错误可以通过 `type`、`title`、`status`、`detail` 和 extension fields 表达。成功响应则直接返回它自己的 contract。

这既减少自定义协议，也让 HTTP status 保持真实语义。

## PostgreSQL + Npgsql：把数据库当作 .NET 的一等伙伴

PostgreSQL 仍然是我的数据库选择，理由与 Java 方案一致：事务、约束、索引、JSONB、full-text search、数组、range、窗口函数和成熟运维能力。

Npgsql 是 .NET 与 PostgreSQL 之间的核心边界。它不只是 EF Core provider，也提供直接 ADO.NET API 和现代 `NpgsqlDataSource`。

这很重要，因为我的数据访问策略不是“永远只能经过 ORM”。

同一个平台里，我可以清楚地选择：

```text
EF Core + LINQ
→ EF Core raw SQL
→ NpgsqlDataSource / NpgsqlCommand
```

每一步都仍然使用 PostgreSQL 的原生 driver 和同一套连接基础。

Npgsql EF provider 也能翻译和映射不少 PostgreSQL 特有能力，例如：

- `ILIKE`；
- 正则匹配；
- full-text search；
- array；
- range/multirange；
- JSON/JSONB；
- `inet` 等类型。

这意味着 EF Core-first 不等于把 PostgreSQL 降级为通用关系存储。但 provider 不可能覆盖数据库的一切，因此保留 SQL 逃生口是设计的一部分，不是失败。

## EF Core-first：我选择的是对象状态管理，不只是少写 SQL

EF Core 的价值经常被概括成“用 LINQ 代替 SQL”。这个说法太窄，也容易造成错误期待。

我真正选择 EF Core 的原因包括：

- 可组合 LINQ 查询；
- change tracking；
- identity resolution；
- relationship mapping；
- aggregate-style update；
- optimistic concurrency；
- migrations；
- 与 ASP.NET Core DI 和配置的自然集成；
- 从 C# model 到数据库操作的连续重构体验。

它最强的场景不是大型报表，而是普通业务读写。

### 普通读操作

默认使用 projection + no tracking：

```csharp
public sealed class PostQueries(AppDbContext db)
{
    public async Task<IReadOnlyList<PostSummary>> ListPublished(
        string? keyword,
        CancellationToken cancellationToken)
    {
        var query = db.Posts
            .AsNoTracking()
            .Where(post => post.Status == PostStatus.Published);

        if (!string.IsNullOrWhiteSpace(keyword))
        {
            query = query.Where(post =>
                EF.Functions.ILike(post.Title, $"%{keyword}%"));
        }

        return await query
            .OrderByDescending(post => post.PublishedAt)
            .Select(post => new PostSummary(
                post.Id,
                post.Title,
                post.Slug,
                post.PublishedAt,
                post.Author.DisplayName))
            .Take(50)
            .ToListAsync(cancellationToken);
    }
}
```

这里有几条刻意的规则：

- 只选择 response 需要的字段；
- read-only query 使用 `AsNoTracking()`；
- 直接 projection，不先加载完整 entity；
- 不用 `Include` 拉取整棵对象图再在内存映射；
- PostgreSQL 特性通过 Npgsql provider 表达；
- 关键查询要检查生成 SQL。

### 普通写操作

写入使用 tracked entity 和明确业务方法：

```csharp
public sealed class PublishPost(AppDbContext db, TimeProvider timeProvider)
{
    public async Task<PublishPostResponse> Execute(
        Guid postId,
        CancellationToken cancellationToken)
    {
        var post = await db.Posts.SingleOrDefaultAsync(
            candidate => candidate.Id == postId,
            cancellationToken);

        if (post is null)
        {
            throw new PostNotFound(postId);
        }

        post.Publish(timeProvider.GetUtcNow());

        try
        {
            await db.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateConcurrencyException exception)
        {
            throw new PostPublishConflict(postId, exception);
        }

        return new PostPublishResponse(post.Id, post.Slug, post.PublishedAt);
    }
}
```

这里 EF Core 帮我处理的是：

- entity identity；
- changed properties；
- update SQL；
- transaction；
- concurrency token；
- relationship state。

业务方法 `Publish` 仍然负责状态规则。框架没有替我决定“什么时候允许发布”。

## 我接受 EF Core 的魔法，但给它划清边界

EF Core 不是没有魔法。tracking、relationship fix-up、query translation 和 `SaveChanges` 都包含隐式行为。

我接受它，是因为这些行为在普通写模型里有价值；我限制它，是因为同样的能力一旦扩散到所有查询，就会造成很难追踪的性能和状态问题。

我的固定规则如下。

### 读操作默认 no-tracking

除非后续确实要修改并保存 entity，否则查询不进入 change tracker。

### 查询默认 projection

API 需要什么字段，就选择什么字段。不把 entity graph 当作 read model。

### 不使用 lazy-loading proxies

数据库查询不能因为访问一个 property 在未知位置自动发生。需要关系时显式 projection 或显式加载。

### 谨慎使用 Include

`Include` 适合少量明确场景，不是构建 read response 的默认方式。多层 Include 很容易产生巨大 join、重复行或者 split query 行为。

### endpoint 不直接返回 entity

entity 的字段、导航属性和 persistence concern 不应该自动成为公共 API。

### 每个复杂 LINQ 都要看 SQL

C# 编译通过只证明表达式类型成立，不证明 provider 一定能翻译成理想 SQL。关键路径需要日志、`ToQueryString()` 和真实数据库测试。

### `DbContext` 生命周期保持 request/operation scoped

不缓存长生命周期 context，不跨线程共享，不把它变成全局 unit of work。

### 不在 EF Core 外再包通用 Repository/Unit of Work

`DbContext` 和 `DbSet` 已经承担这些机制。再包一层 `IRepository<T>` 往往会丢失 projection、provider function、bulk operation 和查询组合能力，最后每个真实需求都要绕过抽象。

这些规则把 EF Core 从“整个系统的隐形状态机”限制成“普通读写的高价值工具”。

## LINQ 不是 SQL，也不应该被强迫假装成 SQL

LINQ 的优势是它属于 C#：

- 类型推断；
- refactoring；
- 可组合表达式；
- 与 DTO projection 自然结合；
- 普通筛选、排序和分页非常舒服。

但 LINQ 不是数据库语言本身。

一个表达式可能：

- 无法翻译；
- 被翻译成不理想的 SQL；
- 因导航关系产生额外 join；
- 因 projection 形状改变查询计划；
- 在 provider 版本升级后改变 translation。

所以 EF Core-first 不是 LINQ-only。

我不会为了保持“全项目没有 SQL 字符串”而写出比 SQL 更难理解的 LINQ。抽象一旦开始遮挡问题，就应该下降一层。

## 复杂查询的优先级：LINQ → EF raw SQL → Npgsql → Dapper

我的明确决策顺序是：

```text
1. EF Core + LINQ
2. EF Core raw SQL
3. 直接 Npgsql
4. Dapper-on-proof
```

### 第一层：EF Core + LINQ

适合：

- 普通筛选；
- projection；
- 排序和分页；
- 常规 join/navigation；
- aggregate write；
- 大部分后台管理查询。

### 第二层：EF Core raw SQL

当查询使用复杂 CTE、窗口函数、特殊 JSONB 操作或 provider translation 不自然时，直接写 SQL，同时尽量复用 EF Core 的连接、参数化和结果映射。

示意：

```csharp
public sealed record MonthlyCollectionStat(
    DateOnly Month,
    int AddedItems,
    int ActiveCollections);

var stats = await db.Database
    .SqlQuery<MonthlyCollectionStat>($"""
        select
            date_trunc('month', created_at)::date as "Month",
            count(*)::int as "AddedItems",
            count(distinct collection_id)::int as "ActiveCollections"
        from collection_items
        where created_at >= {from}
        group by 1
        order by 1
        """)
    .ToListAsync(cancellationToken);
```

SQL 在这里比勉强拼装 LINQ 更直接。

### 第三层：直接 Npgsql

适合：

- PostgreSQL COPY；
- 特殊 binary import/export；
- LISTEN/NOTIFY；
- provider 尚未覆盖的类型或命令；
- 需要精确控制 command、parameter、reader 的基础设施代码。

```csharp
await using var command = dataSource.CreateCommand("""
    select id, title
    from posts
    where search_vector @@ websearch_to_tsquery('simple', $1)
    order by published_at desc
    limit $2
    """);

command.Parameters.AddWithValue(keyword);
command.Parameters.AddWithValue(limit);
```

这不是绕过架构，而是明确承认这个操作属于 PostgreSQL 边界。

### 第四层：Dapper-on-proof

只有在项目已经积累大量稳定手写 SQL，并且以下问题持续出现时，才考虑 Dapper：

- EF raw SQL 的结果映射太笨重；
- 直接 `DbDataReader` mapping 重复明显；
- 这部分查询不需要 tracking；
- SQL 已经成熟，不需要 LINQ composition；
- 加入 Dapper 能真实减少代码，而不会建立第二套默认数据层。

第一版不安装，是为了让每一种新增数据访问模式都必须证明自己。

## 为什么 Dapper-first 不是 C# 版本的 jOOQ-first

这是我在比较 Java 与 C# 时最重要的结论之一。

表面上看：

```text
Java：jOOQ-first
C#：Dapper/SQL-first
```

似乎都代表“SQL 优先”。但它们提供的东西完全不同。

jOOQ 提供：

- 从 schema 生成 table 和 column 类型；
- 类型化 SQL DSL；
- SQL grammar 结构；
- dialect-aware rendering；
- 可组合动态查询；
- 更早暴露数据库对象和类型变化。

Dapper 提供：

- 执行手写 SQL；
- 参数绑定；
- 将结果快速映射成对象；
- 很薄的 `DbConnection` 扩展 API。

Dapper 很优秀，但它不是 schema-generated query DSL。Dapper-first 会让我得到完全显式的 SQL，却同时主动放弃 EF Core 最有价值的部分，而没有换来 jOOQ 的编译期数据库模型。

因此，真正诚实的对照是：

```text
jOOQ
= 类型化 relational programming model

Dapper
= SQL execution + object mapping

EF Core
= LINQ query translation + object state management
```

我在 Java 里选择 jOOQ-first，是因为 jOOQ 本身足以成为统一的主数据层；我在 C# 里选择 EF Core-first，是因为 .NET 生态里没有一个与 jOOQ 完全同形、同时又足够主流的替代品，而 EF Core 的整体收益高于 Dapper-first 的纯显式性。

这不是双重标准，而是尊重工具真实能力。

## EF Core Migrations：统一开发体验，但数据库变化必须被审查

C# 方案使用 EF Core Migrations 作为 schema 的唯一权威来源。

典型命令是：

```bash
dotnet ef migrations add AddPostSearch
dotnet ef migrations script
dotnet ef database update
```

选择 migrations 的原因是它与 model、provider 和 CLI 集成自然，可以快速表达普通 schema 演进。

但我不会把 migration 当作不可读的生成物。

每次 migration 都要检查：

- column type 是否正确；
- nullable/default 是否符合数据语义；
- 是否意外 drop/rename；
- index 是否存在；
- PostgreSQL 特有 SQL 是否需要手写；
- 大表 migration 是否会长时间锁表；
- data migration 是否可恢复。

生产环境不应该在应用启动时无条件执行 migration。更稳妥的方式是由 CI 生成 SQL script，审查后在部署步骤中执行。

ORM 可以帮助生成变化，但数据库历史仍然属于工程资产。

## Schema authority 必须唯一

使用 EF Migrations 后，我不会同时加入 Flyway 或 DbUp 来管理同一数据库。

也不会让 `EnsureCreated()` 成为生产建库方式。

规则很简单：

```text
EF Core model
→ EF Core migration
→ reviewed PostgreSQL SQL
→ deployed schema
```

特殊 PostgreSQL 对象，例如复杂 index、extension、trigger 或 materialized view，可以在 migration 中写明确 SQL。统一历史比追求“全部由 C# API 表达”更重要。

## 乐观并发：只在真正会冲突的对象上使用

EF Core 对 optimistic concurrency 的支持，是我选择它的重要理由之一。

但我不会给所有表机械地加 version 字段。

适合并发 token 的对象包括：

- 会被多人或多个后台任务修改的内容；
- 状态转换不能静默覆盖的审核对象；
- 排序、库存、配额等需要检测 lost update 的数据；
- 管理界面中可能长时间打开再提交的记录。

简单 append-only log 或个人偏好表未必需要。

并发冲突也不应该自动无限重试。很多情况下，正确行为是返回 `409 Conflict`，告诉调用方数据已经变化，由用户重新确认。

框架提供检测机制，产品语义决定如何处理冲突。

## xUnit v3：测试入口保持普通

我会选择 xUnit v3。它与 `dotnet test`、VS Code 和现代 .NET 测试平台有清楚路径，也足以覆盖普通 unit/integration tests。

测试代码不需要另一套复杂架构。

快速测试直接验证：

- value object；
- 状态转换；
- permission rule；
- parser；
- mapper；
- 不依赖数据库的 application logic。

```csharp
[Fact]
public void Published_post_cannot_return_to_draft()
{
    var post = Post.CreatePublished(...);

    Assert.Throws<InvalidPostTransition>(
        () => post.ReturnToDraft());
}
```

上例使用什么 assertion library可以按项目再定；关键不是 fluent syntax，而是测试描述真实行为。第一版甚至可以先使用 xUnit 自带 `Assert`，不为断言风格增加依赖。

我也不会为了“单元测试纯度”把所有 EF Core 调用包进 mockable repository。大量 mock 只能证明我写的 mock 按预期工作，不能证明 LINQ 真能翻译、migration 真能执行或 PostgreSQL constraint 真能保护数据。

## WebApplicationFactory + Testcontainers：从真实入口测试真实数据库

集成测试会组合：

- `WebApplicationFactory`；
- 完整 ASP.NET Core pipeline；
- PostgreSQL Testcontainers；
- EF Core Migrations；
- 真实 Npgsql provider。

测试目标包括：

- 应用能从空数据库启动；
- 所有 migration 可执行；
- endpoint binding 和 validation 正确；
- Problem Details 格式稳定；
- authorization boundary 正确；
- LINQ translation 在 PostgreSQL 上成立；
- raw SQL 返回正确 mapping；
- transaction 和 concurrency conflict 符合预期。

我不会使用 EF Core InMemory provider 证明数据库逻辑正确，也不会用 SQLite 替代 PostgreSQL 的集成测试。

InMemory provider 适合非常有限的场景，但它没有真实关系数据库的 constraint、transaction、query translation 和 provider behavior。绿色结果可能只说明测试绕过了最重要的部分。

Testcontainers 让测试稍慢，却把“我的代码在生产数据库上是否成立”变成可自动回答的问题。这是值得支付的复杂度。

## 内置 logging：先解决可诊断性，不先建设日志产品

ASP.NET Core 已经提供 `ILogger<T>`、category、scope 和多个 logging provider。

第一版我会使用内置 logging，并根据部署环境启用普通 console 或 JSON console 输出。

日志原则包括：

- 使用 message template，不手工拼接结构化值；
- request ID / trace ID 可以关联；
- 不记录 password、token、完整 cookie 或敏感内容；
- expected business conflict 不全部记成 error；
- 外部系统失败包含 operation 和必要上下文；
- 后台任务记录开始、结果、数量和失败原因；
- 不为每个方法进入/退出写噪音日志。

Serilog 有丰富 sink 和生态，但如果我只是把 stdout 交给容器平台收集，内置 provider 已经足够。等确实需要特定 sink、enrichment 或持久化策略时再加入 Serilog。

## Health Checks：健康状态要能触发维护动作

第一版会有基础 health endpoint，至少区分：

- 应用进程可以响应；
- PostgreSQL 是否可连接；
- 关键后台依赖是否需要纳入 readiness。

但我不会把所有外部 API 都放入 liveness，导致第三方短暂故障把健康应用反复重启。

健康检查不是“越多越完整”。它应该对应明确问题：负载均衡是否应继续发送流量，部署是否完成，管理员是否需要处理。

对于长期个人项目，比一个永远返回 200 的 `/health` 更有价值的可能是：

- 最近一次备份成功时间；
- 最近一次导入成功时间；
- migration 版本；
- storage 可写状态。

这些信号应该在真实需求出现后逐项加入。

## OpenTelemetry：第一版保留能力，不安装完整链路

.NET 本身已经有：

- `ILogger`；
- `Activity` / `ActivitySource`；
- `Meter`；
- ASP.NET Core 和 HttpClient 的 instrumentation 基础。

OpenTelemetry 的主要价值，是把 logs、metrics 和 traces 采集并导出到具体 backend。

如果第一版没有 Prometheus、Grafana、Tempo、Jaeger、Azure Monitor 或其他 OTLP endpoint，那么提前安装一组 instrumentation、exporter 和 Collector，只会增加配置，却没有真实观察入口。

因此我的决定是：

> 第一版使用平台内置可观测性 primitives 和 health/logging；当部署环境出现明确 telemetry backend 和排障需求时，再加入 OpenTelemetry。

这不是以后补技术债，而是避免为不存在的观测系统写配置。

## Dev Container：.NET 工具链也不进入宿主机

我的 C# 项目同样使用 Dev Container。

宿主机只需要：

- Git；
- Docker；
- VS Code；
- Dev Containers extension。

`.NET SDK`、EF tool、PostgreSQL client 和项目相关工具都在容器里。

项目可以使用 local tool manifest 固定 `dotnet-ef`：

```bash
dotnet new tool-manifest
dotnet tool install dotnet-ef
dotnet tool restore
```

这让 migration 命令也成为仓库的一部分，而不是我的全局机器状态。

进入容器后，开发流程应该是：

```bash
dotnet tool restore
dotnet restore
dotnet build
dotnet test
dotnet run --project src/Archive.Api
```

VS Code 的 C# extension 负责补全、导航、测试和调试，但命令行仍然是项目真相。

## Docker：一个镜像足够表达一个 modular monolith

第一版应用只有一个 production image。

```text
ASP.NET Core application image
PostgreSQL
reverse proxy / hosting platform
backup
```

内部有多个 feature，不代表需要多个 container。模块边界是代码和职责边界，不是网络边界。

Dockerfile 应该可以从 CLI 构建，使用明确的 SDK/runtime base image，并在 CI 中验证：

```bash
docker build -t archive-api .
```

我不会为了本地看起来像云原生环境，加入 Kubernetes manifest、service mesh 或十几个 Compose service。

## GitHub Actions：云端不拥有另一套项目

CI 的主要入口仍然是普通 .NET 命令：

```bash
dotnet restore
dotnet build --no-restore -c Release
dotnet test --no-build -c Release
dotnet publish --no-build -c Release
```

需要数据库的 integration tests 通过 Testcontainers 或 CI Docker 环境启动 PostgreSQL。

CI 应该证明：

- `global.json` 有效；
- tool manifest 可恢复；
- build 不依赖本地 Visual Studio；
- migrations 能从零执行；
- unit/integration tests 通过；
- publish 产物可生成；
- Docker image 可构建。

GitHub Actions 不应该包含本地无法运行的神秘 PowerShell 流程。它只是重复并保护已经在 Dev Container 内成立的工作流。

## Feature-first modular monolith：一个生产 project，不复制 Clean Architecture 模板

我会从一个生产 project 和一个测试 project 开始：

```text
src/
└── Archive.Api/
    ├── Features/
    │   ├── Posts/
    │   │   ├── CreatePostEndpoint.cs
    │   │   ├── CreatePost.cs
    │   │   ├── ListPosts.cs
    │   │   ├── Post.cs
    │   │   └── PostContracts.cs
    │   ├── Collections/
    │   ├── Comments/
    │   ├── Identity/
    │   ├── Moderation/
    │   └── Reports/
    ├── Data/
    │   ├── AppDbContext.cs
    │   ├── Configurations/
    │   └── Migrations/
    ├── Infrastructure/
    │   ├── Time/
    │   └── ExternalServices/
    └── Program.cs

tests/
└── Archive.IntegrationTests/
```

这不是唯一正确目录。重点是 feature 文件彼此靠近，而不是把所有 endpoint、service、entity 和 DTO 分散到全局 layer。

### 为什么不拆成四个 project

常见模板会建立：

```text
Api
Application
Domain
Infrastructure
```

对大型组织，这可能形成编译和依赖边界。但对一个人的中等规模项目，它也可能造成：

- 每个功能跨四个 project；
- 大量 interface 和 DI registration；
- DTO 重复；
- internal implementation 被迫 public；
- navigation 成本增加；
- 架构图比业务本身复杂。

我先用 namespace、folder、`internal` visibility 和 code review 规则建立边界。只有当真实依赖问题出现时才增加物理 project。

### feature 不需要统一模板

查询型 feature 可以只有 endpoint + query + response。

有状态写入的 feature 可以包含 entity、application operation 和 EF configuration。

外部集成 feature 可以有 client 和 adapter。

让结构服从问题，比让问题服从模板更重要。

## 一次请求怎样流动

以发布文章为例：

```text
POST /api/posts/{id}/publish
→ Minimal API named handler
→ authentication / authorization
→ PublishPost application operation
→ EF Core tracked entity
→ domain state transition
→ SaveChanges
→ concurrency handling
→ typed response / Problem Details
```

以复杂报表为例：

```text
GET /api/reports/monthly-activity
→ Minimal API named handler
→ ReportQueries
→ EF raw SQL
→ immutable report records
→ typed response
```

两个流程可以使用不同数据访问形状，却不需要两套 architecture。

我不会在每个流程中机械地插入：

```text
Request DTO
Command
MediatR pipeline
Handler
Repository interface
Repository implementation
AutoMapper profile
Result wrapper
Domain event
```

只有当某一层拥有真实决策、复用或边界时，它才值得存在。

## 第一版明确不加入什么

C# 生态的默认诱惑不是技术不足，而是模板太完整。以下技术第一版全部不加入。

### 不加入 Dapper

EF Core、raw SQL 和 Npgsql 已经覆盖第一版。Dapper 等真实映射重复出现后再证明自己。

### 不加入 MediatR

我不需要为了调用一个 application operation，把普通方法调用改成 `Send(command)`。一个进程、一个开发者、清楚的 feature 边界下，直接调用更容易导航、调试和重构。

### 不加入 AutoMapper

简单 request/response mapping 用 constructor 或 projection 明确表达。自动 mapping 容易把字段变化、查询形状和 runtime configuration 隐藏起来。

### 不加入 FluentValidation

.NET 10 内置 validation 先处理入口结构规则。复杂业务规则写在明确业务代码里。

### 不加入 generic repository

EF Core 已经提供 query composition 和 unit of work。`IRepository<T>` 会把 PostgreSQL 与 LINQ 能力压缩成最低公分母。

### 不加入自定义 Unit of Work

`DbContext.SaveChanges` 已经是当前事务写入边界。再包一层同名概念不会增加清楚度。

### 不加入 EF lazy-loading proxies

属性访问不应该在未知位置触发 SQL。

### 不加入重型 Clean Architecture 多 project 模板

feature-first 单体先满足当前规模。物理边界由真实依赖问题触发。

### 不加入 CQRS 框架

读 projection 和写 entity 可以自然分开，不需要 Command Bus/Query Bus。

### 不加入统一 Result monad

预期 HTTP 错误使用 Problem Details，内部不可恢复错误使用 exception。只有错误组合真的成为领域核心时，才考虑更复杂结果类型。

### 不加入 Domain Event dispatcher

进程内同步业务调用已经足够。没有可靠跨边界事件需求，就不引入隐式 handler 和事务时机问题。

### 不加入 MassTransit、RabbitMQ 或 Kafka

没有多服务异步消息问题。

### 不加入 Hangfire

简单后台任务可以先使用 `BackgroundService` 或托管平台 cron。只有持久化调度、重试和管理界面成为真实需求时再加入。

### 不加入 .NET Aspire

当前没有分布式应用编排和多个服务的开发体验问题。Dev Container + Compose 足够。

### 不加入 Serilog

内置 logging 先满足 stdout/JSON。等特定 sink 或 enrichment 需求出现再评估。

### 不加入完整 OpenTelemetry 栈

没有 exporter backend 就不安装 instrumentation 和 Collector。

### 不加入 Redis

先使用正确 SQL、索引和应用内合理缓存。缓存失效问题必须由数据证明值得承担。

### 不加入 Elasticsearch/OpenSearch

PostgreSQL full-text search 先满足产品。搜索成为核心且有测量瓶颈后再迁移。

### 不加入 NativeAOT

这是长期运行的 Web service，不需要先牺牲兼容性和调试体验换冷启动。

### 不使用 EF InMemory 或 SQLite 代替 PostgreSQL 集成测试

生产数据库是什么，关键集成测试就使用什么。

这份列表不是在宣布这些技术永远不能使用，而是在要求每一项未来变化都提供证据。

## EF Core + LINQ 与 jOOQ 的真实差异

我的 Java 与 C# 方案不是同一个数据策略的语言翻译。

它们各自接受了生态里最符合目标的主路。

| 维度 | EF Core + LINQ | jOOQ |
|---|---|---|
| 核心模型 | 对象、`DbContext`、change tracker | 关系、SQL DSL、generated schema types |
| 普通 CRUD | 非常简洁 | 更显式，也更长 |
| 聚合写入 | tracking、关系和 concurrency 支持自然 | 需要明确组织多条写入 |
| 复杂查询 | 能力强，但受 LINQ translation/provider 约束 | 直接按 SQL 结构表达 |
| 编译期反馈 | C# expression 类型安全；能编译不等于一定能翻译 | SQL grammar 与 schema 对象得到更多编译期检查 |
| PostgreSQL 能力 | Npgsql 覆盖很多能力，仍受 EF 抽象边界影响 | dialect 是设计中心 |
| 隐式状态 | tracking、identity resolution、fix-up | 没有 persistence context |
| 调试 | 需要查看生成 SQL 和 tracking state | DSL 与最终 SQL 更接近 |
| 写模型认知负担 | 低，规则正确时非常顺畅 | 显式，但需要自己管理状态和写入顺序 |
| 查询认知负担 | 简单查询很低，复杂处可能出现翻译落差 | 需要 SQL 能力，但复杂处更可预测 |

最准确的一句话是：

> **EF Core 更擅长管理对象的生命周期；jOOQ 更擅长表达数据库正在做什么。**

如果只评价数据库层的显式性，我更喜欢 jOOQ。

如果评价整个 Web 项目的连贯性、普通业务开发速度和维护心智，C# + EF Core 更符合我当前需要。

## 为什么这套 C# 栈整体比 Java 更符合我的审美

Java + jOOQ 的数据库体验非常优秀，但整个项目仍然需要协调：

- Java language/runtime；
- Spring Boot；
- Spring MVC；
- Maven lifecycle；
- Flyway；
- jOOQ codegen；
- 可能的 Hibernate 边界；
- 多个相对独立的生态传统。

C# 方案里：

- `dotnet` 是统一 CLI；
- ASP.NET Core 提供 hosting、DI、config、logging 和 health；
- System.Text.Json 是默认 JSON；
- validation 和 Problem Details 有平台主路；
- EF Core 与 migrations 属于同一编程模型；
- Npgsql 把 PostgreSQL 能力接入 LINQ，也保留底层 API；
- async/await 从 endpoint 到数据库保持同一种语言形状。

它并不是没有魔法，而是魔法的来源更少、默认路径更一致。

这种一致性让我不需要把大量注意力花在“Java 生态中这件事究竟有哪几代主流做法”上。我可以更早进入产品本身。

## 为什么下一个真正完成的项目会先用 C#

我已经有 TypeScript/JavaScript、Go 和 Python。学习 Java 与 C# 的目的不是收集语言，而是找到另一类适合长期后端系统的工具。

Java 方案非常强，但它会让我持续思考：

- jOOQ codegen 生命周期怎样最漂亮；
- Spring 的哪些习惯应该保留；
- Hibernate 是否进入；
- Maven 和 package 边界怎样保持克制；
- 为什么这个功能不用 TypeScript 或 Go。

这些问题有价值，却也容易让我继续研究技术栈，而不是完成产品。

C# 方案更容易让我停下来：

```text
Minimal API
+ EF Core
+ PostgreSQL
+ Testcontainers
```

已经足够开始做真实功能。

因此，我的明确顺序是：

1. 先用 C#/.NET 完成一个真实、自托管、可长期使用的个人项目；
2. 在真实开发中建立 EF Core、Npgsql、testing、deployment 的经验；
3. 之后再选择一个查询和报表更核心的项目，让 Java + jOOQ 发挥它真正独特的价值。

这不是认为 C# 能力高于 Java，而是认为它更符合我当前的完成概率和注意力预算。

## 适合这套 C# 栈的项目

我准备做的项目可以是一套自托管兴趣内容社区与个人档案系统。

它不是简单论坛，也不是视频平台的巨大复制品，而是把我真正会使用的机制缝在一起：

- 用户和个人资料；
- 内容条目；
- 收藏集；
- 标签与关系；
- 评论和引用；
- 草稿、发布、归档等状态；
- PostgreSQL full-text search；
- 简单审核；
- 导入任务；
- 修改冲突；
- 统计和少量报表；
- 导出、备份与恢复。

这个项目能同时展示：

- Minimal APIs 的简洁 HTTP 边界；
- EF Core 对普通读写和聚合状态的价值；
- LINQ projection；
- Npgsql/PostgreSQL 特有能力；
- 一两个明确 raw SQL report；
- Testcontainers 的真实集成测试；
- feature-first modular monolith；
- 从开发、部署到恢复的完整生命周期。

它足够复杂，可以证明 .NET 比 TypeScript 脚本式后端更有长期结构；又没有复杂到需要用微服务和消息系统逃避单体设计。

## 我会怎样防止这套栈逐渐失去克制

决定第一版很容易，维护边界更难。我会保留以下规则。

### 每个新 package 都要解释维护成本

PR 或 decision note 至少写清楚：

- 当前问题；
- 平台内置能力为什么不够；
- 新 package 提供什么；
- 新的配置、升级和故障面；
- 如果移除，要改哪些代码。

### 先写直接代码，再从重复中提取抽象

不根据模板预测重复。两个看起来相似的 feature 可能很快出现不同业务语义，过早共享只会制造条件分支。

### 查询以数据库结果为准

LINQ 的美感不能替代 SQL 质量。关键查询要看生成 SQL、参数、索引和执行计划。

### entity 只服务于写模型

不要为了复用把 entity 传播到 endpoint、cache、message 和 UI contract。

### Integration test 优先保护边界

重点保护 migration、权限、并发、PostgreSQL translation、恢复和外部协议，而不是用 mock 追求覆盖率。

### 一次只引入一种数据访问例外

如果 raw SQL 已经解决问题，就不同时加入 Dapper；如果 Npgsql 只服务于 COPY，就让它停留在该 feature。

### 不因为“官方”就默认加入

Aspire、OpenTelemetry、Identity、background framework 都需要真实产品问题。官方支持意味着兼容路径更可信，不意味着当前项目必需。

### 定期删除不再产生价值的结构

一个只剩单实现的 interface、一个没有 handler 的 bus、一个无人查看的 telemetry exporter，都应该允许被删除。

架构不是只能增长的收藏品。

## 这套方案的代价

我不想把 C#/.NET 写成没有缺点的完美答案。

这套方案仍然要求我承担：

- EF Core query translation 的学习成本；
- tracking 和 context lifetime 的规则；
- migration review；
- Npgsql provider 与 PostgreSQL 版本兼容；
- async call chain；
- .NET major/LTS 升级；
- 容器和数据库的真实运维；
- 在 Minimal APIs 中主动建立文件结构。

它也没有 jOOQ 那种从真实 schema 生成 SQL DSL 的数据库体验。复杂查询进入 raw SQL 后，编译器保护会减少；Dapper 也不会自动补回这一点。

但相比 Dapper-first，我得到 EF Core 的完整价值；相比重型 .NET 模板，我保留普通调用链；相比 Java，我减少了生态拼装和历史方案选择。

这是一种经过边界控制的折中，而不是幻想中的零成本方案。

## 最后的结论

我的 C# 方案最终可以写成：

```text
.NET 10 LTS + C# 14
负责统一语言、运行时、CLI 和基础库

ASP.NET Core Minimal APIs
负责清楚、低 ceremony 的 HTTP 边界

System.Text.Json + validation + Problem Details
负责平台内置的 API 契约机制

PostgreSQL + Npgsql
负责真实关系数据和数据库特有能力

EF Core
负责普通 LINQ 查询、对象状态、聚合写入和 migrations

raw SQL / Npgsql
负责 ORM 抽象不适合的局部问题

Dapper
第一版不存在；只有持续映射痛点证明价值后才加入
```

它的核心并不是“微软官方全家桶”，而是尽可能让一条主路径覆盖大多数问题，同时为 SQL 和 PostgreSQL 保留清楚的出口。

我的最终选择是：

> **C# 14 + .NET 10 LTS + ASP.NET Core Minimal APIs + PostgreSQL + Npgsql + EF Core-first。**  
> **读操作默认 projection + AsNoTracking；写操作使用受控 tracking；复杂查询使用 EF raw SQL 或直接 Npgsql；Dapper-on-proof。**

如果 Java 方案代表我对数据库显式性和 SQL 表达力的追求，那么 C# 方案代表我对整个工程连续性、克制和完成度的追求。

两套方案我都会保留，但下一个真正开始并完成的个人项目，我会先使用 C#/.NET。

[上一篇：我为什么选择这套 Java 后端栈](/2026/08/04/my-java-backend-stack-jooq-first/)

## 参考资料

以下是这套选择依赖的主要官方资料。具体版本应始终使用项目基线下的当前补丁版本。

- [.NET and .NET Core Support Policy](https://dotnet.microsoft.com/en-us/platform/support/policy/dotnet-core)
- [What's new in C# 14](https://learn.microsoft.com/en-us/dotnet/csharp/whats-new/csharp-14)
- [ASP.NET Core Minimal APIs](https://learn.microsoft.com/en-us/aspnet/core/fundamentals/minimal-apis?view=aspnetcore-10.0)
- [Minimal API Validation](https://learn.microsoft.com/en-us/aspnet/core/fundamentals/minimal-apis?view=aspnetcore-10.0#validation-support-in-minimal-apis)
- [ASP.NET Core Problem Details](https://learn.microsoft.com/en-us/aspnet/core/fundamentals/error-handling-api?view=aspnetcore-10.0)
- [EF Core Tracking vs. No-Tracking Queries](https://learn.microsoft.com/en-us/ef/core/querying/tracking)
- [EF Core SQL Queries](https://learn.microsoft.com/en-us/ef/core/querying/sql-queries)
- [EF Core Concurrency Conflicts](https://learn.microsoft.com/en-us/ef/core/saving/concurrency)
- [Applying EF Core Migrations](https://learn.microsoft.com/en-us/ef/core/managing-schemas/migrations/applying)
- [Npgsql Entity Framework Core Provider](https://www.npgsql.org/efcore/)
- [Npgsql Full-Text Search](https://www.npgsql.org/efcore/mapping/full-text-search.html)
- [Npgsql Basic Usage](https://www.npgsql.org/doc/basic-usage.html)
- [Dapper](https://github.com/DapperLib/Dapper)
- [xUnit.net](https://xunit.net/)
- [Testcontainers for .NET: PostgreSQL](https://dotnet.testcontainers.org/modules/postgres/)
- [.NET Observability with OpenTelemetry](https://learn.microsoft.com/en-us/dotnet/core/diagnostics/observability-with-otel)
- [VS Code Dev Containers](https://code.visualstudio.com/docs/devcontainers/containers)
- [GitHub Actions Documentation](https://docs.github.com/actions)
