---
title: 我为什么为个人项目选择这套 Java 后端栈：jOOQ-first，Hibernate-local
date: 2026-08-04 22:50:00
cover: /img/covers/backend-java-jooq.webp
description: 从 TypeScript/Go 开发者的视角，解释 Java 25、Spring Boot 4.1、PostgreSQL、Flyway、jOOQ、Testcontainers 等选择背后的目的，以及我明确拒绝的企业级复杂度。
tags:
  - Java
  - Spring Boot
  - jOOQ
  - PostgreSQL
  - 后端架构
categories:
  - 开发笔记
series: 后端技术栈选择
---

我最终还是给自己的个人项目确定了一套 Java 后端技术栈。

但这并不是一份“现在 Java 圈流行什么，我就把什么装进去”的依赖清单，也不是为了证明个人项目可以拥有和大公司一样长的架构图。

我的主要背景仍然是 TypeScript/JavaScript。我也使用 Go 和 Python。面对大多数普通 API、轻量服务、自动化工具和边缘逻辑，我完全可以继续使用这些语言。Java 如果只是换一种语法重新写 CRUD，对我没有价值；它必须在事务、关系数据、复杂查询、长期维护和系统稳定性上，给出足以抵消自身重量的收益。

所以这篇文章真正要回答的不是“Java 后端能用哪些技术”，而是：

> 一个偏爱显式、直观、低魔法的 TypeScript/Go 开发者，怎样在不继承整套传统企业 Java 习惯的前提下，建立一套自己愿意长期维护的 Java 后端？

我的答案是：

> **Java 25 + Spring Boot 4.1 + PostgreSQL + Flyway + jOOQ。**  
> **第一版只使用 jOOQ；Hibernate 只有在真实聚合写入证明其价值后，才允许局部进入。**

我把这条数据访问策略概括为：

> **jOOQ-first，Hibernate-local。**

如果要写得更严格一点，则是：

> **jOOQ-first，Hibernate-on-proof。**

<!-- more -->

## 这不是一套公司级超大型系统的缩小版

先说明项目边界。

我想构建的是一个由我独立开发、最大预计为中等规模、需要运行和维护很多年的后端服务。它可能有几十张表、复杂筛选、全文搜索、统计报表、后台任务和明确的业务状态，但它没有几十个团队，也没有必须独立扩缩容的数百个服务。

因此，我不会先假定自己需要：

- 微服务；
- CQRS；
- Event Sourcing；
- Kafka 或其他消息总线；
- Redis；
- Kubernetes；
- Spring Cloud；
- WebFlux；
- 六边形架构模板；
- 每个操作一个 Command、Handler 和十层接口；
- 为“将来可能替换数据库”而抹平 PostgreSQL 的能力。

这些技术并不天然错误。错误的是在问题还没有出现时，就提前支付它们的概念成本、代码成本、部署成本和调试成本。

一个人的项目最稀缺的资源不是服务器，也不是框架能力，而是注意力。每多加入一个技术，我都要长期理解它的版本、边界、失败模式、升级路径和与其他组件的相互作用。依赖不会因为写在 `pom.xml` 里就变成免费的。

## 我的技术审美不是“代码越少越好”

我喜欢简洁，但我并不把“少写几行代码”当作最高目标。

真正重要的是：当系统出错、升级或者半年后重新打开时，我能不能快速回答下面这些问题：

- 一次请求从哪里进入？
- 数据在哪一层被验证？
- 哪段代码开启了事务？
- 最终执行了什么 SQL？
- 数据库 schema 由谁定义？
- 某个字段为什么存在？
- 这项抽象解决了什么真实问题？
- 不打开某个特定 IDE，我是否仍然能构建、测试和理解项目？

因此，我的“低魔法”不是拒绝所有框架，而是拒绝**无法被解释、无法被约束、无法被替换的隐式行为**。

我接受 Spring Boot 的自动配置，因为它解决了依赖装配、生命周期和默认配置的问题，而且这些行为有明确文档、可以覆盖、可以通过日志和 Actuator 检查。我接受 jOOQ 的代码生成，因为它把真实数据库 schema 提升为可编译的 Java 类型。我也可能接受 Hibernate 的 dirty checking，但前提是它只服务于一个清楚的聚合写入边界，而不是接管整个系统的数据模型。

我的判断标准可以概括成几条。

### 复杂度必须支付租金

一项技术不能只提供“以后也许有用”的可能性。它必须在当前项目中减少错误、减少重复、提高表达能力，或者显著降低长期维护成本。

### 数据库不是实现细节

如果系统的核心价值来自关系、约束、查询、索引、事务和报表，那么数据库就是架构的一部分。为了假装数据库可以随时被替换，而故意不使用 PostgreSQL 的能力，对我来说不是解耦，而是主动削弱系统。

### IDE 是加速器，不是隐形运行时

VS Code 可以提供补全、导航、调试和重构，但项目不能依赖 IntelliJ IDEA 里的某个菜单、数据库窗口或生成配置才能运行。

所有关键流程都必须能从命令行完成。IDE 可以调用命令，但不能成为唯一知道这些命令的人。

