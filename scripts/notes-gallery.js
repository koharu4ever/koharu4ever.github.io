/* global hexo */

'use strict';

const technicalCategories = new Set([
  '开发笔记',
  'Kita 开发记录',
  'Kita 工程案例',
  'Kita 从零理解',
  'Kita 真实开发记录',
]);

const defaultCover = {
  width: 1440,
  height: 810,
};

const categoryToneCount = 10;

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function collectionNames(collection) {
  if (!collection) return [];

  const items = collection.toArray ? collection.toArray() : Array.from(collection);
  return items.map((item) => item.name).filter(Boolean);
}

function categoryNames(post) {
  return collectionNames(post.categories);
}

function tagNames(post) {
  return collectionNames(post.tags);
}

function belongsInGallery(post) {
  if (post.notes_index === false || post.published === false || post.draft === true) return false;
  if (post.notes_index === true) return true;

  return categoryNames(post).some((category) => technicalCategories.has(category));
}

function galleryImage(post) {
  const custom = post.gallery_image;

  if (typeof custom === 'string') {
    return { path: custom, ...defaultCover };
  }

  if (custom && typeof custom === 'object') {
    return {
      path: custom.path || custom.src || post.cover,
      width: Number(custom.width) || defaultCover.width,
      height: Number(custom.height) || defaultCover.height,
    };
  }

  return { path: post.cover, ...defaultCover };
}

function readingMinutes(post) {
  const content = String(post.raw || post._content || post.content || '');
  const chineseCount = (content.match(/[\u4e00-\u9fa5]/g) || []).length;
  const wordCount = (
    content.replace(/[\u4e00-\u9fa5]/g, '').match(/[a-zA-Z0-9_\u0392-\u03c9\u0400-\u04ff]+|\w+/g) ||
    []
  ).length;

  return Math.max(1, Math.floor(chineseCount / 300 + wordCount / 160));
}

function postDate(post) {
  if (post.date?.format) {
    return {
      display: post.date.format('YYYY-MM-DD HH:mm'),
      iso: post.date.toISOString ? post.date.toISOString() : post.date.format('YYYY-MM-DD'),
    };
  }

  const date = new Date(post.date);
  if (Number.isNaN(date.getTime())) return { display: '', iso: '' };

  return {
    display: date.toISOString().slice(0, 16).replace('T', ' '),
    iso: date.toISOString(),
  };
}

function toneIndex(value) {
  let hash = 0;

  for (const character of String(value)) {
    hash = (hash * 31 + character.codePointAt(0)) >>> 0;
  }

  return hash % categoryToneCount;
}

function renderTags(tags, limit = tags.length) {
  if (!tags.length) return '<span class="kral-notes-entry__untagged">未标记</span>';

  return tags
    .slice(0, limit)
    .map((tag) => `<span class="kral-notes-entry__tag">${escapeHtml(tag)}</span>`)
    .join('');
}

