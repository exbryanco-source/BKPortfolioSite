# Portfolio site

Static portfolio (Superpills / Bryan Khua) built with Vite + vanilla JS, with one React island for the 3D hero. Layout/structure references https://pensatori-irrazionali.com/; visual design comes from the owner's Figma file (Figma MCP server in `.mcp.json`):
- Desktop frame: file `gXPm8y9DY39DrkYXWPZIdW`, node `71:16`
- Mobile frame: same file, node `84:657` (390 wide)

The landing page (`index.html`) and Library page (`library.html`, Figma `240:715` / mobile `240:834`) are complete for desktop + mobile. Remote: `origin` → github.com/exbryanco-source/BKPortfolioSite.

## Commands
- `npm run dev` — dev server
- `npm run build` — `tsc --noEmit` then `vite build` (every root `*.html` is a page)
- `npm run typecheck`

## Project structure
```
index.html                 Landing page — page-specific sections + @include partials
vite.config.ts             html-partials plugin + multi-page input (all root *.html)
src/
  pages/home.js            Landing entry: calls bootPage(), mounts 3D hero (styles are <link>ed in the HTML)
  pages/library.js         Library entry: initArchive() then bootPage()
  core/                    Shared runtime — every page uses these via bootPage()
    boot.js                bootPage({ load }): scroll, menu, strips, clock, loader, animations
    scroll.js              Lenis smooth scroll (starts stopped; boot.js starts it after the loader)
    menu.js                Fullscreen menu timeline + [data-scroll-link] handling
    loader.js              "Loading (n%)" boot screen
    animations.js          GSAP data-attribute animations (split text, reveals, ticker, hero intro)
    hscroll.js             [data-hscroll] horizontal strips (drag + native swipe)
    clock.js               [data-clock] live Singapore time
    archive.js             [data-archive] endless horizontal pan (library page)
  partials/                Shared markup, inlined at build time
    loader.html  header.html (header + menu overlay)  contact-card.html  footer.html
  styles/
    index.css              Shared bundle (imports everything below except pages/)
    tokens.css             Figma variables (desktop + --m-* mobile) + layout tokens
    base.css               Reset, element defaults, Lenis, lazy-image fade, reduced motion
    typography.css         .t-* text styles (Figma "Desktop/…" styles)
    utilities.css          .section, .divider, .only-mobile / .only-desktop
    components/            buttons, loader, header, menu, marquee, hscroll, contact-card, footer
    pages/home.css         Landing-only sections (hero, client list, services, showreel)
    pages/library.css      Library-only (fixed screen, archive grid, base line)
  hero/                    Landing-only React + R3F island (see "3D hero")
public/assets/             Figma-exported images; *-m.svg = mobile-cropped variants
  library/                 library-01…30 archive tiles (row-major; 21–24 are animated GIFs)
```

## Landing page structure (`index.html`, top → bottom)
1. **Loader** (partial) → **Header + menu** (partial): logo, 40×40 menu toggle; menu = dimmed page + 440px dark side panel (Figma `101:3677`). The header toggle stays on top as the panel's close (X); the item for the section in view gets `aria-current` (cream), others grey. "Library" links to `/library.html` (project archive page) from both the menu and the footer. Page links in the menu (no `data-menu-section`) get `aria-current="page"` on their own page; section links only track sections on their own page.
2. **Hero** `[data-hero-root]` — React; text left, disc stack right (mobile: stack behind text).
3. **Selected client work** `#work` — marquee band, client list (`.brand-card` ×6), marquee band.
4. **Services** — `.service` ×3 (Branding / Product / Motion): number, copy, "Learn more", project strip.
5. **Skillset** `#about` — h2 + Vimeo showreel embed + metadata.
6. **Contact card** `#contact` (partial) → **Footer** (partial).

## Library page (`library.html`)
One fixed screen (`.library`, 100svh, no page scroll): header partial, `.archive[data-archive]` filling the space between header and base line, and `.library__base` (clock + ©; not the footer partial). The archive is a 10 × 3 grid (`[data-archive-set]`, 240×129 tiles, 40px gap) inside `[data-archive-rail]`; `core/archive.js` clones the set to cover the viewport and wraps the rail's x offset modulo one set, so it pans endlessly. Drag (mouse/pen/touch), wheel on either axis and ←/→ pan it, with eased motion and release momentum (none under reduced motion). Tiles are not links yet. To add a tile, add a `.card__media` to the set and adjust `grid-template-columns` in `pages/library.css`.