### 目录结构应该表达业务，而不是框架

我不想打开项目后先看到：

```text
controller/
service/
repository/
entity/
dto/
mapper/
```

这种结构在文件少时看起来整齐，规模增长后却把同一个功能拆散到整个仓库。

我更希望看到：

```text
catalog/
identity/
collections/
comments/
moderation/
reports/
```

框架是实现手段，业务 feature 才是维护单位。

### 默认方案只是当前最好的假设

技术栈不是宗教，也不是身份。某项技术一旦不再产生价值，就应该被移除。所谓“最终选择”，指的是第一版明确采用的默认路径，而不是未来永远不能变化的誓言。

## 最终的 Java 技术栈

我的第一版会使用下面这套组合：

| 领域 | 选择 | 它在项目中的职责 |
|---|---|---|
| 语言与运行时 | Java 25 LTS | 长期维护的运行时、现代 Java 语言能力、成熟 JVM 工具链 |
| 应用框架 | Spring Boot 4.1.x | 依赖管理、配置、应用生命周期和各组件的集成底座 |
| Web | Spring MVC | 清楚的同步请求模型，适合 JDBC/jOOQ 和普通业务后端 |
| 参数验证 | Jakarta Validation | 在系统入口声明输入约束 |
| JSON | Jackson | HTTP JSON 序列化与反序列化 |
| HTTP Client | RestClient | 调用外部 HTTP API 的同步、流式接口 |
| 构建 | Maven Wrapper | 统一构建入口，不要求宿主机安装 Maven |
| 数据库 | PostgreSQL | 关系数据、事务、约束、索引、搜索和数据库特有能力 |
| Schema 演进 | Flyway | 数据库结构的唯一历史和唯一权威来源 |
| 数据访问 | jOOQ | 默认查询与写入方式，类型化表达 SQL |
| ORM | 第一版不加入 | Hibernate 只在真实聚合写入证明价值后局部加入 |
| 测试 | JUnit Jupiter + AssertJ | 单元测试和可读断言 |
| 集成测试 | Testcontainers + PostgreSQL | 使用真实 PostgreSQL 验证迁移、SQL 和事务行为 |
| 运行状态 | Actuator + Micrometer | 基础健康检查、指标和诊断入口 |
| 开发环境 | Dev Container + Docker | 可复现、与宿主机解耦的开发环境 |
| CI | GitHub Actions | 使用与本地相同的 Maven Wrapper 命令验证项目 |
| 架构 | Feature-first modular monolith | 以业务功能组织的单体应用，保留清楚模块边界 |

这张表最重要的部分不是技术数量，而是每个组件只有一个明确职责。

## Java 25：我需要的是长期基线，不是语法竞赛

选择 Java 25，首先是因为它是一条适合新项目的长期支持基线。

我并不需要为了使用 Java 而回到十年前的 Java 写法。现代 Java 已经有 record、sealed class、改进后的 switch、模式匹配、更好的并发工具和持续改善的运行时。它仍然不像 TypeScript 或 C# 那样轻盈，但已经足以让我用更少的仪式表达 DTO、值对象和有限状态。

不过，我选择 Java 25 的核心原因并不是某个单独语法特性，而是这些更基础的东西：

- JVM 的长期稳定性；
- 成熟的性能分析和诊断能力；
- 大量经过生产验证的数据库、HTTP、测试和可观测性库；
- 对长期运行服务非常清楚的升级路线；
- 静态类型和编译期反馈对中等规模业务模型的保护。

我也不会因为 Java 25 支持更多并发能力，就在第一版主动使用所有新特性。虚拟线程、复杂并发模型或者自定义调度策略，应该由真实吞吐和阻塞问题触发，而不是因为版本号已经允许。

版本选择的目的，是给项目一个现代而稳定的地基，不是制造“我已经使用了最新 Java”的展示项目。

## Spring Boot 4.1：把它当作集成底座，而不是世界观

Spring Boot 是这套方案里最容易引起矛盾感的部分。

一方面，我不喜欢大量注解、隐式扫描和历史上常见的企业 Java 样板；另一方面，Spring Boot 确实解决了一组非常实际的问题：

- 统一依赖版本；
- 启动和关闭应用；
- 读取配置；
- 装配 Web、数据库、验证、日志和监控；
- 管理环境差异；
- 提供成熟的测试与生产运行路径。

如果不用 Spring Boot，我仍然需要自己选择并连接这些部件。那不一定更显式，只可能把成熟框架已经解决的问题重新手写一遍。

所以我的态度不是“Spring 很优雅”，也不是“Spring 太重所以完全不用”，而是：

> **只让 Spring Boot 负责它真正擅长的集成工作，不让 Spring 的习惯替我决定整个代码结构。**

具体来说：

- 允许 constructor injection，不使用字段注入；
- 配置使用明确的 typed configuration，而不是到处读取字符串；
- 不为每个类机械地添加接口；
- 不把所有业务逻辑塞进带注解的 service；
- 不因为存在 Spring Data，就默认所有数据访问都必须是 Repository；
- 不让 framework annotation 成为领域模型的主要语言；
- 不让 Spring package 分层覆盖 feature 边界。