function articleEntry(post) {
  const image = galleryImage(post);
  if (!image.path) return '';

  const title = String(post.title || '未命名文章');
  const categories = categoryNames(post);
  const primaryCategory = categories[0] || '技术札记';
  const tags = tagNames(post);
  const series = String(post.series || '').trim();
  const minutes = readingMinutes(post);
  const date = postDate(post);
  const timestamp = Number(post.date?.valueOf?.()) || 0;
  const path = `/${String(post.path || '').replace(/^\/+/, '')}`;
  const searchText = [title, ...categories, ...tags, series].filter(Boolean).join(' ');

  return `
    <article class="kral-notes-entry" data-search="${escapeHtml(searchText)}" data-title="${escapeHtml(title)}" data-timestamp="${timestamp}" data-reading-minutes="${minutes}" data-categories="${escapeHtml(
      JSON.stringify(categories)
    )}" data-tags="${escapeHtml(JSON.stringify(tags))}">
      <a class="kral-notes-entry__link" href="${escapeHtml(path)}">
        <span class="kral-notes-entry__category kral-notes-tone-${toneIndex(primaryCategory)}">${escapeHtml(primaryCategory)}</span>
        ${date.display ? `<time datetime="${escapeHtml(date.iso)}">${escapeHtml(date.display)}</time>` : '<time></time>'}
        <span class="kral-notes-entry__status-dot" aria-hidden="true">↓</span>
        <span class="kral-notes-entry__title-cell">
          <span class="kral-notes-entry__media">
            <img src="${escapeHtml(image.path)}" alt="" width="${image.width}" height="${image.height}" loading="lazy" decoding="async">
          </span>
          <span class="kral-notes-entry__content">
            <h2>${escapeHtml(title)}</h2>
            <span class="kral-notes-entry__tags" aria-label="文章标签">${renderTags(tags, 12)}</span>
          </span>
        </span>
        <span class="kral-notes-entry__reading">约 ${escapeHtml(minutes)} 分钟</span>
        <span class="kral-notes-entry__uploader">${escapeHtml(series || 'Kral')}</span>
      </a>
    </article>`;
}

function countNames(posts, readNames) {
  const counts = new Map();

  for (const post of posts) {
    for (const name of readNames(post)) {
      counts.set(name, (counts.get(name) || 0) + 1);
    }
  }

  return [...counts.entries()].sort(([leftName, leftCount], [rightName, rightCount]) => {
    if (leftCount !== rightCount) return rightCount - leftCount;
    return leftName.localeCompare(rightName, 'zh-CN');
  });
}

function filterButton({ name, count, kind, tone, className = '' }) {
  return `<button class="kral-notes-filter-button kral-notes-tone-${tone} ${className}" type="button" data-note-filter-kind="${kind}" data-note-filter-value="${escapeHtml(
    name
  )}" aria-pressed="false"><span>${escapeHtml(name)}</span>${count ? `<small>${count}</small>` : ''}</button>`;
}

function quickFilters(categories, tags) {
  const values = categories.map(([name, count]) => ({ name, count, kind: 'category' }));
  const used = new Set(values.map((value) => value.name));

  for (const [name, count] of tags) {
    if (values.length >= 10) break;
    if (used.has(name)) continue;
    values.push({ name, count, kind: 'tag' });
    used.add(name);
  }

  return values
    .slice(0, 10)
    .map((value, index) => filterButton({ ...value, tone: index }))
    .join('');
}

function allTagButtons(tags) {
  return tags
    .map(([name, count], index) =>
      filterButton({
        name,
        count,
        kind: 'tag',
        tone: index % categoryToneCount,
        className: 'kral-notes-filter-button--tag',
      })
    )
    .join('');
}

