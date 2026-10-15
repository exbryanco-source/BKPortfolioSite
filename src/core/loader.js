import { gsap } from 'gsap';
import { prefersReducedMotion } from './scroll.js';

/** "Loading (0%)" boot screen. Progress is fed by the GLTF loader. */
export function createLoader() {
  const el = document.querySelector('[data-loader]');
  const countEl = el.querySelector('[data-loader-count]');
  const state = { value: 0 };

  const render = () => (countEl.textContent = Math.round(state.value));
  const tweenTo = (value, duration = 0.4) =>
    gsap.to(state, { value, duration, ease: 'power2.out', onUpdate: render, overwrite: true });

  return {
    setProgress(p) {
      tweenTo(Math.min(p, 1) * 100);
    },
    finish() {
      if (prefersReducedMotion) {
        el.remove();
        document.body.classList.remove('is-loading');
        return Promise.resolve();
      }
      return new Promise((resolve) => {
        gsap
          .timeline({
            onComplete: () => {
              el.remove();
              document.body.classList.remove('is-loading');
              resolve();
            },
          })
          .add(tweenTo(100, 0.6))
          .to(el, { clipPath: 'inset(0 0 100% 0)', duration: 1, ease: 'expo.inOut' }, '+=0.2');
      });
    },
  };
}