Spring Boot 在我的项目里是 chassis，不是 architecture。

## Spring MVC：同步模型已经足够，而且更诚实

我的主要数据访问方式是 PostgreSQL + JDBC + jOOQ。它们的核心执行模型是同步、阻塞的。

在这种前提下使用 Spring WebFlux，往往意味着为了一个并不存在的全链路响应式系统，引入 Reactor、`Mono`、`Flux`、新的错误传播方式、新的调试方式和更多线程语义。最后数据库调用仍然阻塞，复杂度却已经进入了每个 endpoint。

这不是我需要的能力。

Spring MVC 的请求模型更符合这个项目：

```text
HTTP request
→ validation
→ application operation
→ transaction
→ SQL
→ response
```

它的好处不是“老”，而是因果关系直接。一次请求对应一次清楚的调用链，异常可以沿普通 Java 堆栈传播，数据库事务也不需要跨越响应式上下文。

如果未来出现经过测量的并发瓶颈，我可以评估虚拟线程、连接池、查询优化或者异步任务。第一反应不会是把整个系统改写成响应式编程。

## Jakarta Validation：把入口约束写在入口

输入验证属于真正有价值的声明式能力。

例如，一个创建内容的请求可以直接表达：

```java
public record CreatePostRequest(
    @NotBlank
    @Size(max = 160)
    String title,

    @NotBlank
    String body,

    @Size(max = 10)
    List<@NotBlank String> tags
) {}
```

这些约束不是领域规则的全部，但它们适合处理 HTTP 边界上的结构问题：必填、长度、格式、集合大小。

我不会把所有业务规则都塞进 annotation。比如“只有已发布的合集才能被公开引用”涉及数据库状态和业务语义，应该由明确的 application/domain code 判断。

验证框架的职责是尽早拒绝无效输入，而不是把业务逻辑变成元数据谜题。

## Jackson：使用默认主路，不建立自己的 JSON 世界

Spring Boot 已经把 Jackson 作为成熟的 JSON 处理主路。对普通 REST API 来说，它足够稳定，也有广泛的生态支持。

我的原则是：

- API request/response 使用专门的 DTO；
- 不直接序列化 jOOQ generated record；
- 如果未来加入 Hibernate，也不直接序列化 entity；
- 对日期、枚举和 nullable 字段建立清楚约定；
- 只在必要时写自定义 serializer/deserializer；
- 不为了“统一”创建一层没有业务价值的通用 mapper 框架。

JSON 是外部契约，数据库 record 和持久化 entity 是内部实现。它们不应该因为省几行代码而被绑在一起。

## RestClient：外部 HTTP 调用也保持同步和清楚

这套应用使用 Spring MVC，因此调用少量外部 HTTP API 时，我会选择 `RestClient`。

它提供流式 API，但仍然保持普通同步代码的可读性。对个人项目常见的 webhook、第三方元数据、邮件或外部内容接口，这比为了几个调用引入整套响应式客户端更合适。

我会把外部系统边界写成具体 client，例如：

```text
GitHubClient
ImageMetadataClient
NotificationClient
```

而不是建立一个“万能 HTTP service”。

每个 client 负责：

- base URL；
- authentication；
- request/response model；
- timeout；
- 错误转换；
- 与外部协议有关的重试策略。

这样故障发生时，我知道失败属于哪个外部边界，而不是在一个通用工具类里寻找字符串 URL。

## Maven Wrapper：构建必须脱离我的机器记忆

我会使用 Maven，而不是因为它最现代，而是因为它的生命周期、插件模型和命令入口足够明确，特别适合把 Flyway、jOOQ code generation、编译和测试串成一条可复现流程。

真正关键的是 Maven Wrapper：

```bash
./mvnw clean verify
./mvnw test
./mvnw spring-boot:run
./mvnw generate-sources
```

宿主机不需要安装 Maven，也不需要知道项目使用哪个 Maven 版本。Dev Container、CI 和我自己的终端都调用同一个 wrapper。

我会坚持几个构建规则：

1. 第一版只使用一个 Maven module；
2. 所有代码生成必须能从 Maven lifecycle 或明确的 Maven profile 触发；
3. 不依赖 IntelliJ 的 Run Configuration 才能完成迁移或生成代码；
4. `./mvnw clean verify` 必须是最终可信入口；
5. CI 不重复发明另一套构建脚本；
6. `pom.xml` 只承载真实构建需求，不把所有可能用到的插件提前装上。

多 module 并不等于 modular monolith。模块边界首先应该在 package、依赖方向和业务职责里成立。只有当编译边界、发布边界或者构建速度真的需要时，才值得拆 Maven module。

## PostgreSQL：不是一个可以随时替换的黑盒

我选择 PostgreSQL，不只是因为它“流行”，而是因为它能覆盖这类长期个人系统真正需要的能力：

- 可靠事务；
- 外键、唯一约束和 check constraint；
- 丰富索引；
- JSONB；
- 数组与 range；
- full-text search；
- CTE、窗口函数和复杂聚合；
- `RETURNING`；
- advisory lock；
- 成熟的备份、恢复和监控工具。