hexo.extend.tag.register('notes_gallery', () => {
  const posts = hexo.locals.get('posts').sort('-date').toArray().filter(belongsInGallery);
  const entries = posts.map(articleEntry).join('');
  const categories = countNames(posts, categoryNames);
  const tags = countNames(posts, tagNames);
  const dots = Array.from({ length: 48 }, () => '<span></span>').join('');

  return `
<main class="kral-notes-gallery" data-notes-view="minimal" data-notes-total="${posts.length}" data-notes-page-size="25">
  <nav class="kral-notes-subnav" aria-label="技术札记导航">
    <a href="/">Front Page</a>
    <a href="/archives/">Archive</a>
    <a href="/projects/">Projects</a>
    <a href="/categories/">Categories</a>
    <a href="/tags/">Tags</a>
    <a href="/resume/">Resume</a>
    <a href="https://github.com/koharu4ever">GitHub</a>
    <a href="/atom.xml">RSS</a>
  </nav>

  <header class="kral-notes-header">
    <div class="kral-notes-brand">Kral Notes · <a href="/notes/">Technical Archive</a> <span title="搜索标题、分类、系列和标签">[?]</span></div>

    <form class="kral-notes-search-panel" role="search">
      <div class="kral-notes-quick-filters" aria-label="常用分类和标签">
        ${quickFilters(categories, tags)}
      </div>
      <div class="kral-notes-search-row">
        <label class="sr-only" for="kral-notes-search-input">搜索技术札记</label>
        <input id="kral-notes-search-input" type="search" name="notes-search" placeholder="Search Keywords" autocomplete="off">
        <button type="submit">Search</button>
        <button type="button" data-notes-clear>Clear</button>
      </div>
      <div class="kral-notes-advanced-links">
        <details class="kral-notes-advanced">
          <summary>
            <span class="kral-notes-advanced-summary--show">[Show Advanced Options]</span>
            <span class="kral-notes-advanced-summary--hide">[Hide Advanced Options]</span>
          </summary>
          <div class="kral-notes-advanced-panel">
            <label class="kral-notes-advanced-control">
              <span>Sort</span>
              <select name="notes-sort">
                <option value="newest" selected>Newest</option>
                <option value="oldest">Oldest</option>
                <option value="title">Title</option>
                <option value="reading">Reading Time</option>
              </select>
            </label>
            <label class="kral-notes-advanced-control">
              <span>Per Page</span>
              <select name="notes-page-size">
                <option value="25" selected>25</option>
                <option value="50">50</option>
                <option value="all">All</option>
              </select>
            </label>
          </div>
        </details>
        <details class="kral-notes-all-tags">
          <summary>[Show Tag Search]</summary>
          <div>${allTagButtons(tags)}</div>
        </details>
      </div>
      <div class="kral-notes-active-filters" data-notes-active-filters hidden>
        <span class="kral-notes-active-filters__label">Active Filters</span>
        <div class="kral-notes-active-filters__list" data-notes-active-filter-list></div>
        <button type="button" data-notes-clear-active>Clear all</button>
      </div>
    </form>

    <div class="kral-notes-seekbar" aria-hidden="true">${dots}</div>
    <p class="kral-notes-result-count" data-notes-count>Found ${posts.length} results.</p>

    <div class="kral-notes-toolbar">
      <nav class="kral-notes-pagination" aria-label="文章分页">
        <button type="button" data-notes-page="first">&lt;&lt; First</button>
        <button type="button" data-notes-page="prev">&lt; Prev</button>
        <span data-notes-page-status title="Page 1 / 1">Jump/Seek</span>
        <button type="button" data-notes-page="next">Next &gt;</button>
        <button type="button" data-notes-page="last">Last &gt;&gt;</button>
      </nav>
      <label class="kral-notes-view-picker">
        <span class="sr-only">View</span>
        <select name="notes-view">
          <option value="minimal" selected>Minimal</option>
          <option value="minimal-plus">Minimal+</option>
          <option value="compact">Compact</option>
          <option value="extended">Extended</option>
          <option value="thumbnail">Thumbnail</option>
        </select>
      </label>
    </div>
  </header>

  <section class="kral-notes-list-shell" aria-label="技术文章">
    <div class="kral-notes-list-head" aria-hidden="true">
      <span></span><span>Published</span><span></span><span>Title</span><span>Reading</span><span>Uploader</span>
    </div>
    <div class="kral-notes-results">${entries}</div>
  </section>
  <nav class="kral-notes-pagination kral-notes-pagination--bottom" aria-label="文章底部分页">
    <button type="button" data-notes-page="first">&lt;&lt; First</button>
    <button type="button" data-notes-page="prev">&lt; Prev</button>
    <span data-notes-page-status title="Page 1 / 1">Jump/Seek</span>
    <button type="button" data-notes-page="next">Next &gt;</button>
    <button type="button" data-notes-page="last">Last &gt;&gt;</button>
  </nav>
  <p class="kral-notes-empty" hidden>No matching articles were found.</p>
</main>
<script defer src="/js/notes-gallery-controls.js"></script>`;
});
