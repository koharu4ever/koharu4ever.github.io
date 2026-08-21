/* global document, location, window */

(() => {
  'use strict';

  const MINIMUM_WIDTH = 1440;
  const WIDE_WIDTH = 1600;
  const COMPACT_COUNT = 12;
  const WIDE_COUNT = 14;
  const SESSION_SEED_KEY = 'kral-home-sticker-seed-v1';

  const stickerFiles = [
    'picker.png',
    'sticker-heart.png',
    'sticker-02-cry.png',
    'sticker-03-heart-eyes.png',
    'laugh.png',
    'sticker-05-shocked.png',
    'sticker-06-pleading.png',
    'sticker-07-star-eyes.png',
    'sticker-08-upside-down.png',
    'rocket.png',
    'hooray.png',
    'sticker-cool.png',
    'sticker-12-again.png',
    'sticker-13-hard.png',
    'sticker-14-good.png',
    'sticker-15-easy.png',
    'sticker-16-notification-badge.png',
    'thumbs-up.png',
    'sticker-18-smirking.png',
    'confused.png',
    'sticker-20-sweat.png',
    'sticker-salute.png',
    'sticker-giggle.png',
    'sticker-23-savoring.png',
    'sticker-24-screaming-in-fear.png',
    'sticker-25-shushing-close.png',
    'sticker-26-smiling.png',
    'sticker-27-smiling-halo.png',
    'sticker-28-spiral-eyes.png',
    'eyes.png',
    'sticker-thanks.png',
    'sticker-31-police-car-light.png',
    'sticker-idea.png',
    'sticker-33-melting.png',
    'sticker-34-flushed.png',
    'sticker-35-sleeping.png',
    'thumbs-down.png',
    'sticker-37-tear.png',
    'sticker-38-expressionless.png',
    'sticker-39-crossed-out-eyes.png',
    'sticker-40-woozy.png',
    'sticker-41-blowing-a-kiss.png',
    'sticker-42-open-hands.png',
    'sticker-crown.png',
    'heart.png',
    'sticker-45-big-heart-blue.png',
    'sticker-46-anki.png',
    'sticker-47-robot.png',
    'sticker-48-perfect-streaks.png',
    'sticker-49-lost-streaks.png',
  ];

  const compactSlots = {
    left: [
      { top: '7rem', x: 38 },
      { top: '22%', x: 62 },
      { top: '39%', x: 44 },
      { top: '56%', x: 68 },
      { top: '73%', x: 36 },
      { top: '90%', x: 56 },
    ],
    right: [
      { top: '14%', x: 24 },
      { top: '31%', x: 36 },
      { top: '48%', x: 28 },
      { top: '65%', x: 38 },
      { top: '82%', x: 22 },
      { top: '92%', x: 34 },
    ],
  };

  const wideSlots = {
    left: [
      { top: '7rem', x: 46 },
      { top: '17%', x: 68 },
      { top: '31%', x: 34 },
      { top: '45%', x: 62 },
      { top: '59%', x: 42 },
      { top: '73%', x: 66 },
      { top: '88%', x: 38 },
    ],
    right: [
      { top: '11%', x: 24 },
      { top: '24%', x: 43 },
      { top: '38%', x: 28 },
      { top: '52%', x: 46 },
      { top: '66%', x: 30 },
      { top: '80%', x: 42 },
      { top: '93%', x: 26 },
    ],
  };

  const hash = (value) => {
    let result = 2166136261;

    for (let index = 0; index < value.length; index += 1) {
      result ^= value.charCodeAt(index);
      result = Math.imul(result, 16777619);
    }

    return result >>> 0;
  };

  const randomFromSeed = (initialSeed) => {
    let seed = initialSeed || 1;

    return () => {
      seed += 0x6d2b79f5;
      let value = seed;
      value = Math.imul(value ^ (value >>> 15), value | 1);
      value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
      return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
    };
  };

  const getSessionSeed = () => {
    try {
      const storedSeed = sessionStorage.getItem(SESSION_SEED_KEY);
      if (storedSeed) return storedSeed;

      const randomValue = new Uint32Array(1);
      crypto.getRandomValues(randomValue);
      const seed = randomValue[0].toString(36);
      sessionStorage.setItem(SESSION_SEED_KEY, seed);
      return seed;
    } catch {
      return 'kral-static-sticker-seed';
    }
  };

  const getStickerDeck = () => {
    const deck = stickerFiles.map((file, index) => ({ file, index }));
    const random = randomFromSeed(hash(getSessionSeed()));

    for (let index = deck.length - 1; index > 0; index -= 1) {
      const target = Math.floor(random() * (index + 1));
      [deck[index], deck[target]] = [deck[target], deck[index]];
    }

    return deck;
  };

  const getPageNumber = () => {
    const match = location.pathname.match(/\/page\/(\d+)\/?$/);
    return match ? Number.parseInt(match[1], 10) : 1;
  };

  const selectStickers = (count) => {
    const deck = getStickerDeck();
    const pageOffset = ((getPageNumber() - 1) * WIDE_COUNT) % deck.length;

    return Array.from({ length: count }, (_, index) => deck[(pageOffset + index) % deck.length]);
  };

  const createRail = (side) => {
    const rail = document.createElement('div');
    rail.className = `kral-home-sticker-rail kral-home-sticker-rail--${side}`;
    rail.setAttribute('aria-hidden', 'true');
    return rail;
  };

  const createSticker = ({ file, index }, slot, order, isWide) => {
    const image = document.createElement('img');
    const variation = hash(`${getSessionSeed()}:${location.pathname}:${index}:${order}`);
    const rotation = (variation % 25) - 12;
    const size = isWide ? 54 + ((variation >>> 5) % 17) : 46 + ((variation >>> 5) % 11);

    image.className = 'kral-home-sticker';
    image.src = `/img/reactions/anki-tan/${file}`;
    image.alt = '';
    image.loading = 'lazy';
    image.decoding = 'async';
    image.setAttribute('fetchpriority', 'low');
    image.draggable = false;
    image.style.setProperty('--kral-sticker-top', slot.top);
    image.style.setProperty('--kral-sticker-x', `${slot.x}%`);
    image.style.setProperty('--kral-sticker-rotation', `${rotation}deg`);
    image.style.setProperty('--kral-sticker-size', `${size}px`);
    return image;
  };

  const removeStickerRails = () => {
    document.querySelectorAll('.kral-home-sticker-rail').forEach((rail) => rail.remove());
    document.querySelector('.kral-home-sticker-host')?.classList.remove('kral-home-sticker-host');
  };

  const isHomePagination = () => /^\/(?:page\/\d+\/?)?$/.test(location.pathname);

  const initHomeStickers = () => {
    removeStickerRails();

    const host = document.querySelector('#content-inner.layout');
    const recentPosts = host?.querySelector(':scope > #recent-posts');
    if (!isHomePagination() || !host || !recentPosts || window.innerWidth < MINIMUM_WIDTH) return;

    const isWide = window.innerWidth >= WIDE_WIDTH;
    const slots = isWide ? wideSlots : compactSlots;
    const count = isWide ? WIDE_COUNT : COMPACT_COUNT;
    const selected = selectStickers(count);
    const leftRail = createRail('left');
    const rightRail = createRail('right');

    host.classList.add('kral-home-sticker-host');

    slots.left.forEach((slot, index) => {
      leftRail.append(createSticker(selected[index], slot, index, isWide));
    });

    slots.right.forEach((slot, index) => {
      const stickerIndex = slots.left.length + index;
      rightRail.append(createSticker(selected[stickerIndex], slot, stickerIndex, isWide));
    });

    host.append(leftRail, rightRail);
  };

  let resizeFrame;
  const handleResize = () => {
    window.cancelAnimationFrame(resizeFrame);
    resizeFrame = window.requestAnimationFrame(initHomeStickers);
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initHomeStickers, { once: true });
  } else {
    initHomeStickers();
  }

  window.addEventListener('resize', handleResize, { passive: true });
  document.addEventListener('pjax:complete', initHomeStickers);
})();