我不会为了维持一个虚假的“数据库无关性”，把这些能力全部隐藏在最低公分母后面。

所谓数据库可维护性，不是保证明天可以无痛把 PostgreSQL 换成 MySQL，而是保证：

- schema 有版本历史；
- SQL 可以被读懂和测试；
- 索引有依据；
- 约束尽可能靠近数据；
- 数据库升级有演练；
- 备份可以真实恢复。

如果一个系统高度依赖关系数据，那么承认数据库的重要性，比假装它只是 repository 后面的实现细节更诚实。

## Flyway：数据库结构的唯一权威来源

数据库 schema 必须只有一个 owner。

在这套方案里，这个 owner 是 Flyway migration。

```text
V001__create_users.sql
V002__create_posts.sql
V003__add_post_search_vector.sql
V004__add_collection_visibility.sql
```

每一次结构变化都通过版本化 SQL 记录。它的目的不是追求“SQL-first”标签，而是让我能够回答：

- 生产数据库为什么是现在这个形状？
- 一个字段何时加入？
- 某个索引为了解决什么问题？
- 从空数据库能否重建当前 schema？
- 升级失败时具体执行到了哪里？

Flyway 也意味着其他工具不能同时修改 schema。

如果未来加入 Hibernate：

```properties
spring.jpa.hibernate.ddl-auto=validate
spring.jpa.open-in-view=false
```

Hibernate 可以验证 mapping，但不能 `create` 或 `update` 数据库。jOOQ codegen 从 Flyway 建立的真实 schema 生成代码，测试环境同样先执行 migration。

一套数据库，不能存在两个互相竞争的历史版本系统。

## jOOQ：让 SQL 成为类型化的一等语言

jOOQ 是这套 Java 栈的中心选择。

我不想把 SQL 隐藏起来，也不想让 SQL 退化成散落在 annotation、XML 和字符串里的文本。jOOQ 的价值在于，它既承认关系模型和 SQL 的表达能力，又把表、列、类型和查询结构带进 Java 编译器。

一个普通查询可以保持接近 SQL 的形状：

```java
public List<PostSummary> findPublishedPosts(String keyword, int limit) {
    return dsl
        .select(
            POST.ID,
            POST.TITLE,
            POST.SLUG,
            POST.PUBLISHED_AT,
            AUTHOR.DISPLAY_NAME
        )
        .from(POST)
        .join(AUTHOR).on(AUTHOR.ID.eq(POST.AUTHOR_ID))
        .where(POST.STATUS.eq(PostStatus.PUBLISHED))
        .and(POST.TITLE.likeIgnoreCase("%" + keyword + "%"))
        .orderBy(POST.PUBLISHED_AT.desc())
        .limit(limit)
        .fetch(record -> new PostSummary(
            record.get(POST.ID),
            record.get(POST.TITLE),
            record.get(POST.SLUG),
            record.get(POST.PUBLISHED_AT),
            record.get(AUTHOR.DISPLAY_NAME)
        ));
}
```

这段代码没有假装查询是对象导航。它明确展示了：

- 选择哪些字段；
- 从哪些表读取；
- 怎样 join；
- 过滤条件是什么；
- 排序和限制是什么；
- 最终映射成什么读模型。

### jOOQ code generation 的意义

jOOQ 根据真实 schema 生成 table、column 和数据类型。这样，当 migration 删除列、修改类型或者重命名表后，重新生成代码会把受影响的调用点暴露给编译器。

它不是绝对的静态证明，但比字符串 SQL 更早、更系统地发现问题。

我的预期流程是：

```text
Flyway migrations
→ 建立/更新专用 codegen PostgreSQL schema
→ jOOQ code generation
→ Java compilation
→ tests
```

底层可以通过开发容器和 CI 中的 PostgreSQL service 完成，但对开发者暴露的入口必须仍然是 Maven Wrapper。

### 为什么不是 JdbcTemplate

JdbcTemplate 足够显式，也很可靠，但大量查询最终仍然是字符串 SQL、参数和手工 row mapping。对于复杂筛选和可组合查询，它缺少 jOOQ 的结构化 DSL 与 schema 类型。

### 为什么不是 MyBatis

MyBatis 能让 SQL 保持可见，但它通常把 SQL 放在 XML、annotation 或字符串中，动态组合依赖额外模板语义，字段和映射错误也更容易推迟到运行时。

这并不意味着 MyBatis 不能构建优秀系统。它只是没有解决我最关心的问题：**如何同时保留 SQL 的表达力，并让编译器理解更多数据库结构。**

### 为什么不默认使用 Spring Data JPA

Spring Data JPA 最擅长围绕 entity repository 提供便利。我的主要需求却包括查询、筛选、报表、聚合和 PostgreSQL 特有能力。把这些问题全部塞回 entity graph、method-name query、Specification 或 JPQL，会让我离真实 SQL 越来越远。

我宁愿先选择与主要问题形状一致的工具。

## jOOQ-first 不等于所有代码都写成 SQL

选择 jOOQ，不代表 application layer 消失，也不代表 controller 直接拼查询。

