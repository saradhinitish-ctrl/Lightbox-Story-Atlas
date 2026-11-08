/* Lightbox Studio — the research board (Field Notes room only)
 *
 * Your real research notes, pinned to the light table as index cards, with
 * red string between linked ones. React renders an empty, stable host
 * (.lbx-board-host) in the Research corkboard; this module draws inside it.
 *
 * Reads the open project through window.LightboxStudio (script.js) and writes
 * only through it, so every change goes through the app's own changeProject:
 *   - drag a card (or move it with the arrow keys) → its x / y, and the
 *     notes' reading order (top to bottom, left to right) become `order`
 *   - tie a string → `fields['research.links']` on the first note
 * Both are undoable and saved like any other edit. Notes that share a
 * keyword are joined by a lighter, dashed thread that is not stored.
 *
 * Motion: a dragged card moves by transform only; nothing else animates.
 */
(() => {
  'use strict';
  const root = document.getElementById('root');
  if (!root) return;

  const VIEW_KEY = 'lightbox.research.view';
  const CARD_W = 240, CARD_H = 160, GAP_X = 34, GAP_Y = 40, PAD = 24;
  const KINDS = { question: 'Question', fact: 'Fact', quote: 'Quote', place: 'Place', person: 'Person', image: 'Image', lead: 'Lead' };
  const STATUS = { open: 'Open thread', followed: 'Followed up', dead: 'Dead end' };
  const api = () => window.LightboxStudio;
  let view = 'board';
  try { if (localStorage.getItem(VIEW_KEY) === 'cards') view = 'cards'; } catch {}

  const make = (tag, cls, text) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  };
  const SVG_NS = 'http://www.w3.org/2000/svg';
  const plain = (html) => {
    const t = document.createElement('template');
    t.innerHTML = String(html || '').replace(/<\/(p|div|h\d|li)>/gi, ' ').replace(/<br\s*\/?>/gi, ' ');
    return (t.content.textContent || '').replace(/\s+/g, ' ').trim();
  };
  const wordCount = (text) => text ? text.split(/\s+/).filter(Boolean).length : 0;
  // A steady, per-note tilt so the board looks pinned by hand (static, never animated)
  const tilt = (id) => { let h = 0; for (const c of id) h = (h * 31 + c.charCodeAt(0)) | 0; return ((Math.abs(h) % 9) - 4) * .45; };

  let board = null;            // { host, folder, el, svg, cards: Map, notes, positions, tying, ... }

  function notesFor(project, folderId) {
    return project.nodes.filter((n) => n.parent === folderId).sort((a, b) => a.order - b.order);
  }
  function columns(width) { return Math.max(1, Math.floor((width - PAD * 2 + GAP_X) / (CARD_W + GAP_X))); }
  function defaultSpot(i, cols) {
    const col = i % cols, row = Math.floor(i / cols);
    return { x: PAD + col * (CARD_W + GAP_X), y: PAD + row * (CARD_H + GAP_Y) + (col % 2 ? 14 : 0) };
  }
  function linksOf(notes) {
    const ids = new Set(notes.map((n) => n.id)), seen = new Set(), out = [];
    for (const n of notes) {
      for (const other of (n.fields?.['research.links'] || '').split(',').filter(Boolean)) {
        if (!ids.has(other) || other === n.id) continue;
        const key = [n.id, other].sort().join('|');
        if (seen.has(key)) continue;
        seen.add(key);
        out.push({ a: n.id, b: other, tied: true });
      }
    }
    // Shared keywords: a lighter thread, derived, never stored
    for (let i = 0; i < notes.length; i++) for (let j = i + 1; j < notes.length; j++) {
      const a = notes[i], b = notes[j], key = [a.id, b.id].sort().join('|');
      if (seen.has(key)) continue;
      const kw = new Set((a.keywords || []).map((k) => k.toLowerCase()));
      if ((b.keywords || []).some((k) => kw.has(k.toLowerCase()))) { seen.add(key); out.push({ a: a.id, b: b.id, tied: false }); }
    }
    return out;
  }

  /* ---- Render ---------------------------------------------------------------- */
  function cardFor(n, index) {
    const card = make('article', 'lbx-pin');
    card.dataset.id = n.id;
    card.tabIndex = 0;
    card.setAttribute('role', 'group');
    const text = plain(n.html);
    const kind = n.kind === 'folder' ? 'Collection' : n.kind === 'file' ? 'Reference' : KINDS[n.fields?.['research.kind']] || 'Note';
    const status = n.kind === 'folder' ? '' : STATUS[n.fields?.['research.status'] || 'open'];
    const title = n.title && !/^untitled\b/i.test(n.title) ? n.title : 'Untitled note';
    card.setAttribute('aria-label', title + '. ' + kind + (status ? ', ' + status : '') + '. Arrow keys move it; Enter opens it.');
    card.style.setProperty('--tilt', tilt(n.id) + 'deg');
    const head = make('div', 'lbx-pin-head');
    head.append(make('span', 'lbx-pin-kind', kind), make('span', 'lbx-pin-no', 'Nº ' + String(index + 1).padStart(2, '0')));
    const h = make('h3', 'lbx-pin-title' + (title === 'Untitled note' ? ' is-untitled' : ''), title);
    const body = make('p', 'lbx-pin-text', text || n.fields?.['research.why'] || n.synopsis || 'Nothing written yet.');
    if (!text) body.classList.add('is-empty');
    const foot = make('div', 'lbx-pin-foot');
    const words = wordCount(text);
    const meta = make('span', 'lbx-pin-meta', [status, n.kind === 'folder' ? '' : words + (words === 1 ? ' wd' : ' wds')].filter(Boolean).join(' · '));
    meta.title = [status, words + (words === 1 ? ' word' : ' words')].filter(Boolean).join(' · ');
    if ((n.fields?.['research.status'] || 'open') === 'open' && n.kind !== 'folder') meta.classList.add('is-open');
    const tie = make('button', 'lbx-pin-tie');
    tie.type = 'button';
    tie.dataset.act = 'tie';
    tie.title = 'Tie a red string to another note';
    tie.setAttribute('aria-label', 'Tie a string from ' + title);
    tie.innerHTML = '<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path d="M2 12c3-6 6 2 12-8" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><circle cx="2" cy="12" r="1.6" fill="currentColor"/><circle cx="14" cy="4" r="1.6" fill="currentColor"/></svg>';
    const open = make('button', 'lbx-pin-open');
    open.type = 'button';
    open.dataset.act = 'open';
    open.setAttribute('aria-label', 'Open ' + title);
    open.innerHTML = 'Open <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M7 17 17 7"/><path d="M8.5 7H17v8.5"/></svg>';
    foot.append(meta, tie, open);
    card.append(make('i', 'lbx-pin-tack'), head, h, body, foot);
    return card;
  }

  function layout(b) {
    const width = Math.max(b.el.clientWidth, CARD_W + PAD * 2);
    const cols = columns(width);
    b.positions = new Map();
    let maxY = 0;
    b.notes.forEach((n, i) => {
      const d = defaultSpot(i, cols);
      // Saved positions are kept exactly; only the display is clamped to a narrow board.
      const x = Number.isFinite(n.x) ? Math.min(Math.max(0, n.x), width - CARD_W - 8) : d.x;
      const y = Number.isFinite(n.y) ? Math.max(0, n.y) : d.y;
      b.positions.set(n.id, { x, y });
      maxY = Math.max(maxY, y + CARD_H);
    });
    b.el.style.height = Math.max(maxY + PAD * 2, 360) + 'px';
    b.cards.forEach((card, id) => place(card, b.positions.get(id)));
    drawStrings(b);
  }
  function place(card, p, dx = 0, dy = 0) {
    if (!p) return;
    card.style.transform = 'translate3d(' + (p.x + dx) + 'px,' + (p.y + dy) + 'px,0) rotate(var(--tilt))';
  }
  function pinOf(b, id) {
    const p = b.positions.get(id);
    if (!p) return null;
    const drag = b.drag && b.drag.id === id ? b.drag : null;
    return { x: p.x + CARD_W / 2 + (drag ? drag.dx : 0), y: p.y + 10 + (drag ? drag.dy : 0) };
  }
  function drawStrings(b) {
    const parts = [];
    for (const l of b.links) {
      const a = pinOf(b, l.a), c = pinOf(b, l.b);
      if (!a || !c) continue;
      // A string pulled between two pins sags a little under its own weight
      const sag = Math.min(60, Math.hypot(c.x - a.x, c.y - a.y) * .14);
      const mx = (a.x + c.x) / 2, my = (a.y + c.y) / 2 + sag;
      const d = 'M' + a.x.toFixed(1) + ' ' + a.y.toFixed(1) + ' Q' + mx.toFixed(1) + ' ' + my.toFixed(1) + ' ' + c.x.toFixed(1) + ' ' + c.y.toFixed(1);
      parts.push('<path class="lbx-string-shadow" d="' + d + '" transform="translate(1.5 2.5)"/>',
        '<path class="lbx-string' + (l.tied ? '' : ' is-thread') + '" d="' + d + '"/>');
    }
    b.svg.innerHTML = parts.join('');
  }

  function render(host) {
    const project = api()?.project?.();
    if (!project) return;
    const folder = host.dataset.folder;
    const notes = notesFor(project, folder);
    const signature = folder + '|' + view + '|' + JSON.stringify(notes.map((n) => [n.id, n.title, n.html.length, n.x, n.y, n.order, n.fields, n.keywords]));
    if (board && board.host === host && board.signature === signature) return;
    if (board && board.host === host && board.drag) return;   // never redraw under a dragging hand
    const keepScroll = board?.host === host ? host.scrollTop : 0;
    const b = { host, folder, notes, signature, cards: new Map(), links: linksOf(notes), tying: board?.host === host ? board.tying : null };
    host.replaceChildren();
    document.documentElement.classList.toggle('lbx-research-cards', view === 'cards');

    const bar = make('div', 'lbx-board-bar');
    const hint = make('p', 'lbx-board-hint');
    hint.append(make('b', '', 'Research board'), make('span', '', notes.length
      ? ' — drag cards to arrange them; tie a red string between notes that belong together.'
      : ' — your notes will be pinned here.'));
    const toggle = make('div', 'lbx-board-toggle');
    toggle.setAttribute('role', 'group');
    toggle.setAttribute('aria-label', 'Research view');
    [['board', 'Board'], ['cards', 'Cards']].forEach(([key, label]) => {
      const btn = make('button', '', label);
      btn.type = 'button';
      btn.setAttribute('aria-pressed', String(view === key));
      btn.addEventListener('click', () => {
        view = key;
        try { localStorage.setItem(VIEW_KEY, key); } catch {}
        board = null;
        render(host);
      });
      toggle.append(btn);
    });
    bar.append(hint, toggle);
    const status = make('p', 'lbx-board-status sr-only');
    status.setAttribute('aria-live', 'polite');
    host.append(bar, status);
    b.status = status;
    if (view === 'cards') { board = b; return; }

    const el = make('div', 'lbx-board');
    const svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('class', 'lbx-strings');
    svg.setAttribute('aria-hidden', 'true');
    el.append(svg);
    notes.forEach((n, i) => {
      const card = cardFor(n, i);
      if (b.tying === n.id) card.classList.add('is-tying');
      b.cards.set(n.id, card);
      el.append(card);
    });
    if (!notes.length) el.append(make('p', 'lbx-board-empty', 'No notes yet. Use “New note” to pin the first one.'));
    host.append(el);
    Object.assign(b, { el, svg });
    board = b;
    wire(b);
    layout(b);
    host.scrollTop = keepScroll;
    if (!b.resize) {
      b.resize = new ResizeObserver(() => { if (board === b && !b.drag) layout(b); });
      b.resize.observe(el);
    }
  }

  /* ---- Saving: positions and reading order --------------------------------- */
  function save(b, movedIds) {
    const order = [...b.notes].sort((p, q) => {
      const a = b.positions.get(p.id), c = b.positions.get(q.id);
      const rowA = Math.round(a.y / (CARD_H / 2)), rowC = Math.round(c.y / (CARD_H / 2));
      return rowA - rowC || a.x - c.x;
    });
    const updates = order.map((n, i) => {
      const u = { id: n.id, order: i };
      // Every card gets its place written once it has been on a board that moved,
      // so the arrangement survives a different window width.
      const p = b.positions.get(n.id);
      if (movedIds.includes(n.id) || !Number.isFinite(n.x) || !Number.isFinite(n.y)) { u.x = p.x; u.y = p.y; }
      return u;
    });
    api()?.placeNotes(updates);
    const moved = b.notes.find((n) => n.id === movedIds[0]);
    b.status.textContent = moved ? '“' + (moved.title || 'Note') + '” moved. Position ' + (order.indexOf(moved) + 1) + ' of ' + order.length + '.' : '';
  }

  /* ---- Interaction ------------------------------------------------------------- */
  function tieTo(b, id) {
    if (!b.tying) {
      b.tying = id;
      b.cards.get(id)?.classList.add('is-tying');
      b.el.classList.add('is-tying');
      b.status.textContent = 'Choose a note to tie the string to. Escape cancels.';
      return;
    }
    const from = b.tying;
    b.tying = null;
    b.el.classList.remove('is-tying');
    b.cards.forEach((c) => c.classList.remove('is-tying'));
    if (from === id) { b.status.textContent = 'String put away.'; return; }
    const wasTied = b.links.some((l) => l.tied && ((l.a === from && l.b === id) || (l.a === id && l.b === from)));
    api()?.linkNotes(from, id);
    b.status.textContent = wasTied ? 'String untied.' : 'String tied.';
  }
  function wire(b) {
    b.el.addEventListener('click', (event) => {
      const card = event.target.closest('.lbx-pin');
      if (!card || b.suppressClick > performance.now()) return;
      const act = event.target.closest('[data-act]')?.dataset.act;
      if (act === 'open') { api()?.openNode(card.dataset.id); return; }
      if (act === 'tie' || b.tying) { tieTo(b, card.dataset.id); return; }
    });
    b.el.addEventListener('dblclick', (event) => {
      const card = event.target.closest('.lbx-pin');
      if (card && !event.target.closest('button')) api()?.openNode(card.dataset.id);
    });
    b.el.addEventListener('keydown', (event) => {
      const card = event.target.closest('.lbx-pin');
      if (event.key === 'Escape' && b.tying) { event.preventDefault(); tieTo(b, b.tying); return; }
      if (!card || event.target !== card) return;
      const id = card.dataset.id;
      if (event.key === 'Enter') { event.preventDefault(); if (b.tying) tieTo(b, id); else api()?.openNode(id); return; }
      const step = event.shiftKey ? 64 : 16;
      const delta = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[event.key];
      if (!delta) return;
      event.preventDefault();
      const p = b.positions.get(id);
      p.x = Math.max(0, Math.min(p.x + delta[0], b.el.clientWidth - CARD_W - 8));
      p.y = Math.max(0, p.y + delta[1]);
      place(card, p);
      drawStrings(b);
      clearTimeout(b.keySave);
      b.keySave = setTimeout(() => save(b, [id]), 450);
    });
    b.el.addEventListener('pointerdown', (event) => {
      const card = event.target.closest('.lbx-pin');
      if (!card || event.target.closest('button') || (event.pointerType === 'mouse' && event.button !== 0)) return;
      // On touch screens a card is picked up by its pinned head, so the rest of it still scrolls the page.
      if (event.pointerType === 'touch' && !event.target.closest('.lbx-pin-head,.lbx-pin-tack')) return;
      b.drag = { id: card.dataset.id, card, x: event.clientX, y: event.clientY, dx: 0, dy: 0, moved: false, pointer: event.pointerId };
    });
    b.el.addEventListener('pointermove', (event) => {
      const d = b.drag;
      if (!d || d.pointer !== event.pointerId) return;
      d.dx = event.clientX - d.x;
      d.dy = event.clientY - d.y;
      if (!d.moved) {
        if (Math.hypot(d.dx, d.dy) < 5) return;
        d.moved = true;
        b.el.setPointerCapture?.(event.pointerId);
        d.card.classList.add('is-dragging');
        b.el.classList.add('is-dragging');
      }
      event.preventDefault();
      const p = b.positions.get(d.id);
      // Keep the card on the board
      d.dx = Math.max(-p.x, Math.min(d.dx, b.el.clientWidth - CARD_W - 8 - p.x));
      d.dy = Math.max(-p.y, d.dy);
      place(d.card, p, d.dx, d.dy);
      if (!b.stringFrame) b.stringFrame = requestAnimationFrame(() => { b.stringFrame = 0; drawStrings(b); });
    });
    const end = (event) => {
      const d = b.drag;
      if (!d || d.pointer !== event.pointerId) return;
      b.drag = null;
      d.card.classList.remove('is-dragging');
      b.el.classList.remove('is-dragging');
      if (b.el.hasPointerCapture?.(event.pointerId)) b.el.releasePointerCapture(event.pointerId);
      if (!d.moved) return;
      b.suppressClick = performance.now() + 300;
      const p = b.positions.get(d.id);
      p.x += d.dx; p.y += d.dy;
      place(d.card, p);
      drawStrings(b);
      save(b, [d.id]);
    };
    b.el.addEventListener('pointerup', end);
    b.el.addEventListener('pointercancel', (event) => {
      const d = b.drag;
      if (!d) return;
      d.dx = 0; d.dy = 0;
      place(d.card, b.positions.get(d.id));
      end(event);
    });
  }

  /* ---- Mounting ---------------------------------------------------------------- */
  function sync() {
    const host = root.querySelector('.lbx-board-host');
    if (!host) {
      if (board) { board.resize?.disconnect(); board = null; }
      document.documentElement.classList.remove('lbx-research-cards');
      return;
    }
    if (board && board.host !== host) { board.resize?.disconnect(); board = null; }
    render(host);
  }
  let queued = false;
  const schedule = () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => { queued = false; sync(); });
  };
  new MutationObserver((records) => {
    if (records.some((r) => [...r.addedNodes, ...r.removedNodes].some((n) => n.nodeType === 1
      && (n.matches?.('.lbx-board-host,.collection-workspace') || n.querySelector?.('.lbx-board-host'))))) schedule();
  }).observe(root, { childList: true, subtree: true });
  document.addEventListener('lightbox:project', schedule);
  schedule();
})();
