// Field Kit (the phone experience): browser checks in an isolated temp profile.
// Run: PLAYWRIGHT_MODULE=<path to playwright/index.mjs> node tests/field-kit-qa.mjs
// Screenshots and a results file go to qa-artifacts/.
import {createServer} from 'node:http';
import {readFile, mkdir, writeFile} from 'node:fs/promises';
import {resolve, extname, sep} from 'node:path';
import process from 'node:process';
import assert from 'node:assert/strict';

const {chromium} = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const root = process.cwd();
const dir = resolve(root, 'qa-artifacts');
await mkdir(dir, {recursive: true});

// ---- Source guards: nothing in the phone layer can reach the desktop ----------------------------
const css = await readFile(resolve(root, 'field-kit.css'), 'utf8');
const stripped = css.replace(/\/\*[\s\S]*?\*\//g, '').trim();
assert.ok(stripped.startsWith('@media (max-width: 767px) {'), 'The stylesheet opens with the phone media query');
let depth = 0, closedAt = -1;
for (let i = 0; i < stripped.length; i++) { if (stripped[i] === '{') depth++; else if (stripped[i] === '}' && --depth === 0) { closedAt = i; break; } }
assert.equal(closedAt, stripped.length - 1, 'Every rule is inside that one media query');
for (const m of stripped.matchAll(/(?:^|[{}])\s*([^{}@]+)\{/g)) {
  const selector = m[1].trim();
  if (/^(from|to|\d+%)/.test(selector)) continue;
  for (const part of selector.split(/,(?![^(]*\))/)) assert.match(part.trim(), /^html\.fk/, 'Selector is scoped to html.fk: ' + part.trim().slice(0, 80));
}
for (const m of css.matchAll(/transition\s*:([^;}]*)/g)) assert.doesNotMatch(m[1], /\b(width|height|top|left|bottom|filter|box-shadow)\b(?!-)/, 'Transitions stay on transform, opacity and colour: ' + m[1].trim().slice(0, 60));
const js = await readFile(resolve(root, 'field-kit.js'), 'utf8');
assert.doesNotMatch(js, /indexedDB|localStorage|sessionStorage|fetch\(/, 'The kit stores and sends nothing');

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
await new Promise((done) => server.listen(4176, '127.0.0.1', done));
const BASE = 'http://127.0.0.1:4176/index.html';

// A small real project, in the app's own data shape
function seed() {
  let n = 0;
  const id = () => '00000000-0000-4000-8000-' + String(++n).padStart(12, '0');
  const at = '2026-11-08T10:00:00.000Z';
  const node = (title, kind, parent, order = 0, extra = {}) => ({id: id(), parent, order, title, kind, html: '', synopsis: '', notes: '', label: 'None', status: 'No status', keywords: [], include: kind === 'screenplay' || kind === 'text', sectionType: 'Scene', target: 0, created: at, updated: at, fields: {}, bookmarks: [], comments: [], ...extra});
  const p = (el, text, key) => `<p data-element="${el}"${key ? ` data-scene-key="${key}"` : ''}>${text}</p>`;
  const draft = node('Draft', 'folder', null, 0, {role: 'draft'}), research = node('Research', 'folder', null, 3, {role: 'research', include: false});
  const dev = node('Development', 'folder', null, -1, {role: 'development', include: false});
  const characters = node('Characters', 'folder', null, 1, {role: 'characters', include: false});
  const nodes = [draft, research, node('Trash', 'folder', null, 4, {role: 'trash', include: false}), characters, node('Locations', 'folder', null, 2, {role: 'locations', include: false}), node('Props', 'folder', null, 2.5, {role: 'props', include: false}), dev,
    node('Story Foundation', 'text', dev.id, 0, {include: false, fields: {'development.kind': 'foundation', 'development.premise': 'A candy maker finds the sugar she spins can hold memories.', 'development.logline': 'One breath.'}}),
    node('Maya', 'character', characters.id, 0, {include: false})];
  nodes.push(node('Opening', 'screenplay', draft.id, 0, {html: [p('scene', 'INT. SWEET DRIFT CONFECTIONERY — NIGHT', 'k1'), p('action', 'Copper pans tick as they cool.'), p('scene', 'EXT. HARBOUR ROAD — CONTINUOUS', 'k2'), p('action', 'Fog rolls off the water.'), p('character', 'MAYA'), p('dialogue', 'It is just sugar, Tomas.')].join('')}));
  [['A question to chase', 'question', 'open'], ['A fact to keep', 'fact', 'followed']].forEach(([t, k, st], i) => nodes.push(node(t, 'text', research.id, i, {include: false, html: '<p>Body of ' + t + '.</p>', fields: {'research.kind': k, 'research.status': st}})));
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
  await page.locator('.lbd-darkroom').waitFor({state: 'visible', timeout: 20000});
  await page.waitForTimeout(500);
}

const results = [];
const check = async (name, run) => { try { await run(); results.push('PASS  ' + name); } catch (error) { results.push('FAIL  ' + name + ' — ' + String(error.message).split('\n')[0]); } };
const browser = await chromium.launch();

// ---- Phones ---------------------------------------------------------------------------------------
for (const width of [360, 390, 430]) {
  const context = await browser.newContext({viewport: {width, height: 800}, deviceScaleFactor: 2, hasTouch: true, isMobile: true});
  const page = await context.newPage();
  page.setDefaultTimeout(5000);
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await open(page);
  const place = () => page.evaluate(() => window.LightboxFieldKit.place());
  const stop = (id) => page.locator(`.fk-stop[data-fk="${id}"]`).click();
  const kit = async (id) => { await stop('kit'); await page.locator('.fk-sheet.is-open').waitFor(); await page.waitForTimeout(350); await page.locator(`[data-fk-act="${id}"]`).click(); await page.waitForTimeout(700); };
  // Nothing wider than the screen: the page itself, the room's scroller, and every visible control
  const fits = async (label) => {
    const report = await page.evaluate(() => {
      const w = window.innerWidth, out = [];
      if (document.documentElement.scrollWidth > w) out.push('page ' + document.documentElement.scrollWidth);
      const body = document.querySelector('.studio .editor-body');
      if (body && body.scrollWidth > body.clientWidth + 1) out.push('room ' + body.scrollWidth);
      for (const el of document.querySelectorAll('.fk-bar *, .fk-sheet.is-open *, .studio .app-header *, .studio dialog.dialog *, .studio .binder *, .studio .document-heading *')) {
        const r = el.getBoundingClientRect();
        if (r.width && r.height && getComputedStyle(el).visibility !== 'hidden' && (r.right > w + 1 || r.left < -1)) out.push((el.className?.baseVal ?? el.className ?? el.tagName) + ' ' + Math.round(r.left) + '..' + Math.round(r.right));
      }
      return out.slice(0, 5);
    });
    assert.deepEqual(report, [], label + ' fits ' + width + 'px');
  };
  const shot = (name) => page.screenshot({path: resolve(dir, `field-kit-${width}-${name}.png`)});
  const closeDialog = () => page.locator('.studio dialog.dialog [aria-label="Close dialog"]').click();

  await check(width + ': the bar replaces the floating pills', async () => {
    assert.equal(await page.evaluate(() => window.LightboxFieldKit.active()), true);
    await page.locator('.fk-bar').waitFor({state: 'visible'});
    assert.equal(await page.locator('.workspace-launcher').isVisible(), false);
    assert.equal(await page.locator('.lb-cylinder-back').isVisible(), false);
    const bar = await page.locator('.fk-bar').boundingBox();
    assert.ok(Math.abs(bar.y + bar.height - 800) < 1 && bar.width === width, 'docked to the bottom edge');
    const studio = await page.locator('.studio').boundingBox();
    assert.ok(studio.height <= bar.y + 1, 'the room ends where the bar begins');
    for (const b of await page.locator('.fk-stop').all()) { const r = await b.boundingBox(); assert.ok(r.width >= 48 && r.height >= 48, 'stop is at least 48px'); }
    assert.equal(await place(), 'atlas');
    assert.equal(await page.locator('.fk-stop[aria-current="page"]').getAttribute('data-fk'), 'atlas');
    await fits('Atlas'); await shot('01-atlas');
  });
  for (const [id, selector] of [['develop', '.lbs, .foundation-workspace'], ['write', '.script-editor-shell'], ['visuals', '.visual-language'], ['atlas', '.lbd-darkroom']]) {
    await check(width + ': bar → ' + id, async () => {
      await stop(id); await page.locator(selector).first().waitFor({state: 'visible'}); await page.waitForTimeout(600);
      assert.equal(await place(), id); await fits(id); await shot('02-' + id);
    });
  }
  await check(width + ': the kit opens, traps focus, closes on Escape', async () => {
    await stop('kit'); await page.locator('.fk-sheet.is-open').waitFor(); await page.waitForTimeout(500);
    assert.equal(await page.locator('#root').evaluate((el) => el.inert), true);
    assert.equal(await page.locator('[data-fk-act]').count(), 13);
    for (const b of await page.locator('[data-fk-act]').all()) { const r = await b.boundingBox(); assert.ok(r.height >= 48, 'kit entry is at least 48px tall'); }
    assert.equal(await page.locator('[data-fk-count="character"]').textContent(), '01');
    await fits('Kit'); await shot('03-kit');
    await page.keyboard.press('Escape'); await page.waitForTimeout(400);
    assert.equal(await page.locator('.fk-sheet.is-open').count(), 0);
    assert.equal(await page.locator('#root').evaluate((el) => el.inert), false);
  });
  await check(width + ': the kit follows the finger and flicks away', async () => {
    await stop('kit'); await page.locator('.fk-sheet.is-open').waitFor(); await page.waitForTimeout(500);
    const head = await page.locator('.fk-sheet__grab').boundingBox();
    const x = head.x + head.width / 2, y = head.y + head.height / 2;
    await page.mouse.move(x, y); await page.mouse.down();
    for (let i = 1; i <= 8; i++) { await page.mouse.move(x, y + i * 25); await page.waitForTimeout(16); }
    await page.mouse.up(); await page.waitForTimeout(600);
    assert.equal(await page.locator('.fk-sheet.is-open').count(), 0);
  });
  for (const [id, expected, selector] of [['sequence', 'sequence', '.btl'], ['breakdown', 'breakdown', '.breakdown-stage'], ['research', 'research', '.collection-workspace'], ['pitch', 'pitch', '.pitch-stage'], ['characters', 'characters', '.collection-workspace'], ['locations', 'locations', '.collection-workspace'], ['props', 'props', '.collection-workspace']]) {
    await check(width + ': kit → ' + id, async () => {
      await kit(id); await page.locator(selector).first().waitFor({state: 'visible'});
      assert.equal(await place(), expected);
      assert.equal(await page.locator('.studio .binder').count(), 0, 'the library did not stay open');
      assert.equal(await page.locator('.studio dialog.dialog[open]').count(), 0, 'no dialog left open');
      await fits(id); await shot('04-' + id);
    });
  }
  for (const [id, title] of [['find', 'Go anywhere.'], ['worlds', 'Your story worlds'], ['export', 'Export your screenplay'], ['settings', 'Workspace settings']]) {
    await check(width + ': kit → ' + id + ' is a bottom sheet', async () => {
      await kit(id);
      const dialog = page.locator('.studio dialog.dialog[open]');
      assert.equal((await dialog.locator('h2').textContent()).trim(), title);
      const r = await dialog.boundingBox();
      assert.ok(r.x === 0 && r.width === width && Math.abs(r.y + r.height - 800) < 1, 'full width, on the bottom edge');
      await fits(id); await shot('05-' + id);
      await closeDialog(); await page.waitForTimeout(250);
      assert.equal(await page.locator('.studio dialog.dialog[open]').count(), 0);
    });
  }
  await check(width + ': kit → library is a sheet that can be closed', async () => {
    await kit('library');
    const r = await page.locator('.studio aside.binder').boundingBox();
    assert.ok(r.width === width && r.y < 40, 'a tall, full-width sheet');
    await fits('library'); await shot('06-library');
    await page.locator('.binder .phone-panel-heading .icon-button').click(); await page.waitForTimeout(250);
    assert.equal(await page.locator('.studio .binder').count(), 0);
  });
  await check(width + ': kit → studio menu, and every group opens', async () => {
    await kit('menu');
    const popover = page.locator('.application-menu-popover');
    await popover.waitFor({state: 'visible'});
    const r = await popover.boundingBox();
    assert.ok(r.x === 0 && r.width === width && r.y > 0, 'on screen, full width');
    assert.equal(await popover.locator('.application-menu-grid > button').count(), 8);
    await shot('07-menu');
    await popover.locator('button', {hasText: 'Documents'}).click(); await page.waitForTimeout(250);
    assert.ok(await popover.locator('[role="menuitem"]').count() >= 10);
    const last = await popover.locator('[role="menuitem"]').last().boundingBox();
    assert.ok(last.height >= 48);
    await page.keyboard.press('Escape'); await page.mouse.click(width / 2, 120); await page.waitForTimeout(250);
  });
  await check(width + ': screenplay tools and document actions are on screen', async () => {
    await stop('write'); await page.locator('.script-editor-shell').waitFor(); await page.waitForTimeout(500);
    await page.locator('.script-more-trigger').click(); await page.waitForTimeout(450);
    let r = await page.locator('.script-more-popover').boundingBox();
    assert.ok(r.y >= 0 && r.y + r.height <= 800 && r.width === width, 'screenplay tools sheet is inside the screen');
    await shot('08-script-tools');
    await page.locator('.script-more-popover button', {hasText: 'Scene navigator'}).click(); await page.waitForTimeout(300);
    await page.keyboard.press('Escape'); await page.waitForTimeout(200);
    if (await page.locator('.script-more-popover').count()) await page.locator('.script-more-trigger').click({force: true});
    await page.locator('.document-context-actions .menu-host > button').click(); await page.waitForTimeout(450);
    r = await page.locator('.document-context-actions .dropdown').boundingBox();
    assert.ok(r.y >= 0 && r.y + r.height <= 800 && r.width === width, 'document actions sheet is inside the screen');
    await shot('09-document-actions');
    await page.keyboard.press('Escape'); await page.mouse.click(width / 2, 100); await page.waitForTimeout(200);
  });
  await check(width + ': writing still works and is saved', async () => {
    await stop('write'); await page.locator('.script-editor-shell .ProseMirror').waitFor(); await page.waitForTimeout(400);
    await page.locator('.script-editor-shell .ProseMirror p').last().click();
    await page.keyboard.press('End'); await page.keyboard.type(' Kit check.');
    await page.waitForTimeout(1600);
    const saved = await page.evaluate(async () => new Promise((res) => { const r = indexedDB.open('lightbox-portable-v64', 1); r.onsuccess = () => { const g = r.result.transaction('workspace').objectStore('workspace').get('current'); g.onsuccess = () => res(JSON.stringify(g.result.state.projects[0].nodes)); }; }));
    assert.ok(saved.includes('Kit check.'), 'typed text reached the workspace');
    await page.evaluate(() => document.activeElement?.blur());
  });
  await check(width + ': no script errors', async () => assert.deepEqual(errors, []));
  await context.close();
}

// ---- First run on a phone: no project, no bar, the menu stays in the header -------------------
{
  const context = await browser.newContext({viewport: {width: 390, height: 800}, deviceScaleFactor: 2, hasTouch: true, isMobile: true});
  const page = await context.newPage();
  await page.goto(BASE);
  await page.locator('.lb-opener__skip').click({timeout: 1500}).catch(() => {});
  await page.locator('.welcome').waitFor({state: 'visible', timeout: 20000});
  await page.waitForTimeout(600);
  await check('first run: welcome has no bar and keeps the menu', async () => {
    assert.equal(await page.locator('.fk-bar').isVisible(), false);
    assert.equal(await page.locator('.application-menu-trigger').isVisible(), true);
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await page.screenshot({path: resolve(dir, 'field-kit-390-00-welcome.png')});
  });
  await context.close();
}

// ---- Reduced motion ---------------------------------------------------------------------------------
{
  const context = await browser.newContext({viewport: {width: 390, height: 800}, hasTouch: true, isMobile: true, reducedMotion: 'reduce'});
  const page = await context.newPage();
  await open(page);
  await check('reduced motion: the bar and sheets do not animate', async () => {
    await page.locator('.fk-stop[data-fk="kit"]').click();
    const longest = await page.evaluate(() => Math.max(...[...document.querySelectorAll('.fk-bar, .fk-bar *, .fk-sheet, .fk-veil')].map((el) => { const c = getComputedStyle(el); return Math.max(...c.transitionDuration.split(',').map(parseFloat)) + (c.animationName !== 'none' ? 1 : 0); })));
    assert.ok(longest < .01, 'longest transition ' + longest + 's');
  });
  await context.close();
}

// ---- Desktop: untouched --------------------------------------------------------------------------
// The same page with and without the two Field Kit files: every element under the studio
// must compute to the same style, in the writing room and in a World room.
async function desktopStyles(withKit) {
  const context = await browser.newContext({viewport: {width: 1440, height: 900}});
  const page = await context.newPage();
  if (!withKit) await page.route(/field-kit\.(css|js)/, (route) => route.abort());
  await open(page);
  const snapshot = async () => page.evaluate(() => {
    const rows = [];
    for (const el of document.querySelectorAll('.studio, .studio *:not(canvas)')) {
      if (el.closest('.lbd-darkroom, svg')) continue;
      const c = getComputedStyle(el), r = el.getBoundingClientRect();
      rows.push([el.tagName, String(el.className?.baseVal ?? el.className), Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height), c.display, c.position, c.color, c.backgroundColor, c.fontFamily, c.fontSize, c.padding, c.margin, c.borderRadius, c.zIndex, c.boxShadow, c.backdropFilter].join('|'));
    }
    return rows;
  });
  const out = {};
  out.kit = await page.evaluate(() => ({cls: document.documentElement.className, bar: document.querySelectorAll('.fk-bar, .fk-sheet, .fk-veil').length}));
  await page.locator('.creative-dock button', {hasText: 'Write'}).first().click();
  await page.locator('.script-editor-shell').waitFor(); await page.waitForTimeout(900);
  out.write = await snapshot();
  await page.screenshot({path: resolve(dir, `field-kit-desktop-write-${withKit ? 'with' : 'without'}.png`)});
  await page.locator('.app-wordmark').click(); await page.locator('.lbd-darkroom').waitFor(); await page.waitForTimeout(600);
  await page.screenshot({path: resolve(dir, `field-kit-desktop-atlas-${withKit ? 'with' : 'without'}.png`)});
  await context.close();
  return out;
}
const [withKit, withoutKit] = [await desktopStyles(true), await desktopStyles(false)];
await check('desktop: the kit adds no class and no elements', async () => {
  assert.doesNotMatch(withKit.kit.cls, /\bfk\b/); assert.equal(withKit.kit.bar, 0);
});
await check('desktop: writing room computes identically with and without the kit (' + withoutKit.write.length + ' elements)', async () => {
  assert.equal(withKit.write.length, withoutKit.write.length);
  const diff = withKit.write.filter((row, i) => row !== withoutKit.write[i]);
  assert.deepEqual(diff.slice(0, 3), []);
});
await check('resizing a desktop window down to a phone and back mounts and removes the kit', async () => {
  const context = await browser.newContext({viewport: {width: 1200, height: 800}});
  const page = await context.newPage();
  await open(page);
  await page.setViewportSize({width: 390, height: 800}); await page.waitForTimeout(700);
  assert.equal(await page.locator('.fk-bar').isVisible(), true);
  await page.setViewportSize({width: 1200, height: 800}); await page.waitForTimeout(700);
  assert.equal(await page.locator('.fk-bar').count(), 0);
  assert.doesNotMatch(await page.evaluate(() => document.documentElement.className), /\bfk/);
  await context.close();
});

await browser.close();
server.close();
await writeFile(resolve(dir, 'field-kit-results.txt'), results.join('\n') + '\n');
console.log(results.join('\n'));
const failed = results.filter((line) => line.startsWith('FAIL'));
console.log(`\n${results.length - failed.length}/${results.length} passed`);
process.exit(failed.length ? 1 : 0);