我仍然会区分：

```text
HTTP contract
application operation
transaction boundary
query/write implementation
response model
```

例如：

```java
@Service
public final class PublishPostService {
    private final DSLContext dsl;
    private final Clock clock;

    public PublishPostService(DSLContext dsl, Clock clock) {
        this.dsl = dsl;
        this.clock = clock;
    }

    @Transactional
    public PublishPostResult publish(UUID postId, long expectedVersion) {
        var updated = dsl
            .update(POST)
            .set(POST.STATUS, PostStatus.PUBLISHED)
            .set(POST.PUBLISHED_AT, OffsetDateTime.now(clock))
            .set(POST.VERSION, POST.VERSION.plus(1))
            .where(POST.ID.eq(postId))
            .and(POST.STATUS.eq(PostStatus.DRAFT))
            .and(POST.VERSION.eq(expectedVersion))
            .returning(POST.ID, POST.SLUG, POST.VERSION)
            .fetchOne();

        if (updated == null) {
            throw new PostPublishConflict(postId);
        }

        return new PublishPostResult(
            updated.get(POST.ID),
            updated.get(POST.SLUG),
            updated.get(POST.VERSION)
        );
    }
}
```

这里的业务意图仍然明确：只有 draft、版本一致时才能发布。数据库 update count 或 `RETURNING` 结果直接承担并发判断，不需要为了“面向对象”先加载整棵 entity graph。

SQL 是实现业务规则的一种语言，但它不会取代业务边界本身。

## Hibernate-local：允许，但不预装

我并不认为 Hibernate 是一个没有品味或者没有价值的工具。

Hibernate 真正擅长的是对象状态管理：

- persistence context；
- identity map；
- dirty checking；
- relationship management；
- optimistic locking；
- 以聚合为单位的加载、修改和提交。

如果某个 feature 的写入逻辑确实是：

```text
加载一个聚合
→ 调用一组领域行为
→ 修改多个关联对象
→ 由乐观锁保护并发
→ 在事务提交时统一持久化
```

那么 Hibernate 可能比手工维护多条 update 更清楚。

但“可能以后会有复杂业务”不足以成为第一版依赖。

### 第一版为什么不加入 Hibernate

一旦 Hibernate 进入项目，我就必须同时维护：

- jOOQ generated model；
- Hibernate entity model；
- mapping；
- persistence context；
- flush 时机；
- lazy/eager loading；
- jOOQ 与 Hibernate 在同一事务内的可见性；
- 两种数据访问方式的选择规则。

如果当前写入只是单表 insert/update、批量操作或者显式状态转换，这些成本没有回报。

因此第一版是 **jOOQ-only**。`Hibernate-local` 是未来允许采用的边界政策，不是第一天就安装两套持久化框架。

### 只有这些证据能让 Hibernate 进入

我会要求至少满足下面几项：

1. 某个 feature 已经出现真实、稳定的聚合边界；
2. 一次写入需要协调多个对象状态；
3. 手写更新逻辑明显开始重复或容易遗漏；
4. optimistic locking 与 persistence context 能显著降低错误；
5. Hibernate 可以被限制在该 feature 内；
6. 加入后整体代码不仅更短，而且更容易解释和测试。

### Hibernate 一旦加入，必须遵守的边界

- Flyway 仍然是唯一 schema authority；
- `ddl-auto=validate`；
- `open-in-view=false`；
- Hibernate 不负责列表、搜索、报表和复杂 projection；
- entity 不跨 feature 共享；
- 不建立全系统可导航的双向 entity graph；
- 不把 `JpaRepository` 暴露成 application API；
- 不为了统一而把 jOOQ query 包装成 entity repository；
- 尽量避免在同一个事务里交替操作 jOOQ 和未 flush 的 Hibernate entity；
- 需要混用时显式控制 flush 和执行顺序。

这就是我说的 `Hibernate-local`：不是两个工具平分项目，而是 jOOQ 默认拥有数据访问，Hibernate 只租用一小块被证明适合它的写模型。

## 事务边界：业务操作拥有事务，不是 repository 方法拥有事务

事务应该围绕完整业务操作，而不是每次数据库调用。

例如“发布文章并记录审核日志”是一个事务；“查询首页列表”通常不是一个需要显式写事务的复杂流程。

我会把 `@Transactional` 放在清楚的 application operation 上，而不是到处散布：

```text
PublishPostService.publish(...)
MoveItemService.move(...)
ApproveCommentService.approve(...)
```

这样可以直接回答：一次业务动作的原子边界在哪里。

我不会创建一个通用 `TransactionManagerHelper`，也不会让 controller 自己管理 commit/rollback。框架负责事务机制，业务服务声明事务范围。

## JUnit Jupiter + AssertJ：测试应该描述行为，而不是展示 mock 技巧

JUnit Jupiter 是稳定、直接的 Java 测试基础。AssertJ 则让断言更接近自然语言，特别适合集合、异常和结构化结果。

我会把测试分成两类。

### 快速测试

不启动 Spring context，直接测试：

- 值对象；
- 纯业务规则；
- 状态转换；
- mapper；
- parser；
- SQL 之外的组合逻辑。

