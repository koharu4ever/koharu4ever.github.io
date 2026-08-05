/* global document, MutationObserver */

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

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initStats, { once: true });
  } else {
    initStats();
  }

  document.addEventListener('pjax:complete', initStats);
})();
