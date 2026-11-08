// Atlas light table + rooms: browser checks (isolated temp browser profile).
// Run: PLAYWRIGHT_MODULE=<path to playwright/index.mjs> node tests/atlas-light-table-qa.mjs
// The Classic view (the cylinder) is covered by tests/story-cylinder-qa.mjs.
import {createServer} from 'node:http';
import {readFile, mkdir, writeFile} from 'node:fs/promises';
import {resolve, extname, sep} from 'node:path';
import process from 'node:process';
import assert from 'node:assert/strict';

const {chromium} = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const root = process.cwd();
const dir = resolve(root, 'qa-artifacts');
await mkdir(dir, {recursive: true});

// Source-level guards: the light table never animates blur or layout.
const css = await readFile(resolve(root, 'atlas-light-table.css'), 'utf8') + await readFile(resolve(root, 'light-table-rooms.css'), 'utf8');
for (const m of css.matchAll(/transition\s*:([^;}]*)/g)) assert.doesNotMatch(m[1], /filter|blur|width|height|top|left/, 'No transition on filter or layout: ' + m[1]);
for (const m of css.matchAll(/@keyframes[^{]*\{((?:[^{}]*\{[^}]*\})*)\s*\}/g)) assert.doesNotMatch(m[1], /filter|blur/, 'No keyframes animate blur');
for (const m of css.matchAll(/blur\((\d+(?:\.\d+)?)px\)/g)) assert.ok(Number(m[1]) <= 3, 'Blur at rest is at most 3px');

const mime = {'.html': 'text/html; charset=utf-8', '.js': 'application/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.woff2': 'font/woff2', '.ico': 'image/x-icon', '.webmanifest': 'application/manifest+json'};
const server = createServer(async (request, response) => {
  const url = new URL(request.url, 'http://localhost');
  const path = resolve(root, '.' + decodeURIComponent(url.pathname));
  if (!path.startsWith(root + sep) && path !== root) { response.writeHead(403); response.end(); return; }
  try {
    const body = await readFile(path === root ? resolve(root, 'index.html') : path);
    response.writeHead(200, {'Content-Type': mime[extname(path)] || 'application/octet-stream', 'Cache-Control': 'no-store'});
    response.end(body);
  } catch { response.writeHead(404); response.end('Not found'); }
});
await new Promise((done) => server.listen(4174, '127.0.0.1', done));
const BASE = 'http://127.0.0.1:4174/index.html';

