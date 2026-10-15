// Responsive media for every image/GIF referenced from the HTML.
//   npm run optimize            (idempotent: skips outputs newer than their source)
//
// public/assets/<path>/<name>.jpg|png → public/opt/<path>/<name>-<w>.avif|webp (+ <name>-<w>.jpg|png fallback)
// public/assets/<path>/<name>.gif     → public/opt/<path>/<name>.webm + .mp4 + -poster.avif|jpg
// Writes src/media-manifest.json, which the responsive-media plugin in vite.config.ts
// uses to rewrite <img> tags (and to drop the unreferenced originals from dist/).
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import sharp from 'sharp';
import ffmpeg from 'ffmpeg-static';

const run = promisify(execFile);
const ROOT = process.cwd();
const WIDTHS = [640, 1280, 1920, 2720];
const FALLBACK_WIDTH = 1920;
const VIDEO_MAX_WIDTH = 1280;

// Every /assets/… raster referenced from a page or partial
const htmlFiles = [
  ...fs.readdirSync(ROOT).filter((f) => f.endsWith('.html')),
  ...fs.readdirSync('src/partials').map((f) => path.join('src/partials', f)),
];
const refs = new Set();
for (const f of htmlFiles) {
  for (const m of fs.readFileSync(f, 'utf8').matchAll(/\/assets\/[^"'\s)]+\.(?:jpe?g|png|gif)/gi)) refs.add(m[0]);
}

const fresh = (out, src) => fs.existsSync(out) && fs.statSync(out).mtimeMs >= fs.statSync(src).mtimeMs;
const optPath = (ref, suffix) => '/opt' + ref.replace(/^\/assets/, '').replace(/\.[^.]+$/, suffix);
const abs = (p) => path.join(ROOT, 'public', p);
const manifest = {};
let written = 0;

async function image(ref) {
  const src = abs(ref);
  const meta = await sharp(src).metadata();
  const alpha = !!meta.hasAlpha && ref.endsWith('.png');
  const widths = WIDTHS.filter((w) => w < meta.width);
  widths.push(Math.min(meta.width, WIDTHS.at(-1)));
  const fbW = Math.min(meta.width, FALLBACK_WIDTH);
  const fbExt = alpha ? 'png' : 'jpg';
  const jobs = [];
  for (const w of [...new Set(widths)]) {
    for (const fmt of ['avif', 'webp']) {
      const out = abs(optPath(ref, `-${w}.${fmt}`));
      if (fresh(out, src)) continue;
      fs.mkdirSync(path.dirname(out), { recursive: true });
      const pipe = sharp(src).resize({ width: w, withoutEnlargement: true });
      jobs.push((fmt === 'avif' ? pipe.avif({ quality: 55, effort: 4 }) : pipe.webp({ quality: 78 })).toFile(out));
    }
  }
  const fb = abs(optPath(ref, `-${fbW}.${fbExt}`));
  if (!fresh(fb, src)) {
    fs.mkdirSync(path.dirname(fb), { recursive: true });
    const pipe = sharp(src).resize({ width: fbW, withoutEnlargement: true });
    jobs.push((alpha ? pipe.png({ compressionLevel: 9, palette: true, quality: 85 }) : pipe.jpeg({ quality: 78, mozjpeg: true })).toFile(fb));
  }
  await Promise.all(jobs);
  written += jobs.length;
  manifest[ref] = { w: meta.width, h: meta.height, widths: [...new Set(widths)].sort((a, b) => a - b), fallback: optPath(ref, `-${fbW}.${fbExt}`) };
}

async function video(ref) {
  const src = abs(ref);
  const meta = await sharp(src).metadata(); // first frame
  const w = Math.min(meta.width, VIDEO_MAX_WIDTH);
  const scale = `scale=${w}:-2:flags=lanczos,format=yuv420p`;
  const outs = {
    webm: optPath(ref, '.webm'),
    mp4: optPath(ref, '.mp4'),
    posterAvif: optPath(ref, '-poster.avif'),
    posterJpg: optPath(ref, '-poster.jpg'),
  };
  fs.mkdirSync(path.dirname(abs(outs.mp4)), { recursive: true });
  if (!fresh(abs(outs.mp4), src)) {
    await run(ffmpeg, ['-y', '-loglevel', 'error', '-i', src, '-vf', scale, '-c:v', 'libx264', '-preset', 'slow', '-crf', '24', '-movflags', '+faststart', '-an', abs(outs.mp4)]);
    written++;
  }
  if (!fresh(abs(outs.webm), src)) {
    await run(ffmpeg, ['-y', '-loglevel', 'error', '-i', src, '-vf', scale, '-c:v', 'libvpx-vp9', '-crf', '36', '-b:v', '0', '-row-mt', '1', '-an', abs(outs.webm)]);
    written++;
  }
  if (!fresh(abs(outs.posterAvif), src)) {
    await sharp(src).resize({ width: w }).avif({ quality: 55 }).toFile(abs(outs.posterAvif));
    await sharp(src).resize({ width: w }).jpeg({ quality: 78, mozjpeg: true }).toFile(abs(outs.posterJpg));
    written += 2;
  }
  manifest[ref] = { w: meta.width, h: meta.pageHeight || meta.height, video: true, ...outs };
}

// Small worker pool: AVIF and VP9 are CPU-bound
const queue = [...refs].sort();
const missing = queue.filter((r) => !fs.existsSync(abs(r)));
if (missing.length) console.warn('Referenced but missing:', missing);
const work = queue.filter((r) => fs.existsSync(abs(r)));
let done = 0;
await Promise.all(
  Array.from({ length: Math.max(2, Math.min(6, os.cpus().length - 1)) }, async () => {
    while (work.length) {
      const ref = work.shift();
      await (ref.endsWith('.gif') ? video(ref) : image(ref));
      if (++done % 10 === 0) console.log(`${done}/${queue.length}`);
    }
  })
);

const sorted = Object.fromEntries(Object.entries(manifest).sort(([a], [b]) => a.localeCompare(b)));
fs.writeFileSync('src/media-manifest.json', JSON.stringify(sorted, null, 1) + '\n');
console.log(`${Object.keys(sorted).length} media, ${written} files written`);
