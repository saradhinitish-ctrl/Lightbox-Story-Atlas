/* Lightbox Studio Atlas — The Darkroom.
 *
 * The Atlas is a darkroom under a red safelight. The five stages are prints
 * pegged to one twine line strung across the room; the print still in the
 * developer tray below the line is where you stopped writing.
 *
 *   01 The Spark → 02 The World → 03 Research → 04 The Screenplay → 05 Visual Language
 *
 * Everything hanging in the room moves in the same air: layered noise, slow
 * gusts that travel across the line, and the cursor's wake. The thread is a
 * verlet rope pinned to the walls; every peg is a heavy point on it and every
 * print is a damped pendulum hanging from its peg. One requestAnimationFrame
 * loop drives it all; per frame only transform and opacity change in the DOM
 * (the thread and the dust are drawn on two canvases).
 *
 * Data is read-only, through window.LightboxStudio (the bridge in script.js).
 * Every print opens its room through the native React control, so routes and
 * actions are exactly the app's own. This module never writes project data.
 *
 * (The file keeps its historical name so index.html and the bundle need no
 * new entry point. The light table and the 3D cylinder it replaced are gone.)
 */
(() => {
  'use strict';
  const root = document.getElementById('root');
  if (!root) return;

  /* ---- Stages, in the order of the line ------------------------------------ */
  const STAGES = [
    { id: 'spark', no: '01', name: 'The Spark', source: '.atlas-foundation' },
    { id: 'world', no: '02', name: 'The World', source: '.atlas-world' },
    { id: 'research', no: '03', name: 'Research', source: '.atlas-research' },
    { id: 'script', no: '04', name: 'The Screenplay', source: '.atlas-script' },
    { id: 'visual', no: '05', name: 'Visual Language', source: '.atlas-visual' }
  ];
  const N = STAGES.length;
  const WORLD_KINDS = [
    { role: 'characters', kind: 'character', label: 'Characters', one: 'character', short: 'CHAR.' },
    { role: 'locations', kind: 'location', label: 'Locations', one: 'location', short: 'LOC.' },
    { role: 'props', kind: 'prop', label: 'Objects', one: 'object', short: 'OBJ.' }
  ];
  const FOUNDATION_TAKES = ['seed', 'world', 'conflict', 'premise', 'theme', 'tone', 'logline', 'questions'];

  const reduceMQ = matchMedia('(prefers-reduced-motion: reduce)');
  const phoneMQ = matchMedia('(max-width: 767px)');
  const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
  const lerp = (a, b, t) => a + (b - a) * t;
  const pad2 = (n) => String(n).padStart(2, '0');
  const plural = (n, one, many) => n + ' ' + (n === 1 ? one : (many || one + 's'));
  const easeInOut = (t) => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  const SVG_NS = 'http://www.w3.org/2000/svg';
  const make = (tag, cls, text) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  };
  const sourceFor = (stage) => root.querySelector('.story-atlas .atlas-map ' + stage.source);

  /* Small deterministic random, so every print keeps its own character. */
  function rng(seed) {
    return () => {
      seed = (seed + 0x6D2B79F5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /* ---- Smooth 2D gradient noise, about [-1, 1] ------------------------------- */
  const PERM = new Uint8Array(512), GX = new Float32Array(256), GY = new Float32Array(256);
  (() => {
    const r = rng(1979), p = Array.from({ length: 256 }, (_, i) => i);
    for (let i = 255; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [p[i], p[j]] = [p[j], p[i]]; }
    for (let i = 0; i < 512; i++) PERM[i] = p[i & 255];
    for (let i = 0; i < 256; i++) { const a = r() * Math.PI * 2; GX[i] = Math.cos(a); GY[i] = Math.sin(a); }
  })();
  function grad(ix, iy, dx, dy) { const h = PERM[ix + PERM[iy]]; return GX[h] * dx + GY[h] * dy; }
  function noise2(x, y) {
    const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, X = xi & 255, Y = yi & 255;
    const u = xf * xf * xf * (xf * (xf * 6 - 15) + 10), v = yf * yf * yf * (yf * (yf * 6 - 15) + 10);
    const a = grad(X, Y, xf, yf), b = grad(X + 1, Y, xf - 1, yf);
    const c = grad(X, Y + 1, xf, yf - 1), d = grad(X + 1, Y + 1, xf - 1, yf - 1);
    return (a + (b - a) * u + (c + (d - c) * u - a - (b - a) * u) * v) * 1.414;
  }

  /* ---- Live project data (read-only, through the bridge) -------------------- */
  function sectionNodes(project, role) {
    const byId = new Map(project.nodes.map((n) => [n.id, n]));
    const trashed = (n) => { const seen = new Set(); let c = n; while (c && !seen.has(c.id)) { if (c.role === 'trash') return true; seen.add(c.id); c = byId.get(c.parent); } return false; };
    const top = project.nodes.find((n) => n.role === role);
    if (!top) return [];
    const out = [];
    const walk = (id) => project.nodes.filter((n) => n.parent === id).forEach((n) => { if (!trashed(n)) { out.push(n); if (n.kind === 'folder') walk(n.id); } });
    walk(top.id);
    return out;
  }
  const time = (iso) => { const t = Date.parse(iso || ''); return Number.isFinite(t) ? t : 0; };
  const safeImage = (url) => typeof url === 'string'
    && (/^data:image\/(png|jpe?g|gif|webp|avif);base64,/i.test(url) || /^(https?:\/\/|\/legacy\/|\/api\/assets\/|blob:)/i.test(url)) ? url : '';
  const safeColour = (c) => typeof c === 'string' && c.length < 40 && window.CSS?.supports?.('color', c) ? c : '';

  function liveData() {
    const api = window.LightboxStudio;
    const project = api?.project?.();
    if (!project) return null;
    let scenes = [];
    try { scenes = api.scenes() || []; } catch { scenes = []; }
    const written = scenes.filter((sc) => sc.blocks.some((b) => b.type !== 'scene' && b.text.trim()));
    // Where the writer stopped: the remembered caret, else the end of the last written scene.
    let spot = null;
    try { spot = api.spot(); } catch {}
    const remembered = !!spot;
    let index = spot ? scenes.findIndex((sc) => sc.documentId === spot.documentId
      && (spot.sceneKey ? sc.key === spot.sceneKey : sc.key === 'document' || sc.blockIndex === 0)) : -1;
    if (index < 0 && scenes.length) {
      const last = written.at(-1) || scenes[0];
      index = scenes.indexOf(last);
      const blocks = last.blocks;
      spot = { documentId: last.documentId, sceneKey: last.key.startsWith('legacy-') || last.key === 'document' ? null : last.key,
        block: Math.max(0, blocks.length - 1), offset: (blocks.at(-1)?.text || '').length };
    }
    const scene = scenes[index] || null;
    let lines = [];
    if (scene) {
      const upTo = clamp(spot?.block ?? scene.blocks.length - 1, 0, scene.blocks.length - 1);
      lines = scene.blocks.slice(0, upTo + 1)
        .map((b, i) => ({ type: b.type, text: b.text.replace(/\s+/g, ' ').trim(), last: i === upTo }))
        .filter((b, i) => i > 0 && b.text).slice(-4);
    }
    let seconds = 0, writtenSeconds = 0, sceneTime = null;
    try {
      const all = scenes.map((sc) => api.timing(sc));
      seconds = all.reduce((a, t) => a + t.seconds, 0);
      writtenSeconds = all.filter((t) => t.source === 'pages').reduce((a, t) => a + t.seconds, 0);
      sceneTime = scene ? all[index] : null;
    } catch {}
    const first = scenes[0] || null;
    const opening = first ? first.blocks.filter((b) => b.type !== 'scene' && b.text.trim()).slice(0, 3)
      .map((b) => ({ type: b.type, text: b.text.replace(/\s+/g, ' ').trim() })) : [];

    const foundation = project.nodes.find((n) => n.fields?.['development.kind'] === 'foundation');
    const field = (k) => (foundation?.fields?.['development.' + k] || '').trim();
    const takes = FOUNDATION_TAKES.filter((k) => field(k)).length;

    const world = WORLD_KINDS.map((k) => sectionNodes(project, k.role).filter((n) => n.kind === k.kind));
    const notes = sectionNodes(project, 'research').filter((n) => n.kind !== 'folder');
    const open = notes.filter((n) => (n.fields?.['research.status'] || 'open') === 'open').length;

    const refs = project.moodboard || [];
    const images = refs.map((c) => c.asset?.mime?.startsWith('image/') ? safeImage(c.asset.url) : '').filter(Boolean);
    const colours = refs.filter((c) => c.kind === 'palette').flatMap((c) => c.colors || []).map(safeColour).filter(Boolean);
    const boards = scenes.filter((sc) => refs.some((c) => { try { return api.referenceInScene(c, sc.id); } catch { return false; } })).length;

    // When each stage was last touched (node timestamps); the reference cards
    // carry none, so the board is read from the project's own clock.
    const stamps = { spark: time(foundation?.updated), world: 0, research: 0, script: 0, visual: 0 };
    world.flat().forEach((n) => { stamps.world = Math.max(stamps.world, time(n.updated)); });
    notes.forEach((n) => { stamps.research = Math.max(stamps.research, time(n.updated)); });
    project.nodes.filter((n) => n.kind === 'screenplay').forEach((n) => { stamps.script = Math.max(stamps.script, time(n.updated)); });
    const latestNode = Math.max(0, ...project.nodes.map((n) => time(n.updated)));
    if (refs.length && time(project.updated) > latestNode + 1500) stamps.visual = time(project.updated);

    return { api, project, scenes, written, spot, remembered, index, scene, lines, seconds, writtenSeconds, sceneTime, opening, first,
      premise: field('premise'), logline: field('logline'), takes, world, notes, open, refs, images, colours, boards, stamps };
  }

  /* How far each stage has developed, 0 (blank paper) to 1 (a finished print).
   * Read from real work only; these are drawing rules, not stored data. */
  function levels(d) {
    if (!d) return [0, 0, 0, 0, 0];
    const spark = d.takes / 8;
    const counts = d.world.map((list) => list.length), total = counts.reduce((a, b) => a + b, 0);
    const world = total ? .15 + .5 * counts.filter(Boolean).length / 3 + .35 * Math.min(1, total / 9) : 0;
    const followed = d.notes.length - d.open;
    const research = d.notes.length ? .15 + .6 * Math.min(1, d.notes.length / 6) + .25 * followed / d.notes.length : 0;
    const S = d.scenes.length, w = d.written.length;
    const script = w ? .12 + .48 * w / Math.max(1, S) + .4 * Math.min(1, d.writtenSeconds / 600) : S ? .04 : 0;
    const R = d.refs.length;
    const visual = R ? .15 + (S ? .5 * d.boards / S : .25 * Math.min(1, R / 4)) + .35 * Math.min(1, R / 12) : 0;
    return [spark, world, research, script, visual].map((v) => clamp(v, 0, 1));
  }
  /* The editor's select: the stage you touched last (ties go to the line's order). */
  function currentStage(d, lv) {
    if (!d || lv.every((v) => v === 0)) return 0;
    const ids = STAGES.map((s) => s.id);
    let best = -1, bestTime = -1;
    ids.forEach((id, i) => { if (lv[i] > 0 && d.stamps[id] > bestTime) { best = i; bestTime = d.stamps[id]; } });
    const tied = ids.filter((id, i) => lv[i] > 0 && d.stamps[id] === bestTime).length > 1;
    if (tied && d.remembered && lv[3] > 0) return 3;
    return best < 0 ? 0 : best;
  }
  function statusText(i, d) {
    if (!d) return '';
    if (i === 0) return d.takes ? d.takes + ' of 8 takes answered' : 'No takes yet';
    if (i === 1) return d.world.map((list, k) => plural(list.length, WORLD_KINDS[k].one)).join(' · ');
    if (i === 2) return d.notes.length ? plural(d.notes.length, 'note') + ' · ' + plural(d.open, 'open thread') : 'No notes yet';
    if (i === 3) {
      if (!d.scenes.length) return 'Not started';
      return d.written.length + ' of ' + plural(d.scenes.length, 'scene') + ' written · ' + d.api.formatDuration(d.seconds);
    }
    if (!d.scenes.length && !d.refs.length) return 'No boards yet';
    return d.boards + ' of ' + plural(d.scenes.length, 'board') + ' · ' + plural(d.refs.length, 'ref');
  }

  /* ---- The pictures on the prints -----------------------------------------
   * Each print is a photograph of its stage's real work. With nothing there
   * yet it shows the shape of what it could become, which is what hovering
   * develops into view. Text is set with textContent only. */
  function picture(i, d) {
    const img = make('div', 'lbd-img lbd-img--' + STAGES[i].id);
    if (i === 0) {
      img.append(make('i', 'lbd-spark-glow'), make('i', 'lbd-spark-star'));
      const text = d?.premise || d?.logline || '';
      if (text) {
        img.append(make('p', 'lbd-spark-text', text));
        const count = text.split(/\s+/).filter(Boolean).length;
        img.append(make('span', 'lbd-img-tag', (d.premise ? 'PREMISE' : 'LOGLINE') + ' · ' + count + (count === 1 ? ' WORD' : ' WORDS')));
      } else {
        const form = make('div', 'lbd-spark-blanks');
        ['When', 'a', 'must', 'or else'].forEach((lead) => { const row = make('span'); row.append(make('b', '', lead), make('i')); form.append(row); });
        img.append(form, make('span', 'lbd-img-tag', 'THE PREMISE · NOT YET WRITTEN'));
      }
    } else if (i === 1) {
      WORLD_KINDS.forEach((k, row) => {
        const strip = make('div', 'lbd-sheet-row');
        strip.append(make('span', 'lbd-sheet-label', k.short));
        const list = d?.world[row] || [];
        for (let f = 0; f < 3; f++) {
          const n = list[f];
          const frame = make('span', 'lbd-sheet-frame' + (n ? '' : ' is-empty'));
          if (n) {
            const title = (n.title || '').trim() || 'Untitled ' + k.one;
            frame.append(make('b', '', title.charAt(0).toUpperCase()), make('small', '', title));
          }
          strip.append(frame);
        }
        img.append(strip);
      });
      img.append(make('span', 'lbd-sheet-edge', '▸ 01   ▸ 02   ▸ 03'));
    } else if (i === 2) {
      const notes = d?.notes || [];
      for (let c = 0; c < 3; c++) {
        const n = notes[c];
        const card = make('span', 'lbd-card lbd-card--' + (c + 1) + (n ? '' : ' is-blank'));
        card.append(make('i', 'lbd-card-pin'));
        if (n) card.append(make('b', '', (n.title || '').trim() || 'Untitled note'));
        card.append(make('span', 'lbd-card-lines'));
        img.append(card);
      }
      const string = document.createElementNS(SVG_NS, 'svg');
      string.setAttribute('class', 'lbd-card-string');
      string.setAttribute('viewBox', '0 0 100 100');
      string.setAttribute('preserveAspectRatio', 'none');
      const path = document.createElementNS(SVG_NS, 'path');
      path.setAttribute('d', 'M31 7 C 45 26, 58 20, 69 33 S 55 52, 39 58');
      string.append(path);
      img.append(string);
    } else if (i === 3) {
      const page = make('div', 'lbd-page');
      page.append(make('b', 'lbd-page-no', '1.'), make('span', 'lbd-page-fade', 'FADE IN:'));
      page.append(make('span', 'lbd-page-slug', d?.first ? d.first.heading : 'INT. THE FIRST SCENE — DAY'));
      const lines = d?.opening || [];
      if (lines.length) lines.forEach((b) => page.append(make('span', 'lbd-page-line lbd-page-line--' + b.type, b.text)));
      else for (let k = 0; k < 4; k++) page.append(make('span', 'lbd-page-rule'));
      img.append(page);
    } else {
      const frames = make('div', 'lbd-vframes');
      const pics = d?.images || [];
      const count = pics.length ? Math.min(4, pics.length) : 2;
      frames.classList.toggle('is-quad', count > 2);
      for (let f = 0; f < count; f++) {
        const frame = make('span', 'lbd-vframe');
        if (pics[f]) {
          const im = make('img');
          im.alt = '';
          im.decoding = 'async';
          im.loading = 'lazy';
          im.src = pics[f];
          frame.append(im);
        } else frame.append(make('small', '', d?.scenes[f] ? 'SC. ' + pad2(f + 1) : '—'));
        frames.append(frame);
      }
      const chips = make('div', 'lbd-cscript' + (d?.colours.length ? '' : ' is-empty'));
      const colours = d?.colours.slice(0, 8) || [];
      if (colours.length) colours.forEach((c) => { const chip = make('i'); chip.style.background = c; chips.append(chip); });
      else for (let k = 0; k < 6; k++) chips.append(make('i'));
      img.append(frames, chips, make('span', 'lbd-img-tag', colours.length ? 'COLOUR SCRIPT · ' + pad2(colours.length) + ' KEYS' : 'COLOUR SCRIPT · NOT STARTED'));
    }
    return img;
  }

  /* ---- Paper, pegs and pencil (generated once per size) --------------------- */
  // A deckled edge: the paper is torn, never cut. Jitter only goes inward.
  function decklePath(w, h, seed) {
    const r = rng(seed), amp = Math.max(.7, w / 230), step = 3.1;
    const pts = [];
    const edge = (x0, y0, x1, y1, nx, ny) => {
      const len = Math.hypot(x1 - x0, y1 - y0), n = Math.max(2, Math.round(len / step));
      let j = r();
      for (let k = 0; k < n; k++) {
        const t = k / n;
        j = j * .55 + r() * .45;
        const deep = j * amp * (k === 0 ? .2 : 1);
        pts.push((x0 + (x1 - x0) * t + nx * deep).toFixed(1) + ' ' + (y0 + (y1 - y0) * t + ny * deep).toFixed(1));
      }
    };
    edge(0, 0, w, 0, 0, 1); edge(w, 0, w, h, -1, 0); edge(w, h, 0, h, 0, -1); edge(0, h, 0, 0, 1, 0);
    return 'M' + pts.join('L') + 'Z';
  }
  // The grease-pencil select: a box drawn fast around the frame, overshooting.
  function markPath(x, y, w, h, seed) {
    const r = rng(seed), j = (a) => (r() - .5) * a;
    const p = [
      [x - 6 + j(3), y + 5 + j(4)], [x + w * .45 + j(4), y - 3 + j(3)], [x + w + 4 + j(3), y + j(3)],
      [x + w + 2 + j(4), y + h * .5 + j(5)], [x + w + 5 + j(3), y + h + 2 + j(3)], [x + w * .5 + j(5), y + h + 5 + j(3)],
      [x - 3 + j(3), y + h + 1 + j(3)], [x - 5 + j(3), y + h * .45 + j(5)], [x + 4 + j(3), y - 4 + j(2)]
    ];
    let d = 'M' + p[0][0].toFixed(1) + ' ' + p[0][1].toFixed(1);
    for (let k = 1; k < p.length; k++) {
      const a = p[k - 1], b = p[k];
      d += 'Q' + ((a[0] + b[0]) / 2 + j(4)).toFixed(1) + ' ' + ((a[1] + b[1]) / 2 + j(4)).toFixed(1) + ' ' + b[0].toFixed(1) + ' ' + b[1].toFixed(1);
    }
    return d;
  }
  const PEG_BODY = 'M4 .8C6.5 0 9.5 0 12 .8L13.3 27C13.8 35 13.6 41 12.4 47.2H3.6C2.4 41 2.2 35 2.7 27Z';
  const PEG = '<svg viewBox="0 0 16 48" aria-hidden="true">'
    + '<path d="' + PEG_BODY + '" transform="translate(1.6 2.6)" fill="#000" fill-opacity=".42"/>'
    + '<path d="' + PEG_BODY + '" fill="url(#lbd-wood)"/>'
    + '<path d="M6.1 2.5C6.6 13 5.7 27 6.4 46M9.6 1.8C9.1 12 10.2 30 9.7 46.5M11.6 3C11.9 18 12.3 30 11.4 45" fill="none" stroke="#1d0906" stroke-opacity=".32" stroke-width=".42"/>'
    + '<path d="M4.6 2L3.6 27.5" fill="none" stroke="#ffb59c" stroke-opacity=".28" stroke-width=".6"/>'
    + '<path d="M2.6 16.3Q8 18.7 13.4 16.3L13.4 19Q8 21.3 2.6 19Z" fill="#150604" fill-opacity=".62"/>'
    + '<rect x="1.4" y="24" width="13.2" height="4.6" rx="1.3" fill="url(#lbd-steel)"/>'
    + '<path d="M3.2 24.3v4M5.2 24.3v4M7.2 24.3v4M9.2 24.3v4M11.2 24.3v4M13.1 24.3v4" stroke="#fff1ea" stroke-opacity=".34" stroke-width=".5"/>'
    + '<path d="M8 30.5V47.2" stroke="#150604" stroke-opacity=".55" stroke-width=".6"/></svg>';
  const DEFS = '<svg class="lbd-defs" width="0" height="0" aria-hidden="true" focusable="false"><defs>'
    + '<linearGradient id="lbd-wood" x1="0" x2="1"><stop offset="0" stop-color="#3f1a12"/><stop offset=".28" stop-color="#7a3b29"/>'
    + '<stop offset=".55" stop-color="#8e4a34"/><stop offset="1" stop-color="#3a160f"/></linearGradient>'
    + '<linearGradient id="lbd-steel" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#d8bfb9"/><stop offset=".5" stop-color="#7d6662"/>'
    + '<stop offset="1" stop-color="#3a2b29"/></linearGradient>'
    + '<filter id="lbd-wax" x="-5%" y="-5%" width="110%" height="110%"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" seed="3"/>'
    + '<feDisplacementMap in="SourceGraphic" scale="2.2"/></filter></defs></svg>';
  const ARROW = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 12h15"/><path d="m13.5 6.5 5.5 5.5-5.5 5.5"/></svg>';

  /* Film grain, made once: speckles in alpha only, so no blend modes are needed. */
  let grainURL = '', grainCanvas = null;
  function grain() {
    if (grainURL) return grainURL;
    try {
      const c = document.createElement('canvas');
      grainCanvas = c;
      c.width = c.height = 128;
      const ctx = c.getContext('2d'), data = ctx.createImageData(128, 128), r = rng(24);
      for (let i = 0; i < data.data.length; i += 4) {
        const v = r(), light = v > .5;
        data.data[i] = data.data[i + 1] = data.data[i + 2] = light ? 255 : 0;
        data.data[i + 3] = Math.round(Math.pow(Math.abs(v - .5) * 2, 2.2) * 120);
      }
      ctx.putImageData(data, 0, 0);
      grainURL = c.toDataURL('image/png');
    } catch { grainURL = ''; }
    return grainURL;
  }

  /* ---- Mounting the room ---------------------------------------------------- */
  let active = null;
  let hasEnteredAtlas = false;
  let returnButton = null;
  let watching = false;

  function buildPrint(i) {
    const el = make('div', 'lbd-print lbd-print--' + STAGES[i].id);
    el.dataset.stage = STAGES[i].id;
    const lift = make('div', 'lbd-lift');
    const paper = make('div', 'lbd-paper');
    const win = make('div', 'lbd-window');
    const latent = make('div', 'lbd-emul is-latent'), sharp = make('div', 'lbd-emul is-sharp');
    latent.setAttribute('aria-hidden', 'true'); sharp.setAttribute('aria-hidden', 'true');
    const fog = make('i', 'lbd-fog'), grainEl = make('i', 'lbd-grain');
    const sheen = make('i', 'lbd-sheen');
    win.append(latent, sharp, fog, grainEl, sheen);
    const cap = make('div', 'lbd-cap');
    cap.setAttribute('aria-hidden', 'true');
    const light = make('i', 'lbd-light');
    const face = make('button', 'lbd-face');
    face.type = 'button';
    // The deckled stock is its own layer, so the image above it can be
    // composited and fade without repainting the paper.
    const stock = make('i', 'lbd-stock');
    stock.append(light);
    paper.append(stock, win, cap, face);
    let tabs = null;
    if (STAGES[i].id === 'world') {
      tabs = make('div', 'lbd-tabs');
      WORLD_KINDS.forEach((k) => {
        const b = make('button', 'lbd-tab');
        b.type = 'button';
        b.dataset.role = k.role;
        b.append(make('span', '', k.short), make('b', '', '0'));
        tabs.append(b);
      });
      paper.append(tabs);
    }
    const focusRing = make('i', 'lbd-focus');
    lift.append(paper, focusRing);
    el.append(lift);
    const shadowA = make('i', 'lbd-shadow is-tight'), shadowB = make('i', 'lbd-shadow is-soft');
    const clip = make('div', 'lbd-clip');
    clip.innerHTML = PEG;
    clip.setAttribute('aria-hidden', 'true');
    return { el, liftEl: lift, paper, stock, win, latent, sharp, fog, cap, light, sheen, face, tabs, focusRing, shadowA, shadowB, clip, mark: null };
  }

  function mount(atlas) {
    const viewport = atlas.querySelector('.atlas-viewport');
    if (!viewport || viewport.querySelector('.lbd-darkroom') || STAGES.some((st) => !sourceFor(st))) return;
    const host = make('section', 'lbd-darkroom');
    host.setAttribute('aria-label', 'Story Atlas — the darkroom. Five prints on one line, in order from the spark to the visual language.');
    host.style.setProperty('--lbd-grain', grainURL || grain() ? 'url("' + grain() + '")' : 'none');
    host.innerHTML = DEFS
      + '<div class="lbd-wall" aria-hidden="true"><canvas class="lbd-beam"></canvas></div><i class="lbd-lamp" aria-hidden="true"><i class="lbd-lamp-filter"></i></i>'
      + '<div class="lbd-scroller"><div class="lbd-line" role="list">'
      + '<canvas class="lbd-back" aria-hidden="true"></canvas><div class="lbd-shadows" aria-hidden="true"></div><canvas class="lbd-thread" aria-hidden="true"></canvas>'
      + '<i class="lbd-hook is-left" aria-hidden="true"></i><i class="lbd-hook is-right" aria-hidden="true"></i>'
      + '<div class="lbd-clips" aria-hidden="true"></div><canvas class="lbd-front" aria-hidden="true"></canvas>'
      + '<div class="lbd-snaps" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></div><i class="lbd-veil" aria-hidden="true"></i>'
      + '</div></div>'
      + '<div class="lbd-bench"><i class="lbd-bench-top" aria-hidden="true"></i>'
      + '<div class="lbd-tray-wrap"><div class="lbd-tray" aria-hidden="true"><div class="lbd-basin">'
      + '<i class="lbd-liquid"></i><div class="lbd-tray-print"><div class="lbd-tray-page"></div></div><i class="lbd-tray-sheen"></i><i class="lbd-tray-rim"></i>'
      + '</div></div>'
      // One action and one quiet line: the tray itself says "still in the developer".
      + '<div class="lbd-tray-info"><button class="lbd-continue" type="button"><span>Continue Scene 01</span>' + ARROW + '</button>'
      + '<span class="lbd-tray-slug"></span></div></div>'
      + '<span class="lbd-hint" aria-hidden="true">Swipe along the line</span></div>'
      + '<span class="lbd-sr lbd-live" aria-live="polite"></span>';
    viewport.append(host);

    const q = (sel) => host.querySelector(sel);
    const s = {
      host, atlas, scroller: q('.lbd-scroller'), line: q('.lbd-line'), back: q('.lbd-back'), thread: q('.lbd-thread'), front: q('.lbd-front'), beam: q('.lbd-beam'),
      shadows: q('.lbd-shadows'), clips: q('.lbd-clips'), hooks: [q('.lbd-hook.is-left'), q('.lbd-hook.is-right')],
      tray: q('.lbd-tray'), trayPrint: q('.lbd-tray-print'), trayPage: q('.lbd-tray-page'), traySheen: q('.lbd-tray-sheen'),
      trayInfo: q('.lbd-tray-info'), slug: q('.lbd-tray-slug'), cont: q('.lbd-continue'),
      contLabel: q('.lbd-continue span'), live: q('.lbd-live'),
      prints: [], ac: new AbortController(), raf: 0, last: 0, acc: 0, visible: true, onscreen: true,
      still: reduceMQ.matches, pulling: null, hover: -1, pointer: null, jank: 0, dataKey: '', current: 0, lv: [0, 0, 0, 0, 0],
      air: { t: 0, gusts: [], puffs: [], nextGust: 4.5, prevail: Math.random() < .5 ? -1 : 1, A0: 18, rnd: rng((Date.now() & 0xffff) + 7) },
      rope: null, dust: [], trayAir: 0, trayAirV: 0, trayBoost: 0, trayHover: false, layoutKey: ''
    };
    const shadowFrag = document.createDocumentFragment(), clipFrag = document.createDocumentFragment();
    const params = rng(31);
    STAGES.forEach((st, i) => {
      const p = buildPrint(i);
      p.el.setAttribute('role', 'listitem');
      // Each print has its own weight and stiffness, so no two move in unison.
      Object.assign(p, {
        i, T: 1.95 + params() * .55, zeta: .8 + params() * .35, mass: .85 + params() * .3, gain: .9 + params() * .25,
        wf: 7.8 + params() * 3, zf: .2 + params() * .1, wt: 5.5 + params() * 2,
        a: (params() - .5) * .02, av: 0, acc: 0, f: 0, fv: 0, tw: 0, twv: 0,
        lift: 0, liftV: 0, tx: 0, txV: 0, ty: 0, tyV: 0, hx: 0, hy: 0, boost: 0, level: 0,
        pvx: 0, pax: 0, focus: false, ptr: false, cache: {}
      });
      shadowFrag.append(p.shadowA, p.shadowB);
      clipFrag.append(p.clip);
      s.line.insertBefore(p.el, s.clips);
      s.prints.push(p);
      p.face.addEventListener('click', (e) => { e.preventDefault(); pull(s, i, null); });
      p.tabs?.querySelectorAll('.lbd-tab').forEach((b) => b.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); pull(s, i, b.dataset.role); }));
      const focusables = [p.face, ...(p.tabs ? p.tabs.querySelectorAll('button') : [])];
      focusables.forEach((b) => {
        b.addEventListener('focus', () => { p.focus = true; p.keyboard = b.matches(':focus-visible'); p.el.classList.toggle('is-focus', p.keyboard); setHover(s); if (p.keyboard) reveal(s, i); });
        b.addEventListener('blur', () => { p.focus = false; p.keyboard = false; p.el.classList.remove('is-focus'); setHover(s); });
      });
    });
    s.shadows.append(shadowFrag);
    s.clips.append(clipFrag);

    s.cont.addEventListener('click', (e) => { e.preventDefault(); pull(s, 3, 'continue'); });
    const trayZone = q('.lbd-tray-wrap');
    trayZone.addEventListener('pointerenter', () => { s.trayHover = true; });
    trayZone.addEventListener('pointerleave', () => { s.trayHover = false; });
    s.cont.addEventListener('focus', () => { s.trayHover = true; });
    s.cont.addEventListener('blur', () => { s.trayHover = false; });

    const sig = { signal: s.ac.signal };
    host.addEventListener('pointermove', (e) => pointer(s, e), { passive: true, signal: s.ac.signal });
    host.addEventListener('pointerdown', (e) => pointer(s, e), { passive: true, signal: s.ac.signal });
    host.addEventListener('pointerleave', () => { s.pointer = null; s.prints.forEach((p) => { p.ptr = false; }); setHover(s); }, sig);
    document.addEventListener('visibilitychange', () => { s.visible = !document.hidden; wake(s); }, sig);
    const onReduce = () => { s.still = reduceMQ.matches; host.classList.toggle('is-still', s.still); relayout(s, true); wake(s); };
    reduceMQ.addEventListener?.('change', onReduce, sig);
    addEventListener('resize', () => relayout(s), sig);
    s.scroller.addEventListener('scroll', () => { nearest(s); if (s.still) render(s, 0); }, { passive: true, signal: s.ac.signal });
    phoneMQ.addEventListener?.('change', () => nearest(s), sig);
    s.viewX = 0;
    s.resizeObserver = new ResizeObserver(() => relayout(s));
    s.resizeObserver.observe(s.host);
    s.io = new IntersectionObserver((entries) => { s.onscreen = entries.some((en) => en.isIntersecting); wake(s); });
    s.io.observe(host);

    host.classList.toggle('is-still', s.still);
    s.studio = atlas.closest('.studio');
    setClass(s.studio, true, 'lb-cylinder-atlas', 'lbd-studio');
    setClass(atlas, true, 'lb-cylinder-mounted', 'lbd-atlas');
    active = s;
    hasEnteredAtlas = true;
    refresh(s, true);
    relayout(s, true);
    // On narrow screens the line scrolls: open on the print you are working on.
    if (s.scroll) s.scroller.scrollLeft = clamp(s.clipX[s.current] - s.W / 2, 0, s.lineW - s.W);
    nearest(s);
    wake(s);
  }

  function unmount(s) {
    s.ac.abort();
    s.resizeObserver?.disconnect();
    s.io?.disconnect();
    if (s.raf) cancelAnimationFrame(s.raf);
    s.raf = 0;
    clearTimeout(s.launchTimer);
    s.host.remove();
    s.atlas.classList.remove('lbd-atlas', 'is-pulling');
    if (!s.studio?.querySelector('.story-atlas')) s.studio?.classList.remove('lbd-studio');
  }

  /* ---- Content (re-laid only when the project changes) --------------------- */
  function refresh(s, force = false) {
    if (!s.host.isConnected || (s.pulling && !force)) return;
    const d = liveData();
    const lv = levels(d);
    const current = currentStage(d, lv);
    const key = JSON.stringify([lv, current, d ? [d.premise, d.logline, d.takes, d.world.map((l) => l.slice(0, 3).map((n) => n.title).concat(l.length)),
      d.notes.slice(0, 3).map((n) => n.title).concat(d.notes.length, d.open), d.scenes.length, d.written.length, d.seconds, d.index,
      d.lines.map((b) => b.text), d.opening.map((b) => b.text), d.first?.heading, d.images.slice(0, 4).map((u) => u.length + u.slice(-24)),
      d.colours.slice(0, 8), d.boards, d.refs.length, d.project.title, d.sceneTime?.eighths] : 0]);
    if (!force && key === s.dataKey) return;
    s.dataKey = key;
    s.lv = lv;
    s.current = current;
    s.prints.forEach((p, i) => {
      p.level = lv[i];
      const pic = picture(i, d);
      p.sharp.replaceChildren(pic);
      p.latent.replaceChildren(pic.cloneNode(true));
      const status = statusText(i, d);
      const cap = make('span', 'lbd-cap-head');
      cap.append(make('b', 'lbd-cap-no', STAGES[i].no), make('span', 'lbd-cap-name', STAGES[i].name));
      p.cap.replaceChildren(cap);
      if (!p.tabs) p.cap.append(make('span', 'lbd-cap-status', status));
      else p.tabs.querySelectorAll('.lbd-tab').forEach((b, k) => {
        const n = d ? d.world[k].length : 0;
        b.querySelector('b').textContent = String(n);
        b.setAttribute('aria-label', 'Open ' + WORLD_KINDS[k].label.toLowerCase() + ' (' + n + ')');
      });
      const isCurrent = i === current;
      p.el.classList.toggle('is-current', isCurrent);
      p.el.classList.toggle('is-blank', lv[i] === 0);
      const destination = p.tabs ? 'Open characters.' : 'Open ' + STAGES[i].name.replace(/^The /, 'the ') + '.';
      p.face.setAttribute('aria-label', STAGES[i].no + ' ' + STAGES[i].name + '. ' + (status ? status + '. ' : '')
        + (isCurrent ? 'Marked: you are working here. ' : '') + destination);
      p.cache = {};
    });
    // The tray: the one print still in the chemicals is where you stopped.
    const sceneNo = d?.scene ? d.index + 1 : 1;
    const started = !!(d && d.lines.length);
    s.contLabel.textContent = (started ? 'Continue' : 'Start') + ' Scene ' + pad2(sceneNo);
    const heading = d?.scene ? d.scene.heading : 'INT. THE FIRST SCENE — DAY';
    const meta = ['Scene ' + pad2(sceneNo) + ' of ' + pad2(Math.max(d?.scenes.length || 0, 1))];
    if (d?.sceneTime && d.sceneTime.source === 'pages') meta.push(d.api.formatEighths(d.sceneTime.eighths) + ' pg', d.api.formatDuration(d.sceneTime.seconds));
    s.slug.textContent = heading;
    s.slug.title = heading + ' · ' + meta.join(' · ');
    s.cont.setAttribute('aria-label', s.contLabel.textContent + ': ' + heading + ', ' + meta.join(', ') + (started ? '. Where you stopped writing.' : '.'));
    const page = [];
    if (started) d.lines.forEach((b) => { const l = make('span', 'lbd-tray-line lbd-tray-line--' + b.type, b.text); if (b.last) l.append(make('i', 'lbd-caret')); page.push(l); });
    else page.push(make('span', 'lbd-tray-line lbd-tray-line--empty', d?.scene ? 'The scene is ready for its first action.' : 'Your first scene begins here.'));
    s.trayPage.replaceChildren(...page);
    s.trayLevel = started ? clamp(.35 + lv[3] * .6, 0, .95) : .18;
    if (s.W) layoutMarks(s);
    if (s.still) render(s, 0);
  }

  /* ---- Layout ------------------------------------------------------------------ */
  function relayout(s, force = false) {
    if (!s.host.isConnected) return;
    const W = Math.round(s.host.clientWidth || s.atlas.clientWidth || innerWidth);
    const top = s.host.getBoundingClientRect().top + scrollY;
    const dock = s.atlas.closest('.studio')?.querySelector('.creative-dock');
    const dockH = dock && getComputedStyle(dock).display !== 'none' ? dock.getBoundingClientRect().height : 0;
    const scroll = W < 980;
    let H = Math.round(clamp(innerHeight - (top - scrollY) - dockH - (scroll ? 70 : 14), scroll ? 470 : 440, scroll ? 600 : 760));
    // A phone's toolbar sliding in and out is not a new room: keep the line as it hangs.
    if (!force && s.H && W === s.W && Math.abs(H - s.H) < 90) H = s.H;
    const key = W + 'x' + H + (s.still ? 's' : '');
    if (!force && key === s.layoutKey) return;
    s.layoutKey = key;
    s.W = W; s.H = H; s.scroll = scroll;
    s.host.style.height = H + 'px';
    s.host.classList.toggle('is-scroll', scroll);
    const benchH = scroll ? clamp(H * .27, 132, 158) : clamp(H * .22, 118, 148);
    const threadY = clamp(H * .085, 34, 58);
    const avail = H - benchH - threadY - 34;
    let pw, colW, pad;
    if (!scroll) {
      pad = clamp(W * .05, 36, 90);
      colW = (W - 2 * pad) / N;
      pw = Math.min(colW * .8, avail / 1.25 / 1.14);
    } else {
      pw = Math.min(W * .58, 236, avail / 1.25 / 1.14);
      colW = pw + clamp(W * .12, 40, 72);
      pad = Math.max(28, (W - colW) / 2);
    }
    pw = Math.round(pw);
    const ph = Math.round(pw * 1.25);
    const pegH = Math.round(clamp(pw * .25, 32, 52)), pegW = pegH / 3;
    // Spare height goes partly above the line, so the prints hang in the room
    // rather than at the top of it, and the bench sits close below them.
    const hanging = 30 + pegH * .42 + ph + 44;
    const spare = H - benchH - threadY - hanging;
    const threadAt = threadY + Math.max(0, spare) * .55;
    s.lineW = scroll ? Math.round(pad * 2 + colW * N) : W;
    s.pw = pw; s.ph = ph; s.pegH = pegH; s.pegW = pegW;
    s.pegThread = pegH * .369;           // where the line runs through the peg's groove
    s.grip = pegH * .423;                // from that groove down to the paper's top edge
    s.threadY = threadAt; s.benchH = benchH;
    s.clipX = STAGES.map((_, i) => pad + colW * (i + .5));
    s.line.style.width = s.lineW + 'px';
    s.line.style.height = H + 'px';
    s.host.style.setProperty('--lbd-pw', pw + 'px');
    s.host.style.setProperty('--lbd-ph', ph + 'px');
    s.host.style.setProperty('--lbd-peg-w', pegW + 'px');
    s.host.style.setProperty('--lbd-peg-h', pegH + 'px');
    s.host.style.setProperty('--lbd-bench', benchH + 'px');
    const b = Math.round(pw * .065), bb = Math.round(Math.max(pw * .25, 46));
    s.border = { b, bb };
    s.host.style.setProperty('--lbd-b', b + 'px');
    s.host.style.setProperty('--lbd-bb', bb + 'px');
    s.host.querySelectorAll('.lbd-snaps i').forEach((m, i) => { m.style.left = s.clipX[i] + 'px'; });
    s.prints.forEach((p, i) => {
      p.el.style.width = pw + 'px';
      p.el.style.height = ph + 'px';
      p.el.style.transformOrigin = (pw / 2) + 'px ' + (-s.grip) + 'px';
      p.stock.style.clipPath = 'path("' + decklePath(pw, ph, 101 + i * 17) + '")';
      p.win.style.inset = b + 'px ' + b + 'px ' + bb + 'px ' + b + 'px';
      [p.shadowA, p.shadowB].forEach((sh) => { sh.style.width = pw + 'px'; sh.style.height = ph + 'px'; sh.style.transformOrigin = p.el.style.transformOrigin; });
      p.clip.style.transformOrigin = (pegW / 2) + 'px ' + s.pegThread + 'px';
      p.cache = {};
    });
    layoutMarks(s);
    // Canvases: the thread and nearer dust are crisp, the far dust soft.
    const dpr = Math.min(devicePixelRatio || 1, 1.5);
    s.dpr = dpr;
    sizeCanvas(s.back, s.lineW, H, 1);
    sizeCanvas(s.front, s.lineW, H, 1);
    sizeCanvas(s.beam, W, H, 1);
    s.lamp = { x: W * (scroll ? .16 : .1), y: 16 };
    s.lampAxis = (() => { const tx = W * (scroll ? .62 : .5), ty = H * 1.05, dx = tx - s.lamp.x, dy = ty - s.lamp.y, l = Math.hypot(dx, dy); return { x: dx / l, y: dy / l, len: l * 1.15 }; })();
    s.lampSpread = .36;
    drawBeam(s);
    buildRope(s);
    // The band the line can move in: its rest shape, plus room to swing.
    const ys = Array.from(s.rope.y);
    s.bandTop = Math.max(0, Math.floor(Math.min(...ys) - 40));
    s.bandH = Math.ceil(Math.max(...ys) + 70 - s.bandTop);
    sizeCanvas(s.thread, s.lineW, s.bandH, dpr);
    s.thread.style.top = s.bandTop + 'px';
    seedDust(s);
    s.hooks[0].style.transform = 'translate3d(' + (s.rope.pinL.x - 6) + 'px,' + (s.rope.pinL.y - 6) + 'px,0)';
    s.hooks[1].style.transform = 'translate3d(' + (s.rope.pinR.x - 6) + 'px,' + (s.rope.pinR.y - 6) + 'px,0)';
    // How much safelight falls on each print where it hangs.
    s.prints.forEach((p, i) => { p.lit = beamAt(s, s.clipX[i], threadAt + ph * .5); p.cache = {}; });
    render(s, 0);
  }
  function sizeCanvas(c, w, h, dpr) {
    const pw = Math.round(w * dpr), ph = Math.round(h * dpr);
    if (c.width !== pw || c.height !== ph) { c.width = pw; c.height = ph; }
    c._rects = null;
    c.style.width = w + 'px';
    c.style.height = h + 'px';
    c._dpr = dpr;
  }
  function layoutMarks(s) {
    const { b, bb } = s.border || { b: 0, bb: 0 };
    s.prints.forEach((p, i) => {
      const current = i === s.current;
      if (!current) { p.mark?.remove(); p.mark = null; return; }
      if (!s.pw) return;
      const svg = p.mark || document.createElementNS(SVG_NS, 'svg');
      svg.setAttribute('class', 'lbd-mark');
      svg.setAttribute('aria-hidden', 'true');
      svg.setAttribute('viewBox', '0 0 ' + s.pw + ' ' + s.ph);
      const d = markPath(b, b, s.pw - 2 * b, s.ph - b - bb, 7 + i);
      svg.innerHTML = '<g filter="url(#lbd-wax)"><path d="' + d + '" class="lbd-mark-a"/><path d="' + d + '" class="lbd-mark-b" transform="translate(1.2 .8)"/></g>';
      if (!p.mark) { p.liftEl.insertBefore(svg, p.focusRing); p.mark = svg; }
    });
  }

  /* ---- The safelight ------------------------------------------------------------ */
  function beamAt(s, x, y) {
    const L = s.lamp, A = s.lampAxis;
    const vx = x - L.x, vy = y - L.y, along = vx * A.x + vy * A.y;
    if (along <= 0) return 0;
    const perp = Math.abs(vx * A.y - vy * A.x), width = along * s.lampSpread + 30;
    const k = Math.exp(-(perp * perp) / (width * width) * 2.2);
    return k * clamp(1.15 - along / A.len, 0, 1);
  }
  function drawBeam(s) {
    const c = s.beam, ctx = c.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, c.width, c.height);
    const L = s.lamp, A = s.lampAxis, ang = Math.atan2(A.y, A.x);
    // Soft cones, each a little wider and fainter, add up to a beam with no hard edge.
    for (let k = 0; k < 7; k++) {
      const spread = Math.atan(s.lampSpread) * (.42 + k * .16);
      const g = ctx.createRadialGradient(L.x, L.y, 0, L.x, L.y, A.len);
      const a = .05 - k * .0045;
      g.addColorStop(0, 'rgba(255,72,46,' + (a * 1.6).toFixed(3) + ')');
      g.addColorStop(.45, 'rgba(232,48,30,' + a.toFixed(3) + ')');
      g.addColorStop(1, 'rgba(200,30,20,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(L.x, L.y);
      ctx.arc(L.x, L.y, A.len, ang - spread, ang + spread);
      ctx.closePath();
      ctx.fill();
    }
    const pool = ctx.createRadialGradient(L.x, L.y + 10, 0, L.x, L.y + 10, Math.max(s.W, s.H) * .5);
    pool.addColorStop(0, 'rgba(255,60,40,.16)');
    pool.addColorStop(1, 'rgba(255,60,40,0)');
    ctx.fillStyle = pool;
    ctx.fillRect(0, 0, c.width, c.height);
    // Matte paint has a tooth: grain, baked in once with the light.
    if (grainCanvas) {
      ctx.globalAlpha = .2;
      ctx.fillStyle = ctx.createPattern(grainCanvas, 'repeat');
      ctx.fillRect(0, 0, c.width, c.height);
      ctx.globalAlpha = 1;
    }
    // No edges: the wall fades into the room around it.
    ctx.globalCompositeOperation = 'destination-in';
    const across = ctx.createLinearGradient(0, 0, c.width, 0);
    across.addColorStop(0, 'rgba(0,0,0,0)'); across.addColorStop(.07, '#000'); across.addColorStop(.93, '#000'); across.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = across;
    ctx.fillRect(0, 0, c.width, c.height);
    const down = ctx.createLinearGradient(0, 0, 0, c.height);
    down.addColorStop(0, 'rgba(0,0,0,0)'); down.addColorStop(Math.min(.2, 34 / c.height), '#000'); down.addColorStop(.82, '#000'); down.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = down;
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.globalCompositeOperation = 'source-over';
  }

  /* ---- The line: a verlet rope, pinned to the walls ------------------------------ */
  function buildRope(s) {
    const pinL = { x: 10, y: s.threadY - 8 }, pinR = { x: s.lineW - 10, y: s.threadY - 8 };
    const span = pinR.x - pinL.x;
    const n = Math.max(18, Math.round(span / 30)) + 1;
    const x = new Float64Array(n), y = new Float64Array(n), px = new Float64Array(n), py = new Float64Array(n);
    const inv = new Float64Array(n).fill(1), ext = new Float64Array(n);
    // Out of the wall's plane: how far each point of the line has swung toward
    // the viewer (z), and how fast. A taut line barely moves along the wall;
    // what you see a real clothesline do is swing out and back.
    const z = new Float64Array(n), zv = new Float64Array(n), az = new Float64Array(n);
    for (let k = 0; k < n; k++) { x[k] = px[k] = pinL.x + span * k / (n - 1); y[k] = py[k] = pinL.y; }
    const clipIdx = s.clipX.map((cx) => clamp(Math.round((cx - pinL.x) / span * (n - 1)), 1, n - 2));
    // A peg with its print is many times heavier than the twine between pegs.
    clipIdx.forEach((k, i) => { inv[k] = 1 / (9 * s.prints[i].mass); });
    inv[0] = inv[n - 1] = 0;
    const rope = { n, x, y, px, py, inv, ext, z, zv, az, clipIdx, pinL, pinR, rest: span / (n - 1), G: 520, Kt: 0 };
    rope.Kt = Math.pow(span / 1.6, 2) / Math.pow(span / (n - 1), 2);   // a line that swings out over ~3 s
    s.rope = rope;
    // Find the length that gives the line a gentle sag (the twine stretches a
    // little under the pegs, so the length can be a touch under the span), then
    // let it come to rest. The sag only grows with length: bisect.
    const target = s.scroll ? clamp(s.H * .045, 16, 26) : clamp(s.H * .04, 16, 30);
    const sagFor = (slack, steps) => {
      rope.rest = span * (1 + slack) / (n - 1);
      for (let k = 0; k < n; k++) { x[k] = px[k] = pinL.x + span * k / (n - 1); y[k] = py[k] = pinL.y; }
      for (let t = 0; t < steps; t++) ropeStep(s, 1 / 120, false);
      let sag = 0;
      clipIdx.forEach((k) => { sag = Math.max(sag, y[k] - pinL.y); });
      return sag;
    };
    let lo = -.06, hi = .03;
    for (let it = 0; it < 10; it++) {
      const mid = (lo + hi) / 2;
      if (sagFor(mid, 360) > target) hi = mid; else lo = mid;
    }
    s.ropeSag = sagFor((lo + hi) / 2, 360);
    s.ropeSlack = (lo + hi) / 2;
    for (let k = 0; k < n; k++) { px[k] = x[k]; py[k] = y[k]; }
    s.prints.forEach((p) => { p.pvx = 0; p.pax = 0; });
  }
  const AIR = [0, 0, 0];
  function ropeStep(s, h, windy) {
    const r = s.rope, { n, x, y, px, py, inv, ext } = r, h2 = h * h;
    for (let k = 1; k < n - 1; k++) {
      const vx = (x[k] - px[k]) / h, vy = (y[k] - py[k]) / h;
      let ax = 0, ay = r.G;
      const heavy = inv[k] < 1;
      if (windy) {
        airAt(s, x[k], y[k], AIR);
        const drag = heavy ? .28 : 1.5;
        ax += drag * (AIR[0] - vx) + ext[k];
        ay += drag * (AIR[1] * .5 - vy);
        r.az[k] = AIR[2];
      } else { ax -= 4 * vx; ay -= 4 * vy; r.az[k] = 0; }
      const nx = x[k] + (x[k] - px[k]) * .996 + ax * h2;
      const ny = y[k] + (y[k] - py[k]) * .996 + ay * h2;
      px[k] = x[k]; py[k] = y[k]; x[k] = nx; y[k] = ny;
    }
    // The swing out of plane: a damped wave along the line, pinned at the walls.
    // Each peg carries its print's sail, so the air pushes hardest there.
    const { z, zv, az, Kt } = r;
    for (let k = 1; k < n - 1; k++) {
      const heavy = inv[k] < 1;
      const lap = z[k - 1] - 2 * z[k] + z[k + 1];
      const a = Kt * lap * inv[k] + (heavy ? 3.6 : 1.2) * az[k] - (heavy ? .8 : 1.1) * zv[k] - (windy ? 0 : 6 * zv[k] + 30 * z[k]);
      zv[k] += a * h;
    }
    for (let k = 1; k < n - 1; k++) z[k] = clamp(z[k] + zv[k] * h, -60, 60);
    const rest = r.rest;
    for (let it = 0; it < 40; it++) {
      const forward = (it & 1) === 0;
      for (let m = 0; m < n - 1; m++) {
        const k = forward ? m : n - 2 - m;
        const dx = x[k + 1] - x[k], dy = y[k + 1] - y[k], d = Math.hypot(dx, dy) || 1e-6;
        const w1 = inv[k], w2 = inv[k + 1], w = w1 + w2;
        if (!w) continue;
        const diff = (d - rest) / (d * w);
        x[k] += dx * diff * w1; y[k] += dy * diff * w1;
        x[k + 1] -= dx * diff * w2; y[k + 1] -= dy * diff * w2;
      }
    }
  }

  /* ---- The air ---------------------------------------------------------------------
   * Slow layered noise that drifts across the room, gusts that travel along
   * the line one print at a time, and puffs from the cursor. Units: px/s.
   * out[0] along the line, out[1] up/down, out[2] into the paper (flutter). */
  function airAt(s, x, y, out) {
    const A = s.air, t = A.t;
    const breath = .62 + .38 * noise2(t * .045, 7.3);
    const n1 = noise2(x * .0016 - t * .11, y * .0019 + t * .031);
    const n2 = noise2(x * .0042 - t * .27 + 31.7, y * .005 - t * .06);
    let vx = A.A0 * breath * (n1 + n2 * .45) + A.A0 * .22 * A.prevail;
    let vy = A.A0 * .35 * noise2(x * .0042 + 11.1, y * .0045 + t * .09);
    let vz = A.A0 * .55 * noise2(x * .007 - t * .5 + 5.5, t * .37 + y * .003);
    for (let g = 0; g < A.gusts.length; g++) {
      const G = A.gusts[g], u = (x - G.x) / G.sigma;
      if (u > 3.2 || u < -3.2) continue;
      const k = Math.exp(-u * u) * G.env;
      vx += G.dir * G.amp * k * (.86 + .14 * noise2(x * .011, t * 1.3));
      vy -= G.amp * .16 * k * u * G.dir;
      vz += G.amp * .42 * k;
    }
    for (let q = 0; q < A.puffs.length; q++) {
      const P = A.puffs[q], dx = x - P.x, dy = y - P.y, d2 = dx * dx + dy * dy, r2 = P.r * P.r;
      if (d2 > r2 * 6) continue;
      const k = Math.exp(-d2 / r2) * P.k;
      vx += P.vx * k; vy += P.vy * k; vz += P.mag * .35 * k;
    }
    out[0] = vx; out[1] = vy; out[2] = vz;
    return out;
  }
  function airStep(s, h) {
    const A = s.air;
    A.t += h;
    A.nextGust -= h;
    if (A.nextGust <= 0) {
      if (A.rnd() < .22) A.prevail *= -1;
      const dir = A.rnd() < .72 ? A.prevail : -A.prevail;
      const sigma = clamp(s.lineW * (.11 + A.rnd() * .06), 130, 320);
      A.gusts.push({ dir, amp: 36 + A.rnd() * 30, speed: s.lineW / (4.4 + A.rnd() * 1.8), sigma,
        x: dir > 0 ? -2.6 * sigma : s.lineW + 2.6 * sigma, from: dir > 0 ? -2.6 * sigma : s.lineW + 2.6 * sigma,
        to: dir > 0 ? s.lineW + 2.6 * sigma : -2.6 * sigma, env: 0 });
      A.nextGust = 11 + A.rnd() * 13;
    }
    for (let g = A.gusts.length - 1; g >= 0; g--) {
      const G = A.gusts[g];
      G.x += G.dir * G.speed * h;
      const p = (G.x - G.from) / (G.to - G.from);
      G.env = clamp(Math.min(p / .14, (1 - p) / .14), 0, 1);
      G.env = G.env * G.env * (3 - 2 * G.env);
      if (p >= 1) A.gusts.splice(g, 1);
    }
    for (let q = A.puffs.length - 1; q >= 0; q--) {
      const P = A.puffs[q];
      P.age += h;
      P.x += P.vx * .3 * h; P.y += P.vy * .3 * h;
      P.k = Math.exp(-P.age / P.tau);
      if (P.age > P.tau * 4) A.puffs.splice(q, 1);
    }
  }

  /* The cursor is air: a slow pass leaves a gentle wake, a flick throws a gust. */
  function pointer(s, e) {
    // The line's box as of the last frame (the page itself rarely moves under the cursor).
    const rect = s.lineRect && s.raf ? s.lineRect : (s.lineRect = s.line.getBoundingClientRect());
    const x = e.clientX - rect.left, y = e.clientY - rect.top, now = performance.now() / 1000;
    const last = s.pointer;
    s.pointer = { x, y, t: now, vx: 0, vy: 0, lastPuff: last?.lastPuff || 0, lastFlick: last?.lastFlick || 0, type: e.pointerType };
    if (last && e.type === 'pointermove') {
      const dt = Math.max(.008, now - last.t);
      s.pointer.vx = last.vx * .55 + (x - last.x) / dt * .45;
      s.pointer.vy = last.vy * .55 + (y - last.y) / dt * .45;
      const speed = Math.hypot(s.pointer.vx, s.pointer.vy);
      if (!s.still && !s.pulling && speed > 14 && now - s.pointer.lastPuff > .03) {
        s.pointer.lastPuff = now;
        const k = speed < 500 ? .2 : .2 + Math.min(.24, (speed - 500) / 2400);
        let vx = s.pointer.vx * k, vy = s.pointer.vy * k;
        const m = Math.hypot(vx, vy);
        if (m > 110) { vx *= 110 / m; vy *= 110 / m; }
        const P = s.air.puffs;
        P.push({ x, y, vx, vy, mag: Math.min(m, 110), r: 60 + Math.min(100, speed * .05), tau: .55 + Math.min(.7, speed / 3000), age: 0, k: 1 });
        if (P.length > 40) P.shift();
        if (speed > 1700 && Math.abs(s.pointer.vx) > Math.abs(s.pointer.vy) * .6 && now - s.pointer.lastFlick > .7) {
          s.pointer.lastFlick = now;
          const dir = Math.sign(s.pointer.vx), sigma = 150;
          s.air.gusts.push({ dir, amp: 26 + Math.min(22, (speed - 1700) / 90), speed: 430, sigma,
            x: x - dir * sigma, from: x - dir * sigma, to: x + dir * Math.min(s.lineW * .55, 700), env: 0 });
        }
      }
    }
    if (e.pointerType === 'mouse' || e.pointerType === 'pen') {
      let hit = -1;
      if (!s.pulling) s.prints.forEach((p, i) => {
        const k = s.rope?.clipIdx[i];
        if (k == null) return;
        const cx = s.projX ? s.projX[k] : s.rope.x[k], top = (s.projY ? s.projY[k] : s.rope.y[k]) - s.pegThread;
        if (x > cx - s.pw / 2 - 6 && x < cx + s.pw / 2 + 6 && y > top - 4 && y < top + s.pegH * .4 + s.grip + s.ph + 8) {
          hit = i;
          p.hx = clamp((x - cx) / (s.pw / 2), -1, 1);
          p.hy = clamp((y - (top + s.pegThread + s.grip + s.ph / 2)) / (s.ph / 2), -1, 1);
        }
      });
      s.prints.forEach((p, i) => { p.ptr = i === hit; });
      setHover(s);
    }
    wake(s);
  }
  /* A phone has no hover. There, the print hanging at the centre of the wall is the one in
   * hand: it lifts and develops as you swipe along the line, and the others keep a half-developed
   * image instead of blank paper. Wider screens never set `near` or `phone`. */
  function nearest(s) {
    const phone = !!s.scroll && phoneMQ.matches;
    let hit = -1;
    if (phone && s.clipX) {
      const centre = s.scroller.scrollLeft + s.W / 2;
      let best = Infinity;
      s.clipX.forEach((x, i) => { const d = Math.abs(x - centre); if (d < best) { best = d; hit = i; } });
    }
    let changed = s.phone !== phone;
    s.phone = phone;
    s.prints.forEach((p, i) => { const near = i === hit; if (!!p.near !== near) { p.near = near; changed = true; } });
    if (changed) { setHover(s); wake(s); }
  }
  function setHover(s) {
    let hover = -1;
    s.prints.forEach((p, i) => { const on = p.ptr || p.focus || p.near; if (on && (hover < 0 || p.ptr)) hover = i; });
    s.prints.forEach((p, i) => {
      const on = i === hover;
      if (p.on !== on) { p.on = on; p.el.classList.toggle('is-hover', on); }
    });
    s.line.classList.toggle('is-pointing', s.prints.some((p) => p.ptr));
    s.hover = hover;
    if (s.still) render(s, 0);
  }
  function reveal(s, i) {
    if (!s.scroll) return;
    const x = s.clipX[i] - s.W / 2;
    s.scroller.scrollTo({ left: clamp(x, 0, s.lineW - s.W), behavior: s.still ? 'auto' : 'smooth' });
  }

  /* ---- Prints: damped pendulums hanging from their pegs -------------------------- */
  const PAIR = [0, 0, 0];
  function printStep(s, h) {
    const r = s.rope;
    for (let i = 0; i < N; i++) {
      const p = s.prints[i], k = r.clipIdx[i];
      const vx = (r.x[k] - r.px[k]) / h;
      p.pax += ((vx - p.pvx) / h - p.pax) * .12;
      p.pvx = vx;
      const Lc = s.grip + s.ph * .55;
      const w0 = 2 * Math.PI / p.T, w02 = w0 * w0;
      const sa = Math.sin(p.a), ca = Math.cos(p.a);
      const cx = r.x[k] + Lc * sa, cy = r.y[k] + Lc * ca;
      airAt(s, cx, cy, PAIR);
      const vrel = PAIR[0] - (vx + p.av * Lc * ca);
      const Kw = .055 * w02 / 70 * p.gain / p.mass;
      const calm = p.on ? 1.1 : 0;
      let acc = -w02 * sa - (p.zeta + calm) * p.av + Kw * vrel * ca - (p.pax / Lc) * ca * .9;
      // A soft stop: a pegged print never swings far.
      if (Math.abs(p.a) > .16) acc -= (p.a - Math.sign(p.a) * .16) * 60;
      p.av += acc * h;
      p.a += p.av * h;
      p.acc = acc;
      // Flutter: the lower edge of the paper lifts in air pushing into it.
      const zv = r.zv[k], zacc = (zv - (p.pzv || 0)) / h;
      p.pzv = zv;
      p.zacc = (p.zacc || 0) + (zacc - (p.zacc || 0)) * .2;
      const fa = -p.wf * p.wf * p.f - 2 * p.zf * p.wf * p.fv + .1 * (PAIR[2] - zv) / p.mass - .04 * acc - p.zacc / Lc * .6;
      p.fv += fa * h; p.f += p.fv * h;
      p.f = clamp(p.f, -.09, .11);
      // Twist: uneven air across the width turns the sheet a touch.
      const ta = -p.wt * p.wt * p.tw - 2 * .24 * p.wt * p.twv + .045 * (PAIR[2] * .35 + vrel * .3) / p.mass;
      p.twv += ta * h; p.tw += p.twv * h;
      p.tw = clamp(p.tw, -.07, .07);
      // The print pulls back on its peg: weight along its angle, and its swing.
      const mr = .9;
      r.ext[k] = mr * (w02 * Lc * sa * .5 - .25 * Lc * (acc * ca - p.av * p.av * sa));
    }
  }

  /* Hover, focus and develop: springs, never snaps. */
  function springs(s, dt) {
    s.prints.forEach((p) => {
      const on = p.on && !s.pulling;
      const tl = on ? 1 : 0;
      const tx = on ? ((p.keyboard || p.near) && !p.ptr ? 0 : p.hx) : 0;
      const ty = on ? ((p.keyboard || p.near) && !p.ptr ? -.25 : p.hy) : 0;
      const step = (x, v, target, w, z) => { const a = w * w * (target - x) - 2 * z * w * v; v += a * dt; return [x + v * dt, v]; };
      [p.lift, p.liftV] = step(p.lift, p.liftV, tl, 7.5, .48);
      [p.tx, p.txV] = step(p.tx, p.txV, tx, 8, .38);
      [p.ty, p.tyV] = step(p.ty, p.tyV, ty, 8, .38);
      const target = on || s.pulling?.i === p.i ? 1 : (s.phone ? .5 : 0);
      p.boost += (target - p.boost) * (1 - Math.exp(-dt / (target > p.boost ? .9 : 2.2)));
    });
    s.trayBoost += ((s.trayHover ? 1 : 0) - s.trayBoost) * (1 - Math.exp(-dt / (s.trayHover ? .8 : 2)));
  }

  /* ---- Dust in the beam, carried by the same air ---------------------------------- */
  function seedDust(s) {
    const r = rng(77), count = Math.round(clamp(s.lineW * s.H / 6500, 50, 150));
    s.dust = Array.from({ length: count }, () => {
      const z = r();
      return { x: r() * s.lineW, y: r() * s.H, z, vx: 0, vy: 0, size: .7 + z * z * 2.4, phase: r() * 6.28, rate: .4 + r() * 1.2,
        tau: .5 + (1 - z) * .9, seed: r() * 100 };
    });
    if (!s.sprites) {
      s.sprites = [1, 2, 3, 5].map((rad) => {
        const c = document.createElement('canvas'), size = rad * 4;
        c.width = c.height = size;
        const ctx = c.getContext('2d');
        const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
        g.addColorStop(0, 'rgba(255,190,170,1)');
        g.addColorStop(.35, 'rgba(255,140,115,.55)');
        g.addColorStop(1, 'rgba(255,110,90,0)');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, size, size);
        return c;
      });
    }
  }
  function dustStep(s, dt) {
    const t = s.air.t;
    for (const m of s.dust) {
      airAt(s, m.x, m.y, AIR);
      const resp = .35 + m.z * .65;
      const bx = 5 * noise2(m.seed, t * .25), by = 4 * noise2(m.seed + 40, t * .22) - 1.2;
      const k = 1 - Math.exp(-dt / m.tau);
      m.vx += (AIR[0] * resp + bx - m.vx) * k;
      m.vy += (AIR[1] * resp * .8 + by - m.vy) * k;
      m.x += m.vx * dt; m.y += m.vy * dt;
      if (m.x < -20) m.x += s.lineW + 40; else if (m.x > s.lineW + 20) m.x -= s.lineW + 40;
      if (m.y < -20) m.y += s.H + 40; else if (m.y > s.H + 20) m.y -= s.H + 40;
    }
  }

  /* ---- Drawing ------------------------------------------------------------------------ */
  function drawThread(s) {
    const r = s.rope;
    // Far dust, behind the line, on its own soft canvas.
    const b = s.back, bctx = b.getContext('2d');
    if (bctx) drawDust(s, b, bctx, false, s.viewX);
    // The line itself is drawn crisp, on a band just tall enough for it.
    const c = s.thread, ctx = c.getContext('2d');
    if (!ctx || !r) return;
    const dpr = c._dpr, top = s.bandTop;
    ctx.setTransform(dpr, 0, 0, dpr, 0, -top * dpr);
    ctx.clearRect(0, top, s.lineW, s.bandH);
    const X = s.projX, Y = s.projY;
    const path = (dx, dy) => {
      ctx.beginPath();
      ctx.moveTo(X[0] + dx, Y[0] + dy);
      for (let k = 1; k < r.n - 1; k++) {
        const mx = (X[k] + X[k + 1]) / 2, my = (Y[k] + Y[k + 1]) / 2;
        ctx.quadraticCurveTo(X[k] + dx, Y[k] + dy, mx + dx, my + dy);
      }
      ctx.lineTo(X[r.n - 1] + dx, Y[r.n - 1] + dy);
    };
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    // Its shadow on the wall, soft and low.
    path(4, 9);
    ctx.strokeStyle = 'rgba(0,0,0,.34)';
    ctx.lineWidth = 3.4;
    ctx.stroke();
    // Aged cotton twine: a dark body, a warm lit edge, and the twist of its ply.
    path(0, 0);
    ctx.strokeStyle = '#2a120d';
    ctx.lineWidth = 2.3;
    ctx.stroke();
    ctx.strokeStyle = 'rgba(214,132,104,.62)';
    ctx.lineWidth = 1.25;
    ctx.stroke();
    path(0, -.55);
    ctx.strokeStyle = 'rgba(255,196,170,.30)';
    ctx.lineWidth = .7;
    ctx.stroke();
    path(0, 0);
    ctx.setLineDash([1.4, 2.6]);
    ctx.strokeStyle = 'rgba(40,12,8,.55)';
    ctx.lineWidth = 1.4;
    ctx.stroke();
    ctx.setLineDash([]);
  }
  /* Dust is a few hundred small sprites: clear only where they were drawn last
   * frame, never the whole canvas. */
  function drawDust(s, c, ctx, near, off) {
    ctx.setTransform(c._dpr, 0, 0, c._dpr, 0, 0);
    const was = c._rects;
    if (!was) ctx.clearRect(0, 0, s.lineW, s.H);
    else for (let q = 0; q < was.length; q += 4) ctx.clearRect(was[q], was[q + 1], was[q + 2], was[q + 3]);
    const rects = c._rects = [];
    if (!s.dust.length || !s.sprites) return;
    const t = s.air.t;
    const left = off - 20, right = off + s.W + 20;
    for (const m of s.dust) {
      if ((m.z >= .62) !== near) continue;
      if (m.x < left || m.x > right) continue;
      const light = beamAt(s, m.x - off, m.y);
      const tw = .7 + .3 * Math.sin(t * m.rate + m.phase);
      const a = (.05 + light * 1.1) * tw * (near ? .85 : .7);
      if (a < .012) continue;
      const sprite = s.sprites[m.size < 1 ? 0 : m.size < 1.6 ? 1 : m.size < 2.2 ? 2 : 3];
      const size = m.size * 4 * (near ? 1.25 : 1);
      ctx.globalAlpha = Math.min(1, a);
      const x0 = m.x - size / 2, y0 = m.y - size / 2;
      ctx.drawImage(sprite, x0, y0, size, size);
      rects.push(Math.floor(x0) - 1, Math.floor(y0) - 1, Math.ceil(size) + 3, Math.ceil(size) + 3);
    }
    ctx.globalAlpha = 1;
  }
  function drawFront(s) {
    const c = s.front, ctx = c.getContext('2d');
    if (ctx) drawDust(s, c, ctx, true, s.viewX);
  }
  const f3 = (n) => (Math.round(n * 1000) / 1000);
  function setStyle(p, el, key, prop, value) {
    if (p.cache[key] === value) return;
    p.cache[key] = value;
    el.style[prop] = value;
  }
  /* The camera: a point of the line that swings toward you comes forward in perspective. */
  const PERSP = 1300;
  function project(s) {
    const r = s.rope, n = r.n;
    if (!s.projX || s.projX.length !== n) { s.projX = new Float64Array(n); s.projY = new Float64Array(n); s.projF = new Float64Array(n); }
    const cx = s.viewX + s.W / 2, cy = s.H * .42;
    for (let k = 0; k < n; k++) {
      const zk = s.still ? 0 : r.z[k], f = PERSP / (PERSP - zk);
      s.projX[k] = cx + (r.x[k] - cx) * f;
      s.projY[k] = cy + (r.y[k] - cy) * f;
      s.projF[k] = f;
    }
  }
  function render(s, dt) {
    if (!s.rope) return;
    // Read the scroll position and where the line sits once, before this
    // frame writes any style, so nothing forces a layout mid-frame.
    s.viewX = s.scroll ? s.scroller.scrollLeft : 0;
    s.lineRect = s.line.getBoundingClientRect();
    const r = s.rope, still = s.still;
    project(s);
    drawThread(s);
    drawFront(s);
    const pull = s.pulling;
    s.prints.forEach((p, i) => {
      const k = r.clipIdx[i];
      const P = { x: s.projX[k], y: s.projY[k] };
      const zf = s.projF[k], zk = still ? 0 : r.z[k];
      const a = still ? 0 : p.a;
      const tan = Math.atan2(s.projY[k + 1] - s.projY[k - 1], s.projX[k + 1] - s.projX[k - 1]);
      const deg = (-a + tan * .12) * 57.2958;
      const lift = still ? 0 : p.lift;
      const tiltY = still ? 0 : p.tx * 7 + p.tw * 57.3;
      const tiltX = still ? 0 : -p.ty * 5 + p.f * 57.3;
      // Swung out from the wall, a print's shadow falls further away and softer.
      const away = clamp(zk / 90, -.5, 1);
      let tf, sh1, sh2, shadowOpacity = (.58 - lift * .22) * (1 - away * .45), softOpacity = still ? (p.on ? .45 : 0) : lift * .55 + Math.max(0, away) * .25;
      const ox = P.x - s.pw / 2, oy = P.y + s.grip;
      const sdx = 6 + (P.x - s.viewX - s.lamp.x) / Math.max(1, s.W) * 12 + zk * .2, sdy = 11 + zk * .28;
      if (pull && pull.i === i) {
        const o = pull.pose(P, deg);
        tf = o.tf; sh1 = o.sh; sh2 = o.sh;
        shadowOpacity = o.shadow; softOpacity = o.shadow;
      } else {
        tf = 'perspective(1300px) translate3d(' + f3(ox) + 'px,' + f3(oy) + 'px,0) rotate(' + f3(deg) + 'deg) rotateX(' + f3(tiltX) + 'deg) rotateY(' + f3(tiltY)
          + 'deg) translate3d(0,' + f3(-lift * 5) + 'px,' + f3(lift * 34) + 'px) scale(' + f3(zf * (1 + lift * .02)) + ')';
        sh1 = 'translate3d(' + f3(ox + sdx + lift * 4) + 'px,' + f3(oy + sdy + lift * 6) + 'px,0) rotate(' + f3(deg) + 'deg) scale(' + f3(zf * (1 + lift * .02)) + ',' + f3(zf * (1 + lift * .02) + Math.max(0, p.f) * .5) + ')';
        sh2 = 'translate3d(' + f3(ox + sdx * 2 + lift * 14) + 'px,' + f3(oy + sdy * 1.9 + lift * 20) + 'px,0) rotate(' + f3(deg) + 'deg) scale(' + f3(1.04 + lift * .06) + ')';
      }
      setStyle(p, p.el, 'tf', 'transform', tf);
      setStyle(p, p.shadowA, 'sa', 'transform', sh1);
      setStyle(p, p.shadowB, 'sb', 'transform', sh2);
      setStyle(p, p.shadowA, 'sao', 'opacity', String(f3(clamp(shadowOpacity, 0, 1))));
      setStyle(p, p.shadowB, 'sbo', 'opacity', String(f3(clamp(softOpacity, 0, 1))));
      const ct = 'translate3d(' + f3(P.x - s.pegW / 2) + 'px,' + f3(P.y - s.pegThread + (pull && pull.i === i ? pull.hop : 0)) + 'px,0) rotate(' + f3(pull && pull.i === i ? tan * 57.3 : deg) + 'deg) scale(' + f3(zf) + ')';
      setStyle(p, p.clip, 'ct', 'transform', ct);
      // Development: a latent image first, then density and sharpness.
      const L = Math.max(p.level, .035);
      const D = still ? (p.on ? L + (1 - L) * .9 : (s.phone ? L + (1 - L) * .45 : L)) : L + (1 - L) * .92 * p.boost;
      const sharp = Math.pow(clamp((D - .06) / .8, 0, 1), .9);
      const latent = clamp(D * 2.2, 0, 1) * (1 - sharp) * .85;
      setStyle(p, p.sharp, 'so', 'opacity', String(Math.round(sharp * 200) / 200));
      setStyle(p, p.latent, 'lo', 'opacity', String(Math.round(latent * 200) / 200));
      setStyle(p, p.fog, 'fo', 'opacity', String(Math.round((.08 + (1 - D) * .5) * 100) / 100));
      setStyle(p, p.light, 'li', 'opacity', String(Math.round((.25 + p.lit * .75) * 100) / 100));
      const glide = still ? 0 : (-a * 3 + p.tx * .25 + p.tw * 2) * s.pw * .45;
      setStyle(p, p.sheen, 'sh', 'transform', 'translate3d(' + f3(glide) + 'px,0,0)');
      setStyle(p, p.sheen, 'sho', 'opacity', String(f3(.35 + lift * .45)));
    });
    // The tray: the developer is never quite still.
    if (!still) {
      const trayX = s.viewX + s.W / 2;
      airAt(s, trayX, s.H - s.benchH * .5, AIR);
      s.trayAirV += ((AIR[0] - s.trayAir) * 2.2 - s.trayAirV * 1.6) * dt;
      s.trayAir += s.trayAirV * dt;
    }
    const ta = still ? 0 : clamp(s.trayAir, -40, 40);
    const rock = still ? 0 : noise2(s.air.t * .18, 3.3);
    s.traySheen.style.transform = 'translate3d(' + f3(ta * .55 + rock * 10) + 'px,0,0)';
    s.trayPrint.style.transform = 'translate3d(' + f3(rock * 2.2) + 'px,' + f3(-s.trayBoost * 4) + 'px,0) rotate(' + f3(-2 + ta * .02 + rock * .6) + 'deg)';
    const tl = still ? (s.trayHover ? .95 : s.trayLevel || .2) : (s.trayLevel || .2) + (1 - (s.trayLevel || .2)) * .8 * s.trayBoost;
    const tlo = String(Math.round(tl * 100) / 100);
    if (s.trayPage._o !== tlo) { s.trayPage.style.opacity = tlo; s.trayPage._o = tlo; }
  }

  /* ---- The loop ------------------------------------------------------------------------- */
  const STEP = 1 / 120;
  function wake(s) {
    if (s.raf || !s.host.isConnected) return;
    if (!running(s)) return;
    s.last = performance.now();
    s.raf = requestAnimationFrame((now) => frame(s, now));
  }
  const running = (s) => s.visible && s.onscreen && !s.still;
  function frame(s, now) {
    s.raf = 0;
    if (!s.host.isConnected || active !== s) return;
    const raw = (now - s.last) / 1000;
    s.last = now;
    if (raw > .05) s.jank++; else if (s.jank) s.jank = Math.max(0, s.jank - .05);
    const dt = clamp(raw, 0, 1 / 20);
    if (!s.rope) return;
    if (!s.still) {
      s.acc += dt;
      let n = 0;
      while (s.acc >= STEP && n < 6) {
        airStep(s, STEP);
        ropeStep(s, STEP, true);
        printStep(s, STEP);
        s.acc -= STEP;
        n++;
      }
      if (n === 6) s.acc = 0;
      dustStep(s, dt);
    }
    springs(s, dt);
    if (s.pulling) s.pulling.tick(dt);
    render(s, dt);
    if (running(s)) s.raf = requestAnimationFrame((t) => frame(s, t));
  }

  /* ---- Taking a print off the line -------------------------------------------------------
   * The peg lets go, the print comes off the line and is brought up into focus,
   * then the stage's own room opens through the native control. */
  let lastLongTask = 0;
  try {
    new PerformanceObserver((list) => { for (const e of list.getEntries()) lastLongTask = e.startTime + e.duration; })
      .observe({ type: 'longtask', buffered: false });
  } catch {}
  function heavyPage(s) {
    const nav = navigator;
    if (nav.connection?.saveData) return true;
    if ((nav.hardwareConcurrency || 8) <= 2 || (nav.deviceMemory || 8) <= 2) return true;
    if (s.jank >= 3) return true;
    if (performance.now() - lastLongTask < 1500) return true;
    return document.getElementsByTagName('*').length > 6000;
  }
  function nativeLaunch(i, sub) {
    const st = STAGES[i];
    if (sub === 'continue') {
      const api = window.LightboxStudio, d = liveData();
      if (api && d) {
        try { if (api.continueWriting(d.spot || null)) return true; } catch (error) { console.warn('Darkroom: continue writing unavailable', error); }
      }
    }
    const source = sourceFor(st);
    if (!source || !source.isConnected) return false;
    const target = st.id === 'world'
      ? source.querySelectorAll('.world-index button')[sub === 'locations' ? 1 : sub === 'props' ? 2 : 0]
      : source;
    if (!target) return false;
    target.click();
    return true;
  }
  function launch(s, i, sub) {
    const go = () => {
      const ok = nativeLaunch(i, sub);
      if (!ok) { console.error('Darkroom: native destination unavailable:', STAGES[i].id); reset(s); }
      return ok;
    };
    if (!s.still && typeof document.startViewTransition === 'function' && !heavyPage(s)) {
      try {
        const vt = document.startViewTransition(async () => {
          go();
          // React commits the room in a microtask after the native click; wait for it.
          for (let t = 0; t < 20 && root.querySelector('.story-atlas'); t++) await new Promise((res) => setTimeout(res, 15));
        });
        vt.finished.catch(() => {});
        return;
      } catch {}
    }
    go();
  }
  function reset(s) {
    if (!s.pulling) return;
    s.pulling = null;
    s.host.classList.remove('is-pulling', 'is-pouring');
    s.atlas.classList.remove('is-pulling');
    s.prints.forEach((p) => { p.el.classList.remove('is-pulled'); p.cache = {}; });
    render(s, 0);
  }
  function pull(s, i, sub) {
    if (s.pulling || !s.host.isConnected) return;
    const p = s.prints[i];
    const fromTray = sub === 'continue';
    s.host.classList.add(fromTray ? 'is-pouring' : 'is-pulling');
    s.atlas.classList.add('is-pulling');
    if (!fromTray) p.el.classList.add('is-pulled');
    s.live.textContent = fromTray ? s.contLabel.textContent : 'Opening ' + STAGES[i].name;
    if (s.still) {
      // Reduced motion: no flight, a short fade and straight in.
      s.pulling = { i: -1, hop: 0, tick() {}, pose() { return null; } };
      s.launchTimer = setTimeout(() => launch(s, i, sub), 160);
      return;
    }
    const DUR = fromTray ? .42 : .78, TUG = .16;
    let t = 0, launched = false, start = null;
    s.pulling = {
      i: fromTray ? -1 : i, hop: 0,
      tick(dt) {
        t += dt;
        if (!fromTray) this.hop = t < TUG ? -Math.sin(t / TUG * Math.PI) * 2 : 0;
        if (!launched && t >= DUR) { launched = true; launch(s, i, sub); }
        // If the room never opens (no native control), the print goes back.
        if (t > DUR + 2.5 && s.host.isConnected) reset(s);
      },
      /* The element's transform origin O is the peg's groove, (pw/2, -grip) in
       * its own box, so a translate T puts the groove at T + O and the print's
       * centre at T + O + scale·R(θ)·(0, d), d = grip + ph/2. Solving for T
       * moves the centre on a straight path from the line to the room's middle. */
      pose(P, deg) {
        const d = s.grip + s.ph / 2;
        if (!start) {
          const th = deg * Math.PI / 180, sc0 = 1 + p.lift * .02;
          start = { cx: P.x - sc0 * d * Math.sin(th), cy: P.y + sc0 * d * Math.cos(th), deg, sc: sc0 };
        }
        // A small tug down out of the jaws, then up into focus.
        const tug = (t < TUG ? Math.sin(t / TUG * Math.PI * .5) : 1) * 9;
        const u = easeInOut(clamp((t - TUG) / (DUR - TUG), 0, 1));
        const view = s.viewX;
        const scale = Math.min(2.2, (s.H * .8) / s.ph, (s.W * .62) / s.pw);
        const sc = lerp(start.sc, scale, u);
        const th = lerp(start.deg, 0, u) * Math.PI / 180;
        const cx = lerp(start.cx, view + s.W / 2, u), cy = lerp(start.cy + tug, s.H * .47, u);
        const tx = cx - s.pw / 2 + sc * d * Math.sin(th), ty = cy + s.grip - sc * d * Math.cos(th);
        const rot = ' rotate(' + f3(th * 57.2958) + 'deg) scale(' + f3(sc) + ')';
        return {
          tf: 'perspective(1300px) translate3d(' + f3(tx) + 'px,' + f3(ty) + 'px,0)' + rot,
          sh: 'translate3d(' + f3(tx + 10 + u * 8) + 'px,' + f3(ty + 14 + u * 10) + 'px,0)' + rot,
          shadow: .5 * (1 - u)
        };
      }
    };
    wake(s);
  }

  /* ---- Following the app ------------------------------------------------------------------- */
  // Touch a class only when it really changes: re-adding one still queues a
  // mutation record, and the observer below would wake sync() again, forever.
  const setClass = (el, on, ...names) => names.forEach((n) => { if (el && el.classList.contains(n) !== on) el.classList.toggle(n, on); });
  function sync() {
    const studio = root.querySelector('.studio.atlas-shell');
    const atlas = studio?.querySelector('.story-atlas');
    if (active && (!atlas || !active.host.isConnected || !atlas.contains(active.host))) {
      unmount(active);
      active = null;
    }
    if (atlas) {
      setClass(studio, true, 'lb-cylinder-atlas');
      if (!active) mount(atlas);
      else refresh(active);
    } else setClass(studio, false, 'lb-cylinder-atlas', 'lbd-studio');
    if (!returnButton) {
      returnButton = document.createElement('button');
      returnButton.type = 'button';
      returnButton.className = 'lb-cylinder-back';
      returnButton.textContent = '← STORY ATLAS';
      returnButton.setAttribute('aria-label', 'Return to the Story Atlas');
      returnButton.addEventListener('click', () => root.querySelector('.studio.atlas-shell .app-wordmark')?.click());
      document.body.append(returnButton);
    }
    returnButton.hidden = !(hasEnteredAtlas && studio && !atlas
      && !studio.classList.contains('composition')
      && studio.querySelector('.main-editor .editor-body'));
  }

  const observer = new MutationObserver((records) => {
    if (watching) return;
    const relevant = records.some((record) => {
      const node = record.target;
      const element = node.nodeType === 1 ? node : node.parentElement;
      if (element?.closest?.('.lbd-darkroom')) return false;
      if (record.type === 'attributes') return element?.matches?.('.studio.atlas-shell,.story-atlas,.breakdown-stage,.pitch-stage');
      if (element?.closest?.('.atlas-map')) return true;
      if (record.type !== 'childList') return false;
      const changed = [...record.addedNodes, ...record.removedNodes];
      return changed.some((n) => n.nodeType === 1
        && (n.matches?.('.studio,.story-atlas,.atlas-map,.main-editor')
          || n.querySelector?.('.story-atlas,.atlas-map,.main-editor')));
    });
    if (!relevant) return;
    watching = true;
    requestAnimationFrame(() => { watching = false; sync(); });
  });
  observer.observe(root, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['class'] });
  // The bridge announces project changes; the prints re-develop when the work changes.
  let liveQueued = false;
  document.addEventListener('lightbox:project', () => {
    if (!active || liveQueued) return;
    liveQueued = true;
    requestAnimationFrame(() => { liveQueued = false; if (active) refresh(active); });
  });
  // For tests and for the curious: a read-only window onto the room.
  window.LightboxDarkroom = {
    calm: (seconds = 60) => { if (active) active.air.nextGust = Math.max(active.air.nextGust, seconds); return !!active; },
    state: () => active && {
      order: STAGES.map((st) => st.id), levels: active.lv.slice(), current: active.current, still: active.still, running: !!active.raf,
      angles: active.prints.map((p) => p.a), clips: active.rope ? active.rope.clipIdx.map((k) => ({ x: active.rope.x[k], y: active.rope.y[k], z: active.rope.z[k] })) : [],
      gusts: active.air.gusts.map((g) => ({ x: g.x, dir: g.dir, amp: g.amp })), time: active.air.t,
      sag: active.ropeSag, size: { W: active.W, H: active.H, lineW: active.lineW, pw: active.pw, ph: active.ph, scroll: active.scroll }
    },
    gust: (dir = 1, amp = 60) => {
      const s = active;
      if (!s || s.still) return false;
      const sigma = clamp(s.lineW * .13, 130, 320);
      s.air.gusts.push({ dir, amp, speed: s.lineW / 5, sigma, x: dir > 0 ? -2.6 * sigma : s.lineW + 2.6 * sigma,
        from: dir > 0 ? -2.6 * sigma : s.lineW + 2.6 * sigma, to: dir > 0 ? s.lineW + 2.6 * sigma : -2.6 * sigma, env: 0 });
      s.air.nextGust = Math.max(s.air.nextGust, 14);
      return true;
    }
  };
  sync();
})();
