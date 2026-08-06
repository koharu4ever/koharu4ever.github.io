/* global hexo */

'use strict';

const homeMain = '<main class="layout" id="content-inner">';
const homeMainWithStart = '<main class="layout kral-home-layout" id="content-inner">';

// Image paths are intentionally kept here so final artwork can be swapped easily.
const startHereImages = {
  projects: '/img/start/projects.webp',
  notes: '/img/start/notes.webp',
};

// Adapted from D-Sketon/hexo-theme-reimu's home category cards (MIT).
// See THIRD_PARTY_NOTICES.md for the upstream source and license.
const startHere = `
<section class="kral-start-here" aria-labelledby="kral-start-title">
  <header class="kral-start-header">
    <div>
      <p class="kral-start-kicker">START HERE</p>
      <h2 id="kral-start-title">从这里开始</h2>
    </div>
    <p>我主要在这里记录做过的项目，以及我为什么选择某一种技术。</p>
  </header>

  <nav class="kral-start-grid" aria-label="推荐阅读入口">
    <a class="kral-start-card kral-start-card-projects" href="/projects/">
      <img src="${startHereImages.projects}" alt="" loading="lazy" decoding="async">
      <span class="kral-start-card-content">
        <strong>项目实践</strong>
        <small>真实项目里的架构、部署、故障与复盘</small>
      </span>
    </a>

    <a class="kral-start-card kral-start-card-notes" href="/notes/">
      <img src="${startHereImages.notes}" alt="" loading="lazy" decoding="async">
      <span class="kral-start-card-content">
        <strong>技术札记</strong>
        <small>语言、数据库、工具与技术选择</small>
      </span>
    </a>
  </nav>
</section>`;

hexo.extend.filter.register('after_render:html', (html, data) => {
  if (data.path !== 'index.html' || html.includes('kral-start-here')) {
    return html;
  }

  return html.replace(homeMain, `${homeMainWithStart}${startHere}`);
});
