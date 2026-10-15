import { readFileSync, readdirSync } from 'node:fs';

const PLACEHOLDER = /\{\{([A-Z0-9_]+)\}\}/g;
const placeholders = (text: string) => [...new Set([...text.matchAll(PLACEHOLDER)].map((m) => m[1]))];
import { fileURLToPath } from 'node:url';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { responsiveMedia } from './vite/responsive-media';
import { seoHead } from './vite/seo-head';

// Production origin — canonical URLs, Open Graph, sitemap.xml (override with SITE_URL=…).
// www is the primary host on Vercel (the bare domain 308-redirects to it), so
// every absolute URL uses it — a canonical or og:image that redirects is a weak signal.
const SITE_URL = process.env.SITE_URL ?? 'https://www.bryankhua.com';

const root = fileURLToPath(new URL('.', import.meta.url));
const partialsDir = `${root}src/partials/`;

/**
 * Inlines shared markup into every page: `<!-- @include footer.html -->`
 * is replaced by src/partials/footer.html (nested includes work too).
 * Pages stay static HTML — no runtime templating.
 */
function htmlPartials(): Plugin {
  const include = (html: string, depth = 0): string =>
    html.replace(/<!--\s*@include\s+([\w./-]+)\s*-->/g, (_, file: string) => {
      if (depth > 5) throw new Error(`[html-partials] include depth exceeded at ${file}`);
      return include(readFileSync(partialsDir + file, 'utf8').trimEnd(), depth + 1);
    });

  let isBuild = false;
  return {
    name: 'html-partials',
    transformIndexHtml: {
      order: 'pre',
      handler: (html, ctx) => {
        // A page scaffolded from templates/case-study/ must have every {{PLACEHOLDER}}
        // filled before it ships (dev still renders, so pages can be filled in place).
        const left = placeholders(html);
        if (left.length && !ctx.server) throw new Error(`[html-partials] ${ctx.filename} still has placeholders: ${left.join(', ')}`);
        return include(html);
      },
    },
    // …and so must its page stylesheet (an unfilled value would just be invalid CSS)
    buildStart() {
      if (!isBuild) return;
      for (const f of readdirSync(`${root}src/styles/pages`)) {
        const left = placeholders(readFileSync(`${root}src/styles/pages/${f}`, 'utf8'));
        if (left.length) throw new Error(`[html-partials] src/styles/pages/${f} still has placeholders: ${left.join(', ')}`);
      }
    },
    configResolved(c) {
      isBuild = c.command === 'build';
    },
    handleHotUpdate({ file, server }) {
      if (file.startsWith(partialsDir)) server.ws.send({ type: 'full-reload' });
    },
  };
}

// Every .html file in the project root is a page (index.html → /, about.html → /about.html).
const pageFiles = readdirSync(root).filter((f) => f.endsWith('.html'));
const pages = Object.fromEntries(pageFiles.map((f) => [f.replace(/\.html$/, ''), `${root}${f}`]));

// React is only used for the hero island (src/hero); the rest of the site is vanilla JS.
export default defineConfig({
  appType: 'mpa', // unknown URLs 404 (and serve 404.html) like on Vercel, instead of falling back to index.html
  plugins: [htmlPartials(), responsiveMedia(root), seoHead(SITE_URL, root, pageFiles), react()],
  build: { rollupOptions: { input: pages } },
});