## Shared components (reuse these on new pages)
| Component | Markup / source | Styles |
|---|---|---|
| Loader | `<!-- @include loader.html -->` | `components/loader.css` |
| Header + menu overlay | `<!-- @include header.html -->` | `components/header.css`, `menu.css` |
| Contact card | `<!-- @include contact-card.html -->` | `components/contact-card.css` |
| Footer | `<!-- @include footer.html -->` | `components/footer.css` |
| Marquee band | `.marquee > .divider + .marquee__viewport > .marquee__track[data-ticker] > span… + .divider` | `components/marquee.css` |
| Image strip | `.thumbs[data-hscroll][data-lenis-prevent-horizontal] > .card__media > img[loading=lazy]` | `components/hscroll.css` |
| Icon button | `button.control` (40×40) | `components/buttons.css` |
| Arrow link | `.arrow-link` + `.t-*` children ("Learn more ↗", "Contact →", "Back to top ↑") | `components/buttons.css` |
| Section spacing | `.section` (side gutter) + `padding-block` from tokens | `utilities.css`, `tokens.css` |
| Divider | `.divider` | `utilities.css` |

### Adding a page
1. Create `about.html` in the project root (it is picked up by the build automatically). In `<head>`, link the styles: `<link rel="stylesheet" href="/src/styles/index.css" />` and `<link rel="stylesheet" href="/src/styles/pages/about.css" />` — never import CSS from the JS entry (in dev, Vite injects JS-imported CSS only after the module runs, so the raw HTML flashes before the loader is styled). Include the partials, give `<main id="top">`, and add `<script type="module" src="/src/pages/about.js">`.
2. `src/pages/about.js`: `import { bootPage } from '../core/boot.js'; bootPage();` — pass `{ load: (loader) => promise }` if the page has async setup the loader should wait for.
3. Put page-only styles in `src/styles/pages/about.css`; promote anything reused to `components/`.

## Conventions
- **Tokens first.** `tokens.css` mirrors Figma variables 1:1 (`scale/040` → `--scale-040`, `text/primary` → `--text-primary`). When applying Figma, update tokens first, then components. Desktop text styles are `.t-*` classes (`Desktop/heading/lead` → `.t-heading-lead`); mobile text styles are font-shorthand tokens (`Mobile/heading/h1` → `font: var(--m-heading-h1)`).
- **Layout tokens:** `--gutter` (40 desktop / 24 mobile) for all side padding; `--space-section-lg` (160/96) and `--space-section-md` (96/64) for section rhythm. Components set `padding-block` only; side padding comes from `.section` (or `var(--gutter)` for fixed chrome).
- **Breakpoints:** mobile is `max-width: 720px` everywhere (CSS, `<picture>` sources, `src/hero`); tablet tweaks at `max-width: 1100px` are not in Figma. Each component file keeps its own mobile rules next to its desktop rules.
- **Breakpoint-specific content:** copy that differs between Figma frames uses `.only-desktop` / `.only-mobile`; mobile-cropped artwork (`*-m.svg`) is swapped with `<picture><source media="(max-width: 720px)">`.
- **Animations are opt-in data attributes:** `data-split` (word reveal on scroll), `data-reveal` (staggered fade-in), `data-hero-title` / `data-hero-fade` (intro after loader), `data-ticker` (looping marquee), `data-hscroll` (strip), `data-clock`. All run from `bootPage()` and no-op when absent.
- **Links:** `[data-scroll-link]` smooth-scrolls only when the target is on the current page; shared nav uses `/#section` so it works from any page. "Back to top" uses `#top` — every page needs `<main id="top">`.
- **Scrolling:** Lenis is locked while the loader shows and started by `bootPage()`. Horizontal scrollers need `data-lenis-prevent-horizontal` or Lenis swallows trackpad swipes.
- Respect `prefers-reduced-motion` (`prefersReducedMotion` in `core/scroll.js`): no smooth scroll, no split/reveal/ticker, minimal 3D motion.
- Images: `<img loading="lazy">` inside `.card__media`; they fade in on load. Always include `width`/`height`.

## 3D hero (landing only, `src/hero/`)
- React + TypeScript island mounted by `pages/home.js` into `[data-hero-root]`. `Hero.tsx` renders the hero section (text + canvas); copy and object settings live in `mount.tsx`.
- `InteractiveGlassObject.tsx`: transparent R3F canvas (`alpha`, clear alpha 0, no scene background), demand frameloop, procedural studio environment (Lightformers — lighting only), desktop/mobile composition presets.
- `DiscStack.tsx`: thin gradient discs receding up-right and deliberately bleeding off the canvas edge (after the owner's reference image). Geometry + vertex-colour gradients `discs/geometry.ts`, disc specs + colours `discs/discs.ts`, material `discs/materials.ts`, damped-spring pointer response `discs/interaction.ts` (no React state on pointer move). Optional `modelUrl` swaps in a .glb.
- Loader waits for the first WebGL frame (6s timeout); WebGL failure falls back to text only.
