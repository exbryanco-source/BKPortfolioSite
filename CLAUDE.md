# Portfolio site

Static portfolio (Superpills / Bryan Khua) built with Vite + vanilla JS, with one React island for the 3D hero. Layout/structure references https://pensatori-irrazionali.com/; visual design comes from the owner's Figma file (Figma MCP server in `.mcp.json`):
- Desktop frame: file `gXPm8y9DY39DrkYXWPZIdW`, node `71:16`
- Mobile frame: same file, node `84:657` (390 wide)

The landing page (`index.html`), Work page (`work.html`, Figma `95:2886` / mobile `95:3063`), Library page (`library.html`, Figma `240:715` / mobile `240:834`), About page (`about.html`, Figma `240:544` / mobile `240:631`) and the case studies — Send.App (`send-app.html`, Figma `166:3048` / mobile `166:3214`), PIL (`pil.html`, Figma `174:3432` / mobile `176:1445`), Spotify (`spotify.html`, Figma `174:4113` / mobile `187:1216`), Bandlab (`bandlab.html`, Figma `184:4528` / mobile `194:563`), EDB (`edb.html`, Figma `201:92` / mobile `201:462`) and CompareSing (`comparesing.html`, Figma `211:955` / mobile `228:1134`) — are complete for desktop + mobile, plus a `404.html` (no Figma frame). Live at **https://www.bryankhua.com** on Vercel (the bare domain 308-redirects to www, so `SITE_URL` in `vite.config.ts` uses www). Remote: `origin` → github.com/exbryanco-source/BKPortfolioSite.

## Commands
- `npm run dev` — dev server
- `npm run build` — `tsc --noEmit` then `vite build` (every root `*.html` is a page)
- `npm run typecheck`
- `npm run optimize` — regenerate responsive media (`scripts/optimize-media.mjs`, sharp + ffmpeg-static) after adding or replacing any image/GIF; idempotent, outputs are committed
- `node scripts/make-brand-assets.mjs` — regenerate the favicon set + `og-image.png` (from `public/assets/footer-logo.svg` and `scripts/og-image.html`)
- `npm run lighthouse -- <label>` — Lighthouse every page (mobile + desktop) against `vite preview` on :4173 → `reports/lighthouse-<label>.md`

