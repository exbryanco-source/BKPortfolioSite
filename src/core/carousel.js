import { prefersReducedMotion } from './scroll.js';

/**
 * Snap carousels ([data-carousel]): a [data-carousel-track] strip (also
 * [data-hscroll][data-hscroll-snap] for drag) plus one [data-carousel-dot]
 * button per slide. The dot for the slide in view gets aria-current; dots,
 * ←/→ on the focused track and one vertical wheel gesture each move a slide.
 */
export function initCarousels() {
  document.querySelectorAll('[data-carousel]').forEach(carousel);
}

const WHEEL_IDLE = 200; // ms without wheel events before the next gesture can step

function carousel(root) {
  const track = root.querySelector('[data-carousel-track]');
  const slides = [...track.children];
  const dots = [...root.querySelectorAll('[data-carousel-dot]')];
  let active = -1;

  // Scroll position that shows each slide (the last ones share the max scroll).
  const positions = () => {
    const max = track.scrollWidth - track.clientWidth;
    return slides.map((s) => Math.min(s.offsetLeft - slides[0].offsetLeft, max));
  };

  function update() {
    const x = track.scrollLeft;
    const p = positions();
    // `<=` so a later slide wins a tie at the max scroll (the last slide reads as active).
    const i = p.reduce((best, pos, j) => (Math.abs(pos - x) <= Math.abs(p[best] - x) ? j : best), 0);
    if (i === active) return;
    active = i;
    dots.forEach((d, j) => (j === i ? d.setAttribute('aria-current', 'true') : d.removeAttribute('aria-current')));
  }

  function goTo(i) {
    const j = Math.max(0, Math.min(slides.length - 1, i));
    track.scrollTo({ left: positions()[j], behavior: prefersReducedMotion ? 'auto' : 'smooth' });
  }

  dots.forEach((d, j) => d.addEventListener('click', () => goTo(j)));

  track.addEventListener('keydown', (e) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    e.preventDefault();
    goTo(active + (e.key === 'ArrowRight' ? 1 : -1));
  });

  // Vertical wheel / trackpad: one gesture = one slide. Horizontal swipes
  // scroll the track natively (and snap).
  let wheelLocked = false;
  let wheelIdle = 0;
  root.addEventListener(
    'wheel',
    (e) => {
      if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
      e.preventDefault();
      clearTimeout(wheelIdle);
      wheelIdle = setTimeout(() => (wheelLocked = false), WHEEL_IDLE);
      if (wheelLocked || Math.abs(e.deltaY) < 4) return;
      wheelLocked = true;
      goTo(active + Math.sign(e.deltaY));
    },
    { passive: false }
  );

  track.addEventListener('scroll', update, { passive: true });
  window.addEventListener('resize', update);
  update();
}
