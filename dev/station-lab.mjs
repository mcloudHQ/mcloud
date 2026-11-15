// Lab for artist station covers (#219): draws each station in the preview as today (one circle) and as the variants in
// `variants` (CSS on top of user.css), side by side, and saves one screenshot per variant plus an overview.
// node dev/station-lab.mjs <stations.json> <out-dir>   (stations.json: [{name, photo, related:[url,url], color:'#rrggbb'}])
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const [file, outDir] = process.argv.slice(2);
const stations = JSON.parse(fs.readFileSync(file, 'utf8'));
// A: Apple's (user.css as committed). B: the artist's photo blurred behind the circles. C: two colours, the artist's
// and the first similar artist's, on a diagonal.
const S = '.am-mix-ready.am-mix-trio[data-am-mix-style="station"]';
const variants = {
  before: `${S}::before{background:var(--am-mix-band)!important}${S}::after{inset:auto!important;left:17%!important;top:17%!important;width:66%!important;aspect-ratio:1!important;border-radius:50%!important;-webkit-mask:none!important;background:var(--am-mix-photo) center 22%/cover no-repeat!important;box-shadow:0 2cqw 6cqw rgb(0 0 0/.28)!important}`,
  A: '',
  B: `${S}::before{inset:-20%;clip-path:inset(14.286% round var(--am-mix-radius,8px));background:var(--am-mix-photo) center/cover,var(--am-mix-deep);filter:blur(7cqw) saturate(1.5) brightness(.72)}${S} {isolation:isolate}`,
  C: `${S}::before{background:radial-gradient(circle 35cqw at 37cqw 39.5cqw,rgb(0 0 0/.26) 27cqw,rgb(0 0 0/0)),radial-gradient(circle 19cqw at 80cqw 53.5cqw,rgb(0 0 0/.24) 12.5cqw,rgb(0 0 0/0)),radial-gradient(circle 18cqw at 48cqw 83.5cqw,rgb(0 0 0/.24) 12cqw,rgb(0 0 0/0)),linear-gradient(135deg,var(--am-mix-from),var(--am-mix-to))}`,
};
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1400, height: 900 }, deviceScaleFactor: 2 });
await page.goto(pathToFileURL(path.join(here, 'preview.html')).href);
await page.waitForSelector('body.am-ready #am-sidebar');
fs.mkdirSync(outDir, { recursive: true });
for (const [key, css] of Object.entries(variants)) {
  await page.evaluate(async ({ stations, css }) => {
    document.getElementById('lab')?.remove();
    const hsl = hex => { const [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255), max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2, d = max - min;
      const s = d ? d / (1 - Math.abs(2 * l - 1)) : 0, h = !d ? 0 : max === r ? ((g - b) / d + 6) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4; return [h * 60, s, l]; };
    // drawMix's colours, as theme.js works them out from the photo's colour.
    const vars = c => { const [h, s, l] = hsl(c), sat = Math.round(Math.min(.7, s) * 100), mid = Math.min(.6, Math.max(.4, l)), band = Math.min(.78, Math.max(.6, l + .25));
      return `--am-mix-band:hsl(${h} ${Math.round(Math.min(.55, s) * 100)}% ${Math.round(band * 100)}%);--am-mix-from:hsl(${h} ${sat}% ${Math.round((mid + .12) * 100)}%);--am-mix-to:hsl(${(h + 330) % 360} ${Math.min(90, sat + 10)}% ${Math.round((mid - .14) * 100)}%);--am-mix-deep:hsl(${h} ${sat}% ${Math.round((mid - .1) * 100)}%)`; };
    const s = document.createElement('section');s.id = 'lab';s.style.cssText = 'position:fixed;inset:0 auto auto 240px;z-index:99999;background:#1e1e1e;padding:24px;display:flex;flex-direction:column;gap:22px';
    s.innerHTML = `<style>${css}</style>` + [230, 150].map(w => `<div style="display:flex;gap:18px;align-items:flex-start">${stations.map(st =>
      `<div style="flex:none;width:${w}px;font:500 13px/1.3 'mcloud Inter',sans-serif;color:#fff"><div class="am-mix am-mix-ready am-mix-trio" data-am-mix-style="station" style="position:relative;width:${w}px;height:${w}px;--am-mix-radius:8px;${vars(st.color)};--am-mix-photo:url('${st.photo}');--am-mix-photo2:url('${st.related[0]}');--am-mix-photo3:url('${st.related[1]}')"><img alt="" style="width:100%;height:100%"></div><div style="margin-top:6px">${st.name}</div></div>`).join('')}</div>`).join('');
    document.querySelector('.am-native-main main').prepend(s);
    await Promise.all([...new Set(stations.flatMap(st => [st.photo, ...st.related]))].map(src => new Promise(r => { const i = new Image(); i.onload = i.onerror = r; i.src = src; })));
    await document.fonts.ready;
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
  }, { stations, css });
  await page.locator('#lab').screenshot({ path: path.join(outDir, `219-${key}.png`) });
}
await browser.close();
