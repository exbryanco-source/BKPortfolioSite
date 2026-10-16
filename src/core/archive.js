import { gsap } from 'gsap';
import { prefersReducedMotion } from './scroll.js';

/**
 * Endless horizontal archive ([data-archive], library page).
 *
 * The tile grid ([data-archive-set]) is repeated inside a rail until it covers
 * the viewport plus one extra copy; the rail's x offset wraps modulo one set
 * (grid width + gap), so panning in either direction never runs out.
 * Drag (mouse, pen, touch), wheel (vertical or horizontal) and ←/→ all pan it;
 * movement eases towards a target, and a drag release keeps its momentum.
 *
 * Intro: the tiles start hidden (.is-pending); `ready(loader)` holds the boot
 * loader until the first screen's media are decoded, then `reveal()` wipes
 * those tiles open column by column, left to right.
 */
export function initArchive(root = document.querySelector('[data-archive]')) {
  if (!root) return;
  const rail = root.querySelector('[data-archive-rail]');
  const set = rail.querySelector('[data-archive-set]');
  if (!prefersReducedMotion) root.classList.add('is-pending');

  const LERP = 0.08; // matches Lenis in core/scroll.js
  const DRAG_THRESHOLD = 4; // px before a press becomes a drag
  let keyStep = 280; // one tile + gap (tiles shrink on short screens)
  let period = 0; // width of one set incl. the gap to the next
  let target = 0;
  let current = 0;

  function layout() {
    const gap = parseFloat(getComputedStyle(rail).columnGap) || 0;
    period = set.offsetWidth + gap;
    keyStep = (set.firstElementChild?.offsetWidth || 240) + gap;
    const needed = Math.ceil(root.clientWidth / period) + 1;
    const sets = rail.querySelectorAll('[data-archive-set]');
    for (let i = sets.length; i <= needed; i++) rail.append(cloneSet());
    for (let i = sets.length - 1; i > needed; i--) sets[i].remove();
  }

  function cloneSet() {
    const copy = set.cloneNode(true);
    copy.setAttribute('aria-hidden', 'true');
    // Copies are decorative duplicates; keep the lazy fade-in (base.css) working on them.
    copy.querySelectorAll('img').forEach((img) => {
      img.alt = '';
      const show = () => img.classList.add('is-loaded');
      img.complete ? show() : img.addEventListener('load', show, { once: true });
    });
    return copy;
  }

  const wrap = (x) => (period ? gsap.utils.wrap(-period, 0, x) : 0);

  function render() {
    current = prefersReducedMotion ? target : current + (target - current) * LERP;
    if (Math.abs(target - current) < 0.01) current = target;
    // Keep both values small without a visible jump: shift them together.
    if (period && (current > 0 || current <= -period)) {
      const shift = wrap(current) - current;
      current += shift;
      target += shift;
      startTarget += shift; // keeps an in-progress drag continuous
    }
    rail.style.transform = `translate3d(${current}px, 0, 0)`;
  }

  // Drag — pointer events cover mouse, pen and touch (touch-action: none in CSS).
  let pressed = false;
  let dragging = false;
  let startX = 0;
  let startTarget = 0;
  let lastX = 0;
  let lastT = 0;
  let velocity = 0; // px per ms

  root.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    pressed = true;
    dragging = false;
    startX = lastX = e.clientX;
    startTarget = target;
    lastT = performance.now();
    velocity = 0;
  });

  root.addEventListener('pointermove', (e) => {
    if (!pressed) return;
    const dx = e.clientX - startX;
    if (!dragging) {
      if (Math.abs(dx) < DRAG_THRESHOLD) return;
      dragging = true;
      root.setPointerCapture(e.pointerId);
      root.classList.add('is-dragging');
    }
    target = startTarget + dx;
    current = target; // follow the finger 1:1 while held
    const now = performance.now();
    velocity = (e.clientX - lastX) / Math.max(now - lastT, 1);
    lastX = e.clientX;
    lastT = now;
  });

  const release = (e) => {
    if (!pressed) return;
    pressed = false;
    if (!dragging) return;
    root.classList.remove('is-dragging');
    if (root.hasPointerCapture(e.pointerId)) root.releasePointerCapture(e.pointerId);
    // Momentum, unless the pointer paused before letting go.
    if (!prefersReducedMotion && performance.now() - lastT < 80) target += velocity * 380;
  };
  root.addEventListener('pointerup', release);
  root.addEventListener('pointercancel', release);

  root.addEventListener(
    'click',
    (e) => {
      if (dragging) {
        e.preventDefault();
        e.stopPropagation();
        dragging = false;
      }
    },
    true
  );
  root.addEventListener('dragstart', (e) => e.preventDefault());

  // Wheel / trackpad: whichever axis moved more pans the rail.
  root.addEventListener(
    'wheel',
    (e) => {
      e.preventDefault();
      const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      target -= delta * (e.deltaMode === 1 ? 32 : 1);
    },
    { passive: false }
  );

  root.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') target -= keyStep;
    else if (e.key === 'ArrowLeft') target += keyStep;
    else return;
    e.preventDefault();
  });

  layout();
  new ResizeObserver(layout).observe(root);
  gsap.ticker.add(render);

  return { ready: (loader) => ready(root, loader), reveal: () => reveal(root) };
}

const READY_TIMEOUT = 5000; // never hold the loader longer than this

/** Tiles currently inside the archive's box (first set + visible clones). */
function visibleTiles(root) {
  const box = root.getBoundingClientRect();
  return [...root.querySelectorAll('.card__media')].filter((tile) => {
    const r = tile.getBoundingClientRect();
    return r.right > box.left && r.left < box.right && r.bottom > box.top && r.top < box.bottom;
  });
}

/** Resolves once every visible tile's image (or video poster) is decoded, feeding the loader's %. */
function ready(root, loader) {
  const jobs = visibleTiles(root).map((tile) => {
    const media = tile.querySelector('img, video');
    if (media?.tagName === 'VIDEO') {
      if (!media.poster) return Promise.resolve();
      const poster = new Image();
      poster.src = media.poster;
      return poster.decode();
    }
    return media ? media.decode() : Promise.resolve();
  });
  let done = 0;
  const all = Promise.all(
    jobs.map((job) =>
      job.catch(() => {}).then(() => loader?.setProgress(++done / jobs.length))
    )
  );
  return Promise.race([all, new Promise((resolve) => setTimeout(resolve, READY_TIMEOUT))]);
}

/** Wipe + fade the visible tiles in, left to right; everything else just shows. */
function reveal(root) {
  if (!root.classList.contains('is-pending')) return;
  const box = root.getBoundingClientRect();
  const tiles = visibleTiles(root).map((tile) => ({ tile, rect: tile.getBoundingClientRect() }));
  const rows = [...new Set(tiles.map(({ rect }) => Math.round(rect.top)))].sort((a, b) => a - b);

  gsap.set(tiles.map(({ tile }) => tile), { opacity: 0, clipPath: 'inset(0% 100% 0% 0%)' });
  root.classList.remove('is-pending');
  tiles.forEach(({ tile, rect }) => {
    tile.querySelector('img')?.classList.add('is-loaded'); // decoded by ready(); skip the per-image fade
    gsap.to(tile, {
      opacity: 1,
      clipPath: 'inset(0% 0% 0% 0%)',
      duration: 0.9,
      ease: 'expo.out',
      delay: ((rect.left - box.left) / box.width) * 0.7 + rows.indexOf(Math.round(rect.top)) * 0.05,
      clearProps: 'opacity,clipPath',
    });
  });
}
