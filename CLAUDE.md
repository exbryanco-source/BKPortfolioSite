# Portfolio site

Static portfolio built with Vite + vanilla JS. Layout/structure references https://pensatori-irrazionali.com/; visual design comes from the owner's Figma file (via the Figma MCP server in `.mcp.json`).

## Stack
- **Vite** dev server / build (`npm run dev`, `npm run build`)
- **Hero** — React + TypeScript island (`src/hero/`), mounted by `main.js` into `[data-hero-root]`. `Hero.tsx` = two-column section (HTML text left ~54%, canvas right ~46% flush to the top-right corner); copy and object settings live in `src/hero/mount.tsx`. Only the hero uses React — the rest of the site stays vanilla JS.
- **React Three Fiber + drei** — `InteractiveGlassObject.tsx`: transparent canvas (`alpha`, clear alpha 0, no scene background), demand frameloop, procedural studio environment (Lightformers — lighting only), composition presets. `DiscStack.tsx`: stack of thin gradient discs receding up-right and deliberately bleeding off the canvas edge (after the owner's reference image). Geometry/vertex-colour gradients in `discs/geometry.ts`, disc specs + colours in `discs/discs.ts`, material in `discs/materials.ts`, damped-spring pointer response in `discs/interaction.ts` (no React state on pointer move). Optional `modelUrl` swaps in a .glb (each mesh becomes a layer).
- **GSAP** (ScrollTrigger, SplitText) — `src/animations.js`
- **Lenis** smooth scroll — `src/scroll.js`, driven by `gsap.ticker`
- `src/menu.js` — fullscreen hamburger overlay timeline
- `src/loader.js` — "Loading (n%)" boot screen; finishes when the hero's first WebGL frame is drawn
- `npm run typecheck` / `npm run build` run `tsc --noEmit` first

## Conventions
- Animations are opt-in via data attributes: `data-split` (word reveal on scroll), `data-reveal` (staggered lazy fade-in), `data-hero-title`, `data-hero-fade`, `data-scroll-link` (smooth in-page anchor).
- Design tokens live at the top of `src/styles.css` (`:root`), mirrored 1:1 from Figma variables (`scale/040` → `--scale-040`, `text/primary` → `--text-primary`). Figma text styles map to `.t-*` classes (`Desktop/heading/lead` → `.t-heading-lead`). When applying Figma, update tokens first, then components.
- Figma assets live in `public/assets/` (source: file `gXPm8y9DY39DrkYXWPZIdW`, node `71:16`).
- Respect `prefers-reduced-motion` (see `prefersReducedMotion` in `scroll.js`).
- Images: use `<img loading="lazy">` inside `.card__media`; they fade in on load.
