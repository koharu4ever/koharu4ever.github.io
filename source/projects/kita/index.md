---
title: Kita · Project Database
date: 2026-08-08
type: projects
comments: false
top_img: false
aside: false
---

{% raw %}
<div class="kral-vndb-projects kral-vndb-projects--detail">
  <header class="kral-vndb-projects__masthead">
    <a class="kral-vndb-projects__brand" href="/projects/">
      <span>Kral's</span>
      <strong>project database</strong>
    </a>
  </header>

  <aside class="kral-vndb-projects__sidebar" aria-label="项目数据库导航">
    <section class="kral-vndb-sidebox">
      <h2>Menu</h2>
      <nav>
        <a href="/projects/">Project home</a>
        <a class="is-current" href="/projects/kita/">Kita</a>
        <a href="/notes/">Technical notes</a>
        <a href="/archives/">Blog archive</a>
        <a href="/resume/">Resume</a>
        <a href="https://github.com/koharu4ever" target="_blank" rel="noopener noreferrer">GitHub</a>
      </nav>
    </section>

    <section class="kral-vndb-sidebox">
      <h2>Kita Index</h2>
      <nav>
        <a href="#overview">Overview</a>
        <a href="#architecture">Architecture</a>
        <a href="#reading-map">Reading map</a>
        <a href="#articles">Articles</a>
        <a href="#history">History</a>
      </nav>
    </section>

    <section class="kral-vndb-sidebox">
      <h2>External Links</h2>
      <nav>
        <a href="https://kita.kral-koharu.com/" target="_blank" rel="noopener noreferrer">Live site ↗</a>
        <a href="https://github.com/koharu4ever/Kita" target="_blank" rel="noopener noreferrer">Source code ↗</a>
      </nav>
    </section>

    <section class="kral-vndb-sidebox">
      <h2>Record Statistics</h2>
      <dl class="kral-vndb-stats">
        <div><dt>Routes</dt><dd>5</dd></div>
        <div><dt>Main systems</dt><dd>4</dd></div>
        <div><dt>Status</dt><dd>Active</dd></div>
        <div><dt>Maintainer</dt><dd>Kral</dd></div>
      </dl>
    </section>

  </aside>

  <main class="kral-vndb-projects__main">
    <nav class="kral-vndb-tabs" aria-label="Kita 页面章节">
      <a class="is-current" href="#overview">p1</a>
      <a href="#architecture">architecture</a>
      <a href="#reading-map">reading map</a>
      <a href="#articles">articles</a>
      <a href="#history">history</a>
    </nav>

    <article class="kral-vndb-record" id="overview">
      <p class="kral-vndb-record__report"><a href="https://github.com/koharu4ever/Kita/issues" target="_blank" rel="noopener noreferrer">Report an issue with this project.</a></p>
      <h1>Kita</h1>
      <p class="kral-vndb-record__subtitle">A personal content system</p>

      <div class="kral-vndb-record__summary">
        <figure class="kral-vndb-record__cover">
          <img src="/img/projects/kita.webp" alt="Kita 项目主视觉" loading="eager" decoding="async">
          <figcaption>project image · p1</figcaption>
        </figure>

        <dl class="kral-vndb-record__facts">
          <div><dt>Title</dt><dd><strong>Kita</strong><br><span>一个围绕游戏、小众文化和个人内容持续演进的全栈项目</span></dd></div>
          <div><dt>Status</dt><dd><span class="kral-vndb-status kral-vndb-status--active">Active development</span></dd></div>
          <div><dt>Started</dt><dd>2025</dd></div>
          <div><dt>Maintainer</dt><dd>Kral</dd></div>
          <div><dt>Application</dt><dd>Next.js 16 · TypeScript</dd></div>
          <div><dt>Content</dt><dd>Payload CMS 3 · Local API</dd></div>
          <div><dt>Data</dt><dd>PostgreSQL · Payload Media · Cloudflare R2</dd></div>
          <div><dt>Runtime</dt><dd>Dev Container · Docker Compose · Coolify</dd></div>
          <div><dt>Relations</dt><dd><a href="https://archive.kral-koharu.com/" target="_blank" rel="noopener noreferrer">OpenList Archive</a> · <a href="/notes/">Technical Notes</a></dd></div>
          <div><dt>Links</dt><dd><a href="https://kita.kral-koharu.com/" target="_blank" rel="noopener noreferrer">Live site</a>, <a href="https://github.com/koharu4ever/Kita" target="_blank" rel="noopener noreferrer">GitHub</a>, <a href="/2026/08/05/Kita-architecture-and-project-review/">Architecture review</a></dd></div>
        </dl>
      </div>

      <section class="kral-vndb-section">
        <h2>Description</h2>
        <div class="kral-vndb-section__body">
          <p>Kita 最初只是一个符合个人审美的首页，后来逐步加入内容管理、数据库、媒体存储和自托管部署。它现在既是实际使用的网站，也是我理解全栈项目边界的开发基座。</p>
          <p>这个项目不追求复杂的服务拆分。Next.js 与 Payload 运行在同一应用中，PostgreSQL 保存结构化数据，Cloudflare R2 保存媒体对象；OpenList 保持为独立应用，只通过链接与 Kita 相连。</p>
        </div>
      </section>

      <section class="kral-vndb-section" id="architecture">
        <h2>Architecture</h2>
        <div class="kral-vndb-architecture">
          <article><strong>Web application</strong><span>Next.js App Router 负责页面、路由和服务端渲染。</span></article>
          <article><strong>Content boundary</strong><span>Payload Local API 在同一进程内提供内容与管理能力。</span></article>
          <article><strong>Persistent data</strong><span>PostgreSQL 保存业务数据，Migration 管理结构变化。</span></article>
          <article><strong>Media & runtime</strong><span>R2 保存媒体，Coolify 负责生产部署与运行。</span></article>
        </div>
      </section>

      <section class="kral-vndb-section" id="reading-map">
        <h2>Reading Map</h2>
        <div class="kral-vndb-route-table">
          <article>
            <header><span>Route 01</span><strong>第一次了解</strong></header>
            <ul>
              <li><a href="/2026/08/04/kita-basics-read-repository/">拿到项目后，应该先看哪些文件</a></li>
              <li><a href="/2026/08/04/kita-basics-project-structure/">Kita 的目录结构从哪里来</a></li>
              <li><a href="/2026/08/04/kita-basics-runtime-layers/">从开发到恢复的六层运行地图</a></li>
            </ul>
          </article>
          <article>
            <header><span>Route 02</span><strong>技术选择</strong></header>
            <ul>
              <li><a href="/2026/08/01/kita-project-notes/">从视频开始搭起 Next.js 开发基座</a></li>
              <li><a href="/2026/08/02/kita-dev-container/">为什么我一直使用 Dev Container</a></li>
              <li><a href="/2026/08/03/kita-technology-tradeoffs/">Kita 使用了什么，也没有使用什么</a></li>
            </ul>
          </article>
          <article>
            <header><span>Route 03</span><strong>工程实施</strong></header>
            <ul>
              <li><a href="/2026/08/04/kita-case-devcontainer-setup/">在 Windows 上配置 Dev Container</a></li>
              <li><a href="/2026/08/04/kita-case-vps-coolify-deployment/">从空白 VPS 到 Coolify 部署</a></li>
              <li><a href="/2026/08/04/kita-case-restore-drill/">从备份文件到真正恢复</a></li>
            </ul>
          </article>
          <article>
            <header><span>Route 04</span><strong>生产记录与复盘</strong></header>
            <ul>
              <li><a href="/2026/08/04/kita-real-timeline/">Kita 不是按路线图做出来的</a></li>
              <li><a href="/2026/08/04/kita-real-503-incident/">Build 通过，网站却 503</a></li>
              <li><a href="/2026/08/04/kita-real-unfinished-work/">我现在明确保留的技术债</a></li>
            </ul>
          </article>
          <article class="is-reference">
            <header><span>Route 05</span><strong>完整参考</strong></header>
            <ul>
              <li><a href="/2026/08/05/Kita-architecture-and-project-review/">Kita 项目整体架构、数据流与边界审查</a></li>
            </ul>
          </article>
        </div>
      </section>

      <section class="kral-vndb-section" id="articles">
        <h2>Selected Articles</h2>
        <div class="kral-vndb-section__body">
          <table class="kral-vndb-article-table">
            <thead><tr><th>Date</th><th>Title</th><th>Type</th></tr></thead>
            <tbody>
              <tr><td>2026-08-05</td><td><a href="/2026/08/05/Kita-architecture-and-project-review/">Kita 项目整体架构、数据流与边界审查</a></td><td>Reference</td></tr>
              <tr><td>2026-08-04</td><td><a href="/2026/08/04/kita-case-payload-media-r2/">从 Payload Media 到 Cloudflare R2 的完整配置</a></td><td>Case</td></tr>
              <tr><td>2026-08-04</td><td><a href="/2026/08/04/kita-real-503-incident/">为什么 Build 通过了，生产容器仍然 503</a></td><td>Incident</td></tr>
              <tr><td>2026-08-03</td><td><a href="/2026/08/03/kita-technology-tradeoffs/">Kita 用了哪些技术，以及我刻意没有使用什么</a></td><td>Decision</td></tr>
            </tbody>
          </table>
        </div>
      </section>

      <section class="kral-vndb-section" id="history">
        <h2>Project History</h2>
        <div class="kral-vndb-history">
          <div><time>2025</time><p><strong>Project started</strong><span>从一张符合个人审美的 Next.js 首页开始。</span></p></div>
          <div><time>2026-08</time><p><strong>Architecture documented</strong><span>整理 Payload、PostgreSQL、R2、部署与恢复的真实边界。</span></p></div>
          <div><time>Current</time><p><strong>Active maintenance</strong><span>继续收口内容工作流、运行责任和可恢复性。</span></p></div>
        </div>
      </section>
    </article>

  </main>
</div>
{% endraw %}
