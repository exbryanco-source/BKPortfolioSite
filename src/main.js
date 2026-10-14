import './styles.css';
import { initSmoothScroll } from './scroll.js';
import { initMenu } from './menu.js';
import { createLoader } from './loader.js';
import { playHeroIntro, initScrollText, initReveals, initTicker } from './animations.js';

const lenis = initSmoothScroll();
initMenu(lenis);

const loader = createLoader();

// Hero (text + interactive glass object) is a React island. It and Three.js
// are loaded lazily so the page shell paints before the 3D bundle arrives.
const heroReady = import('./hero/mount.tsx')
  .then(({ mountHero }) => {
    loader.setProgress(0.6);
    return mountHero(document.querySelector('[data-hero-root]'));
  })
  .catch((err) => console.error('Hero failed to mount:', err));

Promise.all([heroReady, document.fonts.ready]).then(async () => {
  await loader.finish();
  playHeroIntro();
  initScrollText();
  initReveals();
  initTicker();
});

// Footer clock in Singapore time
const clock = document.querySelector('[data-clock]');
if (clock) {
  const fmt = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Singapore', hour: '2-digit', minute: '2-digit' });
  const tick = () => (clock.textContent = fmt.format(new Date()));
  tick();
  setInterval(tick, 30_000);
}
