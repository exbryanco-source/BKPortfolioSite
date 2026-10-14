import { gsap } from 'gsap';
import { prefersReducedMotion } from './scroll.js';

/**
 * Horizontal strips ([data-hscroll]). Touch and trackpad swipes use native
 * overflow scrolling (Lenis lets horizontal gestures through via
 * data-lenis-prevent-horizontal); mouse and pen get click-and-drag with a
 * short inertial glide. Vertical wheel still scrolls the page.
 */
export function initHorizontalScrollers() {
  document.querySelectorAll('[data-hscroll]').forEach(dragToScroll);
}

const DRAG_THRESHOLD = 4; // px before a press becomes a drag (keeps clicks working)

function dragToScroll(el) {
  let pressed = false;
  let dragging = false;
  let startX = 0;
  let startScroll = 0;
  let lastX = 0;
  let lastT = 0;
  let velocity = 0; // px per ms
  let glide = null;

  const stopGlide = () => glide?.kill();

  el.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'touch' || e.button !== 0) return;
    stopGlide();
    pressed = true;
    dragging = false;
    startX = lastX = e.clientX;
    startScroll = el.scrollLeft;
    lastT = performance.now();
    velocity = 0;
  });

  el.addEventListener('pointermove', (e) => {
    if (!pressed) return;
    const dx = e.clientX - startX;
    if (!dragging) {
      if (Math.abs(dx) < DRAG_THRESHOLD) return;
      dragging = true;
      el.setPointerCapture(e.pointerId);
      el.classList.add('is-dragging');
    }
    el.scrollLeft = startScroll - dx;
    const now = performance.now();
    velocity = (e.clientX - lastX) / Math.max(now - lastT, 1);
    lastX = e.clientX;
    lastT = now;
  });

  const release = (e) => {
    if (!pressed) return;
    pressed = false;
    if (!dragging) return;
    el.classList.remove('is-dragging');
    if (el.hasPointerCapture(e.pointerId)) el.releasePointerCapture(e.pointerId);
    // Ignore stale velocity if the pointer paused before letting go.
    if (prefersReducedMotion || performance.now() - lastT > 80) return;
    const max = el.scrollWidth - el.clientWidth;
    const state = { x: el.scrollLeft };
    glide = gsap.to(state, {
      x: gsap.utils.clamp(0, max, el.scrollLeft - velocity * 380),
      duration: 0.9,
      ease: 'power3.out',
      onUpdate: () => (el.scrollLeft = state.x),
    });
  };
  el.addEventListener('pointerup', release);
  el.addEventListener('pointercancel', release);

  // A drag shouldn't count as a click on anything inside, nor start a native image drag.
  el.addEventListener(
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
  el.addEventListener('dragstart', (e) => e.preventDefault());
  el.addEventListener('wheel', stopGlide, { passive: true });
  el.addEventListener('touchstart', stopGlide, { passive: true });
}
