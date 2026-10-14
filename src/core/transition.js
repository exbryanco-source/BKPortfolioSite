import { gsap } from 'gsap';
import { prefersReducedMotion } from './scroll.js';

/**
 * Frame transition between the Work page and project pages
 * (partials/page-transition.html). Frame out: following a [data-transition-link]
 * wipes the dark frame up over the page, then navigates. Frame in: a project
 * page (body.is-framing, no boot loader) starts covered and the frame wipes up
 * and off once it's ready.
 */
const frame = () => document.querySelector('[data-transition]');

export function initPageTransitions() {
  if (!frame()) return;

  document.addEventListener('click', (e) => {
    const link = e.target.closest('a[data-transition-link]');
    // A dragged strip cancels its click (core/hscroll.js); new-tab clicks behave normally.
    if (!link || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    if (link.target && link.target !== '_self') return;
    e.preventDefault();
    frameOut(link.href);
  });

  // Back/forward restores a page from the bfcache as it was left: covered by the frame.
  window.addEventListener('pageshow', (e) => {
    if (e.persisted) gsap.set(frame(), { clipPath: 'inset(100% 0 0 0)' });
  });
}

function frameOut(href) {
  if (prefersReducedMotion) return location.assign(href);
  gsap.fromTo(
    frame(),
    { clipPath: 'inset(100% 0 0 0)' },
    { clipPath: 'inset(0% 0 0 0)', duration: 0.8, ease: 'expo.inOut', onComplete: () => location.assign(href) }
  );
}

/** Uncover a project page. Resolves when the page is visible. */
export function frameIn() {
  const el = frame();
  const done = () => document.body.classList.remove('is-framing');
  if (!el || prefersReducedMotion) {
    done();
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    gsap
      .timeline({ onComplete: () => gsap.set(el, { clearProps: 'clipPath' }) }) // back to hidden-below for the next frame out
      .fromTo(el, { clipPath: 'inset(0 0 0% 0)' }, { clipPath: 'inset(0 0 100% 0)', duration: 1, ease: 'expo.inOut' })
      // Hand over while the frame is still lifting so the hero intro overlaps it
      // (the tween's inline clip-path outranks the class being removed).
      .call(() => (done(), resolve()), null, 0.6);
  });
}
