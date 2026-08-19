/* global document, location, requestAnimationFrame, window */

(() => {
  'use strict';

  const STORAGE_PREFIX = 'kral:reading-resume:v1:';
  const SESSION_PREFIX = 'kral:reading-resume-shown:v1:';
  const MIN_TEXT_LENGTH = 12000;
  const MIN_SECTION_COUNT = 6;
  const MIN_SAVED_PROGRESS = 0.06;
  const MAX_SAVED_PROGRESS = 0.96;
  const MAX_AGE = 1000 * 60 * 60 * 24 * 90;
  const HEADER_OFFSET = 88;
  const SAVE_DELAY = 800;

  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

  const safeStorage = {
    get(storage, key) {
      try {
        return storage.getItem(key);
      } catch {
        return null;
      }
    },
    set(storage, key, value) {
      try {
        storage.setItem(key, value);
      } catch {
        // Storage may be unavailable in private or restricted browser contexts.
      }
    },
    remove(storage, key) {
      try {
        storage.removeItem(key);
      } catch {
        // Treat unavailable storage as a graceful no-op.
      }
    },
  };

  const parseState = (value) => {
    if (!value) return null;

    try {
      const state = JSON.parse(value);
      if (!state || typeof state !== 'object') return null;
      if (typeof state.progress !== 'number' || typeof state.savedAt !== 'number') return null;
      return state;
    } catch {
      return null;
    }
  };

  const createPrompt = ({ state, onResume, onRestart }) => {
    const prompt = document.createElement('aside');
    prompt.className = 'kral-reading-resume';
    prompt.setAttribute('aria-label', '继续上次阅读');
    prompt.setAttribute('aria-live', 'polite');

    const icon = document.createElement('span');
    icon.className = 'kral-reading-resume__icon';
    icon.setAttribute('aria-hidden', 'true');
    icon.innerHTML = '<i class="fa-solid fa-book-open"></i>';

    const content = document.createElement('div');
    content.className = 'kral-reading-resume__content';

    const eyebrow = document.createElement('span');
    eyebrow.className = 'kral-reading-resume__eyebrow';
    eyebrow.textContent = `阅读进度 ${Math.round(state.progress * 100)}%`;

    const title = document.createElement('strong');
    title.className = 'kral-reading-resume__title';
    title.textContent = state.headingText ? `上次读到：${state.headingText}` : '继续上次阅读';

    content.append(eyebrow, title);

    const actions = document.createElement('div');
    actions.className = 'kral-reading-resume__actions';

    const restartButton = document.createElement('button');
    restartButton.className = 'kral-reading-resume__button kral-reading-resume__button--quiet';
    restartButton.type = 'button';
    restartButton.textContent = '从头开始';
    restartButton.addEventListener('click', onRestart, { once: true });

    const resumeButton = document.createElement('button');
    resumeButton.className = 'kral-reading-resume__button kral-reading-resume__button--primary';
    resumeButton.type = 'button';
    resumeButton.textContent = '继续阅读';
    resumeButton.addEventListener('click', onResume, { once: true });

    actions.append(restartButton, resumeButton);
    prompt.append(icon, content, actions);
    document.body.appendChild(prompt);

    requestAnimationFrame(() => prompt.classList.add('is-visible'));
    return prompt;
  };

  const focusHeading = (heading) => {
    if (!heading) return;

    const hadTabIndex = heading.hasAttribute('tabindex');
    if (!hadTabIndex) heading.setAttribute('tabindex', '-1');
    heading.focus({ preventScroll: true });

    if (!hadTabIndex) {
      heading.addEventListener('blur', () => heading.removeAttribute('tabindex'), { once: true });
    }
  };

  const initReadingResume = () => {
    window.__kralReadingResume?.destroy();

    const article = document.querySelector('#post > article#article-container.post-content');
    if (!article) return;

    const headings = Array.from(article.querySelectorAll('h2[id]'));
    const textLength = (article.textContent || '').trim().length;
    if (textLength < MIN_TEXT_LENGTH || headings.length < MIN_SECTION_COUNT) return;

    const path = location.pathname;
    const storageKey = `${STORAGE_PREFIX}${path}`;
    const sessionKey = `${SESSION_PREFIX}${path}`;
    const storedState = parseState(safeStorage.get(localStorage, storageKey));
    const now = Date.now();
    const navigationType = window.performance?.getEntriesByType?.('navigation')?.[0]?.type;
    const browserMayRestoreScroll =
      navigationType === 'reload' || navigationType === 'back_forward';
    const canOfferResume =
      storedState &&
      storedState.path === path &&
      now - storedState.savedAt < MAX_AGE &&
      storedState.progress >= MIN_SAVED_PROGRESS &&
      storedState.progress <= MAX_SAVED_PROGRESS &&
      !location.hash &&
      !browserMayRestoreScroll &&
      !safeStorage.get(sessionStorage, sessionKey);

    let prompt;
    let saveTimer;
    let trackingEnabled = !canOfferResume;
    let destroyed = false;

    const articleTop = () => article.getBoundingClientRect().top + window.scrollY;
    const articleScrollableHeight = () =>
      Math.max(1, article.scrollHeight - window.innerHeight * 0.45);

    const readingProgress = () =>
      clamp((window.scrollY + HEADER_OFFSET - articleTop()) / articleScrollableHeight(), 0, 1);

    const currentHeading = () => {
      let active = headings[0];

      for (const heading of headings) {
        if (heading.getBoundingClientRect().top > HEADER_OFFSET + 24) break;
        active = heading;
      }

      return active;
    };

    const persist = () => {
      if (!trackingEnabled || destroyed) return;

      const progress = readingProgress();
      if (progress < 0.02) return;

      if (progress > MAX_SAVED_PROGRESS) {
        safeStorage.remove(localStorage, storageKey);
        return;
      }

      const heading = currentHeading();
      const headingTop = heading.getBoundingClientRect().top + window.scrollY;
      const state = {
        path,
        progress,
        headingId: heading.id,
        headingText: (heading.textContent || '').trim(),
        headingOffset: Math.max(0, window.scrollY - headingTop),
        savedAt: Date.now(),
      };

      safeStorage.set(localStorage, storageKey, JSON.stringify(state));
    };

    const schedulePersist = () => {
      if (!trackingEnabled || saveTimer) return;
      saveTimer = window.setTimeout(() => {
        saveTimer = undefined;
        persist();
      }, SAVE_DELAY);
    };

    const removePrompt = () => {
      if (!prompt) return;
      prompt.classList.remove('is-visible');
      const currentPrompt = prompt;
      prompt = undefined;
      window.setTimeout(() => currentPrompt.remove(), 220);
    };

    const resume = () => {
      safeStorage.set(sessionStorage, sessionKey, 'true');
      removePrompt();

      const heading = storedState.headingId ? document.getElementById(storedState.headingId) : null;
      const maxScroll = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
      const fallback = articleTop() + articleScrollableHeight() * storedState.progress;
      const destination = heading
        ? heading.getBoundingClientRect().top + window.scrollY + (storedState.headingOffset || 0)
        : fallback;
      const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      window.scrollTo({
        top: clamp(destination, 0, maxScroll),
        behavior: reduceMotion ? 'auto' : 'smooth',
      });

      window.setTimeout(
        () => {
          focusHeading(heading);
          trackingEnabled = true;
          persist();
        },
        reduceMotion ? 50 : 650
      );
    };

    const restart = () => {
      safeStorage.remove(localStorage, storageKey);
      safeStorage.set(sessionStorage, sessionKey, 'true');
      removePrompt();
      trackingEnabled = true;
    };

    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') persist();
    };

    const destroy = () => {
      if (destroyed) return;
      persist();
      destroyed = true;
      window.clearTimeout(saveTimer);
      window.removeEventListener('scroll', schedulePersist);
      window.removeEventListener('pagehide', persist);
      document.removeEventListener('visibilitychange', handleVisibility);
      prompt?.remove();
    };

    window.addEventListener('scroll', schedulePersist, { passive: true });
    window.addEventListener('pagehide', persist);
    document.addEventListener('visibilitychange', handleVisibility);

    if (canOfferResume && window.scrollY < 120) {
      prompt = createPrompt({ state: storedState, onResume: resume, onRestart: restart });
    } else {
      trackingEnabled = true;
    }

    window.__kralReadingResume = { destroy, persist };
  };

  if (document.readyState === 'loading') {
    document.addEventListener(
      'DOMContentLoaded',
      () => requestAnimationFrame(() => requestAnimationFrame(initReadingResume)),
      { once: true }
    );
  } else {
    requestAnimationFrame(() => requestAnimationFrame(initReadingResume));
  }

  document.addEventListener('pjax:send', () => window.__kralReadingResume?.destroy());
  document.addEventListener('pjax:complete', initReadingResume);
})();
