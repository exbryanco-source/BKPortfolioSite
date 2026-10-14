import { gsap } from 'gsap';
import { scrollToTarget } from './scroll.js';

/**
 * Side-panel menu: the page dims, the dark panel wipes in from the right and
 * the links slide up. The header toggle stays on top and becomes the close (X).
 */
export function initMenu(lenis) {
  const toggle = document.querySelector('[data-menu-toggle]');
  const menu = document.querySelector('[data-menu]');
  const scrim = menu.querySelector('[data-menu-scrim]');
  const panel = menu.querySelector('[data-menu-panel]');
  const links = menu.querySelectorAll('.menu__text');
  const onThisPage = (a) => new URL(a.href, location.href).pathname === location.pathname;
  // Section links only track sections on their own page; a page link (e.g.
  // Library) is current when it points at the page we're on, or at the page's
  // parent (<body data-menu-parent="/work.html"> on case studies).
  const parent = document.body.dataset.menuParent;
  const sectionLinks = [...menu.querySelectorAll('[data-menu-section]')].filter(onThisPage);
  menu.querySelectorAll('.menu__link:not([data-menu-section])').forEach((a) => {
    const isParent = parent && new URL(a.href, location.href).pathname === parent;
    if (onThisPage(a)) a.setAttribute('aria-current', 'page');
    else if (isParent) a.setAttribute('aria-current', 'true');
  });
  let isOpen = false;

  const tl = gsap
    .timeline({ paused: true, defaults: { ease: 'expo.inOut' } })
    .set(menu, { visibility: 'visible' })
    .from(scrim, { opacity: 0, duration: 0.6, ease: 'power2.out' }, 0)
    .fromTo(panel, { clipPath: 'inset(0 0 0 100%)' }, { clipPath: 'inset(0 0 0 0%)', duration: 0.8 }, 0)
    .from(links, { yPercent: 110, duration: 0.8, stagger: 0.06, ease: 'expo.out' }, '-=0.35')
    .from('[data-menu-fade]', { opacity: 0, duration: 0.4, ease: 'none' }, '-=0.5');

  tl.eventCallback('onReverseComplete', () => gsap.set(menu, { visibility: 'hidden' }));

  // Highlight the item for the section currently in view (Figma: active = on-dark primary).
  function markCurrent() {
    const probe = window.innerHeight * 0.4;
    let current = null;
    for (const link of sectionLinks) {
      const section = document.getElementById(link.dataset.menuSection);
      if (section && section.getBoundingClientRect().top <= probe) current = link;
    }
    sectionLinks.forEach((link) => link.toggleAttribute('aria-current', link === current));
    if (current) current.setAttribute('aria-current', 'location');
  }

  function setOpen(open) {
    isOpen = open;
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Close menu' : 'Menu');
    document.body.classList.toggle('menu-open', open);
    menu.inert = !open;
    if (open) {
      markCurrent();
      lenis?.stop();
      tl.timeScale(1).play();
    } else {
      lenis?.start();
      tl.timeScale(1.6).reverse();
    }
  }

  scrim.addEventListener('click', () => setOpen(false));
  toggle.addEventListener('click', () => setOpen(!isOpen));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isOpen) {
      setOpen(false);
      toggle.focus();
    }
  });

  // [data-scroll-link]: smooth-scroll when the target is on this page
  // ("#work", or "/#work" while on "/"); otherwise navigate normally, so the
  // shared nav partial works from any page.
  document.querySelectorAll('[data-scroll-link]').forEach((a) => {
    a.addEventListener('click', (e) => {
      const url = new URL(a.href, location.href);
      const target = url.pathname === location.pathname && url.hash && document.querySelector(url.hash);
      if (!target) {
        if (isOpen) setOpen(false);
        return;
      }
      e.preventDefault();
      if (isOpen) {
        setOpen(false);
        setTimeout(() => scrollToTarget(lenis, url.hash), 400);
      } else {
        scrollToTarget(lenis, url.hash);
      }
    });
  });
}
