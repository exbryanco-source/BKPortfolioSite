import { inject as injectAnalytics } from '@vercel/analytics';
import { injectSpeedInsights } from '@vercel/speed-insights';
import { initSmoothScroll } from './scroll.js';
import { initMenu } from './menu.js';
import { createLoader } from './loader.js';
import { initHorizontalScrollers } from './hscroll.js';
import { initCarousels } from './carousel.js';
import { initClock } from './clock.js';
import { initAutoplayVideos } from './media.js';
import { initCursorPreviews } from './cursor-preview.js';
import { initPageTransitions, frameIn } from './transition.js';
import { playHeroIntro, initScrollText, initReveals, initTicker } from './animations.js';

/**
 * Shared page bootstrap. Every page entry (src/pages/*.js) calls this once.
 *
 * Wires the shared chrome (smooth scroll, menu, horizontal strips, carousels, clock, autoplay clips),
 * shows the boot loader until `load(loader)` and the fonts are ready, then
 * unlocks scrolling and starts the data-attribute animations. Project pages
 * have no loader partial: they start under the transition frame (body.is-framing)
 * and frame in instead.
 *
 * @param {object} [options]
 * @param {(loader: ReturnType<typeof createLoader>) => Promise<unknown>} [options.load]
 *   Page-specific work to finish before the loader exits (e.g. mounting a 3D
 *   hero). May call `loader.setProgress(0–1)`; `loader` is null on pages without one.
 */
export function bootPage({ load } = {}) {
  injectAnalytics(); // Vercel Web Analytics page views (production only; dev logs to the console)
  injectSpeedInsights(); // Vercel Speed Insights (real-user Core Web Vitals)
  const lenis = initSmoothScroll();
  initMenu(lenis);
  initHorizontalScrollers();
  initCarousels();
  initClock();
  initAutoplayVideos();
  initPageTransitions();

  const loader = document.querySelector('[data-loader]') ? createLoader() : null;
  const pageReady = Promise.resolve(load?.(loader)).catch((err) => console.error('Page load step failed:', err));

  return Promise.all([pageReady, document.fonts.ready]).then(async () => {
    await (loader ? loader.finish() : frameIn());
    lenis?.start(); // scroll.js keeps Lenis locked while the loader (or frame) is up
    playHeroIntro();
    initScrollText();
    initReveals();
    initTicker();
    initCursorPreviews(); // after the loader, so its images don't compete with the hero
    return { lenis };
  });
}