// A small real project, in the app's own data shape
function seed() {
  let n = 0;
  const id = () => '00000000-0000-4000-8000-' + String(++n).padStart(12, '0');
  const at = '2026-11-08T10:00:00.000Z';
  const node = (title, kind, parent, order = 0, extra = {}) => ({id: id(), parent, order, title, kind, html: '', synopsis: '', notes: '', label: 'None', status: 'No status', keywords: [], include: kind === 'screenplay' || kind === 'text', sectionType: 'Scene', target: 0, created: at, updated: at, fields: {}, bookmarks: [], comments: [], ...extra});
  const p = (el, text, key) => `<p data-element="${el}"${key ? ` data-scene-key="${key}"` : ''}>${text}</p>`;
  const draft = node('Draft', 'folder', null, 0, {role: 'draft'}), research = node('Research', 'folder', null, 3, {role: 'research', include: false});
  const dev = node('Development', 'folder', null, -1, {role: 'development', include: false});
  const nodes = [draft, research, node('Trash', 'folder', null, 4, {role: 'trash', include: false}), node('Characters', 'folder', null, 1, {role: 'characters', include: false}), node('Locations', 'folder', null, 2, {role: 'locations', include: false}), node('Props', 'folder', null, 2.5, {role: 'props', include: false}), dev,
    node('Story Foundation', 'text', dev.id, 0, {include: false, fields: {'development.kind': 'foundation', 'development.premise': 'A candy maker finds the sugar she spins can hold memories.', 'development.logline': 'One breath.'}})];
  nodes.push(node('Opening', 'screenplay', draft.id, 0, {html: [p('scene', 'INT. SWEET DRIFT CONFECTIONERY — NIGHT', 'k1'), p('action', 'Copper pans tick as they cool.'), p('scene', 'EXT. HARBOUR ROAD — CONTINUOUS', 'k2'), p('action', 'Fog rolls off the water.'), p('character', 'MAYA'), p('dialogue', 'It is just sugar, Tomas.')].join('')}));
  [['A question to chase', 'question'], ['A fact to keep', 'fact'], ['A place to see', 'place']].forEach(([t, k], i) => nodes.push(node(t, 'text', research.id, i, {include: false, html: '<p>Body of ' + t + '.</p>', fields: {'research.kind': k}})));
  return {revision: 1, userId: 'lightbox-portable-local', state: {version: 3, editorVersion: 2, projects: [{id: 'qa-project', title: 'Sweet Drift', author: '', description: '', template: 'screenplay', nodes, collections: [], customFields: [], target: 0, created: at, updated: at}], snapshots: [], scratch: '', history: {}}};
}
async function open(page, data = seed()) {
  await page.goto(BASE);
  await page.evaluate(async (data) => {
    await new Promise((res, rej) => { const r = indexedDB.open('lightbox-portable-v64', 1); r.onupgradeneeded = () => r.result.createObjectStore('workspace'); r.onsuccess = () => { const t = r.result.transaction('workspace', 'readwrite'); t.objectStore('workspace').put(data, 'current'); t.oncomplete = () => { r.result.close(); res(); }; t.onerror = rej; }; });
    localStorage.clear(); localStorage.setItem('desk-last-project', 'qa-project');
  }, data);
  await page.reload();
  await page.locator('.lb-opener__skip').click({timeout: 1500}).catch(() => {});
  await page.locator('.lb-cylinder-v9.is-rack').waitFor({state: 'visible', timeout: 20000});
  await page.waitForTimeout(400);
}
const readProject = (page) => page.evaluate(async () => new Promise((res) => { const r = indexedDB.open('lightbox-portable-v64', 1); r.onsuccess = () => { const g = r.result.transaction('workspace').objectStore('workspace').get('current'); g.onsuccess = () => res(g.result.state.projects[0]); }; }));
const activeId = (page) => page.locator('.lb-cylinder-card.is-active').getAttribute('data-id');
const ensureAtlas = async (page) => {
  if (await page.locator('.lb-cylinder-v9').isVisible().catch(() => false)) return;
  if (await page.locator('.lb-cylinder-back').isVisible().catch(() => false)) await page.locator('.lb-cylinder-back').click();
  else await page.locator('.app-wordmark').click();
  await page.locator('.lb-cylinder-v9').waitFor({state: 'visible', timeout: 5000}); await page.waitForTimeout(300);
};
const backToAtlas = async (page) => { await page.locator('.lb-cylinder-back').click(); await page.locator('.lb-cylinder-v9').waitFor({state: 'visible', timeout: 5000}); await page.waitForTimeout(300); };