## Project structure
```
index.html                 Landing page — page-specific sections + @include partials
vite.config.ts             html-partials + responsive-media plugins, multi-page input (all root *.html)
vite/seo-head.ts           Per-page canonical / Open Graph / Twitter / icon tags from each page's <title> + description; emits sitemap.xml (SITE_URL in vite.config.ts)
vite/responsive-media.ts   Rewrites /assets rasters in the HTML to public/opt variants (<picture> AVIF/WebP, GIF → <video>)
vercel.json                Cache headers (hashed js/css/fonts immutable; media 1 week)
scripts/                   optimize-media.mjs, lighthouse.mjs, make-brand-assets.mjs + og-image.html
404.html                   Not-found page (noindex; Vercel serves it for unknown routes); styles pages/404.css
public/                    robots.txt, favicon.ico/.svg, apple-touch-icon, icon-192/512, site.webmanifest, og-image.png
reports/                   Lighthouse results (before / after)
src/
  pages/home.js            Landing entry: calls bootPage(), mounts 3D hero (styles are <link>ed in the HTML)
  pages/work.js            Work entry: bootPage() (the carousel is wired by boot)
  pages/library.js         Library entry: initArchive() then bootPage()
  pages/about.js           About entry: bootPage()
  pages/send-app.js        Send.App case study entry: bootPage()
  pages/pil.js             PIL case study entry: bootPage()
  pages/spotify.js         Spotify case study entry: bootPage()
  pages/bandlab.js         Bandlab case study entry: bootPage()
  pages/edb.js             EDB case study entry: bootPage()
  pages/404.js             404 entry: bootPage()
  pages/comparesing.js     CompareSing case study entry: bootPage()
  core/                    Shared runtime — every page uses these via bootPage()
    boot.js                bootPage({ load }): scroll, menu, strips, clock, loader, animations
    scroll.js              Lenis smooth scroll (starts stopped; boot.js starts it after the loader)
    menu.js                Fullscreen menu timeline + [data-scroll-link] handling
    loader.js              "Loading (n%)" boot screen (skipped on pages without the loader partial)
    transition.js          Frame out/in between Work and project pages ([data-transition-link], body.is-framing)
    animations.js          GSAP data-attribute animations (split text, reveals, ticker, hero intro)
    hscroll.js             [data-hscroll] horizontal strips (drag + native swipe; [data-hscroll-snap] glides onto items)
    carousel.js            [data-carousel] snap carousel: marker dots, ←/→, one wheel gesture = one slide
    clock.js               [data-clock] live Singapore time
    media.js               video[data-autoplay] clips (ex-GIFs): load + play in view, pause offscreen, never under reduced motion
    archive.js             [data-archive] endless horizontal pan (library page)
  partials/                Shared markup, inlined at build time
    loader.html  page-transition.html  header.html (header + menu overlay)  contact-card.html  footer.html
  styles/
    index.css              Shared bundle (imports everything below except pages/)
    tokens.css             Figma variables (desktop + --m-* mobile) + layout tokens
    base.css               Reset, element defaults, Lenis, lazy-image fade, reduced motion
    typography.css         .t-* text styles (Figma "Desktop/…" styles)
    utilities.css          .section, .divider, .only-mobile / .only-desktop, .visually-hidden
    components/            buttons, loader, page-transition, header, menu, marquee, hscroll, tag, feature, case-study, contact-card, footer
    pages/home.css         Landing-only sections (hero, client list, services, showreel)
    pages/work.css         Work-only (fixed screen, project cards, marker rail, base line)
    pages/library.css      Library-only (fixed screen, archive grid, base line)
    pages/about.css        About-only (intro, biography, details columns)
    pages/send-app.css     Send.App-only: Send's looser mobile spacing (credits included) + proportions
    pages/pil.css          PIL-only: next-project accent, mobile 2-column strip + image proportions
    pages/spotify.css      Spotify-only: next-project accent, mobile hero/type tweaks
    pages/bandlab.css      Bandlab-only: next-project accent, mobile hero/type + video-caption tweaks
    pages/edb.css          EDB-only: next-project accent, lead-sized context title, 3-column motion grid, mobile tweaks
    pages/comparesing.css  CompareSing-only: 4-column strip, next-project accent, mobile stacked strip + type tweaks
  hero/                    Landing-only React + R3F island (see "3D hero")
public/assets/             Figma-exported originals (the source of truth); *-m.svg = mobile-cropped variants. Rasters are not deployed — the build drops every original listed in src/media-manifest.json
public/opt/                Generated by `npm run optimize`: <name>-<w>.avif|webp + fallback jpg/png, GIF → .webm/.mp4/-poster.jpg
  work/                    Work page card images (Send.App reuses product-02.jpg)
  library/                 library-01…30 archive tiles (row-major; 21–24 are animated GIFs)
  about/                   portrait.png (same export for desktop + mobile)
  send-app/                Case-study images (hero, strip-01…13, bleed, context-01…05, next-pil; *-m = mobile crops)
  pil/                     Case-study images (hero, strip-01…13 — 01 is an animated GIF, bleed, context-01/03, next-spotify; *-m = mobile)
  spotify/                 Case-study images (hero, bleed, context-01, gallery-01…04, square-01…04, next-bandlab; the .gif ones have *-m.jpg stills for mobile)
  bandlab/                 Case-study images (hero, context-01, square-01…04, gallery-01/02, next-edb; the .gif ones have *-m.png stills for mobile)
  edb/                     Case-study images (hero, bleed-01/02, context-01, gallery-01…03, square-01…04, motion-01…09, next-comparesing = work/work-comparesing.jpg; the GIFs are used on mobile too)
  comparesing/             Case-study images (strip-01…10, bleed, context-01, gallery-01…06; hero = work/work-comparesing.jpg, next = product-02.jpg; same files on mobile)
```

