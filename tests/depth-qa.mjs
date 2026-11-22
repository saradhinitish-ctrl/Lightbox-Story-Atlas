// Depth QA: the Atlas darkroom's parallax layers (wall, safelight) in story-cylinder-v9.js.
// Run: PLAYWRIGHT_MODULE=<path to playwright/index.mjs> node tests/depth-qa.mjs
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve, extname, sep} from 'node:path';
import process from 'node:process';
import assert from 'node:assert/strict';
import {openApp} from './fixtures.mjs';

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
await new Promise((done) => server.listen(4180, '127.0.0.1', done));
const BASE = 'http://127.0.0.1:4180';
const browser = await chromium.launch();
const layer = (page) => page.evaluate(() => {
  const n = (el) => { const t = getComputedStyle(el).translate; if (t === 'none') return {x: 0, y: 0}; const [x, y] = t.split(' ').map(parseFloat); return {x, y: y || 0}; };
  return {wall: n(document.querySelector('.lbd-beam')), lamp: n(document.querySelector('.lbd-lamp'))};
});

// ---- Desk: the cursor looks around the room ------------------------------------------------------------
{
  const context = await browser.newContext({viewport: {width: 1440, height: 900}, reducedMotion: 'no-preference'});
  const page = await context.newPage(); page.setDefaultTimeout(6000);
  const errors = []; page.on('pageerror', (e) => errors.push(e.message));
  await openApp(page, BASE);
  const host = await page.locator('.lbd-darkroom').boundingBox();
  await check('desk: the wall slides against the cursor, the lamp a little further', async () => {
    await page.mouse.move(host.x + host.width * .95, host.y + host.height * .5); await page.waitForTimeout(1200);
    const right = await layer(page);
    assert.ok(right.wall.x < -2 && right.wall.x > -12, 'wall ' + JSON.stringify(right));
    assert.ok(Math.abs(right.lamp.x / right.wall.x - 1.7) < .25, 'lamp is 1.7x the wall: ' + JSON.stringify(right));
    await page.mouse.move(host.x + host.width * .05, host.y + host.height * .5); await page.waitForTimeout(1200);
    const left = await layer(page);
    assert.ok(left.wall.x > 2, 'and the other way: ' + JSON.stringify(left));
  });
  await check('desk: it never moves further than a few pixels (the wall stays inside its edges)', async () => {
    const reach = 1440 * .012;
    for (const fx of [0, 1]) { await page.mouse.move(host.x + host.width * fx, host.y + 20); await page.waitForTimeout(900); const l = await layer(page); assert.ok(Math.abs(l.wall.x) <= reach * 1.01 && Math.abs(l.lamp.x) <= reach * 1.75, JSON.stringify(l)); }
  });
  await check('desk: it settles when the cursor leaves', async () => {
    await page.mouse.move(5, 5); await page.waitForTimeout(1600);
    const l = await layer(page);
    assert.ok(Math.abs(l.wall.x) < 1.5, JSON.stringify(l));
  });
  await check('desk: the room never grows a sideways scroll, at either extreme', async () => {
    for (const fx of [0, 1]) {
      await page.mouse.move(host.x + host.width * fx, host.y + 40); await page.waitForTimeout(900);
      const over = await page.evaluate(() => ({page: document.documentElement.scrollWidth - innerWidth, room: (() => { const b = document.querySelector('.studio .editor-body'); return b ? b.scrollWidth - b.clientWidth : 0; })()}));
      assert.ok(over.page <= 0 && over.room <= 1, JSON.stringify(over));
    }
  });
  await check('desk: no script errors', async () => assert.deepEqual(errors, []));
  await context.close();
}

