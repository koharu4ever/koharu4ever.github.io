/* global document, window */

(() => {
  'use strict';

  const storageKeys = {
    view: 'kral-notes-view',
    sort: 'kral-notes-sort',
    pageSize: 'kral-notes-page-size',
  };
  const supportedViews = new Set(['minimal', 'minimal-plus', 'compact', 'extended', 'thumbnail']);
  const supportedSorts = new Set(['newest', 'oldest', 'title', 'reading']);
  const supportedPageSizes = new Set(['25', '50', 'all']);

  const viewFromUrl = () => {
    const view = new URLSearchParams(window.location.search).get('view');
    return supportedViews.has(view) ? view : undefined;
  };

  const normalize = (value) =>
    String(value || '')
      .normalize('NFKC')
      .toLocaleLowerCase('zh-CN')
      .trim();

  const readStoredPreference = (key, supported, fallback) => {
    try {
      const value = localStorage.getItem(key);
      return supported.has(value) ? value : fallback;
    } catch {
      return fallback;
    }
  };

  const storePreference = (key, value) => {
    try {
      localStorage.setItem(key, value);
    } catch {
      // The archive remains usable when storage is blocked.
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
    const sortPicker = gallery.querySelector('select[name="notes-sort"]');
    const pageSizePicker = gallery.querySelector('select[name="notes-page-size"]');
    const viewPicker = gallery.querySelector('select[name="notes-view"]');
    const clearButton = gallery.querySelector('[data-notes-clear]');
    const clearActiveButton = gallery.querySelector('[data-notes-clear-active]');
    const activeFilters = gallery.querySelector('[data-notes-active-filters]');
    const activeFilterList = gallery.querySelector('[data-notes-active-filter-list]');
    const count = gallery.querySelector('[data-notes-count]');
    const pageStatuses = [...gallery.querySelectorAll('[data-notes-page-status]')];
    const empty = gallery.querySelector('.kral-notes-empty');
    const filterButtons = [...gallery.querySelectorAll('[data-note-filter-kind]')];
    const pageButtons = [...gallery.querySelectorAll('[data-notes-page]')];
    const seekDots = [...gallery.querySelectorAll('.kral-notes-seekbar span')];
    const results = gallery.querySelector('.kral-notes-results');
    const entries = [...gallery.querySelectorAll('.kral-notes-entry')];
    const selectedFilters = new Map();
    const filterLabels = new Map();
    let currentPage = 1;
    let pageSize = '25';
    let sortMode = 'newest';

    if (
      !form ||
      !search ||
      !sortPicker ||
      !pageSizePicker ||
      !viewPicker ||
      !clearButton ||
      !clearActiveButton ||
      !activeFilters ||
      !activeFilterList ||
      !count ||
      !pageStatuses.length ||
      !empty ||
      !results
    )
      return;

    gallery.dataset.notesReady = 'true';

    entries.forEach((entry, index) => {
      entry.dataset.normalizedSearch = normalize(entry.dataset.search);
      entry.kralNotesCategories = parseList(entry, 'categories');
      entry.kralNotesTags = parseList(entry, 'tags');
      entry.kralNotesTitle = normalize(entry.dataset.title);
      entry.kralNotesTimestamp = Number(entry.dataset.timestamp) || 0;
      entry.kralNotesReading = Number(entry.dataset.readingMinutes) || 0;
      entry.kralNotesOriginalIndex = index;
    });

    for (const button of filterButtons) {
      const kind = button.dataset.noteFilterKind;
      const value = normalize(button.dataset.noteFilterValue);
      filterLabels.set(`${kind}:${value}`, button.dataset.noteFilterValue || value);
    }

    const setView = (view, persist = true) => {
      const nextView = supportedViews.has(view) ? view : 'minimal';
      gallery.dataset.notesView = nextView;
      viewPicker.value = nextView;
      if (persist) storePreference(storageKeys.view, nextView);
    };

    const sortEntries = () => {
      entries.sort((left, right) => {
        let difference = 0;

        if (sortMode === 'newest') difference = right.kralNotesTimestamp - left.kralNotesTimestamp;
        if (sortMode === 'oldest') difference = left.kralNotesTimestamp - right.kralNotesTimestamp;
        if (sortMode === 'title') {
          difference = left.kralNotesTitle.localeCompare(right.kralNotesTitle, 'zh-CN', {
            numeric: true,
            sensitivity: 'base',
          });
        }
        if (sortMode === 'reading') difference = left.kralNotesReading - right.kralNotesReading;

        return difference || left.kralNotesOriginalIndex - right.kralNotesOriginalIndex;
      });

      results.append(...entries);
    };

    const setSort = (sort, persist = true) => {
      sortMode = supportedSorts.has(sort) ? sort : 'newest';
      sortPicker.value = sortMode;
      sortEntries();
      if (persist) storePreference(storageKeys.sort, sortMode);
    };

    const setPageSize = (value, persist = true) => {
      pageSize = supportedPageSizes.has(value) ? value : '25';
      pageSizePicker.value = pageSize;
      if (persist) storePreference(storageKeys.pageSize, pageSize);
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

    const createActiveFilter = ({ kind, value = '', label }) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.notesActiveKind = kind;
      button.dataset.notesActiveValue = value;
      button.textContent = `${label} ×`;
      button.setAttribute('aria-label', `Remove ${label} filter`);
      return button;
    };

    const syncActiveFilters = () => {
      activeFilterList.replaceChildren();
      const query = search.value.trim();

      if (query) {
        activeFilterList.append(
          createActiveFilter({ kind: 'search', label: `Search: “${query}”` })
        );
      }

      for (const [kind, values] of selectedFilters) {
        for (const value of values) {
          const label = filterLabels.get(`${kind}:${value}`) || value;
          const prefix = kind === 'category' ? 'Category' : 'Tag';
          activeFilterList.append(
            createActiveFilter({ kind, value, label: `${prefix}: ${label}` })
          );
        }
      }

      activeFilters.hidden = activeFilterList.childElementCount === 0;
    };

    const effectivePageSize = (matchCount) =>
      pageSize === 'all' ? Math.max(1, matchCount) : Number(pageSize);

    const render = ({ resetPage = false } = {}) => {
      syncFilterButtons();
      syncActiveFilters();

      const matches = matchingEntries();
      const visiblePageSize = effectivePageSize(matches.length);
      const pageCount = Math.max(1, Math.ceil(matches.length / visiblePageSize));
      if (resetPage) currentPage = 1;
      currentPage = Math.min(Math.max(currentPage, 1), pageCount);

      const start = (currentPage - 1) * visiblePageSize;
      const visible = new Set(matches.slice(start, start + visiblePageSize));

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
    clearActiveButton.addEventListener('click', resetFilters);
    viewPicker.addEventListener('change', () => setView(viewPicker.value));
    sortPicker.addEventListener('change', () => {
      setSort(sortPicker.value);
      render({ resetPage: true });
    });
    pageSizePicker.addEventListener('change', () => {
      setPageSize(pageSizePicker.value);
      render({ resetPage: true });
    });

    activeFilterList.addEventListener('click', (event) => {
      const button = event.target.closest('[data-notes-active-kind]');
      if (!button) return;

      const kind = button.dataset.notesActiveKind;
      if (kind === 'search') {
        search.value = '';
      } else {
        const values = selectedFilters.get(kind);
        values?.delete(button.dataset.notesActiveValue);
        if (!values?.size) selectedFilters.delete(kind);
      }

      render({ resetPage: true });
    });

    for (const button of filterButtons) {
      button.addEventListener('click', () => {
        const kind = button.dataset.noteFilterKind;
        const value = normalize(button.dataset.noteFilterValue);
        const values = selectedFilters.get(kind) || new Set();

        if (values.has(value)) values.delete(value);
        else values.add(value);

        if (values.size) selectedFilters.set(kind, values);
        else selectedFilters.delete(kind);

        render({ resetPage: true });
      });
    }

    for (const button of pageButtons) {
      button.addEventListener('click', () => {
        const matches = matchingEntries();
        const pageCount = Math.max(
          1,
          Math.ceil(matches.length / effectivePageSize(matches.length))
        );
        const action = button.dataset.notesPage;

        if (action === 'first') currentPage = 1;
        if (action === 'prev') currentPage -= 1;
        if (action === 'next') currentPage += 1;
        if (action === 'last') currentPage = pageCount;

        render();
        gallery.querySelector('.kral-notes-result-count')?.scrollIntoView({ block: 'start' });
      });
    }

    setView(
      viewFromUrl() || readStoredPreference(storageKeys.view, supportedViews, 'minimal'),
      false
    );
    setSort(readStoredPreference(storageKeys.sort, supportedSorts, 'newest'), false);
    setPageSize(readStoredPreference(storageKeys.pageSize, supportedPageSizes, '25'), false);
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
