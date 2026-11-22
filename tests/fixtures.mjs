// Shared test fixture: a small real project in the app's own data shape.
export function seed() {
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


// Opens the app on the fixture (or on an empty database) and waits for the first screen.
export async function openApp(page, base, {empty = false, settle = 700} = {}) {
  await page.goto(base + '/index.html');
  await page.evaluate(async ({data, empty}) => {
    await new Promise((res, rej) => { const r = indexedDB.open('lightbox-portable-v64', 1); r.onupgradeneeded = () => r.result.createObjectStore('workspace'); r.onsuccess = () => { const t = r.result.transaction('workspace', 'readwrite'); if (empty) t.objectStore('workspace').clear(); else t.objectStore('workspace').put(data, 'current'); t.oncomplete = () => { r.result.close(); res(); }; t.onerror = rej; }; });
    localStorage.clear(); if (!empty) localStorage.setItem('desk-last-project', 'qa-project');
  }, {data: seed(), empty});
  await page.reload();
  await page.locator('.lb-opener__skip').click({timeout: 1200}).catch(() => {});
  if (empty) await page.waitForSelector('text=Begin a story', {timeout: 20000});
  else await page.locator('.lbd-darkroom').waitFor({state: 'visible', timeout: 20000});
  await page.evaluate(() => document.fonts && document.fonts.ready).catch(() => {});
  await page.waitForTimeout(settle);
}