## Landing page structure (`index.html`, top → bottom)
1. **Loader** (partial) + **page-transition frame** (partial, for the client-list links) → **Header + menu** (partial): logo, 40×40 menu toggle; menu = dimmed page + 440px dark side panel (Figma `101:3677`). The header toggle stays on top as the panel's close (X); the item for the section in view gets `aria-current` (cream), others grey. "Work" links to `/work.html` (featured work page), "Library" to `/library.html` (project archive page) and "About" to `/about.html` from both the menu and the footer. Page links in the menu (no `data-menu-section`) get `aria-current="page"` on their own page; section links only track sections on their own page.
2. **Hero** `[data-hero-root]` — React; text left, disc stack right (mobile: stack behind text).
3. **Selected client work** `#work` — marquee band, client list (`a.brand-card[data-transition-link]` ×6, each linking to its case study), marquee band.
4. **Services** — `.service` ×3 (Branding / Product / Motion): number, copy, "Learn more", project strip.
5. **Skillset** `#about` — h2 + Vimeo showreel embed + metadata.
6. **Contact card** `#contact` (partial) → **Footer** (partial).

## Work page (`work.html`)
One fixed screen (`.work`, 100svh, no page scroll): header partial, `.work__featured` (gallery + marker rail) and `.work__base` (clock + ©; not the footer partial). The gallery is a `.thumbs[data-hscroll][data-hscroll-snap][data-carousel-track]` of 6 `.project-card` articles (900×500 desktop / 300×500 mobile, image + scrim + title/divider/details; a card with a case study wraps its title in `a.project-card__link`, whose `::after` covers the card — drags don't click through), inset from both screen edges by `--gutter` (track `padding-inline` + `scroll-padding-inline`); cards give up height first on short viewports. `.work__rail` has one `button.work__dot[data-carousel-dot]` per card (filled = in view). Drag, swipe, dots, ←/→ on the focused gallery and vertical wheel all move it. All six cards link to their case studies. To add a project, add a `.project-card` and a matching dot.

## Library page (`library.html`)
One fixed screen (`.library`, 100svh, no page scroll): header partial, `.archive[data-archive]` filling the space between header and base line, and `.library__base` (clock + ©; not the footer partial). The archive is a 10 × 3 grid (`[data-archive-set]`, 240×129 tiles, 40px gap) inside `[data-archive-rail]`; `core/archive.js` clones the set to cover the viewport and wraps the rail's x offset modulo one set, so it pans endlessly. Drag (mouse/pen/touch), wheel on either axis and ←/→ pan it, with eased motion and release momentum (none under reduced motion). Tiles are not links yet. To add a tile, add a `.card__media` to the set and adjust `grid-template-columns` in `pages/library.css`.

## About page (`about.html`)
Normal scrolling page: header partial, `.about-intro` (eyebrow `.t-label-eyebrow` + h1 with `data-hero-title`/`data-hero-fade` intro), `.bio` (round portrait + lead/body copy; grid keeps Figma's 420 : 900 split), `.details` (canvas band, three equal columns — Services / Notable Clients / Awards & Mentions, each `.t-label-section` h2 + list; one column on mobile), then the contact-card and footer partials. The landing page's `#about` (showreel) section still exists but nav no longer points at it.

## Case study pages (`send-app.html`, `pil.html`, `spotify.html`, `bandlab.html`, `edb.html`, `comparesing.html`)
The shared template — `.utility-row` and every `.case-*` section below — lives in `components/case-study.css` (part of `index.css`). It also holds the shared mobile spacing (section `padding-block` 48, context/outcomes gap 40, inner gaps 24, mobile bleed 390/212 and context image 342/126), which PIL and Spotify use as-is. Each page's `pages/<project>.css` holds only the sections it alone uses and whatever differs from that baseline in its Figma frames (e.g. the hero ratio; Send.App's looser 64/32 spacing). New case studies should start from the shared values and override only real differences. The next-project band's colour comes from `--case-next-bg` (default `--accent-blue`; PIL sets `--accent-red`, Spotify `--accent-primary`, Bandlab `--accent-orange`, EDB `--accent-yellow`, CompareSing `--accent-orange`).

Normal scrolling page with `<body class="is-framing" data-menu-parent="/work.html">` (the menu marks "Work" as current).

**No boot loader.** Project pages include `page-transition.html` instead of `loader.html` and start with `body.is-framing`, so the dark frame (`components/page-transition.css`) covers the page from first paint. `bootPage()` sees there's no `[data-loader]` and runs `frameIn()` (frame wipes up and off; the hero intro starts while it lifts). Links into a project page carry `data-transition-link` (the Work card link, the landing page's client-list cards, the case study's next-project link): `core/transition.js` wipes the frame up over the current page, then navigates. The Work and landing pages include the frame partial too (they keep their loader). New-tab clicks, drags (`hscroll.js` cancels the click) and reduced motion skip the animation; a bfcache restore resets the frame.

Sections, top → bottom:
1. `.case-hero` — project image (`data-hero-fade`, not lazy).
2. `.case-premise` — label + `ul.tags > li.tag`, h1 (`data-hero-title`) with the description bottom-right.
3. `.case-strip` — no side gutter; `.thumbs[data-hscroll]` laid out as a 6-column grid (2880px, 240px rows) that drags sideways; `.case-strip__item--wide` spans two columns. On mobile it becomes a vertical stack (wide items = short 342×88 bands). Items are in the grid's row-major order so both layouts share one DOM order.
4. `.case-bleed` — full-bleed image.
5. `.case-context` — `.utility-row` (label + meta), h2 + challenge copy, divider, image, lead/body columns, image gallery.
6. `.case-video` — the shared `.feature` block with a Vimeo embed, kept at 16:9 (Figma's 1360 × 650 / 342 × 380 frames would letterbox it).
7. `.case-outcomes` — `.impact` ×3 (metric, h4, note), ruled.
8. `.case-credits` — two role lists + role note.
9. `.case-next` — `--accent-blue` band; title + image are one link to the next case study.
Then the contact-card and footer partials. Image boxes use `aspect-ratio` from Figma and `flex: none` (`.card__media`'s 600px flex-basis would otherwise set their height in column layouts). Section 8 is on Send.App and CompareSing (Send.App overrides its tighter mobile lists); section 6 is on Send.App and Bandlab (Bandlab's sits right after the premise); PIL has two impact statements (the outcomes grid makes one equal column per item) and, on mobile, a 2-column strip (`--wide` items span both columns, `grid-auto-flow: dense` matches Figma's order). A `.case-context__gallery--campaign` gallery (Spotify, Bandlab) has 1360 × 800 wide visuals and a 2 × 2 `.case-context__grid` of `--square` items (one column on mobile); Spotify puts the grid last, Bandlab first. Spotify has no strip (premise goes straight to the bleed); Bandlab has no strip or bleed. EDB has no strip or video, two bleeds in a row, a lead-sized context title, and a campaign gallery (wide, 2 × 2 squares, wide, `.case-context__grid--motion` 3-column grid of 9 tiles, wide). CompareSing's strip is a 4-column grid (1907px, 3 rows; stacked on mobile like Send.App's), it has no video, a plain 6-image context gallery, and its next project loops back to Send.App.

To add another case study: copy `pil.html` (keep `is-framing` + the frame partial, no loader), keep only the sections it uses, add `pages/<project>.css` with its `--case-next-bg` and only the mobile values that differ from the shared baseline, point the previous case study's `.case-next__link` at it, and add a `.project-card__link[data-transition-link]` to its Work card.

## Shared components (reuse these on new pages)
| Component | Markup / source | Styles |
|---|---|---|
| Loader | `<!-- @include loader.html -->` | `components/loader.css` |
| Header + menu overlay | `<!-- @include header.html -->` | `components/header.css`, `menu.css` |
| Contact card | `<!-- @include contact-card.html -->` | `components/contact-card.css` |
| Footer | `<!-- @include footer.html -->` | `components/footer.css` |
| Marquee band | `.marquee > .divider + .marquee__viewport > .marquee__track[data-ticker] > span + .divider` (one span = the whole sentence, cloned for the loop; the band is cap-height tall, with the dividers behind the text on its cap line and baseline) | `components/marquee.css` |
| Image strip | `.thumbs[data-hscroll][data-lenis-prevent-horizontal] > .card__media > img[loading=lazy]` | `components/hscroll.css` |
| Tag pill | `ul.tags > li.tag.t-caption-tag` | `components/tag.css` |
| Featured video | `.feature > .feature__media > iframe` + `.feature__meta` | `components/feature.css` |
| Snap carousel | `[data-carousel]` > `.thumbs[data-carousel-track][data-hscroll][data-hscroll-snap]` (CSS `scroll-snap-type`) + `[data-carousel-dot]` buttons | `core/carousel.js`; styles per page |
| Case-study sections | `.case-hero` / `.case-premise` / `.case-strip` / `.case-bleed` / `.case-context` / `.case-outcomes` / `.case-next` + `.utility-row` (see `pil.html`) | `components/case-study.css` |
| Icon button | `button.control` (40×40) | `components/buttons.css` |
| Arrow link | `.arrow-link` + `.t-*` children ("Learn more ↗", "Contact →", "Back to top ↑") | `components/buttons.css` |
| Section spacing | `.section` (side gutter) + `padding-block` from tokens | `utilities.css`, `tokens.css` |
| Divider | `.divider` | `utilities.css` |

### Adding a page
Replace `<page>` with the new page's name (check the root first — `index`, `work`, `library`, `about`, `send-app`, `pil`, `spotify`, `bandlab`, `edb`, `comparesing` and `404` are taken).
1. Create `<page>.html` in the project root (it is picked up by the build automatically). In `<head>`, give it a unique `<title>` and `<meta name="description">` (the seo-head plugin derives canonical, Open Graph, Twitter and icon tags from them and adds the page to `sitemap.xml` — don't hand-write those; add `<meta name="robots" content="noindex">` to keep a page out) and link the styles: `<link rel="stylesheet" href="/src/styles/index.css" />` and `<link rel="stylesheet" href="/src/styles/pages/<page>.css" />` — never import CSS from the JS entry (in dev, Vite injects JS-imported CSS only after the module runs, so the raw HTML flashes before the loader is styled). Include the partials, give `<main id="top">`, and add `<script type="module" src="/src/pages/<page>.js">`.
2. `src/pages/<page>.js`: `import { bootPage } from '../core/boot.js'; bootPage();` — pass `{ load: (loader) => promise }` if the page has async setup the loader should wait for.
3. Put page-only styles in `src/styles/pages/<page>.css`; promote anything reused to `components/`.

## Conventions
- **Tokens first.** `tokens.css` mirrors Figma variables 1:1 (`scale/040` → `--scale-040`, `text/primary` → `--text-primary`). When applying Figma, update tokens first, then components. Desktop text styles are `.t-*` classes (`Desktop/heading/lead` → `.t-heading-lead`); mobile text styles are font-shorthand tokens (`Mobile/heading/h1` → `font: var(--m-heading-h1)`).
- **Layout tokens:** `--gutter` (40 desktop / 24 mobile) for all side padding; `--space-section-lg` (160/96) and `--space-section-md` (96/64) for section rhythm. Components set `padding-block` only; side padding comes from `.section` (or `var(--gutter)` for fixed chrome).
- **Breakpoints:** mobile is `max-width: 720px` everywhere (CSS, `<picture>` sources, `src/hero`); tablet tweaks at `max-width: 1100px` are not in Figma. Each component file keeps its own mobile rules next to its desktop rules.
- **Breakpoint-specific content:** copy that differs between Figma frames uses `.only-desktop` / `.only-mobile`; mobile-cropped artwork (`*-m.svg`) is swapped with `<picture><source media="(max-width: 720px)">`.
- **Animations are opt-in data attributes:** `data-split` (word reveal on scroll), `data-reveal` (staggered fade-in), `data-hero-title` / `data-hero-fade` (intro after loader), `data-ticker` (looping marquee), `data-hscroll` (strip), `data-carousel` (snap carousel), `data-clock`. All run from `bootPage()` and no-op when absent. The split reveals mask each line (`.split-line-mask`); `base.css` extends that clip 0.25em downwards so Inter's descenders aren't cut at our 1.1 heading line-height — keep the reveal's start offset (`yPercent: 125`) below it.
- **Links:** `[data-scroll-link]` smooth-scrolls only when the target is on the current page; shared nav uses `/#section` so it works from any page. "Back to top" uses `#top` — every page needs `<main id="top">`.
- **Scrolling:** Lenis is locked while the loader shows and started by `bootPage()`. Horizontal scrollers need `data-lenis-prevent-horizontal` or Lenis swallows trackpad swipes.
- **Hover + focus:** every link and button needs a hover state. Shared ones: `.control` greys, `.arrow-link` nudges its arrow (last child) the way it points, footer / menu-social / inline text links underline, the header logo dims (`components/buttons.css`, `header.css`). Keyboard focus is one site-wide ring in `base.css` (`:focus-visible`, 2px `--action-indicator`, light on the dark menu); only add a page-specific ring when that one can't show (e.g. Work's card, whose link is clipped).
- **Menu is modal:** while it's open, `core/menu.js` makes everything but the menu and the toggle `inert`, so Tab cycles inside it.
- Respect `prefers-reduced-motion` (`prefersReducedMotion` in `core/scroll.js`): no smooth scroll, no split/reveal/ticker, no page-transition wipe, no loader count/wipe, the menu opens/closes instantly, autoplay clips stay on their poster, minimal 3D motion (no float, damped pointer response). `base.css` disables CSS transitions with `transition: none` — never `transition-duration: 0.01ms` on `*`, which gives every element a transition and breaks GSAP's inline styles.
- **Accessibility:** `header.html` starts with a skip link (first Tab stop → `#top`). SplitText runs with `aria: 'none'` (its default puts a prohibited `aria-label` on `<p>` titles). Decorative-but-meaningful motion text gets real copy too: each marquee has its sentence in a `p.visually-hidden`. Focusable scrollers are `role="region"` with an `aria-label`. Repeated link text gets a visually-hidden suffix ("Learn more about branding").
- **Images:** author plain `<img src="/assets/…" loading="lazy">` (original path) inside `.card__media`, always with `width`/`height`; they fade in on load. Then run `npm run optimize`: the responsive-media plugin swaps in `<picture>` (AVIF/WebP srcset, `sizes` from the slot class via `SLOT_SIZES`, else full width) and turns GIFs into autoplaying `<video>`s. The first non-lazy image on a page gets `fetchpriority="high"`. A new slot size → add it to `SLOT_SIZES` in `vite/responsive-media.ts`.
- **Fonts:** Inter is self-hosted via `@fontsource/inter` (imported in `styles/index.css`); don't add Google Fonts links.

## 3D hero (landing only, `src/hero/`)
- React + TypeScript island mounted by `pages/home.js` into `[data-hero-root]`. `Hero.tsx` renders the hero section (text + canvas); copy and object settings live in `mount.tsx`.
- `InteractiveGlassObject.tsx`: transparent R3F canvas (`alpha`, clear alpha 0, no scene background), demand frameloop, procedural studio environment (Lightformers — lighting only), desktop/mobile composition presets.
- `DiscStack.tsx`: thin gradient discs receding up-right and deliberately bleeding off the canvas edge (after the owner's reference image). Geometry + vertex-colour gradients `discs/geometry.ts`, disc specs + colours `discs/discs.ts`, material `discs/materials.ts`, damped-spring pointer response `discs/interaction.ts` (no React state on pointer move). Optional `modelUrl` swaps in a .glb.
- Loader waits for the first WebGL frame (6s timeout); WebGL failure falls back to text only.
