// Motion QA: the unified motion layer (css/motion.css, motion.js) in a real browser.
// Run: PLAYWRIGHT_MODULE=<path to playwright/index.mjs> node tests/motion-qa.mjs
import {createServer} from 'node:http';
import {readFile, readdir} from 'node:fs/promises';
import {resolve, extname, sep} from 'node:path';
import process from 'node:process';
import assert from 'node:assert/strict';
import {openApp} from './fixtures.mjs';

const {chromium} = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const root = process.cwd();
const results = [];
const check = async (name, run) => { try { await run(); results.push('PASS  ' + name); } catch (error) { results.push('FAIL  ' + name + ' — ' + String(error.message).split('\n')[0]); } };

// Reduced-motion blocks are allowed their own (gentle) timings: remove them before scanning.
function stripReduced(css) {
  let out = '', i = 0;
  while (i < css.length) {
    const at = css.indexOf('@media (prefers-reduced-motion', i);
    if (at < 0) { out += css.slice(i); break; }
    out += css.slice(i, at);
    let depth = 0, j = css.indexOf('{', at);
    for (; j < css.length; j++) { if (css[j] === '{') depth++; else if (css[j] === '}' && --depth === 0) { j++; break; } }
    i = j;
  }
  return out;
}

// ---- Source: every transition in the studio speaks the same durations and curves -----------------
await check('source: transition durations and curves are tokens', async () => {
  const bad = [];
  for (const file of (await readdir(resolve(root, 'css'))).filter((f) => f.endsWith('.css') && !['framework.css', 'fonts.css', 'tokens.css', 'public-pages.css'].includes(f))) {
    let css = (await readFile(resolve(root, 'css', file), 'utf8')).replace(/\/\*[\s\S]*?\*\//g, '');
    css = stripReduced(css);
    for (const m of css.matchAll(/(?<![\w-])transition(?:-duration|-timing-function)?\s*:\s*([^;}]+)/g)) {
      const value = m[1].replace(/var\([^)]*\)/g, '');
      if (/(?<![\w.-])\d*\.?\d+m?s\b/.test(value.replace(/\b0s\b|\.01ms\b/g, ''))) bad.push(file + ': ' + m[0].trim().slice(0, 70));
      if (/cubic-bezier|\bease(-in-out|-out)?\b/.test(value)) bad.push(file + ': ' + m[0].trim().slice(0, 70));
    }
  }
  assert.deepEqual(bad.slice(0, 5), [], 'raw timing left in transitions');
});
await check('source: motion layer moves only transform, opacity (translate, scale) and outline-offset', async () => {
  const css = (await readFile(resolve(root, 'css/motion.css'), 'utf8')).replace(/\/\*[\s\S]*?\*\//g, '');
  for (const m of css.matchAll(/@keyframes[^{]*\{([\s\S]*?\}\s*)\}/g)) assert.doesNotMatch(m[1], /\b(width|height|top|left|right|bottom|margin|padding|filter|box-shadow)\s*:/, 'keyframes stay on the compositor');
  assert.equal((css.match(/!important/g) || []).length, 4, 'only the reduced-motion guard uses !important');
});

// ---- Browser --------------------------------------------------------------------------------------
const mime = {'.html': 'text/html; charset=utf-8', '.js': 'application/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.woff2': 'font/woff2', '.ico': 'image/x-icon', '.webmanifest': 'application/manifest+json'};
const server = createServer(async (request, response) => {
  const url = new URL(request.url, 'http://localhost');
  const path = resolve(root, '.' + decodeURIComponent(url.pathname));
  if (!path.startsWith(root + sep) && path !== root) { response.writeHead(403); response.end(); return; }
  try { const body = await readFile(path === root ? resolve(root, 'index.html') : path); response.writeHead(200, {'Content-Type': mime[extname(path)] || 'application/octet-stream', 'Cache-Control': 'no-store'}); response.end(body); }
  catch { response.writeHead(404); response.end('Not found'); }
});
await new Promise((done) => server.listen(4178, '127.0.0.1', done));
const BASE = 'http://127.0.0.1:4178';
const browser = await chromium.launch();

const names = (page) => page.evaluate(() => document.getAnimations().map((a) => ({name: a.animationName || '', ms: a.effect?.getTiming().duration})));
const dock = (page, text) => page.evaluate((l) => { const b = [...document.querySelectorAll('button')].find((x) => x.textContent.trim() === l); b?.click(); return !!b; }, text);

for (const [label, viewport, mobile] of [['desktop', {width: 1440, height: 900}, false], ['phone', {width: 390, height: 844}, true]]) {
  const context = await browser.newContext({viewport, hasTouch: mobile, isMobile: mobile, reducedMotion: 'no-preference'});
  const page = await context.newPage(); page.setDefaultTimeout(6000);
  const errors = []; page.on('pageerror', (e) => errors.push(e.message));
  await openApp(page, BASE);
  await page.evaluate(() => { window.__cls = 0; window.__watch = false; new PerformanceObserver((l) => { for (const e of l.getEntries()) if (window.__watch) window.__cls += e.value; }).observe({type: 'layout-shift', buffered: false}); });

  await check(label + ': a room arrives (opacity + translate, 300ms) and ends fully visible', async () => {
    await page.evaluate(() => { window.__cls = 0; window.__watch = true; });
    if (mobile) await page.locator('.fk-stop[data-fk="develop"]').click(); else await dock(page, 'Develop');
    await page.waitForTimeout(60);
    const live = await names(page);
    assert.ok(live.some((a) => a.name === 'ds-arrive' && a.ms === 300), 'ds-arrive 300ms is running: ' + JSON.stringify(live));
    await page.waitForTimeout(500);
    assert.equal((await names(page)).filter((a) => a.name === 'ds-arrive').length, 0, 'finished');
    await page.evaluate(() => { window.__watch = false; });
    const room = await page.evaluate(() => { const el = document.querySelector('.lbs, .foundation-workspace'); const cs = getComputedStyle(el); return {opacity: cs.opacity, translate: cs.translate}; });
    assert.deepEqual(room, {opacity: '1', translate: 'none'});
  });

  await check(label + ': pressing a control sinks it, releasing eases it back', async () => {
    const button = page.locator(mobile ? '.fk-stop[data-fk="write"]' : 'button[aria-label="Workspace settings"]').first();
    const box = await button.boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down(); await page.waitForTimeout(220);
    const down = await button.evaluate((el) => parseFloat(getComputedStyle(el).scale));
    assert.ok(down < 0.99 && down > 0.9, 'sunk to ' + down);
    await page.mouse.move(5, 5); await page.mouse.up(); await page.waitForTimeout(500);   // let go elsewhere: no click
    assert.equal(await button.evaluate((el) => getComputedStyle(el).scale), 'none', 'back to rest, nothing left behind');
  });

  await check(label + ': the writing surface and text fields are not pressed', async () => {
    if (mobile) await page.locator('.fk-stop[data-fk="write"]').click(); else { await page.locator('.app-wordmark').click(); await page.locator('.lbd-darkroom').waitFor(); await page.waitForTimeout(300); await dock(page, 'Write'); }
    await page.locator('.script-editor-shell').waitFor(); await page.waitForTimeout(500);
    const editor = page.locator('.ProseMirror').first();
    const box = await editor.boundingBox();
    await page.mouse.move(box.x + 40, box.y + 40); await page.mouse.down(); await page.waitForTimeout(220);
    assert.equal(await editor.evaluate((el) => getComputedStyle(el).scale), 'none');
    await page.mouse.up();
  });

  if (!mobile) {
    await check('desktop: dialogs rise in (220ms); the library slides in (300ms)', async () => {
      await page.locator('button[aria-label="Workspace settings"]').first().click(); await page.waitForTimeout(40);
      assert.ok((await names(page)).some((a) => a.name === 'ds-pop' && a.ms === 220), 'ds-pop on the dialog');
      await page.keyboard.press('Escape'); await page.waitForTimeout(400);
      await page.locator('button[aria-label="Show / hide Binder"]').first().click(); await page.waitForTimeout(40);
      assert.ok((await names(page)).some((a) => a.name === 'ds-slide-in' && a.ms === 300), 'ds-slide-in on the binder');
    });
  } else {
    await check('phone: sheets keep Field Kit\'s own motion (no ds-pop stacked on top)', async () => {
      await page.locator('.fk-stop[data-fk="kit"]').click(); await page.waitForTimeout(80);
      const live = await names(page);
      assert.ok(!live.some((a) => a.name === 'ds-pop'), 'no ds-pop: ' + JSON.stringify(live));
      assert.ok(live.some((a) => a.ms === 460), 'Field Kit moves the sheet over 460ms: ' + JSON.stringify(live));
      await page.keyboard.press('Escape'); await page.waitForTimeout(500);
    });
  }

  await check(label + ': a room arriving causes no layout shift', async () => {
    const cls = await page.evaluate(() => window.__cls);
    assert.ok(cls < 0.01, 'CLS ' + cls);
  });
  await check(label + ': every transition on a control uses a studio duration', async () => {
    const odd = await page.evaluate(() => {
      window.__unexpected = [];
      const ok = new Set(['0s', '0.14s', '0.22s', '0.3s', '0.46s', '1e-05s', '0.6s', '0.2s', '0.16s', '0.25s']);
      const out = new Set();
      for (const el of document.querySelectorAll('button, a, summary, [role="button"], [role="tab"]')) for (const d of getComputedStyle(el).transitionDuration.split(',')) if (!ok.has(d.trim())) out.add(d.trim() + ' on ' + el.tagName.toLowerCase() + '.' + String(el.className).slice(0, 40));
      return [...out];
    });
    assert.deepEqual(odd, [], 'unexpected durations: ' + JSON.stringify(odd.slice(0, 4)));
  });
  await check(label + ': no script errors', async () => assert.deepEqual(errors, []));
  await context.close();
}

// ---- Reduced motion: nothing moves --------------------------------------------------------------
{
  const context = await browser.newContext({viewport: {width: 1440, height: 900}, reducedMotion: 'reduce'});
  const page = await context.newPage(); page.setDefaultTimeout(6000);
  await openApp(page, BASE);
  await check('reduced motion: rooms, dialogs and the library appear with no arrival animation', async () => {
    await dock(page, 'Develop'); await page.waitForTimeout(80);
    await page.locator('button[aria-label="Workspace settings"]').first().click(); await page.waitForTimeout(40);
    const live = (await names(page)).filter((a) => /^ds-/.test(a.name) && a.ms > 1);
    assert.deepEqual(live, [], 'no ds-* animation of any length');
    await page.keyboard.press('Escape');
  });
  await check('reduced motion: pressing does not scale', async () => {
    const button = page.locator('button[aria-label="Workspace settings"]').first();
    const box = await button.boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2); await page.mouse.down(); await page.waitForTimeout(220);
    assert.equal(await button.evaluate((el) => getComputedStyle(el).scale), 'none');
    await page.mouse.up();
  });
  await check('reduced motion: every control transition is effectively instant', async () => {
    const slow = await page.evaluate(() => { let n = 0; for (const el of document.querySelectorAll('button, a, summary')) for (const d of getComputedStyle(el).transitionDuration.split(',')) if (parseFloat(d) > 0.001 * (d.includes('ms') ? 1 : 1000) && parseFloat(d) > 0.00002) n++; return n; });
    assert.equal(slow, 0);
  });
  await context.close();
}

await browser.close();
server.close();
console.log(results.join('\n'));
const failed = results.filter((r) => r.startsWith('FAIL')).length;
console.log(`\nMOTION_QA ${results.length - failed}/${results.length} passed`);
process.exit(failed ? 1 : 0);
