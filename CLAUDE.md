# Portfolio site

Static portfolio built with Vite + vanilla JS. Layout/structure references https://pensatori-irrazionali.com/; visual design comes from the owner's Figma file (via the Figma MCP server in `.mcp.json`).

## Stack
- **Vite** dev server / build (`npm run dev`, `npm run build`)
- **Three.js** — `src/scene.js`: fixed fullscreen canvas, loads `public/models/hero.glb` (Draco supported), plays baked clips via `AnimationMixer`, scroll-driven + pointer-parallax motion. Falls back to a placeholder mesh if the model is missing. Lazy-imported from `main.js`.
- **GSAP** (ScrollTrigger, SplitText) — `src/animations.js`
- **Lenis** smooth scroll — `src/scroll.js`, driven by `gsap.ticker`
- `src/menu.js` — fullscreen hamburger overlay timeline
- `src/loader.js` — "Loading (n%)" boot screen fed by GLTF progress

## Conventions
- Animations are opt-in via data attributes: `data-split` (word reveal on scroll), `data-reveal` (staggered lazy fade-in), `data-hero-title`, `data-hero-fade`, `data-scroll-link` (smooth in-page anchor).
- Design tokens live at the top of `src/styles.css` (`:root`). When applying Figma, update tokens first, then components.
- Respect `prefers-reduced-motion` (see `prefersReducedMotion` in `scroll.js`).
- Images: use `<img loading="lazy">` inside `.card__media`; they fade in on load.
