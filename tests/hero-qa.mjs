// Hero QA: the lit-table scene on the public pages (css/hero.css, hero.js) and the pages around it.
// Run: PLAYWRIGHT_MODULE=<path to playwright/index.mjs> node tests/hero-qa.mjs
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve, extname, sep} from 'node:path';
import process from 'node:process';
import assert from 'node:assert/strict';

const {chromium} = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const root = process.cwd();
const results = [];
const check = async (name, run) => { try { await run(); results.push('PASS  ' + name); } catch (error) { results.push('FAIL  ' + name + ' — ' + String(error.message).split('\n')[0]); } };
const mime = {'.html': 'text/html; charset=utf-8', '.js': 'application/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.woff2': 'font/woff2', '.ico': 'image/x-icon', '.webmanifest': 'application/manifest+json'};
const server = createServer(async (request, response) => {
  const url = new URL(request.url, 'http://localhost');
  const path = resolve(root, '.' + decodeURIComponent(url.pathname));
  if (!path.startsWith(root + sep) && path !== root) { response.writeHead(403); response.end(); return; }
  try { const body = await readFile(path === root ? resolve(root, 'index.html') : path); response.writeHead(200, {'Content-Type': mime[extname(path)] || 'application/octet-stream', 'Cache-Control': 'no-store'}); response.end(body); }
  catch { response.writeHead(404); response.end('Not found'); }
});
await new Promise((done) => server.listen(4179, '127.0.0.1', done));
const BASE = 'http://127.0.0.1:4179';
const browser = await chromium.launch();
const vars = (page) => page.evaluate(() => { const s = document.querySelector('[data-lbx]').style; return {tx: parseFloat(s.getPropertyValue('--tx') || '0'), ty: parseFloat(s.getPropertyValue('--ty') || '0'), lift: parseFloat(s.getPropertyValue('--lift') || '.3')}; });
const PAGES = ['about', 'features', 'how-it-works', 'creator'];

// ---- Live ------------------------------------------------------------------------------------------
{
  const context = await browser.newContext({viewport: {width: 1440, height: 900}, reducedMotion: 'no-preference'});
  const page = await context.newPage(); page.setDefaultTimeout(6000);
  const external = [], errors = [];
  page.on('request', (r) => { if (!r.url().startsWith(BASE) && !r.url().startsWith('data:')) external.push(r.url()); });
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(BASE + '/about.html'); await page.evaluate(() => document.fonts.ready); await page.waitForTimeout(600);

  await check('live: the scene is live, labelled, and decorative text is not read twice', async () => {
    assert.equal(await page.locator('[data-lbx]').evaluate((el) => el.classList.contains('is-live')), true);
    assert.equal(await page.locator('[data-lbx]').getAttribute('role'), 'img');
    assert.match(await page.locator('[data-lbx]').getAttribute('aria-label'), /lightbox.*five film frames/i);
  });
  await check('live: the scene leans toward the pointer and settles back', async () => {
    const box = await page.locator('[data-lbx]').boundingBox();
    await page.mouse.move(box.x + box.width * .95, box.y + box.height * .1); await page.waitForTimeout(900);
    const lean = await vars(page);
    assert.ok(lean.tx > 4, 'leans right: ' + JSON.stringify(lean));
    await page.mouse.move(box.x + box.width * .05, box.y + box.height * .9); await page.waitForTimeout(900);
    const other = await vars(page);
    assert.ok(other.tx < -4, 'leans left: ' + JSON.stringify(other));
  });
  await check('live: scrolling lifts the frames apart, and they settle back on the way up', async () => {
    await page.evaluate(() => window.scrollTo(0, 0)); await page.waitForTimeout(500);
    const rest = (await vars(page)).lift;
    await page.evaluate(() => window.scrollTo(0, 520)); await page.waitForTimeout(900);
    const lifted = (await vars(page)).lift;
    assert.ok(rest < .35 && lifted > rest + .2, `rest ${rest} → lifted ${lifted}`);
    await page.evaluate(() => window.scrollTo(0, 0)); await page.waitForTimeout(1000);
    assert.ok((await vars(page)).lift < lifted - .15, 'comes back down');
  });
  await check('live: the loop stops while the hero is off screen', async () => {
    await page.evaluate(() => { window.__raf = 0; const orig = window.requestAnimationFrame; window.requestAnimationFrame = (cb) => { if ((new Error().stack || '').includes('hero.js')) window.__raf++; return orig.call(window, cb); }; });
    await page.evaluate(() => window.scrollTo(0, 2600)); await page.waitForTimeout(500);
    const before = await page.evaluate(() => window.__raf); await page.waitForTimeout(600);
    const after = await page.evaluate(() => window.__raf);
    assert.ok(after - before <= 1, `rAF calls while off screen: ${after - before}`);
    await page.evaluate(() => window.scrollTo(0, 0)); await page.waitForTimeout(400);
    const back = await page.evaluate(() => window.__raf); await page.waitForTimeout(400);
    assert.ok((await page.evaluate(() => window.__raf)) > back, 'and starts again when it returns');
  });
  await check('live: only transform, opacity and gradients are animated (no layout properties)', async () => {
    const bad = await page.evaluate(() => document.getAnimations().filter((a) => a.effect?.getKeyframes().some((k) => ['width', 'height', 'top', 'left', 'margin', 'padding', 'filter', 'boxShadow'].some((p) => k[p] !== undefined))).length);
    assert.equal(bad, 0);
  });
  await check('no request leaves the site (fonts included) and no script errors', async () => { assert.deepEqual(external, []); assert.deepEqual(errors, []); });
  await context.close();
}

