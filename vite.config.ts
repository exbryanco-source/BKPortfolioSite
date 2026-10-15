import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { responsiveMedia } from './vite/responsive-media';

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

  return {
    name: 'html-partials',
    transformIndexHtml: { order: 'pre', handler: (html) => include(html) },
    handleHotUpdate({ file, server }) {
      if (file.startsWith(partialsDir)) server.ws.send({ type: 'full-reload' });
    },
  };
}

// Every .html file in the project root is a page (index.html → /, about.html → /about.html).
const pages = Object.fromEntries(
  readdirSync(root)
    .filter((f) => f.endsWith('.html'))
    .map((f) => [f.replace(/\.html$/, ''), `${root}${f}`])
);

// React is only used for the hero island (src/hero); the rest of the site is vanilla JS.
export default defineConfig({
  plugins: [htmlPartials(), responsiveMedia(root), react()],
  build: { rollupOptions: { input: pages } },
});
