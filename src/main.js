import './styles.css';
import { initSmoothScroll } from './scroll.js';
import { initMenu } from './menu.js';
import { createLoader } from './loader.js';
import { playHeroIntro, initScrollText, initReveals, initTicker } from './animations.js';

const lenis = initSmoothScroll();
initMenu(lenis);

const loader = createLoader();

// Three.js is loaded lazily so the page shell paints before the 3D bundle arrives.
const sceneReady = import('./scene.js')
  .then(({ initScene }) =>
    initScene(document.querySelector('[data-webgl]'), {
      onProgress: (p) => loader.setProgress(p * 0.9),
    })
  )
  .catch((err) => console.error('WebGL scene failed:', err));

Promise.all([sceneReady, document.fonts.ready]).then(async () => {
  await loader.finish();
  playHeroIntro();
  initScrollText();
  initReveals();
  initTicker();
});