// ---- Fallbacks -------------------------------------------------------------------------------------
for (const [name, options, init] of [
  ['reduced motion', {reducedMotion: 'reduce'}, ''],
  ['a small device (1 GB)', {reducedMotion: 'no-preference'}, "Object.defineProperty(navigator,'deviceMemory',{value:1})"],
  ['Save-Data', {reducedMotion: 'no-preference'}, "Object.defineProperty(navigator,'connection',{value:{saveData:true,effectiveType:'4g'}})"],
]) {
  await check(`static: ${name} holds one pose and moves nothing`, async () => {
    const context = await browser.newContext({viewport: {width: 1440, height: 900}, ...options});
    const page = await context.newPage();
    if (init) await page.addInitScript(init);
    await page.goto(BASE + '/about.html'); await page.waitForTimeout(500);
    assert.equal(await page.locator('[data-lbx]').evaluate((el) => el.classList.contains('is-static') && !el.classList.contains('is-live')), true);
    await page.mouse.move(1200, 300); await page.evaluate(() => window.scrollTo(0, 300)); await page.waitForTimeout(500);
    const v = await vars(page);
    assert.deepEqual(v, {tx: 0, ty: 0, lift: .3});
    const running = await page.evaluate(() => [...document.querySelector('[data-lbx]').querySelectorAll('*')].flatMap((e) => e.getAnimations()).filter((a) => a.playState === 'running' && a.effect.getTiming().iterations === Infinity).length);
    assert.equal(running, 0, 'no looping animation');
    assert.ok(await page.locator('.lbx-frame').count() === 5, 'all five frames still drawn');
    await context.close();
  });
}

// ---- The pages -------------------------------------------------------------------------------------
for (const [label, width, height, mobile] of [['phone 320', 320, 640, true], ['phone 390', 390, 844, true], ['tablet', 820, 1180, false], ['desktop', 1440, 900, false]]) {
  const context = await browser.newContext({viewport: {width, height}, isMobile: mobile, hasTouch: mobile});
  const page = await context.newPage();
  for (const name of PAGES) {
    await check(`${label}: ${name}.html fits the screen, tap targets are comfortable`, async () => {
      await page.goto(`${BASE}/${name}.html`); await page.evaluate(() => document.fonts.ready); await page.waitForTimeout(250);
      const report = await page.evaluate(() => {
        const w = window.innerWidth, out = [];
        if (document.documentElement.scrollWidth > w) out.push('page scrolls sideways: ' + document.documentElement.scrollWidth);
        for (const el of document.querySelectorAll('.nav a, .btn, .brand')) { const r = el.getBoundingClientRect(); if (r.height < 44 - 0.5) out.push((el.className || el.tagName) + ' is ' + Math.round(r.height) + 'px tall'); }
        return out;
      });
      assert.deepEqual(report, []);
    });
  }
  if (mobile === false && width === 1440) {
    await check('desktop: keyboard focus is visible on links and buttons', async () => {
      await page.goto(BASE + '/about.html'); await page.keyboard.press('Tab'); await page.keyboard.press('Tab');
      const outline = await page.evaluate(() => { const cs = getComputedStyle(document.activeElement); return {w: cs.outlineWidth, s: cs.outlineStyle, tag: document.activeElement.tagName}; });
      assert.ok(outline.s !== 'none' && parseFloat(outline.w) >= 2, JSON.stringify(outline));
    });
    await check('desktop: body text and eyebrows are never smaller than 11px', async () => {
      const small = await page.evaluate(() => [...document.querySelectorAll('body *')].filter((e) => e.childNodes.length && [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()) && parseFloat(getComputedStyle(e).fontSize) < 11).length);
      assert.equal(small, 0);
    });
  }
  await context.close();
}

await browser.close();
server.close();
console.log(results.join('\n'));
const failed = results.filter((r) => r.startsWith('FAIL')).length;
console.log(`\nHERO_QA ${results.length - failed}/${results.length} passed`);
process.exit(failed ? 1 : 0);
