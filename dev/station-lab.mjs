// Lab for artist station covers (#219): draws each station in the preview as today (one circle) and as the variants
// below (CSS on top of user.css), one row per station, with Apple Music's own cover for that artist first when the
// station gives one (a local file, for comparison only), and saves the grid plus one shot per variant.
// node dev/station-lab.mjs <stations.json> <out-dir>   (stations.json: [{name, photo, related:[url,url], color:'#rrggbb', apple?:path}])
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const [file, outDir] = process.argv.slice(2);
const stations = JSON.parse(fs.readFileSync(file, 'utf8')).map(s => ({ ...s, apple: s.apple && pathToFileURL(path.resolve(s.apple)).href }));
// A: Apple's (user.css as committed). B: the artist's photo blurred behind the circles. C: two colours on a diagonal.
const S = '.am-mix-ready.am-mix-trio[data-am-mix-style="station"]';
const variants = {
  before: `.v-before ${S}{background:none}.v-before ${S}::before{background:var(--am-mix-band);-webkit-mask:none}.v-before ${S}::after{inset:auto;left:17%;top:17%;width:66%;aspect-ratio:1;border-radius:50%;-webkit-mask:none;background:var(--am-mix-photo) center 22%/cover no-repeat;box-shadow:0 2cqw 6cqw rgb(0 0 0/.28)}`,
  A: '',
  B: `.v-B ${S}{background:var(--am-mix-top)}.v-B ${S} .lab-blur{display:block!important}`,
  C: `.v-C ${S}{background:linear-gradient(135deg,var(--am-mix-from),var(--am-mix-to))}`,
};
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1500, height: 1200 }, deviceScaleFactor: 2 });
await page.goto(pathToFileURL(path.join(here, 'preview.html')).href);
await page.waitForSelector('body.am-ready #am-sidebar');
fs.mkdirSync(outDir, { recursive: true });
const keys = Object.keys(variants), w = 230;
await page.evaluate(async ({ stations, variants, keys, w }) => {
  const hsl = hex => { const [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255), max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2, d = max - min;
    const s = d ? d / (1 - Math.abs(2 * l - 1)) : 0, h = !d ? 0 : max === r ? ((g - b) / d + 6) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4; return [h * 60, s, l]; };
  // drawMix's colours, as theme.js works them out from the photo's colour.
  const vars = c => { const [h0, s, l] = hsl(c), h = Math.round(h0), sat = Math.round(Math.min(.7, s) * 100), mid = Math.min(.6, Math.max(.4, l)), band = Math.min(.78, Math.max(.6, l + .25)), full = Math.round(s * 100);
    return `--am-mix-band:hsl(${h} ${Math.round(Math.min(.55, s) * 100)}% ${Math.round(band * 100)}%);--am-mix-from:hsl(${h} ${sat}% ${Math.round((mid + .12) * 100)}%);--am-mix-to:hsl(${(h + 330) % 360} ${Math.min(90, sat + 10)}% ${Math.round((mid - .14) * 100)}%);--am-mix-top:hsl(${h} ${full}% 20%);--am-mix-bottom:hsl(${h} ${full}% 49%)`; };
  const label = 'font:600 13px/1.3 "mcloud Inter",sans-serif;color:#fff;margin-top:6px';
  const cover = (st, k) => `<div class="v-${k}" style="flex:none;width:${w}px"><div class="am-mix am-mix-ready am-mix-trio" data-am-mix-style="station" style="position:relative;width:${w}px;height:${w}px;--am-mix-radius:8px;${vars(st.color)};--am-mix-photo:url('${st.photo}');--am-mix-photo2:url('${st.related[0]}');--am-mix-photo3:url('${st.related[1]}')"><i class="lab-blur" style="display:none;position:absolute;inset:-20%;background:url('${st.photo}') center/cover;filter:blur(7cqw) saturate(1.5) brightness(.72)"></i><img alt="" style="width:100%;height:100%"></div><div style="${label}">${k}</div></div>`;
  const apple = st => `<div style="flex:none;width:${w}px"><div style="width:${w}px;height:${w}px;border-radius:8px;overflow:hidden;background:#333">${st.apple ? `<img alt="" src="${st.apple}" style="width:100%;height:100%;display:block">` : ''}</div><div style="${label}">Apple Music</div></div>`;
  const s = document.createElement('section');s.id = 'lab';s.style.cssText = 'position:fixed;inset:0 auto auto 0;z-index:99999;background:#1e1e1e;padding:24px;display:flex;flex-direction:column;gap:20px';
  s.innerHTML = `<style>${Object.values(variants).join('')}</style>` + stations.map(st => `<div><div style="font:700 15px 'mcloud Inter',sans-serif;color:#fff;margin-bottom:8px">${st.name}</div><div style="display:flex;gap:16px">${apple(st)}${keys.map(k => cover(st, k)).join('')}</div></div>`).join('');
  document.body.append(s);
  await Promise.all([...s.querySelectorAll('img[src]')].map(i => i.decode().catch(() => {})));
  await Promise.all([...new Set(stations.flatMap(st => [st.photo, ...st.related]))].map(src => new Promise(r => { const i = new Image(); i.onload = i.onerror = r; i.src = src; })));
  await document.fonts.ready;
  await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
}, { stations, variants, keys, w });
await page.locator('#lab').screenshot({ path: path.join(outDir, '219-compare.png') });
// One shot per variant, Apple's beside it.
for (const k of keys) {
  await page.evaluate(k => document.querySelectorAll('#lab [class^="v-"]').forEach(e => { e.style.display = e.classList.contains('v-' + k) ? '' : 'none'; }), k);
  await page.locator('#lab').screenshot({ path: path.join(outDir, `219-${k}.png`) });
}
await browser.close();
