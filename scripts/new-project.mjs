// Scaffold a new case study from templates/case-study/.
//   npm run new-project -- --slug acme --name "Acme" [--next send-app] [--figma 300:1 --figma-mobile 300:2]
// Creates <slug>.html, src/pages/<slug>.js, src/styles/pages/<slug>.css and
// public/assets/<slug>/. The pages still contain {{PLACEHOLDERS}} for the copy,
// image sizes and alt text — `npm run build` fails until every one is filled.
// Wiring into the rest of the site is listed in CLAUDE.md → "How to add a new project".
import fs from 'node:fs';

const args = Object.fromEntries(
  process.argv.slice(2).join(' ').split(/\s*--/).filter(Boolean).map((a) => {
    const [k, ...v] = a.split(/\s+/);
    return [k, v.join(' ').replace(/^["']|["']$/g, '')];
  })
);
const slug = args.slug;
if (!slug || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug) || !args.name) {
  console.error('Usage: npm run new-project -- --slug acme --name "Acme" [--next send-app] [--figma 300:1 --figma-mobile 300:2]');
  process.exit(1);
}

const out = {
  html: `${slug}.html`,
  js: `src/pages/${slug}.js`,
  css: `src/styles/pages/${slug}.css`,
  assets: `public/assets/${slug}`,
};
const taken = Object.values(out).filter((p) => fs.existsSync(p));
if (taken.length) {
  console.error(`"${slug}" is taken — already exists: ${taken.join(', ')}`);
  process.exit(1);
}

const next = args.next || 'send-app'; // the case studies loop back to the first one
if (!fs.existsSync(`${next}.html`)) console.warn(`Warning: next project "${next}.html" doesn't exist yet.`);
const fill = (s) =>
  s
    .replaceAll('{{SLUG}}', slug)
    .replaceAll('{{NAME}}', args.name)
    .replaceAll('{{NEXT_SLUG}}', next)
    .replaceAll('{{FIGMA_DESKTOP}}', args.figma || '{{FIGMA_DESKTOP}}')
    .replaceAll('{{FIGMA_MOBILE}}', args['figma-mobile'] || '{{FIGMA_MOBILE}}');

const tpl = (f) => fs.readFileSync(`templates/case-study/${f}`, 'utf8');
fs.writeFileSync(out.html, fill(tpl('page.html')));
fs.writeFileSync(out.js, fill(tpl('page.js')));
fs.writeFileSync(out.css, fill(tpl('page.css')));
fs.mkdirSync(out.assets, { recursive: true });

const left = [...new Set([...fs.readFileSync(out.html, 'utf8').matchAll(/\{\{([A-Z0-9_]+)\}\}/g)].map((m) => m[1]))];
console.log(`Created ${out.html}, ${out.js}, ${out.css} and ${out.assets}/ (next project: ${next}).`);
console.log(`Still to fill in ${out.html}: ${left.join(', ')}`);
console.log('Next: follow CLAUDE.md → "How to add a new project" (steps 3–9).');
