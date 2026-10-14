import Lenis from 'lenis';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Smooth (inertia) scrolling via Lenis, driven by GSAP's ticker so
 * ScrollTrigger animations stay in sync with the eased scroll position.
 */
export function initSmoothScroll() {
  if (prefersReducedMotion) return null;

  const lenis = new Lenis({ lerp: 0.08, wheelMultiplier: 1 });
  lenis.stop(); // locked until the loader finishes

  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((time) => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);

  return lenis;
}

export function scrollToTarget(lenis, target) {
  if (lenis) lenis.scrollTo(target, { duration: 1.4 });
  else document.querySelector(target)?.scrollIntoView();
}
