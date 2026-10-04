// Kullanım:
//   node render.mjs                       → sessiz video (tahmini sürelerle)
//   node render.mjs --audio ses           → ses/01.mp3 … ses/12.mp3 sürelerine göre senkronlar ve sesi ekler
//   node render.mjs --stills 12,40,95     → yalnızca verilen saniyelerden PNG kareler (kontrol için)
//   node render.mjs --bolum bolum02 …     → bolum02/ klasöründeki bölümü işler (scenes.json, animasyon/, ses/, cikti/ o klasörde)
// Diğer seçenekler: --fps 30  --out cikti/video.mp4  --from 0 --to 60  --scenes-only
import fs from 'node:fs';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import ffmpegPath from 'ffmpeg-static';
import { chromium } from 'playwright-core';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const args = Object.fromEntries(process.argv.slice(2).reduce((a, v, i, arr) => {
  if (v.startsWith('--')) a.push([v.slice(2), arr[i + 1] && !arr[i + 1].startsWith('--') ? arr[i + 1] : true]);
  return a;
}, []));
// Bölüm klasörü: verilmezse kök klasör (Bölüm 01)
const BASE = args.bolum ? path.resolve(ROOT, args.bolum) : ROOT;
const META = fs.existsSync(path.join(BASE, 'bolum.json')) ? JSON.parse(fs.readFileSync(path.join(BASE, 'bolum.json'), 'utf8')) : {};
const AD = args.ad || META.ad || 'matematik_tarihi_giris';
const LEAD = 1.0, TAIL = 1.0;
const FPS = +(args.fps || 30);

// 1) Sahne süreleri
const scenes = JSON.parse(fs.readFileSync(path.join(BASE, 'scenes.json'), 'utf8'));
const audioFiles = [];
if (args.audio) {
  const dir = path.resolve(BASE, args.audio);
  const files = fs.readdirSync(dir).filter(f => /\.(mp3|wav|m4a|aac|ogg|flac)$/i.test(f)).sort();
  scenes.forEach((sc, i) => {
    const n = String(i + 1).padStart(2, '0');
    const f = files.find(f => f.startsWith(n)) || files.find(f => f.toLowerCase().includes(sc.id));
    if (!f) throw new Error(`Ses dosyası bulunamadı: sahne ${n} (${sc.id}). Dosya adı "${n}" ile başlamalı.`);
    const p = path.join(dir, f);
    const out = spawnSync(ffmpegPath, ['-hide_banner', '-i', p], { encoding: 'utf8' }).stderr;
    const m = out.match(/Duration: (\d+):(\d+):([\d.]+)/);
    const d = +m[1] * 3600 + +m[2] * 60 + +m[3];
    sc.speech = +d.toFixed(3);
    sc.dur = +(d + LEAD + TAIL).toFixed(3);
    audioFiles.push(p);
    console.log(`  ${n} ${sc.id.padEnd(12)} ses ${d.toFixed(2)} sn  → sahne ${sc.dur.toFixed(2)} sn  (${f})`);
  });
}
fs.writeFileSync(path.join(BASE, 'animasyon', 'scenes.js'), 'window.SCENES = ' + JSON.stringify(scenes, null, 1) + ';\n');
if (args['scenes-only']) process.exit(0);

// 2) Tarayıcı
// Google Chrome varsa onu, yoksa Playwright Chromium'unu kullan (bulut: `npx playwright-core install --with-deps chromium`)
const browser = await chromium.launch({ channel: 'chrome', headless: true })
  .catch(() => chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH || undefined }))
  .catch(() => chromium.launch({ headless: true, executablePath: '/opt/pw-browsers/chromium' }));
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
page.on('console', m => { if (m.type() === 'error') console.error('[sayfa]', m.text()); });
await page.goto(pathToFileURL(path.join(BASE, 'animasyon', 'index.html')).href + '?render=1');
await page.evaluate(async () => {
  await Promise.all(['500 74px "Fraunces Variable"', 'italic 400 40px "Fraunces Variable"', '600 30px "Inter Variable"', '400 30px "Inter Variable"'].map(f => document.fonts.load(f, 'AaÇçĞğİıÖöŞşÜü')));
});
await page.waitForFunction(() => window.READY === true);
const TOTAL = await page.evaluate(() => window.TOTAL);
const missing = await page.evaluate(() => window.MISSING);
if (missing.length) console.warn('Uyarı – bulunamayan ipuçları:', missing);

const outDir = path.join(BASE, 'cikti');
fs.mkdirSync(outDir, { recursive: true });

if (args.stills) {
  for (const t of String(args.stills).split(',').map(Number)) {
    await page.evaluate(t => window.renderFrame(t), t);
    const f = path.join(outDir, `kare_${String(t).padStart(6, '0')}.png`);
    await page.screenshot({ path: f });
    console.log(f);
  }
  await browser.close();
  process.exit(0);
}

// 3) Kare kare render → ffmpeg
const from = +(args.from || 0), to = Math.min(+(args.to || TOTAL), TOTAL);
const out = path.resolve(BASE, args.out || `cikti/${AD}_${audioFiles.length ? 'sesli' : 'sessiz'}.mp4`);
const ff = ['-y', '-hide_banner', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-'];
if (audioFiles.length) {
  audioFiles.forEach(f => ff.push('-i', f));
  // sahne başlangıç zamanları
  let T = 0; scenes.forEach(s => { s.start = T; T += s.dur; });
  const parts2 = audioFiles.map((_, i) => {
    const ms = Math.max(0, Math.round((scenes[i].start + LEAD - from) * 1000));
    return `[${i + 1}:a]aresample=48000,adelay=${ms}|${ms}[a${i}]`;
  });
  ff.push('-filter_complex', parts2.join(';') + ';' + audioFiles.map((_, i) => `[a${i}]`).join('') + `amix=inputs=${audioFiles.length}:normalize=0:duration=longest[aout]`,
    '-map', '0:v', '-map', '[aout]', '-c:a', 'aac', '-b:a', '192k', '-t', String(to - from));
}
ff.push('-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', out);
const proc = spawn(ffmpegPath, ff, { stdio: ['pipe', 'inherit', 'inherit'] });
const nFrames = Math.round((to - from) * FPS);
const t0 = Date.now();
for (let i = 0; i < nFrames; i++) {
  const t = from + i / FPS;
  await page.evaluate(t => window.renderFrame(t), t);
  const buf = await page.screenshot({ type: 'jpeg', quality: 92 });
  if (!proc.stdin.write(buf)) await new Promise(r => proc.stdin.once('drain', r));
  if (i % (FPS * 10) === 0) {
    const el = (Date.now() - t0) / 1000, eta = el / (i + 1) * (nFrames - i - 1);
    process.stdout.write(`\r  kare ${i}/${nFrames}  (${t.toFixed(0)} sn)  kalan ~${Math.ceil(eta / 60)} dk   `);
  }
}
proc.stdin.end();
await new Promise(r => proc.on('close', r));
await browser.close();
console.log(`\nTamam → ${out}`);
