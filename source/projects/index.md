---
title: Project Database
date: 2026-08-03
type: projects
comments: false
top_img: false
aside: false
---

{% raw %}
<div class="kral-vndb-projects kral-vndb-projects--home">
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
        <a class="is-current" href="/projects/">Project home</a>
        <a href="/projects/kita/">Kita</a>
        <a href="/notes/">Technical notes</a>
        <a href="/archives/">Blog archive</a>
        <a href="/resume/">Resume</a>
        <a href="https://github.com/koharu4ever" target="_blank" rel="noopener noreferrer">GitHub</a>
      </nav>
    </section>

    <section class="kral-vndb-sidebox">
      <h2>Project Status</h2>
      <dl class="kral-vndb-stats">
        <div><dt>Projects</dt><dd>1</dd></div>
        <div><dt>Active</dt><dd>1</dd></div>
        <div><dt>Main systems</dt><dd>4</dd></div>
        <div><dt>Reading paths</dt><dd>5</dd></div>
      </dl>
    </section>

    <section class="kral-vndb-sidebox">
      <h2>Quick Links</h2>
      <nav>
        <a href="https://kita.kral-koharu.com/" target="_blank" rel="noopener noreferrer">Kita live site</a>
        <a href="https://github.com/koharu4ever/Kita" target="_blank" rel="noopener noreferrer">Kita source</a>
        <a href="/2026/08/05/Kita-architecture-and-project-review/">Architecture review</a>
      </nav>
    </section>

  </aside>

  <main class="kral-vndb-projects__main">
    <section class="kral-vndb-panel kral-vndb-intro" aria-labelledby="kral-project-database-title">
      <h1 id="kral-project-database-title">Kral Project Database</h1>
      <div class="kral-vndb-panel__body">
        <p>这里收录我实际开发并长期维护的项目。项目页保留成品、技术边界、运行状态，以及它在真实开发过程中怎样改变。</p>
        <p>当前主要项目是 Kita。以后增加新的项目时，会作为新的数据库记录加入，而不是重做这个入口。</p>
      </div>
    </section>

    <div class="kral-vndb-dashboard">
      <section class="kral-vndb-panel">
        <h2>Recent Changes <small>project log</small></h2>
        <ul class="kral-vndb-linklist">
          <li><time datetime="2026-08-05">08-05</time><a href="/2026/08/05/Kita-architecture-and-project-review/">完成 Kita 整体架构与边界审查</a></li>
          <li><time datetime="2026-08-04">08-04</time><a href="/2026/08/04/kita-case-restore-drill/">把备份流程推进到真实恢复演练</a></li>
          <li><time datetime="2026-08-04">08-04</time><a href="/2026/08/04/kita-case-payload-media-r2/">完成 Payload Media 与 R2 的工程记录</a></li>
          <li><time datetime="2026-08-03">08-03</time><a href="/2026/08/03/kita-technology-tradeoffs/">整理当前技术选择与明确放弃的部分</a></li>
        </ul>
      </section>

      <section class="kral-vndb-panel">
        <h2>Development Notes <small>latest articles</small></h2>
        <ul class="kral-vndb-linklist">
          <li><a href="/2026/08/04/kita-real-503-incident/">Build 通过，网站却 503</a><span>incident</span></li>
          <li><a href="/2026/08/04/kita-real-unfinished-work/">我现在明确保留的技术债</a><span>maintenance</span></li>
          <li><a href="/2026/08/04/kita-case-vps-coolify-deployment/">从空白 VPS 到 Coolify 部署</a><span>deployment</span></li>
          <li><a href="/2026/08/04/kita-basics-runtime-layers/">从开发到恢复的六层运行地图</a><span>overview</span></li>
        </ul>
      </section>
    </div>

    <section class="kral-vndb-panel kral-vndb-project-list" aria-labelledby="active-projects-title">
      <h2 id="active-projects-title">Active Projects <small>1 record</small></h2>
      <a class="kral-vndb-project-row" href="/projects/kita/">
        <img src="/img/projects/kita.webp" alt="" loading="lazy" decoding="async">
        <span class="kral-vndb-project-row__id">p1</span>
        <span class="kral-vndb-project-row__title">
          <strong>Kita</strong>
          <small>一个围绕游戏、小众文化和个人内容持续演进的全栈项目。</small>
        </span>
        <span class="kral-vndb-project-row__status">Active</span>
        <span class="kral-vndb-project-row__year">2025—</span>
      </a>
    </section>

    <div class="kral-vndb-dashboard">
      <section class="kral-vndb-panel">
        <h2>Technology Index</h2>
        <div class="kral-vndb-tagindex">
          <a href="/tags/Next-js/">Next.js</a>
          <a href="/tags/Payload-CMS/">Payload CMS</a>
          <a href="/tags/PostgreSQL/">PostgreSQL</a>
          <a href="/tags/Cloudflare-R2/">Cloudflare R2</a>
          <a href="/tags/Dev-Container/">Dev Container</a>
          <a href="/tags/Coolify/">Coolify</a>
        </div>
      </section>

      <section class="kral-vndb-panel">
        <h2>About This Archive</h2>
        <div class="kral-vndb-panel__body">
          <p>这里不是项目宣传页，而是一份可以继续增长的个人工程档案。项目展示成品，文章解释选择与代价。</p>
          <p class="kral-vndb-muted">Last reviewed: 2026-08-08</p>
        </div>
      </section>
    </div>

  </main>
</div>
{% endraw %}