例如：

```java
@Test
void published_post_cannot_return_to_draft() {
    var post = Post.published(...);

    assertThatThrownBy(post::returnToDraft)
        .isInstanceOf(InvalidPostTransition.class);
}
```

### 真实数据库集成测试

使用 PostgreSQL Testcontainers 测试：

- Flyway migration 能否从零执行；
- jOOQ 查询是否返回正确结果；
- PostgreSQL 特有表达式；
- constraint；
- transaction rollback；
- optimistic concurrency；
- 索引相关的关键查询计划，必要时单独验证。

我不会用 H2 模拟 PostgreSQL。

H2 可以快速，但当项目依赖 PostgreSQL 方言、JSONB、full-text search、数组、range、`RETURNING` 或真实锁行为时，它测试的是另一个数据库。绿色测试无法证明生产查询成立。

Testcontainers 的成本是测试需要 Docker，回报则是本地和 CI 对着同一种数据库说话。对我的 Dev Container 工作流，这个交换非常合理。

## Actuator + Micrometer：只建立足够的运行可见性

一个长期运行的服务至少应该知道自己是否健康，以及关键资源是否正常。

第一版我会使用 Actuator 和 Micrometer，但范围很克制：

- health；
- readiness/liveness，确有部署需求时启用；
- JVM 基础指标；
- HTTP 请求指标；
- 数据库连接池指标；
- 少量真正重要的业务计数器；
- build/version 信息。

我不会因为加入 Micrometer，就立刻搭建 Prometheus、Grafana、Tempo、告警平台和完整 tracing pipeline。

可观测性应该从“我需要回答哪些运行问题”开始，而不是从“生态里有哪些 dashboard”开始。

例如，比起记录几十个没有人看的指标，我更关心：

- 最近一次后台导入是否成功；
- 数据库连接是否耗尽；
- 某个外部 API 是否持续失败；
- 一类关键写入冲突是否突然增加；
- 备份上一次成功时间是什么。

工具只负责暴露信号，信号必须对应真实维护动作。

## Dev Container：宿主机只负责编辑和运行容器

我的标准开发环境是 Dev Container。

宿主机只需要：

- Git；
- Docker；
- VS Code；
- Dev Containers extension。

JDK、Maven、PostgreSQL client 和项目工具链都在容器里。

这不是为了追求“容器化开发”的标签，而是为了解决几个长期问题：

- 新机器可以快速恢复环境；
- 不同项目不争夺全局 Java/Maven 版本；
- CI 与本地环境更接近；
- 文档不需要依赖我脑中的安装历史；
- 宿主机可以保持干净；
- VS Code 仍然只是前端，不是项目构建真相。

Dev Container 也必须保持简单。第一版通常只需要：

```text
app development container
PostgreSQL container
Docker socket / supported container runtime access for Testcontainers
```

我不会在开发环境里复制一套迷你生产集群。

## Docker：封装运行边界，不用来假装分布式系统

Docker 在这里有三个用途：

1. 提供可复现开发环境；
2. 为集成测试启动真实依赖；
3. 构建可部署的应用镜像。

它不意味着每个内部 feature 都应该变成一个 container。

第一版部署很可能只是：

```text
Java application
PostgreSQL
reverse proxy / hosting platform
backup
```

这已经是一套完整系统。把一个 modular monolith 拆成五个镜像，并不会自动增加架构质量，只会增加网络、配置、部署和故障面。

## GitHub Actions：CI 只重复本地已经成立的命令

CI 不应该拥有一套只有云端知道的流程。

GitHub Actions 的核心任务是：

```bash
./mvnw clean verify
```

必要时，它会启动 PostgreSQL service、执行 Flyway、运行 jOOQ codegen、编译、测试并构建镜像。但这些步骤都必须对应本地可执行的入口。

我希望 CI 检查：

- wrapper 可用；
- migration 能从空数据库执行；
- generated sources 与 schema 一致；
- 编译通过；
- unit/integration tests 通过；
- 应用镜像能构建；
- repository 没有依赖本地 IDE 状态。

CI 是可复现性的验证者，不是隐藏脚本的收容所。

## Feature-first modular monolith：以功能为维护单位

我的项目不会先拆微服务，也不会先建立四个 Maven module 模拟 Clean Architecture。

我会从一个进程、一个部署单元、一个 PostgreSQL 数据库开始，但内部按 feature 组织：

```text
src/main/java/com/koharu/archive/
├── catalog/
│   ├── CatalogEndpoints.java
│   ├── CatalogApplication.java
│   ├── CatalogQueries.java
│   ├── CatalogCommands.java
│   ├── CatalogModels.java
│   └── package-info.java
├── collections/
│   ├── CollectionEndpoints.java
│   ├── CollectionApplication.java
│   ├── CollectionQueries.java
│   └── CollectionModels.java
├── comments/
├── identity/
├── moderation/
├── reports/
├── shared/
│   ├── errors/
│   ├── time/
│   └── pagination/
└── config/
```

这个例子不是固定模板。简单 feature 可能只有 endpoint、query 和 response；复杂 feature 才需要 application service 或更明确的 domain model。

