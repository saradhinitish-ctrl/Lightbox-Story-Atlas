// The Darkroom Atlas and the rooms it opens: browser checks (isolated temp browser profile).
// Run: PLAYWRIGHT_MODULE=<path to playwright/index.mjs> node tests/darkroom-atlas-qa.mjs
// Screenshots and a results file go to qa-artifacts/.
import {createServer} from 'node:http';
import {readFile, mkdir, writeFile} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import {resolve, extname, sep} from 'node:path';
import process from 'node:process';
import assert from 'node:assert/strict';

const {chromium} = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const root = process.cwd();
const dir = resolve(root, 'qa-artifacts');
await mkdir(dir, {recursive: true});

// ---- Source guards: transforms and opacity per frame, no tweened blur or layout -----------------
const css = await readFile(resolve(root, 'atlas-light-table.css'), 'utf8') + await readFile(resolve(root, 'light-table-rooms.css'), 'utf8');
for (const m of css.matchAll(/transition\s*:([^;}]*)/g)) assert.doesNotMatch(m[1], /filter|blur|width|height|top|left/, 'No transition on filter or layout: ' + m[1]);
for (const m of css.matchAll(/@keyframes[^{]*\{((?:[^{}]*\{[^}]*\})*)\s*\}/g)) assert.doesNotMatch(m[1], /filter|blur/, 'No keyframes animate blur');
for (const m of css.matchAll(/blur\((\d+(?:\.\d+)?)px\)/g)) assert.ok(Number(m[1]) <= 16, 'Static blur at most 16px');
const js = await readFile(resolve(root, 'story-cylinder-v9.js'), 'utf8');
const renderBody = js.slice(js.indexOf('function render('), js.indexOf('/* ---- The loop'));
assert.ok(renderBody.length > 500, 'render() found');
assert.doesNotMatch(renderBody, /style\.(left|top|width|height|filter|inset)\b|setProperty\(/, 'The per-frame render writes only transform and opacity');
assert.doesNotMatch(renderBody, /setStyle\([^)]*'(left|top|width|height|filter)'/, 'setStyle in render is transform/opacity only');
assert.doesNotMatch(js, /\binnerHTML\s*=\s*[^;]*\b(title|text|premise|logline|heading)\b/, 'Project text is never written as HTML');

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
await new Promise((done) => server.listen(4175, '127.0.0.1', done));
const BASE = 'http://127.0.0.1:4175/index.html';

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
  [['A question to chase', 'question', 'open'], ['A fact to keep', 'fact', 'followed'], ['A place to see', 'place', 'open']].forEach(([t, k, st], i) => nodes.push(node(t, 'text', research.id, i, {include: false, html: '<p>Body of ' + t + '.</p>', fields: {'research.kind': k, 'research.status': st}})));
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
const readProject = (page) => page.evaluate(async () => new Promise((res) => { const r = indexedDB.open('lightbox-portable-v64', 1); r.onsuccess = () => { const g = r.result.transaction('workspace').objectStore('workspace').get('current'); g.onsuccess = () => res(g.result.state.projects[0]); }; }));
const state = (page) => page.evaluate(() => window.LightboxDarkroom.state());
// The prints never stand perfectly still, so click where they are rather than waiting for them to stop.
async function clickAt(page, selector, touch = false) {
  const b = await page.locator(selector).first().boundingBox();
  assert.ok(b, 'visible: ' + selector);
  if (touch) await page.touchscreen.tap(b.x + b.width / 2, b.y + b.height / 2);
  else await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2);
}
const ensureAtlas = async (page) => {
  if (await page.locator('.lbd-darkroom').isVisible().catch(() => false)) return;
  if (await page.locator('.lb-cylinder-back').isVisible().catch(() => false)) await page.locator('.lb-cylinder-back').click();
  else await page.locator('.app-wordmark').click();
  await page.locator('.lbd-darkroom').waitFor({state: 'visible', timeout: 5000}); await page.waitForTimeout(400);
};
const backToAtlas = async (page) => { await page.locator('.lb-cylinder-back').click(); await page.locator('.lbd-darkroom').waitFor({state: 'visible', timeout: 5000}); await page.waitForTimeout(400); };
async function peaks(page, dir) {
  return page.evaluate(async (dir) => {
    window.LightboxDarkroom.calm(60);
    await new Promise((r) => setTimeout(r, 2500));          // let the last air settle
    window.LightboxDarkroom.gust(dir, 60);
    const t0 = performance.now(), best = [0, 0, 0, 0, 0], at = [0, 0, 0, 0, 0];
    while (performance.now() - t0 < 9000) {
      const s = window.LightboxDarkroom.state();
      s.angles.forEach((a, i) => { if (Math.abs(a) > best[i]) { best[i] = Math.abs(a); at[i] = performance.now() - t0; } });
      await new Promise((r) => setTimeout(r, 30));
    }
    return {deg: best.map((v) => v * 57.2958), at};
  }, dir);
}

