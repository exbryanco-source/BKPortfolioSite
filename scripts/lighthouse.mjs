// Lighthouse every page (mobile + desktop) against `vite preview` on :4173.
// Usage: npm run build && npx vite preview --port 4173 & node scripts/lighthouse.mjs <label>
// Writes reports/lighthouse-<label>.md (scores table) and .json (raw numbers).
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const label = process.argv[2] || 'run';
const base = process.env.LH_URL || 'http://localhost:4173';
const chrome = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const pages = fs.readdirSync('.').filter((f) => f.endsWith('.html')).sort().map((f) => (f === 'index.html' ? '/' : '/' + f));
const lh = path.resolve('node_modules/.bin/lighthouse');
const rows = [];

for (const preset of ['mobile', 'desktop']) {
  for (const page of pages) {
    const out = path.join('reports', `.lh-${label}-${preset}-${page.replace(/\W+/g, '_') || 'index'}.json`);
    const args = [base + page, '--quiet', '--output=json', `--output-path=${out}`, `--chrome-path=${chrome}`,
      '--chrome-flags=--headless=new', '--only-categories=performance,accessibility,best-practices,seo'];
    if (preset === 'desktop') args.push('--preset=desktop');
    try { execFileSync(lh, args, { stdio: 'ignore', timeout: 240000 }); } catch { /* report written even when an audit errors */ }
    if (!fs.existsSync(out)) { rows.push({ preset, page, error: true }); continue; }
    const r = JSON.parse(fs.readFileSync(out, 'utf8'));
    const c = r.categories, a = r.audits;
    rows.push({
      preset, page,
      perf: Math.round(c.performance.score * 100), a11y: Math.round(c.accessibility.score * 100),
      bp: Math.round(c['best-practices'].score * 100), seo: Math.round(c.seo.score * 100),
      lcp: +(a['largest-contentful-paint'].numericValue / 1000).toFixed(1),
      cls: +a['cumulative-layout-shift'].numericValue.toFixed(3),
      tbt: Math.round(a['total-blocking-time'].numericValue),
      kb: Math.round(a['total-byte-weight'].numericValue / 1024),
      a11yFails: Object.values(a).filter((x) => r.categories.accessibility.auditRefs.some((ref) => ref.id === x.id) && x.score === 0).map((x) => x.id),
    });
    fs.rmSync(out);
    console.log(preset, page, JSON.stringify(rows.at(-1)));
  }
}
const md = [`# Lighthouse — ${label} (${new Date().toISOString().slice(0, 10)}, local \`vite preview\`)`, '',
  '| Preset | Page | Perf | A11y | BP | SEO | LCP s | CLS | TBT ms | Weight KB |', '|---|---|---|---|---|---|---|---|---|---|',
  ...rows.map((r) => r.error ? `| ${r.preset} | ${r.page} | error |||||||| ` : `| ${r.preset} | ${r.page} | ${r.perf} | ${r.a11y} | ${r.bp} | ${r.seo} | ${r.lcp} | ${r.cls} | ${r.tbt} | ${r.kb} |`)];
fs.writeFileSync(`reports/lighthouse-${label}.md`, md.join('\n') + '\n');
fs.writeFileSync(`reports/lighthouse-${label}.json`, JSON.stringify(rows, null, 1));
console.log(md.join('\n'));
