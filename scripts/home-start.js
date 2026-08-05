/* global hexo */

'use strict';

const homeMain = '<main class="layout" id="content-inner">';
const homeMainWithStart = '<main class="layout kral-home-layout" id="content-inner">';

// Image paths are intentionally kept here so final artwork can be swapped easily.
const startHereImages = {
  kita: '/img/start/kita.webp',
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
    <p>从项目实践与技术记录开始了解这个站点。</p>
  </header>

  <nav class="kral-start-grid" aria-label="推荐阅读入口">
    <a class="kral-start-card kral-start-card-kita" href="/categories/Kita-工程案例/">
      <img src="${startHereImages.kita}" alt="" loading="lazy" decoding="async">
      <span class="kral-start-card-content">
        <strong>Kita 系列</strong>
        <small>项目、架构与工程记录</small>
      </span>
    </a>

    <a class="kral-start-card kral-start-card-notes" href="/categories/开发笔记/">
      <img src="${startHereImages.notes}" alt="" loading="lazy" decoding="async">
      <span class="kral-start-card-content">
        <strong>技术札记</strong>
        <small>Java、C#、SQL 与后端选择</small>
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
