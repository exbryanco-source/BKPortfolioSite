import { bootPage } from '../core/boot.js';

// Landing page. The hero (text + interactive disc stack) is a React island;
// it and Three.js load lazily so the page shell paints before the 3D bundle.
bootPage({
  load: (loader) =>
    import('../hero/mount.tsx').then(({ mountHero }) => {
      loader.setProgress(0.6);
      return mountHero(document.querySelector('[data-hero-root]'));
    }),
});
