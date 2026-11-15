// CPU, GPU, memory and frame times of the live client on Windows, per scenario (issue #217). Spotify must run with
// --remote-debugging-port=9229 (and --mute-audio), visible. CDP sets each scenario up and then detaches while
// winsample.ps1 samples (an attached client changes Chromium's throttling); frame intervals are recorded by rAF in the
// page and read back afterwards.
//   node dev/client/winperf.mjs <label> <scenarios> [secs] [settings-json]
//   node dev/client/winperf.mjs on paused,playing,home,playlist 15 '{"glass":"eco"}'
// Scenarios: paused (Home, music paused), playing (Home, a song playing), lyrics (Spicy Lyrics' page, playing), home / playlist (scrolling 6px a frame by rAF,
// playing). Settings, when given, are merged into localStorage['mcloud:settings'] and the page reloads first.
// CSS in the environment variable CSS is added as a style for the run (to hide parts of the glass).
// Appends one JSON line per scenario to winperf.jsonl in the working directory.
import { chromium } from 'playwright';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const [label = 'run', scen = 'paused,playing,home,playlist', secs = '15', setJson = ''] = process.argv.slice(2);
const sampler = path.join(path.dirname(fileURLToPath(import.meta.url)), 'winsample.ps1');
const PLAYLIST = process.env.PLAYLIST || 'spotify:playlist:37i9dQZF1DX5Ejj0EkURtP', SONG = process.env.SONG || PLAYLIST;
const sleep = ms => new Promise(r => setTimeout(r, ms));
const connect = async () => { const b = await chromium.connectOverCDP('http://127.0.0.1:9229'); const p = b.contexts().flatMap(c => c.pages()).find(p => p.url().includes('xpui')); return [b, p]; };
let [browser, page] = await connect();
if (setJson) {
  await page.evaluate(j => { const s = JSON.parse(localStorage.getItem('mcloud:settings') || '{}'); localStorage.setItem('mcloud:settings', JSON.stringify({ ...s, ...JSON.parse(j) })); location.reload(); }, setJson);
  await sleep(4000); await browser.close(); await sleep(500); [browser, page] = await connect();
  await page.waitForFunction(() => window.Spicetify?.Player?.data !== undefined && window.Spicetify?.Platform?.History, null, { timeout: 30000 }).catch(() => {});
  await sleep(12000);
}
await page.evaluate(css => { let s = document.getElementById('perf-variant'); if (!s) { s = document.createElement('style'); s.id = 'perf-variant'; document.head.append(s); } s.textContent = css; }, process.env.CSS || '');
for (const s of scen.split(',')) {
  const route = s === 'playlist' ? '/playlist/' + PLAYLIST.split(':').pop() : s === 'lyrics' ? '/SpicyLyrics' : '/';
  await page.evaluate(async ([s, route, song]) => {
    const H = Spicetify.Platform.History; if (H.location.pathname !== route) H.push(route);
    const P = Spicetify.Player, playing = P.isPlaying?.() ?? !P.data?.isPaused;
    if (s === 'paused' && playing) P.pause();
    if (s !== 'paused' && !playing) { if (P.data?.item) P.play(); else await P.playUri(song); }
  }, [s, route, SONG]);
  await sleep(4000);
  await page.evaluate(scroll => {
    const w = window.__amPerf ??= {}; cancelAnimationFrame(w.raf); w.t = []; w.last = 0;
    if (!scroll) return;
    const v = document.querySelector('.main-view-container__scroll-node [data-overlayscrollbars-viewport]') || document.querySelector('.main-view-container__scroll-node');
    let dir = 1; v.scrollTop = 0;
    const f = now => { if (w.last) w.t.push(now - w.last); w.last = now; v.scrollTop += dir * 6; if (v.scrollTop > Math.min(4000, v.scrollHeight - v.clientHeight - 10)) dir = -1; else if (v.scrollTop <= 0) dir = 1; w.raf = requestAnimationFrame(f); };
    w.raf = requestAnimationFrame(f);
  }, s === 'home' || s === 'playlist');
  await browser.close(); await sleep(1500);
  const m = JSON.parse(execFileSync('powershell', ['-NoProfile', '-File', sampler, '-Secs', String(secs)]).toString());
  [browser, page] = await connect();
  const t = await page.evaluate(() => { const w = window.__amPerf; cancelAnimationFrame(w.raf); const t = w.t; w.t = []; return t; });
  const fr = t.length ? (() => { const a = [...t].sort((x, y) => x - y), q = p => a[Math.min(a.length - 1, Math.floor(a.length * p))]; return { n: a.length, fps: 1000 / (a.reduce((x, y) => x + y, 0) / a.length), p50: q(0.5), p95: q(0.95), p99: q(0.99), over25: a.filter(x => x > 25).length }; })() : null;
  const P = m.procs, tot = k => Object.values(P).reduce((x, p) => x + p[k], 0);
  const row = { label, scenario: s, settings: setJson || null, css: process.env.CSS || null, at: new Date().toISOString(), total: { cpu: tot('cpu'), gpu: tot('gpu'), ws: tot('ws'), priv: tot('priv') }, procs: P, frames: fr };
  fs.appendFileSync('winperf.jsonl', JSON.stringify(row) + '\n');
  const f1 = x => x.toFixed(1);
  console.log(`${label.padEnd(14)} ${s.padEnd(9)} CPU ${f1(row.total.cpu)}% core (renderer ${f1(P.renderer?.cpu ?? 0)}, gpu ${f1(P['gpu-process']?.cpu ?? 0)}, browser ${f1(P.browser?.cpu ?? 0)})  GPU ${f1(row.total.gpu)}%  WS ${row.total.ws.toFixed(0)}MB priv ${row.total.priv.toFixed(0)}MB` + (fr ? `  ${f1(fr.fps)}fps p95 ${f1(fr.p95)}ms >25ms ${fr.over25}/${fr.n}` : ''));
}
await browser.close();
process.exit(0);
