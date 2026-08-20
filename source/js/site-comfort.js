/* global document, location, MutationObserver, window */

(() => {
  'use strict';

  const metrics = [
    {
      valueId: 'busuanzi_value_site_uv',
      container: (value) => value.closest('.webinfo-item'),
    },
    {
      valueId: 'busuanzi_value_site_pv',
      container: (value) => value.closest('.webinfo-item'),
    },
    {
      valueId: 'busuanzi_value_page_pv',
      container: (value) => value.closest('.post-meta-pv-cv'),
    },
  ];

  const hasCount = (value) => /\d/.test(value.textContent || '');

  const revealWhenReady = ({ valueId, container }) => {
    const value = document.getElementById(valueId);
    if (!value || value.dataset.kralStatObserved === 'true') return;

    const row = container(value);
    if (!row) return;

    value.dataset.kralStatObserved = 'true';

    const reveal = () => {
      if (!hasCount(value)) return false;

      row.classList.add('kral-stat-ready');
      return true;
    };

    if (reveal()) return;

    const observer = new MutationObserver(() => {
      if (reveal()) observer.disconnect();
    });

    observer.observe(value, {
      childList: true,
      subtree: true,
      characterData: true,
    });
  };

  const initStats = () => metrics.forEach(revealWhenReady);

  let randomPostsRequest;

  const normalizePath = (value) => {
    const path = new URL(value, window.location.origin).pathname;
    return path.endsWith('/') ? path : `${path}/`;
  };

  const loadRandomPosts = () => {
    if (!randomPostsRequest) {
      randomPostsRequest = fetch('/random-posts.json', {
        credentials: 'same-origin',
      })
        .then((response) => {
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          return response.json();
        })
        .then((data) => (Array.isArray(data.posts) ? data.posts : []))
        .catch((error) => {
          randomPostsRequest = undefined;
          throw error;
        });
    }

    return randomPostsRequest;
  };

  const visitRandomPost = async (button) => {
    const defaultTitle = button.title;
    button.disabled = true;

    try {
      const currentPath = normalizePath(location.href);
      const posts = (await loadRandomPosts()).filter((post) => normalizePath(post) !== currentPath);

      if (!posts.length) throw new Error('No random post candidates');

      const destination = posts[Math.floor(Math.random() * posts.length)];
      window.location.assign(destination);
    } catch {
      button.title = '暂时无法获取文章列表';
      button.setAttribute('aria-label', button.title);

      window.setTimeout(() => {
        button.title = defaultTitle;
        button.setAttribute('aria-label', defaultTitle);
        button.disabled = false;
      }, 2500);
    }
  };

  const initRandomPost = () => {
    if (document.getElementById('kral-random-post')) return;

    const rightside = document.getElementById('rightside-config-show');
    const goUp = document.getElementById('go-up');
    if (!rightside || !goUp) return;

    const button = document.createElement('button');
    button.id = 'kral-random-post';
    button.type = 'button';
    button.title = '随便逛逛';
    button.setAttribute('aria-label', button.title);
    button.innerHTML = '<i class="fas fa-random" aria-hidden="true"></i>';
    button.addEventListener('click', () => visitRandomPost(button));

    rightside.insertBefore(button, goUp);
  };

  const commentStickerNames = ['idea', 'cool', 'salute', 'thanks', 'giggle', 'crown', 'heart'];

  const initCommentStickers = () => {
    const comments = document.getElementById('post-comment');
    if (!comments || comments.querySelector('.kral-comment-stickers')) return;

    const stickers = document.createElement('span');
    stickers.className = 'kral-comment-stickers';
    stickers.setAttribute('aria-hidden', 'true');

    commentStickerNames.forEach((name) => {
      const sticker = document.createElement('span');
      sticker.className = `kral-comment-sticker kral-comment-sticker--${name}`;
      stickers.append(sticker);
    });

    comments.prepend(stickers);
  };

  const initComfort = () => {
    initStats();
    initRandomPost();
    initCommentStickers();
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initComfort, { once: true });
  } else {
    initComfort();
  }

  document.addEventListener('pjax:complete', initComfort);
})();
