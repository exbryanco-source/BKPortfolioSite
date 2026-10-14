import { gsap } from 'gsap';
import { scrollToTarget } from './scroll.js';

/** Fullscreen hamburger menu with a GSAP open/close timeline. */
export function initMenu(lenis) {
  const toggle = document.querySelector('[data-menu-toggle]');
  const menu = document.querySelector('[data-menu]');
  const links = menu.querySelectorAll('.menu__text');
  let isOpen = false;

  const tl = gsap
    .timeline({ paused: true, defaults: { ease: 'expo.inOut' } })
    .set(menu, { visibility: 'visible' })
    .fromTo(menu, { clipPath: 'inset(0 0 100% 0)' }, { clipPath: 'inset(0 0 0% 0)', duration: 0.9 })
    .from(links, { yPercent: 110, duration: 0.8, stagger: 0.06, ease: 'expo.out' }, '-=0.35')
    .from('[data-menu-fade]', { opacity: 0, duration: 0.4, ease: 'none' }, '-=0.5');

  tl.eventCallback('onReverseComplete', () => gsap.set(menu, { visibility: 'hidden' }));

  function setOpen(open) {
    isOpen = open;
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Close menu' : 'Menu');
    document.body.classList.toggle('menu-open', open);
    menu.inert = !open;
    if (open) {
      lenis?.stop();
      tl.timeScale(1).play();
    } else {
      lenis?.start();
      tl.timeScale(1.6).reverse();
    }
  }

  toggle.addEventListener('click', () => setOpen(!isOpen));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isOpen) {
      setOpen(false);
      toggle.focus();
    }
  });

  // Smooth-scroll for every in-page link (menu, logo, back to top)
  document.querySelectorAll('[data-scroll-link]').forEach((a) => {
    a.addEventListener('click', (e) => {
      e.preventDefault();
      const target = a.getAttribute('href');
      if (isOpen) {
        setOpen(false);
        setTimeout(() => scrollToTarget(lenis, target), 400);
      } else {
        scrollToTarget(lenis, target);
      }
    });
  });
}
