import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import { prefersReducedMotion } from './scroll.js';

gsap.registerPlugin(ScrollTrigger, SplitText);

/** Hero: masked line-by-line headline reveal after the loader exits. */
export function playHeroIntro() {
  if (prefersReducedMotion) return;

  SplitText.create('[data-hero-title]', {
    type: 'lines',
    mask: 'lines',
    autoSplit: true, // re-splits on resize / font swap
    onSplit: (self) =>
      gsap.from(self.lines, { yPercent: 110, duration: 1.3, stagger: 0.12, ease: 'expo.out' }),
  });

  gsap.from('[data-hero-fade]', { opacity: 0, y: 20, duration: 1, stagger: 0.1, delay: 0.5, ease: 'power3.out' });
}

/** Any [data-split] element: words slide up when it enters the viewport. */
export function initScrollText() {
  if (prefersReducedMotion) return;

  document.querySelectorAll('[data-split]').forEach((el) => {
    SplitText.create(el, {
      type: 'lines,words',
      mask: 'lines',
      autoSplit: true,
      onSplit: (self) =>
        gsap.from(self.words, {
          yPercent: 110,
          duration: 1,
          stagger: 0.04,
          ease: 'expo.out',
          scrollTrigger: { trigger: el, start: 'top 85%', once: true },
        }),
    });
  });
}

/**
 * Lazy-load scroll reveal: [data-reveal] elements fade/slide in with a
 * staggered delay as they enter the viewport, batched per scroll frame.
 * Images inside use native loading="lazy" and fade in once decoded.
 */
export function initReveals() {
  document.querySelectorAll('img[loading="lazy"]').forEach((img) => {
    const show = () => img.classList.add('is-loaded');
    img.complete ? show() : img.addEventListener('load', show, { once: true });
  });

  if (prefersReducedMotion) return;

  gsap.set('[data-reveal]', { opacity: 0, y: 60 });
  ScrollTrigger.batch('[data-reveal]', {
    start: 'top 90%',
    once: true,
    onEnter: (batch) =>
      gsap.to(batch, { opacity: 1, y: 0, duration: 1.1, stagger: 0.15, ease: 'power3.out' }),
  });
}

/** Infinite horizontal text ticker that speeds up with scroll velocity. */
export function initTicker() {
  const track = document.querySelector('[data-ticker]');
  if (!track || prefersReducedMotion) return;

  const loop = gsap.to(track, { xPercent: -50, duration: 20, ease: 'none', repeat: -1 });

  ScrollTrigger.create({
    onUpdate: (self) => {
      const boost = 1 + Math.min(Math.abs(self.getVelocity()) / 400, 4);
      gsap.to(loop, { timeScale: boost, duration: 0.2, overwrite: true });
      gsap.to(loop, { timeScale: 1, duration: 1, delay: 0.2 });
    },
  });
}
