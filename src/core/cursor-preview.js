import { gsap } from 'gsap';
import { prefersReducedMotion } from './scroll.js';

/**
 * [data-cursor-preview] lists: a small project thumbnail trails the cursor
 * while a card is hovered (after monks.com's "On our minds"). The list holds
 * one .cursor-preview with an image per card ([data-preview] on both sides);
 * moving between cards crossfades the image, leaving the list hides it.
 *
 * Fine pointers only, never under reduced motion. The preview stays
 * display:none (so its lazy images don't load) until the list nears the viewport.
 */
export function initCursorPreviews() {
  if (prefersReducedMotion || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  document.querySelectorAll('[data-cursor-preview]').forEach(initCursorPreview);
}

function initCursorPreview(list) {
  const preview = list.querySelector('.cursor-preview');
  if (!preview) return;
  const images = new Map([...preview.querySelectorAll('[data-preview]')].map((img) => [img.dataset.preview, img]));

  const arm = new IntersectionObserver(
    ([entry]) => {
      if (!entry.isIntersecting) return;
      preview.classList.add('is-armed');
      arm.disconnect();
    },
    { rootMargin: '50% 0px' },
  );
  arm.observe(list);

  // Bottom-left corner at the cursor; the CSS margin opens the gap up and to the right
  gsap.set(preview, { yPercent: -100, transformOrigin: '0% 100%', autoAlpha: 0, scale: 0.85 });
  const moveX = gsap.quickTo(preview, 'x', { duration: 0.6, ease: 'power3' });
  const moveY = gsap.quickTo(preview, 'y', { duration: 0.6, ease: 'power3' });
  const tilt = gsap.quickTo(preview, 'rotation', { duration: 0.5, ease: 'power3' });

  let visible = false;
  let current = null;
  let lastX = 0;
  let settle;

  const show = (key, x, y) => {
    if (key !== current) {
      images.forEach((img, k) => gsap.to(img, { opacity: k === key ? 1 : 0, duration: 0.3, overwrite: true }));
      current = key;
    }
    if (visible) return;
    visible = true;
    // Start under the cursor instead of flying in from the last spot
    gsap.set(preview, { x, y, rotation: 0 });
    moveX(x, x);
    moveY(y, y);
    lastX = x;
    gsap.to(preview, { autoAlpha: 1, scale: 1, duration: 0.4, ease: 'power3.out', overwrite: 'auto' });
  };

  const hide = (instant = false) => {
    if (!visible) return;
    visible = false;
    gsap.to(preview, { autoAlpha: 0, scale: 0.85, duration: instant ? 0 : 0.3, ease: 'power3.out', overwrite: 'auto' });
  };

  list.querySelectorAll('a[data-preview]').forEach((card) => {
    card.addEventListener('pointerenter', (e) => {
      if (e.pointerType === 'mouse' || e.pointerType === 'pen') show(card.dataset.preview, e.clientX, e.clientY);
    });
    card.addEventListener('click', () => hide(true)); // the page-transition frame takes over
  });

  list.addEventListener('pointermove', (e) => {
    if (!visible) return;
    moveX(e.clientX);
    moveY(e.clientY);
    // Lean into horizontal movement, then settle upright
    tilt(gsap.utils.clamp(-6, 6, (e.clientX - lastX) * 0.4));
    lastX = e.clientX;
    clearTimeout(settle);
    settle = setTimeout(() => tilt(0), 80);
  });

  list.addEventListener('pointerleave', () => hide());
  // A bfcache restore comes back mid-click: start hidden again
  window.addEventListener('pageshow', (e) => e.persisted && hide(true));
}
