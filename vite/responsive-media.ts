import { existsSync, readFileSync, rmSync } from 'node:fs';
import type { Plugin } from 'vite';

/**
 * Rewrites /assets/… rasters in the HTML to the responsive variants that
 * `npm run optimize` (scripts/optimize-media.mjs) writes to public/opt/:
 *
 *   <img src="/assets/x.jpg">  → <picture data-rm> AVIF + WebP srcsets + <img src="/opt/x-1920.jpg"></picture>
 *   <picture><source media=…>  → each source gets typed AVIF/WebP variants
 *   <img src="/assets/x.gif">  → <video data-autoplay muted loop playsinline> (webm + mp4, poster),
 *                                played in view by core/media.js
 *
 * Pages keep authoring plain <img> tags with the original paths; media
 * without a manifest entry are left alone. `sizes` comes from the slot's
 * class (SLOT_SIZES), else DEFAULT_SIZES. On build, the originals the
 * manifest replaced are removed from dist/ (they're never referenced).
 */

type Img = { w: number; h: number; widths: number[]; fallback: string };
type Vid = { w: number; h: number; video: true; webm: string; mp4: string; posterAvif: string; posterJpg: string };
type Manifest = Record<string, Img | Vid>;

const DEFAULT_SIZES = '(max-width: 720px) 100vw, min(100vw, 1440px)';
// First match wins: class on the image's wrapper (or on the img itself)
const SLOT_SIZES: [RegExp, string][] = [
  [/case-strip__item--wide/, '(max-width: 720px) 100vw, 940px'],
  [/case-strip__item/, '(max-width: 720px) 100vw, 480px'],
  [/case-context__media--square/, '(max-width: 720px) 100vw, 680px'],
  [/case-context__media--motion/, '(max-width: 720px) 100vw, 440px'],
  [/project-card__image/, '(max-width: 720px) 300px, 900px'],
  [/bio__portrait/, '(max-width: 720px) 100vw, 420px'],
  [/archive-tile/, '240px'],
  [/^card__media$/, '(max-width: 720px) 280px, 600px'], // landing service strips
];

const attr = (tag: string, name: string) => tag.match(new RegExp(`\\s${name}="([^"]*)"`))?.[1];
const without = (tag: string, ...names: string[]) =>
  names.reduce((t, n) => t.replace(new RegExp(`\\s${n}(="[^"]*")?(?=[\\s/>])`), ''), tag);
const srcset = (m: Img, fmt: string) => {
  const base = m.fallback.replace(/-\d+\.\w+$/, '');
  return m.widths.map((w) => `${base}-${w}.${fmt} ${w}w`).join(', ');
};

/** Class list of the nearest opening tag before `pos` that isn't a source/img. */
function slotClass(html: string, pos: number, page: string): string {
  if (page.endsWith('library.html')) return 'archive-tile';
  const before = html.slice(Math.max(0, pos - 600), pos);
  const tags = [...before.matchAll(/<(?!\/|source|img)([a-z]+)\b[^>]*>/g)];
  return tags.length ? attr(tags.at(-1)![0], 'class') ?? '' : '';
}
const sizesFor = (cls: string, imgCls = '') =>
  SLOT_SIZES.find(([re]) => re.test(imgCls) || re.test(cls))?.[1] ?? DEFAULT_SIZES;

function videoTag(img: string, m: Vid): string {
  const keep = without(img, 'src', 'srcset', 'sizes', 'loading', 'alt', 'decoding', 'fetchpriority')
    .replace(/^<img/, '')
    .replace(/\s*\/?>$/, '');
  const alt = attr(img, 'alt');
  const label = alt ? ` aria-label="${alt}"` : ' aria-hidden="true"';
  return `<video${keep} data-autoplay muted loop playsinline preload="none" poster="${m.posterJpg}"${label}><source src="${m.webm}" type="video/webm" /><source src="${m.mp4}" type="video/mp4" /></video>`;
}

export function responsiveMedia(root: string): Plugin {
  const manifestPath = `${root}src/media-manifest.json`;
  const load = (): Manifest => (existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, 'utf8')) : {});
  let outDir = `${root}dist`;

  function transform(html: string, page: string): string {
    const media = load();
    let firstEager = true;
    const img = (tag: string, sizes: string) => {
      const src = attr(tag, 'src')!;
      const m = media[src] as Img;
      let out = tag.replace(`src="${src}"`, `src="${m.fallback}"`);
      if (firstEager && !attr(tag, 'loading')) {
        out = out.replace(/^<img/, '<img fetchpriority="high"'); // the page's LCP image
        firstEager = false;
      }
      return { out, sources: ['avif', 'webp'].map((f) => `<source type="image/${f}" srcset="${srcset(m, f)}" sizes="${sizes}" />`).join('') };
    };

    // 1. Authored <picture> blocks (mobile crops / GIF with a mobile still)
    html = html.replace(/<picture\b([^>]*)>([\s\S]*?)<\/picture>/g, (block, pAttrs: string, inner: string, pos: number) => {
      const imgTag = inner.match(/<img\b[^>]*>/)?.[0];
      const src = imgTag && attr(imgTag, 'src');
      if (!imgTag || !src || !media[src]) return block;
      const m = media[src];
      if ('video' in m) return `<div${pAttrs}>${videoTag(imgTag, m)}</div>`; // still frames become the poster
      const sizes = sizesFor(attr(`<p${pAttrs}>`, 'class') ?? slotClass(html, pos, page), attr(imgTag, 'class'));
      const typed = inner.replace(/<source\b[^>]*>/g, (s) => {
        const sm = media[attr(s, 'srcset') ?? ''] as Img | undefined;
        if (!sm || 'video' in sm) return s;
        const rest = without(s, 'srcset', 'type').replace(/^<source/, '').replace(/\s*\/?>$/, '');
        return ['avif', 'webp'].map((f) => `<source${rest} type="image/${f}" srcset="${srcset(sm, f)}" sizes="${sizes}" />`).join('');
      });
      const { out, sources } = img(imgTag, sizes);
      return `<picture${pAttrs}>${typed.replace(imgTag, sources + out)}</picture>`;
    });

    // 2. Plain <img> tags outside a <picture>
    return html.replace(/<img\b[^>]*>/g, (tag, pos: number) => {
      const src = attr(tag, 'src');
      if (!src || !media[src] || html.lastIndexOf('<picture', pos) > html.lastIndexOf('</picture>', pos)) return tag;
      const m = media[src];
      if ('video' in m) return videoTag(tag, m);
      const { out, sources } = img(tag, sizesFor(slotClass(html, pos, page), attr(tag, 'class')));
      return `<picture data-rm>${sources}${out}</picture>`;
    });
  }

  return {
    name: 'responsive-media',
    configResolved(c) {
      outDir = c.build.outDir.startsWith('/') ? c.build.outDir : `${root}${c.build.outDir}`;
    },
    transformIndexHtml: { order: 'pre', handler: (html, ctx) => transform(html, ctx.filename) },
    closeBundle() {
      for (const original of Object.keys(load())) rmSync(`${outDir}${original}`, { force: true });
    },
  };
}
