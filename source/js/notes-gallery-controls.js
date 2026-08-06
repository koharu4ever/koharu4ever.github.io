/* global document, window */

(() => {
  'use strict';

  const storageKey = 'kral-notes-view';
  const supportedViews = new Set(['minimal', 'minimal-plus', 'compact', 'extended', 'thumbnail']);

  const viewFromUrl = () => {
    const view = new URLSearchParams(window.location.search).get('view');
    return supportedViews.has(view) ? view : undefined;
  };

  const normalize = (value) =>
    String(value || '')
      .normalize('NFKC')
      .toLocaleLowerCase('zh-CN')
      .trim();

  const readStoredView = () => {
    try {
      const storedView = localStorage.getItem(storageKey);
      return supportedViews.has(storedView) ? storedView : 'minimal';
    } catch {
      return 'minimal';
    }
  };

  const storeView = (view) => {
    try {
      localStorage.setItem(storageKey, view);
    } catch {
      // The library remains usable when storage is blocked.
    }
  };

  const parseList = (entry, name) => {
    try {
      const values = JSON.parse(entry.dataset[name] || '[]');
      return Array.isArray(values) ? values.map(normalize) : [];
    } catch {
      return [];
    }
  };

  const initNotesGallery = (gallery) => {
    if (gallery.dataset.notesReady === 'true') return;

    const form = gallery.querySelector('.kral-notes-search-panel');
    const search = gallery.querySelector('input[name="notes-search"]');
    const viewPicker = gallery.querySelector('select[name="notes-view"]');
    const clearButton = gallery.querySelector('[data-notes-clear]');
    const count = gallery.querySelector('[data-notes-count]');
    const pageStatuses = [...gallery.querySelectorAll('[data-notes-page-status]')];
    const empty = gallery.querySelector('.kral-notes-empty');
    const filterButtons = [...gallery.querySelectorAll('[data-note-filter-kind]')];
    const pageButtons = [...gallery.querySelectorAll('[data-notes-page]')];
    const seekDots = [...gallery.querySelectorAll('.kral-notes-seekbar span')];
    const entries = [...gallery.querySelectorAll('.kral-notes-entry')];
    const selectedFilters = new Map();
    const pageSize = Number(gallery.dataset.notesPageSize) || 25;
    let currentPage = 1;

    if (!form || !search || !viewPicker || !clearButton || !count || !pageStatuses.length || !empty)
      return;

    gallery.dataset.notesReady = 'true';

    for (const entry of entries) {
      entry.dataset.normalizedSearch = normalize(entry.dataset.search);
      entry.kralNotesCategories = parseList(entry, 'categories');
      entry.kralNotesTags = parseList(entry, 'tags');
    }

    const setView = (view, persist = true) => {
      const nextView = supportedViews.has(view) ? view : 'minimal';
      gallery.dataset.notesView = nextView;
      viewPicker.value = nextView;
      if (persist) storeView(nextView);
    };

    const matchesFilters = (entry) => {
      for (const [key, values] of selectedFilters) {
        const source = key === 'category' ? entry.kralNotesCategories : entry.kralNotesTags;
        for (const value of values) {
          if (!source.includes(value)) return false;
        }
      }
      return true;
    };

    const matchingEntries = () => {
      const query = normalize(search.value);
      return entries.filter(
        (entry) =>
          (!query || entry.dataset.normalizedSearch.includes(query)) && matchesFilters(entry)
      );
    };

    const syncFilterButtons = () => {
      for (const button of filterButtons) {
        const kind = button.dataset.noteFilterKind;
        const value = normalize(button.dataset.noteFilterValue);
        const selected = selectedFilters.get(kind)?.has(value) || false;
        button.setAttribute('aria-pressed', String(selected));
      }
    };

    const render = ({ resetPage = false } = {}) => {
      const matches = matchingEntries();
      const pageCount = Math.max(1, Math.ceil(matches.length / pageSize));
      if (resetPage) currentPage = 1;
      currentPage = Math.min(Math.max(currentPage, 1), pageCount);

      const start = (currentPage - 1) * pageSize;
      const visible = new Set(matches.slice(start, start + pageSize));

      for (const entry of entries) entry.hidden = !visible.has(entry);

      count.textContent = `Found ${matches.length.toLocaleString()} results.`;
      for (const pageStatus of pageStatuses) {
        pageStatus.textContent = 'Jump/Seek';
        pageStatus.title = `Page ${currentPage} / ${pageCount}`;
      }
      empty.hidden = matches.length !== 0;

      for (const button of pageButtons) {
        const action = button.dataset.notesPage;
        button.disabled =
          (currentPage === 1 && (action === 'first' || action === 'prev')) ||
          (currentPage === pageCount && (action === 'next' || action === 'last'));
      }

      const activeDot = Math.round(
        ((currentPage - 1) / Math.max(1, pageCount - 1)) * Math.max(0, seekDots.length - 1)
      );
      seekDots.forEach((dot, index) => dot.classList.toggle('is-active', index === activeDot));
    };

    const resetFilters = () => {
      search.value = '';
      selectedFilters.clear();
      syncFilterButtons();
      render({ resetPage: true });
      search.focus();
    };

    form.addEventListener('submit', (event) => {
      event.preventDefault();
      render({ resetPage: true });
    });

    search.addEventListener('input', () => render({ resetPage: true }));
    search.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') resetFilters();
    });
    clearButton.addEventListener('click', resetFilters);
    viewPicker.addEventListener('change', () => setView(viewPicker.value));

    for (const button of filterButtons) {
      button.addEventListener('click', () => {
        const kind = button.dataset.noteFilterKind;
        const value = normalize(button.dataset.noteFilterValue);
        const values = selectedFilters.get(kind) || new Set();

        if (values.has(value)) values.delete(value);
        else values.add(value);

        if (values.size) selectedFilters.set(kind, values);
        else selectedFilters.delete(kind);

        syncFilterButtons();
        render({ resetPage: true });
      });
    }

    for (const button of pageButtons) {
      button.addEventListener('click', () => {
        const pageCount = Math.max(1, Math.ceil(matchingEntries().length / pageSize));
        const action = button.dataset.notesPage;

        if (action === 'first') currentPage = 1;
        if (action === 'prev') currentPage -= 1;
        if (action === 'next') currentPage += 1;
        if (action === 'last') currentPage = pageCount;

        render();
        gallery.querySelector('.kral-notes-result-count')?.scrollIntoView({ block: 'start' });
      });
    }

    setView(viewFromUrl() || readStoredView(), false);
    render();
  };

  const init = () => document.querySelectorAll('.kral-notes-gallery').forEach(initNotesGallery);

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }

  document.addEventListener('pjax:complete', init);
})();
