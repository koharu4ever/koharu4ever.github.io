/* global hexo */

'use strict';

// Project pages are generated routes, not Hexo Page records.
hexo.extend.filter.register('before_generate', () => {
  const entries = new Set();
  const base = new URL(hexo.config.url);
  const add = (path) => {
    const url = new URL(path, `${base.href.replace(/\/$/, '')}/`);
    if (url.origin !== base.origin) {
      throw new Error(`[sitemap] Expected an internal URL: ${path}`);
    }
    url.pathname = url.pathname.replace(/\/index\.html$/, '/');
    url.search = '';
    url.hash = '';
    entries.add(url.href);
  };

  for (const post of hexo.locals.get('posts').toArray()) {
    if (post.published !== false && post.draft !== true && post.sitemap !== false) {
      add(post.permalink);
    }
  }
  for (const path of hexo.config.sitemap.primary_pages) {
    add(path);
  }
  for (const project of hexo.locals.get('data').projects.projects) {
    if (project.sitemap !== false) {
      add(project.url);
    }
  }

  // A Set also collapses equivalent index.html and trailing-slash URLs.
  hexo.config.sitemap.entries = [...entries].sort();
});
