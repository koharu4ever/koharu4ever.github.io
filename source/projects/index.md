---
title: Projects
date: 2026-08-03
type: projects
comments: false
top_img: false
---

{% raw %}
<main class="kral-reading-map kral-reading-map--projects">
  <header class="kral-reading-map__header">
    <p class="kral-reading-map__eyebrow">PROJECT PRACTICE</p>
    <h1>项目实践</h1>
    <p>项目不是完成后的展示品。我更想保留它怎样形成、怎样运行，以及出现问题以后怎样修正。</p>
  </header>

  <article class="kral-project" aria-labelledby="kral-project-kita-title">
    <div class="kral-project__visual">
      <img src="/img/projects/kita.webp" alt="Kita 项目页面预览" loading="lazy" decoding="async">
      <div class="kral-project__visual-content">
        <span class="kral-project__status">ACTIVE PROJECT</span>
        <h2 id="kral-project-kita-title">Kita</h2>
        <p>一个围绕游戏、小众文化和个人内容持续演进的全栈项目。</p>
        <ul class="kral-project__stack" aria-label="Kita 使用的主要技术">
          <li>Next.js</li>
          <li>Payload</li>
          <li>PostgreSQL</li>
          <li>Cloudflare R2</li>
        </ul>
      </div>
    </div>

    <div class="kral-project__actions" aria-label="Kita 项目链接">
      <a class="kral-project__action kral-project__action--primary" href="https://kita.kral-koharu.com/" target="_blank" rel="noopener noreferrer">
        访问项目 <i class="fas fa-arrow-up-right-from-square" aria-hidden="true"></i>
      </a>
      <a class="kral-project__action" href="https://github.com/koharu4ever/Kita" target="_blank" rel="noopener noreferrer">
        GitHub <i class="fab fa-github" aria-hidden="true"></i>
      </a>
    </div>

    <section class="kral-reading-path-section" aria-labelledby="kral-kita-path-title">
      <header class="kral-reading-path-section__header">
        <p>READING PATH</p>
        <h3 id="kral-kita-path-title">怎样开始阅读 Kita</h3>
        <span>不必从头读到尾。先选择你现在真正想弄清楚的问题。</span>
      </header>

      <ol class="kral-reading-path">
        <li class="kral-reading-path__item">
          <div class="kral-reading-path__content">
            <p class="kral-reading-path__kicker">ROUTE 01</p>
            <h4>第一次了解</h4>
            <p>先认识仓库、目录和运行层次，适合第一次打开这个项目时阅读。</p>
            <ul class="kral-reading-path__links">
              <li><a href="/2026/08/04/kita-basics-read-repository/">拿到项目后，应该先看哪些文件</a></li>
              <li><a href="/2026/08/04/kita-basics-project-structure/">Kita 的目录结构从哪里来</a></li>
              <li><a href="/2026/08/04/kita-basics-runtime-layers/">从开发到恢复的六层运行地图</a></li>
            </ul>
          </div>
        </li>

        <li class="kral-reading-path__item">
          <div class="kral-reading-path__content">
            <p class="kral-reading-path__kicker">ROUTE 02</p>
            <h4>技术选择</h4>
            <p>按照真实形成顺序，理解我为什么选择这些工具，又刻意放弃了什么。</p>
            <ul class="kral-reading-path__links">
              <li><a href="/2026/08/01/kita-project-notes/">从视频开始搭起 Next.js 开发基座</a></li>
              <li><a href="/2026/08/02/kita-dev-container/">为什么我一直使用 Dev Container</a></li>
              <li><a href="/2026/08/03/kita-technology-tradeoffs/">Kita 使用了什么，也没有使用什么</a></li>
            </ul>
          </div>
        </li>

        <li class="kral-reading-path__item">
          <div class="kral-reading-path__content">
            <p class="kral-reading-path__kicker">ROUTE 03</p>
            <h4>工程实施</h4>
            <p>进入真实配置、部署与恢复过程，文章可以直接当作工程说明书使用。</p>
            <ul class="kral-reading-path__links">
              <li><a href="/2026/08/04/kita-case-devcontainer-setup/">在 Windows 上配置 Dev Container</a></li>
              <li><a href="/2026/08/04/kita-case-vps-coolify-deployment/">从空白 VPS 到 Coolify 部署</a></li>
              <li><a href="/2026/08/04/kita-case-restore-drill/">从备份文件到真正恢复</a></li>
            </ul>
          </div>
        </li>

        <li class="kral-reading-path__item">
          <div class="kral-reading-path__content">
            <p class="kral-reading-path__kicker">ROUTE 04</p>
            <h4>生产记录与复盘</h4>
            <p>时间线、故障和技术债不属于一条课程式 Series，但它们最接近项目真实运行的样子。</p>
            <ul class="kral-reading-path__links">
              <li><a href="/2026/08/04/kita-real-timeline/">Kita 不是按路线图做出来的</a></li>
              <li><a href="/2026/08/04/kita-real-503-incident/">Build 通过，网站却 503</a></li>
              <li><a href="/2026/08/04/kita-real-unfinished-work/">我现在明确保留的技术债</a></li>
            </ul>
          </div>
        </li>

        <li class="kral-reading-path__item kral-reading-path__item--reference">
          <div class="kral-reading-path__content">
            <p class="kral-reading-path__kicker">ROUTE 05</p>
            <h4>完整参考</h4>
            <p>当你需要一次看清代码、数据流、开发、部署与恢复边界时，再打开这份长文。</p>
            <a class="kral-reading-path__reference" href="/2026/08/05/Kita-architecture-and-project-review/">
              Kita 项目整体架构、数据流与边界审查
              <i class="fas fa-arrow-right" aria-hidden="true"></i>
            </a>
          </div>
        </li>
      </ol>
    </section>

  </article>
</main>
{% endraw %}
