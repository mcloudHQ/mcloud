// What the live client does while nothing is touched (issue #217): a JS CPU profile of the page and a trace over the
// same seconds. Prints frames drawn a second (viz DrawFrame), main-thread style/layout/paint counts and time, timers and
// observers fired, and the JS functions with the most self time. Spotify must run with --remote-debugging-port=9229.
//   node dev/client/idle.mjs [secs] [css]      (SCROLL=1: the main view scrolls 6px a frame meanwhile)
import { chromium } from 'playwright';
const [secs = '8', css = ''] = process.argv.slice(2);
const browser = await chromium.connectOverCDP('http://127.0.0.1:9229');
const page = browser.contexts().flatMap(c => c.pages()).find(p => p.url().includes('xpui'));
if (css) await page.evaluate(css => { let s = document.getElementById('idle-variant'); if (!s) { s = document.createElement('style'); s.id = 'idle-variant'; document.head.append(s); } s.textContent = css; }, css);
if (process.env.SCROLL) await page.evaluate(() => { const w = window.__amIdle ??= {}; cancelAnimationFrame(w.raf);
  const v = document.querySelector('.main-view-container__scroll-node [data-overlayscrollbars-viewport]') || document.querySelector('.main-view-container__scroll-node');
  let dir = 1; const f = () => { v.scrollTop += dir * 6; if (v.scrollTop > Math.min(4000, v.scrollHeight - v.clientHeight - 10)) dir = -1; else if (v.scrollTop <= 0) dir = 1; w.raf = requestAnimationFrame(f); }; w.raf = requestAnimationFrame(f); });
await new Promise(r => setTimeout(r, 1000));
const cdp = await page.context().newCDPSession(page), bcdp = await browser.newBrowserCDPSession();
await cdp.send('Profiler.enable'); await cdp.send('Profiler.setSamplingInterval', { interval: 200 }); await cdp.send('Profiler.start');
const ev = []; bcdp.on('Tracing.dataCollected', e => ev.push(...e.value));
const done = new Promise(r => bcdp.once('Tracing.tracingComplete', r));
await bcdp.send('Tracing.start', { traceConfig: { includedCategories: ['viz', 'devtools.timeline', 'blink', 'cc', 'toplevel', 'v8'], recordMode: 'recordContinuously' }, transferMode: 'ReportEvents' });
await new Promise(r => setTimeout(r, +secs * 1000));
await bcdp.send('Tracing.end'); await done;
const { profile } = await cdp.send('Profiler.stop');
const S = +secs, procs = {}, threads = {};
for (const e of ev) if (e.ph === 'M') { if (e.name === 'process_name') procs[e.pid] = e.args.name; if (e.name === 'thread_name') threads[e.pid + ':' + e.tid] = e.args.name; }
const agg = {};
for (const e of ev) if ((e.ph === 'X' || e.ph === 'B') && /^(DirectRenderer::DrawFrame|UpdateLayoutTree|Layout|Paint|PrePaint|Layerize|Commit|TimerFire|FireAnimationFrame|FunctionCall|EventDispatch|ParseHTML|RunTask|ProxyMain::BeginMainFrame|MutationObserver|Animation|UpdateLayer|CompositeLayers|v8.run|ScheduledAction)/.test(e.name)) {
  const k = `${(procs[e.pid] || e.pid)}/${threads[e.pid + ':' + e.tid] || e.tid} ${e.name}`; const a = agg[k] ??= { n: 0, ms: 0 }; a.n++; a.ms += (e.dur || 0) / 1000;
}
for (const [k, a] of Object.entries(agg).sort((x, y) => y[1].n - x[1].n).slice(0, 30)) console.log(`${(a.n / S).toFixed(1).padStart(7)}/s ${(a.ms / S).toFixed(2).padStart(7)}ms/s  ${k}`);
// JS self time by function
const dt = profile.timeDeltas, byId = new Map(profile.nodes.map(n => [n.id, n])), self = new Map();
profile.samples.forEach((id, i) => self.set(id, (self.get(id) || 0) + (dt[i] || 0)));
const fn = {};
for (const [id, us] of self) { const c = byId.get(id).callFrame; const k = `${c.functionName || '(anon)'} ${(c.url || '').split('/').pop()}:${c.lineNumber + 1}:${c.columnNumber + 1}`; fn[k] = (fn[k] || 0) + us; }
const files = {}; for (const [id, us] of self) { const u = (byId.get(id).callFrame.url || '(native)').split('/').pop().split('?')[0]; files[u] = (files[u] || 0) + us; }
console.log('--- JS self time by script (ms/s): ' + Object.entries(files).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([u, us]) => `${u} ${(us / 1000 / S).toFixed(1)}`).join(', '));
console.log('--- JS self time (ms/s)');
for (const [k, us] of Object.entries(fn).sort((a, b) => b[1] - a[1]).slice(0, 25)) console.log((us / 1000 / S).toFixed(2).padStart(7), k);
if (css) await page.evaluate(() => document.getElementById('idle-variant')?.remove());
if (process.env.SCROLL) await page.evaluate(() => cancelAnimationFrame(window.__amIdle.raf));
await browser.close(); process.exit(0);