// ---- Phone: swiping the line pans the room --------------------------------------------------------------
{
  const context = await browser.newContext({viewport: {width: 390, height: 844}, hasTouch: true, isMobile: true, reducedMotion: 'no-preference'});
  const page = await context.newPage(); page.setDefaultTimeout(6000);
  await openApp(page, BASE);
  const scroll = (to) => page.evaluate((t) => { const s = document.querySelector('.lbd-scroller'); s.scrollTo({left: t === 'end' ? s.scrollWidth : 0}); }, to);
  await check('phone: swiping along the line slides the wall slower than the prints', async () => {
    await scroll('start'); await page.waitForTimeout(1200);
    const start = await layer(page);
    await scroll('end'); await page.waitForTimeout(1400);
    const end = await layer(page);
    assert.ok(start.wall.x > 3 && end.wall.x < -3, `start ${start.wall.x} → end ${end.wall.x}`);
    const travelled = await page.evaluate(() => document.querySelector('.lbd-scroller').scrollWidth - innerWidth);
    assert.ok(Math.abs(end.wall.x - start.wall.x) < travelled * .05, 'the wall moves a small fraction of the prints');
  });
  await check('phone: the room never grows a sideways scroll while it pans', async () => {
    for (const to of ['start', 'end', 'start']) {
      await scroll(to); await page.waitForTimeout(1000);
      const over = await page.evaluate(() => ({page: document.documentElement.scrollWidth - innerWidth, room: (() => { const b = document.querySelector('.studio .editor-body'); return b ? b.scrollWidth - b.clientWidth : 0; })()}));
      assert.ok(over.page <= 0 && over.room <= 1, to + ' ' + JSON.stringify(over));
    }
  });
  await check('phone: a tilt of the phone nudges the room (only where no permission is needed)', async () => {
    await scroll('start'); await page.waitForTimeout(800);
    const before = await layer(page);
    await page.evaluate(() => window.dispatchEvent(Object.assign(new Event('deviceorientation'), {gamma: -24, beta: 52, alpha: 0})));
    await page.waitForTimeout(1000);
    const tilted = await layer(page);
    assert.ok(tilted.wall.x - before.wall.x > 3, `${before.wall.x} → ${tilted.wall.x}`);
  });
  await check('phone: the studio steps back while the kit is open, and returns when it closes', async () => {
    await page.locator('.fk-stop[data-fk="kit"]').click(); await page.waitForTimeout(900);
    assert.equal(await page.evaluate(() => getComputedStyle(document.querySelector('#root')).scale), '0.955');
    assert.equal(await page.evaluate(() => ['.fk-bar', '.fk-sheet', '.fk-veil'].every((q) => document.querySelector(q).parentElement === document.body)), true, 'bar, sheet and veil stay outside the scaled layer');
    await page.keyboard.press('Escape'); await page.waitForTimeout(900);
    assert.equal(await page.evaluate(() => getComputedStyle(document.querySelector('#root')).scale), 'none');
  });
  await check('phone: frames stay smooth while it moves (p95 under 22ms)', async () => {
    const stats = await page.evaluate(() => new Promise((res) => {
      const s = document.querySelector('.lbd-scroller'), d = []; let last = performance.now(), n = 0;
      const f = (now) => { d.push(now - last); last = now; s.scrollLeft = (Math.sin(n++ / 18) + 1) / 2 * (s.scrollWidth - s.clientWidth); if (n < 150) requestAnimationFrame(f); else { d.sort((a, b) => a - b); res({p95: d[Math.floor(d.length * .95)]}); } };
      requestAnimationFrame(f);
    }));
    assert.ok(stats.p95 < 22, 'p95 ' + stats.p95);
  });
  await context.close();
}

// ---- Reduced motion: the room holds still ------------------------------------------------------------------
{
  const context = await browser.newContext({viewport: {width: 1440, height: 900}, reducedMotion: 'reduce'});
  const page = await context.newPage(); page.setDefaultTimeout(6000);
  await openApp(page, BASE);
  await check('reduced motion: the wall and lamp never move', async () => {
    const host = await page.locator('.lbd-darkroom').boundingBox();
    await page.mouse.move(host.x + host.width * .95, host.y + 100); await page.waitForTimeout(900);
    await page.evaluate(() => window.dispatchEvent(Object.assign(new Event('deviceorientation'), {gamma: 24, beta: 52})));
    await page.waitForTimeout(500);
    assert.deepEqual(await layer(page), {wall: {x: 0, y: 0}, lamp: {x: 0, y: 0}});
  });
  await context.close();
}
{
  const context = await browser.newContext({viewport: {width: 390, height: 844}, hasTouch: true, isMobile: true, reducedMotion: 'reduce'});
  const page = await context.newPage(); page.setDefaultTimeout(6000);
  await openApp(page, BASE);
  await check('reduced motion: the studio does not scale behind the kit', async () => {
    await page.locator('.fk-stop[data-fk="kit"]').click(); await page.waitForTimeout(700);
    assert.equal(await page.evaluate(() => getComputedStyle(document.querySelector('#root')).scale), 'none');
  });
  await context.close();
}

await browser.close();
server.close();
console.log(results.join('\n'));
const failed = results.filter((r) => r.startsWith('FAIL')).length;
console.log(`\nDEPTH_QA ${results.length - failed}/${results.length} passed`);
process.exit(failed ? 1 : 0);