我不会要求每个 feature 都拥有同样数量的层。

### modular 的含义

这里的 modular 指：

- feature 有明确职责；
- 默认不读取其他 feature 的内部表模型；
- 跨 feature 调用经过少量公开 operation；
- 依赖方向可说明；
- 共享代码足够小；
- 未来真有需要时，某些边界具备拆分可能。

它不意味着我要预先建立远程接口、消息协议和 distributed tracing。

### monolith 的价值

对单人项目，单体意味着：

- 本地调试是一条堆栈；
- transaction 可以覆盖一个业务操作；
- 部署和备份更直接；
- 版本只有一套；
- 重构可以跨 feature 完成；
- 不需要为内部调用支付网络失败和序列化成本。

这不是“还没成长到微服务”，而是当前问题下更优的架构。

## 一次请求应该如何流动

以创建一个收藏条目为例，我希望调用链大致是：

```text
POST /collections/{id}/items
→ Spring MVC endpoint
→ Jakarta Validation
→ AddCollectionItemService
→ transaction
→ jOOQ 查询必要状态
→ jOOQ insert/update
→ 返回专用 response DTO
→ Jackson JSON
```

每一步都有清楚职责：

- endpoint 处理 HTTP；
- validation 处理结构约束；
- application service 处理业务动作和事务；
- jOOQ 处理数据库操作；
- DTO 定义外部契约。

我不需要在中间强制加入：

```text
Command
CommandBus
Handler
UseCase interface
Repository interface
Repository implementation
Entity mapper
Domain event
Result wrapper
```

当某个中间层没有自己的决策和边界时，它只是把调用链拉长。

## 第一版明确不加入什么

这份“负面清单”与技术栈本身同样重要。

### 不加入 Spring Data JPA 和 Hibernate

原因不是永远反对 ORM，而是当前没有证据证明第二套持久化模型值得存在。

### 不加入 WebFlux 和 Reactor

当前链路是同步 JDBC。响应式抽象不会免费产生吞吐，只会先增加认知负担。

### 不加入 Spring Cloud

没有服务发现、配置中心、熔断器矩阵和微服务基础设施需求。

### 不加入 Spring Modulith

feature-first package 已经足够表达第一版边界。等到真的需要自动验证模块依赖或模块事件时再评估。

### 不加入 Lombok

现代 Java 已经可以用 record、constructor 和 IDE 生成处理大部分样板。我不希望源码语义依赖额外 annotation processing，尤其不使用会模糊 equality、mutability 和 inheritance 的通用 `@Data`。

### 不加入 MapStruct

映射数量还没有大到值得引入第二套生成规则。简单显式 constructor mapping 更容易读。如果未来重复映射成为真实问题，再用数据证明。

### 不加入通用 Repository、BaseService、BaseEntity

不同 feature 的查询和业务动作并不相同。通用 CRUD 抽象会把最有价值的数据库能力压缩成 `save/find/delete`，然后在每个复杂场景旁边开逃生口。

### 不加入 CQRS 框架

我会自然地区分读模型和写操作，但不需要 Command Bus、Query Bus 和每个请求一个 handler。概念上的读写分离不等于必须购买整套框架结构。

### 不加入消息队列、Outbox 和 Event Sourcing

第一版没有跨服务可靠消息问题。应用内同步调用和数据库事务足够。

### 不加入 Redis

在真实性能数据出现前，PostgreSQL、正确索引和进程内短期缓存已经足够。缓存会带来失效、同步和观测问题。

### 不加入 Elasticsearch/OpenSearch

PostgreSQL full-text search 先满足需求。只有搜索成为产品核心、相关性和规模超出 PostgreSQL 能力时再引入独立搜索系统。

### 不加入多 Maven module

package boundary 先成立。构建拆分由实际编译、依赖或发布问题触发。

### 不加入 GraalVM Native Image

这个项目不是冷启动极端敏感的函数平台。JVM 常驻服务的成熟性和调试体验更重要。

### 不加入 H2 测试数据库

生产使用 PostgreSQL，集成测试也使用 PostgreSQL。

刻意不做不是消极，而是在保护项目的注意力预算。

## 这套 Java 栈什么时候真正比 TypeScript 或 Go 更有价值

我不会把 Java 当作所有后端问题的默认答案。

如果项目只是：

- 几个 CRUD endpoint；
- 少量表；
- 没有复杂事务；
- 没有长期领域状态；
- 部署成本比业务复杂度更重要；

那么 TypeScript 或 Go 往往更直接。

Java 开始产生净收益的场景是：

- 数据关系和约束本身构成产品核心；
- 有大量组合筛选、统计和报表；
- 写入需要清楚的事务与并发控制；
- 业务状态会长期演进；
- 系统需要运行多年；
- 测试、监控、诊断和升级能力很重要；
- 类型系统能够保护不断增长的模型。

对我来说，Java 的意义不是“企业级”，而是**在系统长期变复杂时仍然有很强的托底能力**。jOOQ 则负责避免这种托底能力被过度抽象和历史习惯吞掉。

## 适合这套栈的个人项目

