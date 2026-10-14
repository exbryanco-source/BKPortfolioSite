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
 */
export function initArchive(root = document.querySelector('[data-archive]')) {
  if (!root) return;
  const rail = root.querySelector('[data-archive-rail]');
  const set = rail.querySelector('[data-archive-set]');

  const LERP = 0.08; // matches Lenis in core/scroll.js
  const DRAG_THRESHOLD = 4; // px before a press becomes a drag
  const KEY_STEP = 280; // one tile + gap

  let period = 0; // width of one set incl. the gap to the next
  let target = 0;
  let current = 0;

  function layout() {
    const gap = parseFloat(getComputedStyle(rail).columnGap) || 0;
    period = set.offsetWidth + gap;
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
    if (e.key === 'ArrowRight') target -= KEY_STEP;
    else if (e.key === 'ArrowLeft') target += KEY_STEP;
    else return;
    e.preventDefault();
  });

  layout();
  new ResizeObserver(layout).observe(root);
  gsap.ticker.add(render);
}