const systemBrowser = ['/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium', '/usr/bin/chromium-browser'].find(existsSync);
const browser = await chromium.launch({headless: true, ...(systemBrowser ? {executablePath: systemBrowser} : {})});
const results = [];
const check = async (name, fn) => {
  try { await fn(); results.push({name, status: 'passed'}); console.log('  ✓ ' + name); }
  catch (error) { results.push({name, status: 'failed', error: String(error)}); console.log('  ✗ ' + name + '\n    ' + error.message); }
};
const STAGES = ['spark', 'world', 'research', 'script', 'visual'];
try {
  // 1. Layout at every size: five prints, one line, nothing off the page
  for (const [width, height] of [[320, 760], [390, 844], [768, 1024], [1024, 768], [1280, 720], [1440, 900], [1920, 1080]]) {
    await check('layout ' + width + 'x' + height, async () => {
      const page = await browser.newPage({viewport: {width, height}});
      const errors = [];
      page.on('pageerror', (e) => errors.push(e.message));
      await open(page);
      await page.waitForTimeout(600);
      const m = await page.evaluate(() => {
        const q = (s) => document.querySelector(s);
        const prints = [...document.querySelectorAll('.lbd-print')];
        const rects = prints.map((p) => p.getBoundingClientRect());
        const dock = q('.creative-dock');
        const dockTop = dock && getComputedStyle(dock).display !== 'none' ? dock.getBoundingClientRect().top : innerHeight;
        const tray = q('.lbd-tray-wrap').getBoundingClientRect(), cont = q('.lbd-continue').getBoundingClientRect();
        return {
          order: prints.map((p) => p.dataset.stage), names: [...document.querySelectorAll('.lbd-cap-name')].map((n) => n.textContent),
          pageScroll: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth),
          scroller: {sw: q('.lbd-scroller').scrollWidth, cw: q('.lbd-scroller').clientWidth},
          tops: rects.map((r) => r.top), lefts: rects.map((r) => r.left), rights: rects.map((r) => r.right),
          lowest: Math.max(...rects.map((r) => r.bottom)), trayTop: tray.top, cont: {top: cont.top, bottom: cont.bottom, left: cont.left, right: cont.right}, dockTop,
          thread: q('.lbd-back').width > 0, pegs: document.querySelectorAll('.lbd-clip svg').length, s: window.LightboxDarkroom.state()
        };
      });
      assert.deepEqual(m.order, STAGES, 'the new stage order');
      assert.deepEqual(m.names, ['The Spark', 'The World', 'Research', 'The Screenplay', 'Visual Language']);
      assert.ok(m.pageScroll <= width + 1, 'no horizontal page overflow: ' + m.pageScroll);
      assert.ok(m.thread && m.pegs === 5, 'one thread drawn and five pegs on it');
      assert.ok(m.s.sag >= 10 && m.s.sag <= 40, 'the line sags gently: ' + m.s.sag.toFixed(1));
      if (width >= 980) {
        assert.ok(Math.min(...m.lefts) >= 0 && Math.max(...m.rights) <= width, 'all five prints in view on one line');
        assert.ok(Math.max(...m.tops) - Math.min(...m.tops) < 60, 'one line, not two');
      } else {
        assert.ok(m.scroller.sw > m.scroller.cw + 100, 'narrow screens: the line scrolls along the wall');
      }
      assert.ok(m.lowest <= m.trayTop + 2, 'prints hang above the bench: ' + m.lowest.toFixed(0) + ' vs ' + m.trayTop.toFixed(0));
      assert.ok(m.cont.top >= 0 && m.cont.bottom <= m.dockTop + 1 && m.cont.left >= 0 && m.cont.right <= width, 'Continue is on screen, above the dock');
      assert.deepEqual(errors, []);
      await page.screenshot({path: resolve(dir, `darkroom-${width}x${height}.png`)});
      await page.close();
    });
  }

  const page = await browser.newPage({viewport: {width: 1440, height: 900}});
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  // Count every animation frame the darkroom asks for: there must be one loop.
  await page.addInitScript(() => {
    const raf = window.requestAnimationFrame.bind(window);
    window.__lbdFrames = 0;
    window.requestAnimationFrame = (cb) => { if ((new Error().stack || '').includes('story-cylinder-v9')) window.__lbdFrames++; return raf(cb); };
  });
  await open(page);

  // 2. Real data, development and the select mark
  await check('prints show real data; development follows the work', async () => {
    const m = await page.evaluate(() => ({
      status: [...document.querySelectorAll('.lbd-cap-status')].map((n) => n.textContent),
      tabs: [...document.querySelectorAll('.lbd-tab b')].map((n) => n.textContent),
      premise: document.querySelector('.lbd-print--spark .is-sharp .lbd-spark-text')?.textContent,
      notes: [...document.querySelectorAll('.lbd-print--research .is-sharp .lbd-card b')].map((n) => n.textContent),
      world: [...document.querySelectorAll('.lbd-print--world .is-sharp .lbd-sheet-frame small')].map((n) => n.textContent),
      slug: document.querySelector('.lbd-print--script .is-sharp .lbd-page-slug')?.textContent,
      sharp: [...document.querySelectorAll('.lbd-emul.is-sharp')].map((n) => +getComputedStyle(n).opacity),
      blank: [...document.querySelectorAll('.lbd-print.is-blank')].map((n) => n.dataset.stage),
      current: [...document.querySelectorAll('.lbd-print.is-current')].map((n) => n.dataset.stage),
      marks: document.querySelectorAll('.lbd-print.is-current .lbd-mark').length,
      labels: [...document.querySelectorAll('.lbd-face')].map((b) => b.getAttribute('aria-label')),
      s: window.LightboxDarkroom.state()
    }));
    assert.deepEqual(m.status, ['2 of 8 takes answered', '3 notes · 2 open threads', m.status[2], '0 of 2 boards · 0 refs']);
    assert.match(m.status[2], /^2 of 2 scenes written · /);
    assert.deepEqual(m.tabs, ['1', '0', '0'], 'characters, locations, objects');
    assert.equal(m.premise, 'A candy maker finds the sugar she spins can hold memories.');
    assert.deepEqual(m.notes, ['A question to chase', 'A fact to keep', 'A place to see']);
    assert.deepEqual(m.world, ['Maya']);
    assert.equal(m.slug, 'INT. SWEET DRIFT CONFECTIONERY — NIGHT');
    const [spark, world, research, script, visual] = m.s.levels;
    assert.equal(spark, .25, '2 of 8 takes');
    assert.equal(visual, 0, 'no references yet: blank paper');
    assert.ok(script > research && research > world && world > 0, 'more work, more developed: ' + m.s.levels.map((v) => v.toFixed(2)));
    assert.deepEqual(m.blank, ['visual']);
    assert.equal(m.sharp[4], 0, 'the blank print shows no image at rest');
    assert.ok(m.sharp[3] > m.sharp[2] && m.sharp[2] > m.sharp[1], 'denser image where there is more work: ' + m.sharp);
    assert.deepEqual(m.current, ['spark'], 'one stage marked (nothing edited yet: the first)');
    assert.equal(m.marks, 1, 'grease-pencil select drawn');
    assert.match(m.labels[0], /^01 The Spark\. 2 of 8 takes answered\. Marked: you are working here\./);
  });

  // 3. One loop, paused when nobody can see it
  await check('one animation loop, paused when hidden', async () => {
    const r = await page.evaluate(async () => {
      const a = window.__lbdFrames; await new Promise((res) => setTimeout(res, 1000)); const perSecond = window.__lbdFrames - a;
      Object.defineProperty(document, 'hidden', {configurable: true, get: () => true});
      document.dispatchEvent(new Event('visibilitychange'));
      await new Promise((res) => setTimeout(res, 300));
      const b = window.__lbdFrames; await new Promise((res) => setTimeout(res, 500)); const hidden = window.__lbdFrames - b;
      const runningHidden = window.LightboxDarkroom.state().running;
      delete document.hidden;
      document.dispatchEvent(new Event('visibilitychange'));
      await new Promise((res) => setTimeout(res, 300));
      return {perSecond, hidden, runningHidden, runningAgain: window.LightboxDarkroom.state().running};
    });
    assert.ok(r.perSecond >= 20 && r.perSecond <= 130, 'about one frame request per frame: ' + r.perSecond);
    assert.equal(r.hidden, 0, 'no frames while the tab is hidden');
    assert.equal(r.runningHidden, false);
    assert.equal(r.runningAgain, true, 'resumes when visible');
  });

  // 4. Gusts travel along the line
  await check('a gust reaches each print in turn, calmly', async () => {
    await ensureAtlas(page);
    await page.mouse.move(2, 2);
    const idle = await page.evaluate(async () => {
      window.LightboxDarkroom.calm(60);
      await new Promise((r) => setTimeout(r, 1200));
      let max = 0; const t0 = performance.now();
      while (performance.now() - t0 < 3000) { window.LightboxDarkroom.state().angles.forEach((a) => { max = Math.max(max, Math.abs(a)); }); await new Promise((r) => setTimeout(r, 40)); }
      return max * 57.2958;
    });
    assert.ok(idle < 1.5, 'idle sway stays small: ' + idle.toFixed(2) + '°');
    const right = await peaks(page, 1);
    console.log('    left→right peaks (ms)', right.at.map(Math.round).join(' '), 'deg', right.deg.map((v) => v.toFixed(2)).join(' '));
    for (let i = 1; i < 5; i++) assert.ok(right.at[i] > right.at[i - 1], 'reaches print ' + (i + 1) + ' after print ' + i);
    assert.ok(Math.max(...right.deg) < 8 && Math.min(...right.deg) > .4, 'visible but calm: ' + right.deg.map((v) => v.toFixed(2)));
    const left = await peaks(page, -1);
    console.log('    right→left peaks (ms)', left.at.map(Math.round).join(' '));
    for (let i = 1; i < 5; i++) assert.ok(left.at[i] < left.at[i - 1], 'from the other side, in the other order');
    const z = (await state(page)).clips.map((c) => Math.abs(c.z));
    assert.ok(Math.max(...z) < 60, 'the line swings out of the wall and back');
  });

  // 5. The cursor is air
  await check('the cursor moves the air: a wake and a flick', async () => {
    await ensureAtlas(page);
    const b = await page.locator('.lbd-print--research .lbd-face').boundingBox();
    await page.evaluate(() => window.LightboxDarkroom.calm(60));
    await page.waitForTimeout(2500);
    const before = (await state(page)).angles[2];
    const y = b.y + b.height * .7;
    await page.mouse.move(b.x - 160, y);
    await page.mouse.move(b.x + b.width + 160, y, {steps: 40});   // a slow pass: about 300 px/s
    let swing = 0;
    for (let i = 0; i < 25; i++) { swing = Math.max(swing, Math.abs((await state(page)).angles[2] - before)); await page.waitForTimeout(40); }
    assert.ok(swing * 57.2958 > .25, 'a slow pass nudges the print: ' + (swing * 57.2958).toFixed(2) + '°');
    const g0 = (await state(page)).gusts.length;
    await page.mouse.move(200, 300);
    await page.mouse.move(1200, 300, {steps: 3});                   // a flick
    const g1 = await state(page);
    assert.ok(g1.gusts.length > g0 && g1.gusts.some((g) => g.dir === 1), 'a fast flick throws a small gust');
    await page.mouse.move(2, 2);
  });

  // 6. Hover lifts, tilts and develops; release settles with a damped swing
  await check('hover develops the print; release settles naturally', async () => {
    await ensureAtlas(page);
    const sel = '.lbd-print--visual';
    const b = await page.locator(sel + ' .lbd-face').boundingBox();
    await page.mouse.move(b.x + b.width * .8, b.y + b.height * .3, {steps: 6});
    await page.waitForTimeout(1800);
    const on = await page.evaluate((sel) => {
      const el = document.querySelector(sel), tf = el.style.transform;
      return {hover: el.classList.contains('is-hover'), sharp: +getComputedStyle(el.querySelector('.is-sharp')).opacity,
        z: +/translate3d\(0px, [-\d.]+px, ([-\d.]+)px\)/.exec(tf)[1], ry: +/rotateY\(([-\d.]+)deg\)/.exec(tf)[1],
        soft: +getComputedStyle(document.querySelectorAll('.lbd-shadow.is-soft')[4]).opacity};
    }, sel);
    assert.ok(on.hover, 'hover state');
    assert.ok(on.sharp > .6, 'a blank print develops a preview of what it could become: ' + on.sharp);
    assert.ok(on.z > 25, 'lifts toward the viewer: ' + on.z);
    assert.ok(on.ry > 2, 'tilts toward the cursor (to its right): ' + on.ry);
    assert.ok(on.soft > .3, 'its shadow deepens: ' + on.soft);
    await page.mouse.move(2, 2, {steps: 3});
    const zs = [];
    for (let i = 0; i < 70; i++) { zs.push(await page.evaluate((sel) => +(/translate3d\(0px, [-\d.]+px, ([-\d.]+)px\)/.exec(document.querySelector(sel).style.transform)?.[1] ?? 0), sel)); await page.waitForTimeout(40); }
    assert.ok(zs[2] > 8, 'never snaps back: ' + zs.slice(0, 4).join(' '));
    assert.ok(Math.min(...zs) < -.5, 'a damped swing past rest: ' + Math.min(...zs).toFixed(2));
    assert.ok(Math.abs(zs.at(-1)) < 1, 'and settles: ' + zs.at(-1));
    await page.waitForTimeout(2600);
    const sharp = await page.evaluate((sel) => +getComputedStyle(document.querySelector(sel + ' .is-sharp')).opacity, sel);
    assert.ok(sharp < .25, 'the preview fades back to the real level: ' + sharp);
  });

  // 7. Keyboard: every print in order; focus is hover; Enter opens
  await check('keyboard focus walks the line and opens a room', async () => {
    await ensureAtlas(page);
    await page.locator('.pitch-launch').focus();
    const seen = [];
    for (let i = 0; i < 9; i++) {
      await page.keyboard.press('Tab');
      seen.push(await page.evaluate(() => {
        const a = document.activeElement, p = a.closest('.lbd-print');
        return (p ? p.dataset.stage : '') + ':' + (a.classList.contains('lbd-tab') ? a.dataset.role : a.classList.contains('lbd-continue') ? 'continue' : 'face')
          + (p ? (p.classList.contains('is-focus') && p.classList.contains('is-hover') ? '+lit' : '-dark') : '');
      }));
    }
    assert.deepEqual(seen, ['spark:face+lit', 'world:face+lit', 'world:characters+lit', 'world:locations+lit', 'world:props+lit', 'research:face+lit', 'script:face+lit', 'visual:face+lit', ':continue']);
    await page.locator('.lbd-print--research .lbd-face').focus();
    await page.keyboard.press('Enter');
    await page.locator('.collection-workspace').waitFor({timeout: 5000});
    assert.match(await page.locator('.collection-name input').first().inputValue(), /research/i);
    await backToAtlas(page);
  });

  // 8. Every print opens its own room through the app's own controls
  await check('each print is pulled off the line and opens its room', async () => {
    const rooms = [
      ['.lbd-print--spark .lbd-face', '.lbs', null],
      ['.lbd-print--world .lbd-face', '.collection-workspace', /character/i],
      ['.lbd-tab[data-role=locations]', '.collection-workspace', /location/i],
      ['.lbd-tab[data-role=props]', '.collection-workspace', /prop|object/i],
      ['.lbd-print--research .lbd-face', '.collection-workspace', /research/i],
      ['.lbd-print--script .lbd-face', '.script-editor-shell', null],
      ['.lbd-print--visual .lbd-face', '.visual-language', null]
    ];
    for (const [sel, room, name] of rooms) {
      await ensureAtlas(page);
      await clickAt(page, sel);
      await page.waitForTimeout(350);
      const mid = await page.evaluate(() => {
        const p = document.querySelector('.lbd-print.is-pulled');
        const scale = p ? +(/scale\(([-\d.]+)\)$/.exec(p.style.transform)?.[1] || 0) : 0;
        return {pulling: !!document.querySelector('.lbd-darkroom.is-pulling'), scale};
      });
      assert.ok(mid.pulling && mid.scale > 1.05, 'the print comes off the line, into focus: ' + JSON.stringify(mid));
      await page.locator(room).first().waitFor({timeout: 5000});
      assert.equal(await page.locator('.story-atlas').count(), 0, 'left the Atlas for ' + sel);
      if (name) assert.match(await page.locator('.collection-name input').first().inputValue(), name);
      await page.waitForTimeout(300);
    }
    await ensureAtlas(page);
  });

  // 9. Continue: back to the exact character, and the select follows the work
  await check('Continue Scene NN returns to the exact spot', async () => {
    await ensureAtlas(page);
    await clickAt(page, '.lbd-print--script .lbd-face');
    await page.locator('.ProseMirror').waitFor();
    await page.waitForTimeout(500);
    await page.locator('.ProseMirror p', {hasText: 'just sugar'}).click();
    await page.keyboard.press('End'); for (let i = 0; i < 6; i++) await page.keyboard.press('ArrowLeft');
    await page.keyboard.type('X');
    await page.waitForTimeout(900);
    await backToAtlas(page);
    assert.equal((await page.locator('.lbd-continue span').textContent()).trim(), 'Continue Scene 02');
    assert.match(await page.locator('.lbd-tray-page').textContent(), /It is just sugar, XTomas\./);
    assert.deepEqual(await page.$$eval('.lbd-print.is-current', (els) => els.map((e) => e.dataset.stage)), ['script'], 'the select moves to the stage you worked on');
    await page.locator('.lbd-continue').click();
    await page.waitForTimeout(1500);
    const r = await page.evaluate(() => { const s = getSelection(); return {text: s.anchorNode?.textContent, offset: s.anchorOffset, atlas: !!document.querySelector('.story-atlas')}; });
    assert.equal(r.atlas, false);
    assert.equal(r.text, 'It is just sugar, XTomas.');
    assert.equal(r.offset, 'It is just sugar, X'.length, 'caret on the exact character');
    await backToAtlas(page);
  });

  // 10. The rooms themselves are unchanged
  await check('research board saves drag and string', async () => {
    await ensureAtlas(page);
    await clickAt(page, '.lbd-print--research .lbd-face');
    await page.locator('.lbx-pin').first().waitFor();
    await page.waitForTimeout(900);
    assert.deepEqual(await page.locator('.lbx-pin-title').allTextContents(), ['A question to chase', 'A fact to keep', 'A place to see']);
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
    assert.ok(notes.some((n) => (n.fields['research.links'] || '').length > 0), 'string saved');
    await backToAtlas(page);
  });
  await check('film frames with project edge codes', async () => {
    await ensureAtlas(page);
    await page.locator('.creative-dock button', {hasText: 'Visuals'}).first().click();
    await page.locator('.vl-scene-cover').first().waitFor();
    await page.waitForTimeout(400);
    const codes = await page.$$eval('.vl-scene-cover', (els) => els.map((e) => e.dataset.edge));
    assert.match(codes[0], /^SWEET DRIFT ◆ SC 01 ◆ TK 01 ◆ 0000\+00$/);
    assert.equal(await page.locator('.lbx-film').count(), codes.length);
    await page.locator('.app-wordmark').click();
    await page.locator('.lbd-darkroom').waitFor();
    assert.equal(await page.locator('.lbx-film').count(), 0, 'no film frames on the Atlas');
  });
  await check('pitch view, search and export', async () => {
    await ensureAtlas(page);
    await page.locator('.pitch-launch').click();
    await page.locator('.pitch-stage').waitFor({timeout: 5000});
    await page.locator('.app-wordmark').click().catch(() => {});
    await page.locator('.lbd-darkroom').waitFor({timeout: 5000});
    await page.locator('.command-trigger').click();
    await page.locator('.studio-command input').fill('Opening');
    await page.waitForTimeout(300);
    assert.ok(await page.locator('.studio-command').getByText('Opening').first().isVisible(), 'search finds the scene document');
    await page.keyboard.press('Escape');
    await page.locator('.compile-button').click();
    const download = page.waitForEvent('download', {timeout: 20000});
    await page.getByRole('button', {name: /Download PDF/}).click();
    const bytes = await readFile(await (await download).path());
    assert.equal(bytes.subarray(0, 5).toString(), '%PDF-', 'a PDF was exported');
    await page.keyboard.press('Escape').catch(() => {});
    await ensureAtlas(page);
  });

  // 11. Smooth on an ordinary laptop: 4x slower CPU, with a gust and the cursor moving
  await check('smooth on a throttled CPU', async () => {
    await ensureAtlas(page);
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Emulation.setCPUThrottlingRate', {rate: 4});
    const sampling = page.evaluate(async () => {
      window.LightboxDarkroom.gust(1, 60);
      const frames = []; let last = performance.now(), run = true;
      const tick = (t) => { frames.push(t - last); last = t; if (run) requestAnimationFrame(tick); };
      requestAnimationFrame(tick);
      await new Promise((r) => setTimeout(r, 3500));
      run = false; frames.shift();
      const sorted = [...frames].sort((a, b) => a - b);
      return {frames: frames.length, p95: sorted[Math.floor(sorted.length * .95)], avg: frames.reduce((a, b) => a + b, 0) / frames.length};
    });
    for (let i = 0; i < 6; i++) await page.mouse.move(200 + i * 180, 420 + (i % 2) * 60, {steps: 8});
    const stats = await sampling;
    await cdp.send('Emulation.setCPUThrottlingRate', {rate: 1});
    console.log('    frames', JSON.stringify(stats));
    assert.ok(stats.p95 < 34, '95% of frames under 34ms at 4x CPU throttle: ' + stats.p95);
  });

  // 12. Saved data survives a reload
  await check('saved data intact after reload', async () => {
    await page.reload(); await page.locator('.lbd-darkroom').waitFor(); await page.waitForTimeout(500);
    const p = await readProject(page);
    assert.match(p.nodes.find((n) => n.title === 'Opening').html, /just sugar, XTomas/);
    assert.equal((await page.locator('.lbd-continue span').textContent()).trim(), 'Continue Scene 02');
  });
  await check('no console errors', async () => assert.deepEqual(errors, []));
  await page.close();

  // 13. Reduced motion: the air is still; hover keeps a gentle lift; clicks go straight in
  await check('reduced motion freezes the air', async () => {
    const rm = await browser.newPage({viewport: {width: 1440, height: 900}, reducedMotion: 'reduce'});
    const errs = [];
    rm.on('pageerror', (e) => errs.push(e.message));
    await open(rm);
    const a = await state(rm);
    await rm.waitForTimeout(1200);
    const b = await state(rm);
    assert.equal(a.still, true);
    assert.equal(b.running, false, 'no animation loop');
    assert.deepEqual(a.angles, b.angles, 'nothing sways');
    const tf = await rm.locator('.lbd-print--world').evaluate((e) => e.style.transform);
    assert.ok(Math.abs(+/rotate\(([-\d.]+)deg\)/.exec(tf)[1]) < 1.5, 'prints hang still, following the line: ' + tf);
    await rm.mouse.move(0, 0);
    const box = await rm.locator('.lbd-print--world .lbd-face').boundingBox();
    await rm.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await rm.waitForTimeout(600);
    const lift = await rm.locator('.lbd-print--world .lbd-lift').evaluate((e) => ({tf: getComputedStyle(e).transform, hover: e.closest('.lbd-print').classList.contains('is-hover')}));
    assert.ok(lift.hover && lift.tf !== 'none', 'a gentle lift on hover');
    const before = await rm.locator('.lbd-print--world').evaluate((e) => e.style.transform);
    await clickAt(rm, '.lbd-print--world .lbd-face');
    await rm.waitForTimeout(80);
    assert.equal(await rm.locator('.lbd-print--world').evaluate((e) => e.style.transform), before, 'no flight across the room');
    await rm.locator('.collection-workspace').waitFor({timeout: 3000});
    assert.deepEqual(errs, []);
    await rm.close();
  });

  // 14. Phone: the line scrolls, a tap opens, focus scrolls the print into view
  await check('phone: swipe along the line, tap to open', async () => {
    const ph = await browser.newPage({viewport: {width: 390, height: 844}, hasTouch: true, isMobile: true, deviceScaleFactor: 2});
    await open(ph);
    const r = await ph.evaluate(() => ({page: document.documentElement.scrollWidth, sl: document.querySelector('.lbd-scroller').scrollLeft}));
    assert.ok(r.page <= 390, 'no horizontal page overflow');
    await ph.locator('.lbd-print--visual .lbd-face').focus();
    await ph.waitForTimeout(900);
    const vis = await ph.locator('.lbd-print--visual').boundingBox();
    assert.ok(vis.x > -10 && vis.x + vis.width < 400, 'a focused print is brought into view: ' + vis.x);
    await ph.screenshot({path: resolve(dir, 'darkroom-phone-scrolled.png')});
    await ph.locator('.lbd-print--visual .lbd-face').blur();
    await clickAt(ph, '.lbd-print--visual .lbd-face', true);
    await ph.locator('.visual-language').first().waitFor({timeout: 5000});
    await ph.close();
  });
} finally {
  await writeFile(resolve(dir, 'darkroom-results.json'), JSON.stringify(results, null, 2));
  await browser.close();
  await new Promise((done) => server.close(done));
  const failed = results.filter((r) => r.status !== 'passed');
  console.log('DARKROOM_QA ' + (results.length - failed.length) + '/' + results.length + ' passed');
  if (failed.length) process.exitCode = 1;
}
