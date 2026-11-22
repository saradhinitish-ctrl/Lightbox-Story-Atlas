// Visual + computed-style snapshot of Lightbox, for checking that a CSS refactor changes nothing.
//
//   node tests/design-snapshot.mjs --out qa-artifacts/before
//   (change CSS)
//   node tests/design-snapshot.mjs --out qa-artifacts/after
//   python3 tools/design-compare.py qa-artifacts/before qa-artifacts/after
//
// Each state writes <name>.png and <name>.json (computed styles of every element, plus ::before/::after).
// Motion is switched off (reduced-motion) so frames are deterministic. Options: --only <substring>,
// --port <n>. Set PLAYWRIGHT_MODULE=<path to playwright/index.mjs> if `playwright` does not resolve.
import {createServer} from 'node:http';
import {readFile, mkdir, writeFile} from 'node:fs/promises';
import {resolve, extname, sep} from 'node:path';
import process from 'node:process';

const {chromium} = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const arg = (name, fallback) => { const i = process.argv.indexOf('--' + name); return i > 0 ? process.argv[i + 1] : fallback; };
const root = process.cwd();
const outDir = resolve(root, arg('out', 'qa-artifacts/snapshot'));
const only = arg('only', '');
const PORT = Number(arg('port', 4177));
await mkdir(outDir, {recursive: true});

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
await new Promise((done) => server.listen(PORT, '127.0.0.1', done));
const BASE = `http://127.0.0.1:${PORT}`;

// A small real project in the app's own data shape
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

