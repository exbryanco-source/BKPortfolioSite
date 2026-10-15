// Favicon set + social share card, written to public/ (committed).
//   node scripts/make-brand-assets.mjs
// Source: public/assets/footer-logo.svg (the cat mark alone) and scripts/og-image.html.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import sharp from 'sharp';

const SURFACE = '#fcfcf8';
const INK = '#11120F';
const mark = fs.readFileSync('public/assets/footer-logo.svg', 'utf8');
const d = mark.match(/<path[^>]*\sd="([^"]+)"/)[1];

// The mark sits in a 150×96 box (drawn at 8–142 × 8–88); centre it in a square.
const square = (pad, bg) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${8 - pad} ${48 - 67 - pad} ${134 + pad * 2} ${134 + pad * 2}">` +
  (bg ? `<rect x="${8 - pad}" y="${48 - 67 - pad}" width="${134 + pad * 2}" height="${134 + pad * 2}" fill="${bg}"/>` : '') +
  `<path d="${d}" fill="${INK}"/></svg>`;

// favicon.svg — follows the browser theme
fs.writeFileSync('public/favicon.svg', square(4).replace('</svg>', `<style>@media (prefers-color-scheme: dark){path{fill:${SURFACE}}}</style></svg>`) + '\n');

const png = (svg, size) => sharp(Buffer.from(svg), { density: 1200 }).resize(size, size).png().toBuffer();
fs.writeFileSync('public/apple-touch-icon.png', await png(square(22, SURFACE), 180));
fs.writeFileSync('public/icon-192.png', await png(square(22, SURFACE), 192));
fs.writeFileSync('public/icon-512.png', await png(square(22, SURFACE), 512));

// favicon.ico — PNG-compressed ICO with 16/32/48 entries
const sizes = [16, 32, 48];
const images = await Promise.all(sizes.map((s) => png(square(4, null), s)));
const header = Buffer.alloc(6 + 16 * sizes.length);
header.writeUInt16LE(0, 0); header.writeUInt16LE(1, 2); header.writeUInt16LE(sizes.length, 4);
let offset = header.length;
sizes.forEach((s, i) => {
  const e = 6 + i * 16;
  header.writeUInt8(s, e); header.writeUInt8(s, e + 1); header.writeUInt8(0, e + 2); header.writeUInt8(0, e + 3);
  header.writeUInt16LE(1, e + 4); header.writeUInt16LE(32, e + 6);
  header.writeUInt32LE(images[i].length, e + 8); header.writeUInt32LE(offset, e + 12);
  offset += images[i].length;
});
fs.writeFileSync('public/favicon.ico', Buffer.concat([header, ...images]));

fs.writeFileSync('public/site.webmanifest', JSON.stringify({
  name: 'Superpills — Bryan Khua', short_name: 'Superpills', start_url: '/', display: 'browser',
  background_color: SURFACE, theme_color: SURFACE,
  icons: [{ src: '/icon-192.png', sizes: '192x192', type: 'image/png' }, { src: '/icon-512.png', sizes: '512x512', type: 'image/png' }],
}, null, 2) + '\n');

// og-image.png — the HTML template rendered by headless Chrome (real Inter)
const chrome = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
execFileSync(chrome, ['--headless=new', '--hide-scrollbars', '--allow-file-access-from-files', '--force-device-scale-factor=1',
  '--window-size=1200,630', '--virtual-time-budget=3000', `--screenshot=${path.resolve('public/og-image.png')}`,
  'file://' + path.resolve('scripts/og-image.html')], { stdio: 'ignore' });
const og = await sharp('public/og-image.png').metadata();
console.log('favicon.svg/.ico, apple-touch-icon, icon-192/512, site.webmanifest, og-image', `${og.width}×${og.height}`);
