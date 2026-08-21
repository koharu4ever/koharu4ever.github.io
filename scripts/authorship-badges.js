/* global hexo */

'use strict';

const allowedAuthorship = new Set(['human', 'ai_assisted']);

const normalizeRoot = (root) => {
  const trimmed = String(root || '/').replace(/^\/+|\/+$/g, '');
  return trimmed ? `/${trimmed}/` : '/';
};

const normalizeAuthorship = (post) => {
  if (post.authorship === undefined || post.authorship === null || post.authorship === '') {
    return null;
  }

  if (typeof post.authorship !== 'string') {
    throw new TypeError(
      `[authorship-badges] ${post.source || post.path || post.title || 'Unknown post'}: authorship must be a string.`
    );
  }

  const value = post.authorship.trim().toLocaleLowerCase('en-US');

  if (!allowedAuthorship.has(value)) {
    throw new Error(
      `[authorship-badges] ${post.source || post.path || post.title || 'Unknown post'}: authorship must be "human" or "ai_assisted".`
    );
  }

  return value;
};

hexo.extend.generator.register('authorship-badges', (locals) => {
  const root = normalizeRoot(hexo.config.root);
  const human = locals.posts
    .toArray()
    .filter((post) => post.published !== false && post.draft !== true && post.path)
    .filter((post) => normalizeAuthorship(post) === 'human')
    .map((post) => `${root}${post.path}`.replace(/\/{2,}/g, '/'))
    .sort();

  return {
    path: 'authorship.json',
    data: JSON.stringify({ version: 1, human }, null, 2),
  };
});
