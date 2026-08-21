/* global document, location */

(() => {
  'use strict';

  const endpoint = '/authorship.json';
  let authorshipRequest;

  const normalizePath = (value) => {
    const path = new URL(value, location.origin).pathname.replace(/index\.html$/, '');
    return path.endsWith('/') ? path : `${path}/`;
  };

  const loadHumanAuthorship = () => {
    if (!authorshipRequest) {
      authorshipRequest = fetch(endpoint, { credentials: 'same-origin' })
        .then((response) => {
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          return response.json();
        })
        .then((data) => {
          const paths = Array.isArray(data.human) ? data.human : [];
          return new Set(paths.map(normalizePath));
        })
        .catch((error) => {
          authorshipRequest = undefined;
          throw error;
        });
    }

    return authorshipRequest;
  };

  const createBadge = (variant) => {
    const badge = document.createElement('span');
    badge.className = `kral-authorship-badge kral-authorship-badge--${variant}`;
    badge.title = '本文由作者独立撰写';
    badge.setAttribute('role', 'img');
    badge.setAttribute('aria-label', '纯手工：本文由作者独立撰写');

    const emblem = document.createElement('span');
    emblem.className = 'kral-authorship-badge__emblem';
    emblem.setAttribute('aria-hidden', 'true');

    const frame = document.createElement('span');
    frame.className = 'kral-authorship-badge__frame';
    frame.setAttribute('aria-hidden', 'true');

    const label = document.createElement('span');
    label.className = 'kral-authorship-badge__label';
    label.setAttribute('aria-hidden', 'true');
    label.textContent = '手作';

    badge.append(emblem, frame, label);
    return badge;
  };

  const decorateCards = (humanPaths) => {
    document.querySelectorAll('#recent-posts .recent-post-item').forEach((card) => {
      if (card.querySelector('.kral-authorship-badge')) return;

      const link = card.querySelector('.article-title[href]');
      if (!link || !humanPaths.has(normalizePath(link.href))) return;

      const cover = card.querySelector('.post_cover');
      card.classList.add('kral-authorship-card--badged');

      if (cover) {
        cover.append(createBadge('card'));
      } else {
        card.append(createBadge('card-fallback'));
      }
    });
  };

  const decoratePost = (humanPaths) => {
    const header = document.querySelector('#page-header.post-bg');
    if (!header || header.querySelector('.kral-authorship-badge')) return;
    if (!humanPaths.has(normalizePath(location.href))) return;

    header.classList.add('kral-authorship-header--badged');
    header.append(createBadge('detail'));
  };

  const initAuthorshipBadges = async () => {
    const hasCards = document.querySelector('#recent-posts .recent-post-item');
    const hasPost = document.querySelector('#page-header.post-bg #post-info');
    if (!hasCards && !hasPost) return;

    try {
      const humanPaths = await loadHumanAuthorship();
      decorateCards(humanPaths);
      decoratePost(humanPaths);
    } catch {
      // Authorship is optional metadata. A failed request must not affect article navigation.
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAuthorshipBadges, { once: true });
  } else {
    initAuthorshipBadges();
  }

  document.addEventListener('pjax:complete', initAuthorshipBadges);
})();
