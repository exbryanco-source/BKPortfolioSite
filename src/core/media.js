import { prefersReducedMotion } from './scroll.js';

/**
 * Looping clips that replaced the GIFs (video[data-autoplay], written by the
 * responsive-media plugin). They start with preload="none": each one loads and
 * plays only while it's on screen and pauses when it leaves. Under reduced
 * motion they never play — the poster frame stays.
 */
export function initAutoplayVideos() {
  if (prefersReducedMotion || !('IntersectionObserver' in window)) return;

  const io = new IntersectionObserver(
    (entries) =>
      entries.forEach(({ target, isIntersecting }) => {
        if (isIntersecting) target.play().catch(() => {}); // autoplay can be refused (e.g. low-power mode)
        else target.pause();
      }),
    { rootMargin: '200px 0px' }
  );
  const watch = (root) => root.querySelectorAll?.('video[data-autoplay]').forEach((v) => io.observe(v));

  watch(document);
  // The library archive clones its tile set on resize; pick up new clips too.
  new MutationObserver((records) =>
    records.forEach((r) => r.addedNodes.forEach((n) => (n.matches?.('video[data-autoplay]') ? io.observe(n) : watch(n))))
  ).observe(document.body, { childList: true, subtree: true });
}