我不想再做一个只有用户、文章和评论的教程项目。真正适合这套 Java 栈的项目，应该让关系数据和查询能力成为核心价值。

例如，一个自托管的兴趣内容档案与社区系统：

- 游戏、书、视频、文章等内容条目；
- 自定义收藏集与层级标签；
- 评论、引用和关联关系；
- 多条件筛选；
- PostgreSQL full-text search；
- 时间线与状态历史；
- 数据导入、去重和合并；
- 统计与报表；
- 审核记录；
- 乐观并发；
- 可导出和可备份。

在这个项目里，jOOQ 不只是替代 ORM 的另一种写法，而是可以直接表达产品能力。Java 的类型系统、事务和长期运行生态也有足够空间证明自己的价值。

## 我会用什么规则防止项目重新变重

技术栈确定之后，真正困难的是持续拒绝不必要的增长。

我会保留几条维护规则：

### 新依赖必须写清楚替代了什么

“这个库很好用”不是理由。需要说明：

- 当前痛点；
- 不加它时的实现；
- 加入后的收益；
- 新增的维护面；
- 如何移除。

### 一个 feature 先用最少结构完成

不要预先复制完整模板。代码增长到出现重复和边界问题时，再提取结构。

### 查询先看最终 SQL

无论 DSL 多漂亮，数据库执行的仍然是 SQL。关键查询需要检查生成 SQL、索引和执行计划。

### 测试保护昂贵边界

优先测试迁移、权限、并发、恢复、复杂查询和曾经失败过的路径，而不是追求覆盖率百分比。

### 每次升级只解决一个维度

不要同时升级 Java、Spring Boot、jOOQ、PostgreSQL 并重构数据层。可回滚的小步变化比一次“现代化”更适合长期个人项目。

### 删除技术也是正常演进

如果 Hibernate 加入后没有产生价值，就移除；如果某个抽象只剩一个实现，就折叠；如果 dashboard 没有人看，就停止维护。

架构质量不以技术栈长度衡量。

## 最后的结论

我的 Java 方案最终不是一套“轻量 Spring”，也不是一套“拒绝所有框架的纯 SQL 后端”。

它是在两种能力之间做出的明确分工：

```text
Spring Boot
负责应用集成、配置、生命周期和运行基础

PostgreSQL
负责关系、约束、事务和数据库能力

Flyway
负责 schema 历史

jOOQ
负责把 SQL 作为类型化的一等语言带进 Java

Hibernate
第一版不存在；只有真实聚合写入证明价值后才能局部加入
```

这套方案承认 Java 的重量，也利用 Java 的托底能力；承认 Spring 的成熟，也拒绝让 Spring 习惯替项目决定一切；承认 ORM 的价值，也拒绝在没有对象状态管理需求时提前支付 ORM 成本。

我需要的不是“最像企业最佳实践”的 Java，而是一套我能解释、能从命令行重建、能在 VS Code 中维护、能清楚看到 SQL，并且几年后仍然愿意继续打开的 Java。

这就是我的选择：

> **Java 25 + Spring Boot 4.1 + PostgreSQL + Flyway + jOOQ-only v1。**  
> **长期原则是 jOOQ-first，Hibernate-local；执行原则是 Hibernate-on-proof。**

下一篇我会写对应的 C#/.NET 方案，以及为什么在真正开始下一个个人项目时，我会先选择 C#，而不是这套 Java。

[下一篇：我为什么选择这套 C#/.NET 后端栈](/2026/08/04/my-csharp-backend-stack-ef-core-first/)

## 参考资料

以下是这套选择依赖的主要官方资料。具体版本应始终使用项目基线下的当前补丁版本。

- [OpenJDK JDK 25](https://openjdk.org/projects/jdk/25/)
- [Oracle Java SE Support Roadmap](https://www.oracle.com/java/technologies/java-se-support-roadmap.html)
- [Spring Boot System Requirements](https://docs.spring.io/spring-boot/system-requirements.html)
- [Spring MVC Reference](https://docs.spring.io/spring-framework/reference/web/webmvc.html)
- [Spring REST Clients](https://docs.spring.io/spring-framework/reference/integration/rest-clients.html)
- [Apache Maven Wrapper](https://maven.apache.org/tools/wrapper/index.html)
- [Flyway Versioned Migrations](https://documentation.red-gate.com/fd/versioned-migrations-273973333.html)
- [jOOQ DSL API](https://www.jooq.org/doc/latest/manual/sql-building/dsl-api/)
- [jOOQ Code Generation](https://www.jooq.org/doc/latest/manual/code-generation/)
- [Hibernate ORM User Guide](https://docs.jboss.org/hibernate/orm/current/userguide/html_single/Hibernate_User_Guide.html)
- [Testcontainers for Java: PostgreSQL](https://java.testcontainers.org/modules/databases/postgres/)
- [Spring Boot Actuator Metrics](https://docs.spring.io/spring-boot/reference/actuator/metrics.html)
- [VS Code Dev Containers](https://code.visualstudio.com/docs/devcontainers/containers)
- [GitHub Actions Documentation](https://docs.github.com/actions)