const browser = await chromium.launch({headless: true});
const results = [];
const check = async (name, fn) => {
  try { await fn(); results.push({name, status: 'passed'}); console.log('  ✓ ' + name); }
  catch (error) { results.push({name, status: 'failed', error: String(error)}); console.log('  ✗ ' + name + '\n    ' + error.message); }
};
try {
  // 1. Layout at every size
  for (const [width, height] of [[320, 900], [390, 844], [768, 900], [1200, 900], [1440, 900], [1920, 1080], [1440, 700], [1200, 768]]) {
    await check('layout ' + width + 'x' + height, async () => {
      const page = await browser.newPage({viewport: {width, height}});
      const errors = [];
      page.on('pageerror', (e) => errors.push(e.message));
      page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
      await open(page);
      const m = await page.evaluate(() => {
        const cards = [...document.querySelectorAll('.lb-cylinder-card')];
        const active = document.querySelector('.lb-cylinder-card.is-active');
        const r = active.getBoundingClientRect(), cont = active.querySelector('.lbx-continue')?.getBoundingClientRect();
        const dock = document.querySelector('.creative-dock'), dockTop = dock && getComputedStyle(dock).display !== 'none' ? dock.getBoundingClientRect().top : innerHeight;
        return {cards: cards.length, scroll: document.documentElement.scrollWidth, active: active.dataset.id, blurred: cards.filter((c) => getComputedStyle(c.querySelector('.lb-cylinder-content')).filter.includes('blur')).length,
          activeFilter: getComputedStyle(active.querySelector('.lb-cylinder-content')).filter, contVisible: !!cont && cont.bottom <= r.bottom + 1 && cont.height > 20,
          controlsBottom: document.querySelector('.lb-cylinder-controls').getBoundingClientRect().bottom, dockTop, counter: document.querySelector('.lb-cylinder-counter').textContent,
          toggle: !!document.querySelector('.lbx-layout-toggle')?.offsetParent, status: [...document.querySelectorAll('.lbx-status')].length};
      });
      assert.equal(m.cards, 5, 'five cards');
      assert.ok(m.scroll <= width + 2, 'no horizontal overflow: ' + m.scroll);
      assert.equal(m.active, 'script', 'the screenplay is in focus first');
      assert.equal(m.activeFilter, 'none', 'the lit card is sharp');
      assert.ok(m.blurred <= 2, 'blur on at most two cards (the neighbours): ' + m.blurred);
      assert.ok(m.contVisible, 'Continue button is inside the card');
      assert.equal(m.counter, '03 / 05');
      assert.ok(m.toggle, 'Classic view toggle visible');
      assert.equal(m.status, 5, 'a live status line on every card');
      assert.ok(m.controlsBottom <= Math.min(height, m.dockTop) + 4, 'controls above the dock');
      assert.deepEqual(errors, []);
      await page.screenshot({path: resolve(dir, 'light-table-' + width + 'x' + height + '.png')});
      await page.close();
    });
  }

  const page = await browser.newPage({viewport: {width: 1440, height: 900}});
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await open(page);

  // 2. Navigation: arrows, keys, neighbour click focuses, drag, wheel; no room opens
  await check('rack focus navigation', async () => {
    await page.locator('.lb-cylinder-next').click(); await page.waitForTimeout(500);
    assert.equal(await activeId(page), 'visual');
    await page.locator('.lb-cylinder-prev').click(); await page.waitForTimeout(500);
    await page.locator('.lb-cylinder-stage').focus();
    await page.keyboard.press('ArrowLeft'); await page.waitForTimeout(500);
    assert.equal(await activeId(page), 'research');
    await page.locator('.lb-cylinder-card.lb-cylinder-script').click(); await page.waitForTimeout(500);
    assert.equal(await activeId(page), 'script', 'clicking a neighbour brings it into focus');
    assert.ok(await page.locator('.story-atlas').isVisible(), 'and does not open it');
    const box = await page.locator('.lb-cylinder-stage').boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2); await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2 - 280, box.y + box.height / 2, {steps: 12}); await page.mouse.up();
    await page.waitForTimeout(600);
    assert.notEqual(await activeId(page), 'script', 'drag moves the table');
    assert.ok(await page.locator('.story-atlas').isVisible(), 'drag never opens a room');
    await page.mouse.wheel(-320, 0); await page.waitForTimeout(600);
    for (let i = 0; i < 5 && (await activeId(page)) !== 'script'; i++) { await page.locator('.lb-cylinder-prev').click(); await page.waitForTimeout(300); }
    assert.equal(await activeId(page), 'script');
  });

  // 3. Keyboard focus is visible without blur
  await check('visible keyboard focus', async () => {
    await page.locator('.lb-cylinder-card.lb-cylinder-visual').focus();
    await page.keyboard.press('Shift+Tab'); await page.keyboard.press('Tab');
    await page.waitForTimeout(500);
    const f = await page.evaluate(() => { const el = document.activeElement; const plaque = el.querySelector?.('.lb-cylinder-plaque'); return {outline: plaque ? getComputedStyle(plaque).outlineStyle : getComputedStyle(el).outlineStyle, filter: el.querySelector?.('.lb-cylinder-content') ? getComputedStyle(el.querySelector('.lb-cylinder-content')).filter : 'none'}; });
    assert.notEqual(f.outline, 'none', 'focus has an outline');
    assert.equal(f.filter, 'none', 'focused card is not blurred');
    for (let i = 0; i < 5 && (await activeId(page)) !== 'script'; i++) { await page.locator('.lb-cylinder-prev').click(); await page.waitForTimeout(300); }
  });

  // 4. Continue at the exact spot, through the push-in
  await check('continue writing at the exact spot (push-in)', async () => {
    await page.locator('.lb-cylinder-script .lbx-room').click();
    await page.locator('.ProseMirror').waitFor();
    await page.waitForTimeout(400);
    await page.locator('.ProseMirror p', {hasText: 'just sugar'}).click();
    await page.keyboard.press('End'); for (let i = 0; i < 6; i++) await page.keyboard.press('ArrowLeft');
    await page.keyboard.type('X');
    await page.waitForTimeout(800);
    await backToAtlas(page);
    assert.equal((await page.locator('.lbx-continue').textContent()).trim(), 'Continue Scene 02');
    assert.match(await page.locator('.lbx-lines').innerText(), /It is just sugar, XTomas\./);
    await page.evaluate(() => { window.__vt = []; const o = document.startViewTransition.bind(document); document.startViewTransition = (cb) => { const t = o(cb); t.ready.then(() => window.__vt.push('ready'), (e) => window.__vt.push('fail ' + e.message)); return t; }; });
    await page.waitForTimeout(1600);
    await page.locator('.lbx-continue').click();
    await page.waitForTimeout(1200);
    const r = await page.evaluate(() => { const s = getSelection(); return {text: s.anchorNode?.textContent, offset: s.anchorOffset, vt: window.__vt, names: document.querySelectorAll('[style*="view-transition-name"]').length}; });
    assert.deepEqual(r.vt, ['ready'], 'one shared-element transition ran');
    assert.equal(r.text, 'It is just sugar, XTomas.');
    assert.equal(r.offset, 'It is just sugar, X'.length, 'caret on the exact character');
    assert.equal(r.names, 0, 'no transition names left behind');
    await backToAtlas(page);
  });

  // 5. Classic view toggle and persistence
  await check('Classic view restores the cylinder', async () => {
    await page.locator('.lbx-layout-toggle').click(); await page.waitForTimeout(400);
    assert.equal(await page.locator('.lb-cylinder-v9.is-classic').count(), 1);
    assert.ok(await page.evaluate(() => document.querySelector('.lb-cylinder-body').width > 0), 'cylinder canvas drawn');
    await page.reload(); await page.locator('.lb-cylinder-v9').waitFor(); await page.waitForTimeout(300);
    assert.equal(await page.locator('.lb-cylinder-v9.is-classic').count(), 1, 'kept after reload');
    await page.locator('.lbx-layout-toggle').click(); await page.waitForTimeout(400);
    assert.equal(await page.locator('.lb-cylinder-v9.is-rack').count(), 1);
  });

  // 6. Research board: real notes, drag saves position + order, strings save
  await check('research board saves drag and string', async () => {
    await ensureAtlas(page);
    for (let i = 0; i < 5 && (await activeId(page)) !== 'research'; i++) { await page.locator('.lb-cylinder-prev').click(); await page.waitForTimeout(300); }
    await page.waitForTimeout(400);
    await page.locator('.lb-cylinder-research').click({position: {x: 60, y: 60}});
    await page.locator('.lbx-pin').first().waitFor();
    await page.waitForTimeout(900);   // let the push-in finish: the page is not interactive during a view transition
    assert.deepEqual(await page.locator('.lbx-pin-title').allTextContents(), ['A question to chase', 'A fact to keep', 'A place to see']);
    // Move the first note down into free space: the reading order follows the board
    const b = await page.locator('.lbx-pin').nth(0).boundingBox();
    await page.mouse.move(b.x + 80, b.y + 80); await page.mouse.down();
    await page.mouse.move(b.x + 80 + 40, b.y + 80 + 230, {steps: 14}); await page.mouse.up();
    await page.waitForTimeout(600);
    await page.locator('.lbx-pin').nth(0).locator('.lbx-pin-tie').click();
    await page.locator('.lbx-pin').nth(1).click({position: {x: 100, y: 70}});
    await page.waitForTimeout(2500);
    const p = await readProject(page);
    const notes = p.nodes.filter((n) => n.parent === p.nodes.find((x) => x.role === 'research').id).sort((a, c) => a.order - c.order);
    assert.deepEqual(notes.map((n) => n.title), ['A fact to keep', 'A place to see', 'A question to chase'], 'dragging reorders by reading order');
    assert.ok(notes.every((n) => Number.isFinite(n.x) && Number.isFinite(n.y)), 'positions saved');
    assert.ok(notes.some((n) => (n.fields['research.links'] || '').length > 0), 'string saved');
    assert.equal(await page.locator('.lbx-string').count(), 1);
    await page.locator('.lbx-board-toggle button', {hasText: 'Cards'}).click();
    assert.ok(await page.locator('.card-stage').isVisible(), 'original cards one click away');
    await page.locator('.lbx-board-toggle button', {hasText: 'Board'}).click();
    await backToAtlas(page);
  });

  // 7. Film frames on Visual Language only
  await check('film frames with project edge codes', async () => {
    await ensureAtlas(page);
    await page.locator('.creative-dock button', {hasText: 'Visuals'}).first().click();
    await page.locator('.vl-scene-cover').first().waitFor();
    await page.waitForTimeout(400);
    const codes = await page.$$eval('.vl-scene-cover', (els) => els.map((e) => e.dataset.edge));
    assert.match(codes[0], /^SWEET DRIFT ◆ SC 01 ◆ TK 01 ◆ 0000\+00$/);
    assert.match(codes[1], /^SWEET DRIFT ◆ SC 02 ◆ TK \d\d ◆ \d{4}\+\d\d$/);
    assert.equal(await page.locator('.lbx-film').count(), codes.length);
    await backToAtlas(page);
    assert.equal(await page.locator('.lbx-film').count(), 0, 'no film frames on the Atlas');
  });

  // 8. Pitch view, search and Export PDF still work
  await check('pitch view, search and export', async () => {
    await ensureAtlas(page);
    await page.locator('.pitch-launch').click();
    await page.locator('.pitch-stage').waitFor({timeout: 5000});
    await page.keyboard.press('Escape').catch(() => {});
    await page.locator('.app-wordmark').click().catch(() => {});
    await page.locator('.lb-cylinder-v9').waitFor({timeout: 5000}).catch(() => {});
    await page.locator('.command-trigger').click();
    await page.locator('.studio-command input').fill('Opening');
    await page.waitForTimeout(300);
    assert.ok(await page.locator('.studio-command').getByText('Opening').first().isVisible(), 'search finds the scene document');
    await page.keyboard.press('Escape');
    await page.locator('.compile-button').click();
    const download = page.waitForEvent('download', {timeout: 20000});
    await page.getByRole('button', {name: /Download PDF/}).click();
    const file = await download;
    const bytes = await readFile(await file.path());
    assert.equal(bytes.subarray(0, 5).toString(), '%PDF-', 'a PDF was exported');
    assert.ok(bytes.length > 1000, 'a non-trivial PDF');
  });

  // 9. Reduced motion: the table fades, nothing slides
  await check('reduced motion uses fades', async () => {
    const rm = await browser.newPage({viewport: {width: 1440, height: 900}, reducedMotion: 'reduce'});
    await open(rm);
    const before = await rm.locator('.lb-cylinder-visual').evaluate((e) => e.style.transform);
    await rm.locator('.lb-cylinder-next').click();
    const r = await rm.evaluate(() => ({fading: document.querySelector('.lb-cylinder-rotor').classList.contains('is-fading'), anim: getComputedStyle(document.querySelector('.lb-cylinder-rotor')).animationName}));
    assert.ok(r.fading && r.anim === 'lbx-rack-fade', 'a fade, not a slide');
    const after = await rm.locator('.lb-cylinder-visual').evaluate((e) => e.style.transform);
    assert.notEqual(before, after, 'the card is in place at once');
    await rm.close();
  });

  // 10. Frame time while moving, on a 4x slower CPU (an ordinary laptop)
  await check('smooth on a throttled CPU', async () => {
    const cdp = await page.context().newCDPSession(page);
    await page.locator('.app-wordmark').click().catch(() => {});
    await page.locator('.lb-cylinder-v9').waitFor();
    await cdp.send('Emulation.setCPUThrottlingRate', {rate: 4});
    const stats = await page.evaluate(async () => {
      const frames = []; let last = performance.now(); let run = true;
      const tick = (t) => { frames.push(t - last); last = t; if (run) requestAnimationFrame(tick); };
      requestAnimationFrame(tick);
      for (let i = 0; i < 4; i++) { document.querySelector('.lb-cylinder-next').click(); await new Promise((r) => setTimeout(r, 450)); }
      run = false;
      frames.shift();
      const sorted = [...frames].sort((a, b) => a - b);
      return {frames: frames.length, p95: sorted[Math.floor(sorted.length * .95)], max: sorted.at(-1), avg: frames.reduce((a, b) => a + b, 0) / frames.length};
    });
    await cdp.send('Emulation.setCPUThrottlingRate', {rate: 1});
    console.log('    frames', JSON.stringify(stats));
    assert.ok(stats.p95 < 34, '95% of frames under 34ms at 4x CPU throttle: ' + stats.p95);
  });

  // 11. Saved data survives a reload
  await check('saved data intact after reload', async () => {
    await page.reload(); await page.locator('.lb-cylinder-v9').waitFor(); await page.waitForTimeout(500);
    const p = await readProject(page);
    assert.match(p.nodes.find((n) => n.title === 'Opening').html, /just sugar, XTomas/);
    assert.equal(p.nodes.find((n) => n.fields['development.kind'] === 'foundation').fields['development.premise'], 'A candy maker finds the sugar she spins can hold memories.');
    assert.equal((await page.locator('.lbx-continue').textContent()).trim(), 'Continue Scene 02');
  });
  await check('no console errors', async () => assert.deepEqual(errors, []));
  await page.close();
} finally {
  await writeFile(resolve(dir, 'light-table-results.json'), JSON.stringify(results, null, 2));
  await browser.close();
  await new Promise((done) => server.close(done));
  const failed = results.filter((r) => r.status !== 'passed');
  console.log('LIGHT_TABLE_QA ' + (results.length - failed.length) + '/' + results.length + ' passed');
  if (failed.length) process.exitCode = 1;
}
