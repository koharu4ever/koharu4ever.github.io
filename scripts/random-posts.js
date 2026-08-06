/* global hexo */

'use strict';

const normalizeRoot = (root) => {
  const trimmed = String(root || '/').replace(/^\/+|\/+$/g, '');
  return trimmed ? `/${trimmed}/` : '/';
};

hexo.extend.generator.register('random-posts', (locals) => {
  const root = normalizeRoot(hexo.config.root);
  const posts = locals.posts
    .toArray()
    .filter(
      (post) =>
        post.published !== false && post.draft !== true && post.random !== false && post.path
    )
    .map((post) => `${root}${post.path}`.replace(/\/{2,}/g, '/'))
    .sort();

  return {
    path: 'random-posts.json',
    data: JSON.stringify({ posts }, null, 2),
  };
});
