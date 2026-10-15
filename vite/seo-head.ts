import { readFileSync } from 'node:fs';
import { basename } from 'node:path';
import type { Plugin } from 'vite';

/**
 * Head tags every page needs, generated from the page's own <title> and
 * <meta name="description"> so they can't drift: canonical URL, Open Graph,
 * Twitter card, the favicon set, theme colour and web manifest. Pages marked
 * <meta name="robots" content="noindex"> (the 404) get no canonical/og:url and
 * are left out of the sitemap, which is emitted on build from the page list.
 */

const SHARE_IMAGE = { path: '/og-image.png', width: 1200, height: 630, alt: 'Superpills — Bryan Khua, Creative Director at the intersection of Brand & Product' };
const SITE_NAME = 'Superpills';
const THEME = '#fcfcf8';

const pathFor = (file: string) => (file === 'index.html' ? '/' : `/${file}`);
const noindex = (html: string) => /<meta\s+name="robots"\s+content="[^"]*noindex/.test(html);

export function seoHead(siteUrl: string, root: string, pageFiles: string[]): Plugin {
  const site = siteUrl.replace(/\/$/, '');

  return {
    name: 'seo-head',
    transformIndexHtml(html, ctx) {
      const file = basename(ctx.filename);
      const title = html.match(/<title>([^<]*)<\/title>/)?.[1] ?? SITE_NAME;
      const description = html.match(/<meta\s+name="description"\s+content="([^"]*)"/)?.[1] ?? '';
      const url = site + pathFor(file);
      const image = site + SHARE_IMAGE.path;
      const meta = (attr: 'name' | 'property', key: string, value: string | number) => `<meta ${attr}="${key}" content="${value}" />`;
      const index = !noindex(html);

      const tags = [
        index && `<link rel="canonical" href="${url}" />`,
        '<link rel="icon" href="/favicon.ico" sizes="32x32" />',
        '<link rel="icon" href="/favicon.svg" type="image/svg+xml" />',
        '<link rel="apple-touch-icon" href="/apple-touch-icon.png" />',
        '<link rel="manifest" href="/site.webmanifest" />',
        meta('name', 'theme-color', THEME),
        meta('property', 'og:type', 'website'),
        meta('property', 'og:site_name', SITE_NAME),
        meta('property', 'og:title', title),
        meta('property', 'og:description', description),
        index && meta('property', 'og:url', url),
        meta('property', 'og:image', image),
        meta('property', 'og:image:width', SHARE_IMAGE.width),
        meta('property', 'og:image:height', SHARE_IMAGE.height),
        meta('property', 'og:image:alt', SHARE_IMAGE.alt.replace(/&/g, '&amp;')),
        meta('name', 'twitter:card', 'summary_large_image'),
        meta('name', 'twitter:title', title),
        meta('name', 'twitter:description', description),
        meta('name', 'twitter:image', image),
      ].filter(Boolean);

      return html.replace('</head>', `    ${tags.join('\n    ')}\n  </head>`);
    },
    generateBundle() {
      const urls = pageFiles
        .filter((f) => !noindex(readFileSync(root + f, 'utf8')))
        .map((f) => `  <url><loc>${site}${pathFor(f)}</loc></url>`);
      this.emitFile({
        type: 'asset',
        fileName: 'sitemap.xml',
        source: `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`,
      });
    },
  };
}
