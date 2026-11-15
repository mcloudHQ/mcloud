// Lab for mix covers (#215, #219): draws gradient, band and station covers at Home's and a playlist header's sizes in
// the preview (the embedded Inter, as on Windows), measures the gradient name's descenders against its box and saves
// a screenshot. node dev/covers-lab.mjs <out.png> [extra css]
import { chromium } from 'playwright';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const [out, css = ''] = process.argv.slice(2);
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1320, height: 760 }, deviceScaleFactor: 2 });
await page.goto(pathToFileURL(path.join(here, 'preview.html')).href);
await page.waitForSelector('body.am-ready #am-sidebar');
const result = await page.evaluate(async css => {
  const names = ['Fun Road Trip Mix', 'Baking Mix', 'Chill Study Mix', 'Öğle Yürüyüşü Mixi Ve Daha Çok Şarkı Ğğ Mix'];
  const vars = ['--am-mix-from:hsl(130 60% 52%);--am-mix-to:hsl(100 70% 28%);--am-mix-band:hsl(130 45% 70%)', '--am-mix-from:hsl(40 65% 55%);--am-mix-to:hsl(10 75% 30%);--am-mix-band:hsl(40 50% 72%)',
    '--am-mix-from:hsl(265 35% 58%);--am-mix-to:hsl(235 45% 32%);--am-mix-band:hsl(265 35% 74%)', '--am-mix-from:hsl(200 60% 52%);--am-mix-to:hsl(170 70% 28%);--am-mix-band:hsl(200 45% 72%)'];
  const s = document.createElement('section');s.id = 'lab';s.style.cssText = 'position:fixed;inset:0 0 0 240px;z-index:99999;background:#1e1e1e;padding:20px;display:flex;flex-direction:column;gap:18px';
  s.innerHTML = `<style>${css}</style>` + [['gradient', 150], ['gradient', 230], ['band', 150]].map(([style, w]) => `<div style="display:flex;gap:16px">${names.map((n, i) =>
    `<div class="am-mix am-mix-ready lab-box" data-am-mix-style="${style}" data-am-mix="${n}" style="position:relative;flex:none;width:${w}px;height:${w}px;--am-mix-radius:8px;${vars[i]};--am-mix-photo:linear-gradient(#555,#333)"><img alt="" style="width:100%;height:100%"></div>`).join('')}</div>`).join('');
  document.querySelector('.am-native-main main').prepend(s);
  await document.fonts.ready;
  await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
  const ctx = document.createElement('canvas').getContext('2d');
  return [...s.querySelectorAll('.lab-box')].filter(b => b.dataset.amMixStyle === 'gradient' || b.dataset.amMix === 'Baking Mix').map(b => {
    const a = getComputedStyle(b, '::after'), size = parseFloat(a.fontSize), lh = parseFloat(a.lineHeight) / size;
    ctx.font = `${a.fontWeight} ${a.fontSize} ${a.fontFamily}`;
    const m = ctx.measureText('gpyÖ'), asc = m.fontBoundingBoxAscent / size, desc = m.fontBoundingBoxDescent / size, ink = m.actualBoundingBoxDescent / size;
    // The baseline of a line sits half the leading below the line box's top plus the ascent; the ink goes ink below it.
    const baseline = (lh - asc - desc) / 2 + asc, past = baseline + ink - lh;
    return { style: b.dataset.amMixStyle, width: b.offsetWidth, name: b.dataset.amMix, font: a.fontFamily.split(',')[0], size: +size.toFixed(1), lh: +lh.toFixed(3), padBottom: a.paddingBottom,
      inkBelowLineBox_em: +past.toFixed(3), inkBelowLineBox_px: +(past * size).toFixed(2), clipped_px: +Math.max(0, past * size - parseFloat(a.paddingBottom)).toFixed(2) };
  });
}, css);
console.table(result);
if (out) await page.locator('#lab').screenshot({ path: out });
await browser.close();