const PROPS = ['display', 'position', 'top', 'right', 'bottom', 'left', 'z-index', 'float', 'width', 'height', 'min-width', 'min-height', 'max-width', 'max-height', 'margin-top', 'margin-right', 'margin-bottom', 'margin-left', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left', 'box-sizing', 'overflow-x', 'overflow-y', 'flex-direction', 'flex-wrap', 'flex-grow', 'flex-shrink', 'flex-basis', 'align-items', 'align-self', 'justify-content', 'gap', 'grid-template-columns', 'grid-template-rows', 'color', 'background-color', 'background-image', 'background-size', 'background-position', 'border-top-width', 'border-right-width', 'border-bottom-width', 'border-left-width', 'border-top-style', 'border-top-color', 'border-right-color', 'border-bottom-color', 'border-left-color', 'border-top-left-radius', 'border-top-right-radius', 'border-bottom-right-radius', 'border-bottom-left-radius', 'box-shadow', 'outline-style', 'outline-width', 'outline-color', 'outline-offset', 'opacity', 'visibility', 'transform', 'filter', 'backdrop-filter', 'mix-blend-mode', 'font-family', 'font-size', 'font-weight', 'font-style', 'line-height', 'letter-spacing', 'text-transform', 'text-align', 'text-decoration-line', 'text-shadow', 'white-space', 'cursor', 'pointer-events', 'transition-property', 'transition-duration', 'transition-timing-function', 'animation-name', 'animation-duration', 'object-fit', 'content'];

// Optional hook: LB_PROBE=<module> runs `default(page, stateName)` after every state is captured.
const probe = process.env.LB_PROBE ? (await import(resolve(process.env.LB_PROBE))).default : null;

const results = [];
const browser = await chromium.launch();

async function openApp(page, {empty = false} = {}) {
  await page.goto(BASE + '/index.html');
  await page.evaluate(async ({data, empty}) => {
    await new Promise((res, rej) => { const r = indexedDB.open('lightbox-portable-v64', 1); r.onupgradeneeded = () => r.result.createObjectStore('workspace'); r.onsuccess = () => { const t = r.result.transaction('workspace', 'readwrite'); if (empty) t.objectStore('workspace').clear(); else t.objectStore('workspace').put(data, 'current'); t.oncomplete = () => { r.result.close(); res(); }; t.onerror = rej; }; });
    localStorage.clear(); if (!empty) localStorage.setItem('desk-last-project', 'qa-project');
  }, {data: seed(), empty});
  await page.reload();
  await page.locator('.lb-opener__skip').click({timeout: 1200}).catch(() => {});
  if (empty) await page.waitForSelector('text=Begin a story', {timeout: 20000});
  else await page.locator('.lbd-darkroom').waitFor({state: 'visible', timeout: 20000});
  await settle(page, 700);
}
async function settle(page, ms = 600) {
  await page.evaluate(() => document.fonts && document.fonts.ready).catch(() => {});
  await page.waitForTimeout(ms);
}

async function capture(page, name) {
  await settle(page, 450);
  const styles = await page.evaluate((props) => {
    const out = [];
    const walk = (el, depth) => {
      const cs = getComputedStyle(el);
      const rec = {t: el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (typeof el.className === 'string' && el.className ? '.' + el.className.trim().split(/\s+/).slice(0, 3).join('.') : '')};
      const r = el.getBoundingClientRect();
      rec.box = [Math.round(r.x * 10) / 10, Math.round(r.y * 10) / 10, Math.round(r.width * 10) / 10, Math.round(r.height * 10) / 10];
      for (const p of props) { const v = cs.getPropertyValue(p); if (v) rec[p] = v; }
      for (const pe of ['::before', '::after']) {
        const pc = getComputedStyle(el, pe);
        if (pc.content && pc.content !== 'none' && pc.content !== 'normal') {
          const prec = {};
          for (const p of props) { const v = pc.getPropertyValue(p); if (v) prec[p] = v; }
          rec[pe] = prec;
        }
      }
      out.push(rec);
    };
    for (const el of document.querySelectorAll('body, body *')) {
      if (el.tagName === 'SCRIPT' || el.tagName === 'STYLE' || el.tagName === 'LINK' || el.tagName === 'NOSCRIPT') continue;
      walk(el);
    }
    return out;
  }, PROPS);
  await writeFile(resolve(outDir, name + '.json'), JSON.stringify(styles));
  await page.screenshot({path: resolve(outDir, name + '.png'), animations: 'disabled', caret: 'hide'});
  if (probe) await probe(page, name);
  results.push(name + ' (' + styles.length + ' elements)');
}

async function state(name, run) {
  if (only && !name.includes(only)) return;
  try { await run(); } catch (error) { results.push('SKIPPED ' + name + ' — ' + String(error.message).split('\n')[0]); }
}

// ---- Phone ---------------------------------------------------------------------------------
{
  const context = await browser.newContext({viewport: {width: 390, height: 844}, deviceScaleFactor: 1, hasTouch: true, isMobile: true, reducedMotion: 'reduce'});
  const page = await context.newPage(); page.setDefaultTimeout(5000);
  await state('phone-firstrun', async () => { await openApp(page, {empty: true}); await capture(page, 'phone-firstrun'); });
  await openApp(page);
  const stop = (id) => page.locator(`.fk-stop[data-fk="${id}"]`).click();
  const kit = async (id) => { await stop('kit'); await page.locator('.fk-sheet.is-open').waitFor(); await settle(page, 450); await page.locator(`[data-fk-act="${id}"]`).click(); await settle(page, 700); };
  await state('phone-atlas', async () => { await capture(page, 'phone-atlas'); });
  for (const id of ['develop', 'write', 'visuals']) await state('phone-' + id, async () => { await stop(id); await settle(page, 700); await capture(page, 'phone-' + id); });
  await state('phone-kit', async () => { await stop('kit'); await page.locator('.fk-sheet.is-open').waitFor(); await settle(page, 500); await capture(page, 'phone-kit'); await page.keyboard.press('Escape'); await settle(page, 400); });
  for (const id of ['sequence', 'breakdown', 'research', 'pitch', 'characters', 'locations', 'props']) await state('phone-room-' + id, async () => { await kit(id); await capture(page, 'phone-room-' + id); });
  for (const [id, label] of [['find', 'find'], ['worlds', 'worlds'], ['export', 'export'], ['settings', 'settings']]) await state('phone-dialog-' + label, async () => { await kit(id); await capture(page, 'phone-dialog-' + label); await page.locator('.studio dialog.dialog [aria-label="Close dialog"]').click(); await settle(page, 300); });
  await state('phone-library', async () => { await kit('library'); await capture(page, 'phone-library'); await page.locator('.binder .phone-panel-heading .icon-button').click(); await settle(page, 300); });
  await state('phone-menu', async () => { await kit('menu'); await capture(page, 'phone-menu'); await page.keyboard.press('Escape'); await page.mouse.click(195, 120); await settle(page, 300); });
  await state('phone-write-tools', async () => { await stop('write'); await settle(page, 600); await page.locator('.script-more-trigger').click(); await settle(page, 500); await capture(page, 'phone-write-tools'); });
  await context.close();
}

// ---- Tablet and desktop --------------------------------------------------------------------
for (const [label, width, height] of [['tablet', 820, 1180], ['desktop', 1440, 900]]) {
  const context = await browser.newContext({viewport: {width, height}, deviceScaleFactor: 1, reducedMotion: 'reduce'});
  const page = await context.newPage(); page.setDefaultTimeout(5000);
  await state(label + '-firstrun', async () => { await openApp(page, {empty: true}); await capture(page, label + '-firstrun'); });
  await openApp(page);
  const home = async () => { await page.locator('.app-wordmark').click(); await page.locator('.lbd-darkroom').waitFor({state: 'visible'}); await settle(page, 500); };
  const dock = async (text) => { const ok = await page.evaluate((l) => { const b = [...document.querySelectorAll('button')].find((x) => x.textContent.trim() === l); if (!b) return false; b.click(); return true; }, text); if (!ok) throw new Error('no dock button ' + text); await settle(page, 800); };
  await state(label + '-atlas', async () => { await capture(page, label + '-atlas'); });
  for (const text of ['Develop', 'Write', 'Visuals', 'Sequence', 'Breakdown']) await state(`${label}-room-${text.toLowerCase()}`, async () => { await dock(text); await capture(page, `${label}-room-${text.toLowerCase()}`); await home(); });
  const faces = [['spark', 0], ['research', 2]];
  for (const [id, i] of faces) await state(`${label}-room-${id}`, async () => { await page.locator('.lbd-face').nth(i).click(); await settle(page, 1000); await capture(page, `${label}-room-${id}`); await home(); });
  for (const [id, i] of [['characters', 0], ['locations', 1], ['objects', 2]]) await state(`${label}-room-${id}`, async () => { await page.locator('.lbd-tab').nth(i).click(); await settle(page, 1000); await capture(page, `${label}-room-${id}`); await home(); });
  await state(label + '-pitch', async () => { await page.locator('.pitch-launch').click(); await settle(page, 900); await capture(page, label + '-pitch'); await home(); });
  await state(label + '-find', async () => { await page.keyboard.press('Control+k'); await settle(page, 500); await capture(page, label + '-find'); await page.keyboard.press('Escape'); await settle(page, 300); });
  await state(label + '-settings', async () => { await page.locator('button[aria-label="Workspace settings"]').first().click(); await settle(page, 500); await capture(page, label + '-settings'); await page.keyboard.press('Escape'); await settle(page, 300); });
  await state(label + '-menu', async () => { await page.locator('.application-menu-trigger').click(); await settle(page, 500); await capture(page, label + '-menu'); await page.keyboard.press('Escape'); await settle(page, 300); });
  await context.close();
}

// ---- Public pages --------------------------------------------------------------------------
for (const [label, width, height, mobile] of [['phone', 390, 844, true], ['desktop', 1440, 900, false]]) {
  const context = await browser.newContext({viewport: {width, height}, deviceScaleFactor: 1, isMobile: mobile, hasTouch: mobile, reducedMotion: 'reduce'});
  const page = await context.newPage();
  for (const file of ['about', 'features', 'how-it-works', 'creator', 'widgets']) await state(`${label}-page-${file}`, async () => { await page.goto(`${BASE}/${file}.html`); await settle(page, 500); await capture(page, `${label}-page-${file}`); });
  await context.close();
}

await browser.close();
server.close();
await writeFile(resolve(outDir, 'index.txt'), results.join('\n') + '\n');
console.log(results.join('\n'));
