/* Field Kit: the phone experience of Lightbox Studio.
   Lightbox on a desk is a lit table. On a phone it is the kit you carry:
   paper above, a graphite bar under the thumb, and sheets that rise from the bottom.

   This file only runs its interface at phone widths (the same 767px line the app
   itself uses for its phone layout). Above that it removes everything it added.
   It stores nothing and never touches project data: every action presses a control
   the app already renders. See docs/field-kit.md. */
(() => {
  'use strict';
  if (window.LightboxFieldKit) return;
  const root = document.getElementById('root');
  if (!root || !window.matchMedia) return;

  const html = document.documentElement;
  const phone = window.matchMedia('(max-width: 767px)');
  const still = window.matchMedia('(prefers-reduced-motion: reduce)');
  const $ = (sel, from = document) => from.querySelector(sel);
  const $$ = (sel, from = document) => [...from.querySelectorAll(sel)];

  /* ---- Drawn icons: one weight, round ends, like a pencil on a call sheet ------------------- */
  const svg = (body) => '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' + body + '</svg>';
  const ICON = {
    atlas: svg('<path d="M2.5 6.5c6.3 2.6 12.7 2.6 19 0"/><path d="M8 8.4v1.4M16 8.4v1.4"/><rect x="5" y="9.8" width="6" height="8.2" rx=".7" transform="rotate(-4 8 14)"/><rect x="13" y="9.8" width="6" height="8.2" rx=".7" transform="rotate(3 16 14)"/>'),
    develop: svg('<path d="M12 3v4.2M12 16.8V21M3 12h4.2M16.8 12H21M5.9 5.9l2.8 2.8M15.3 15.3l2.8 2.8M18.1 5.9l-2.8 2.8M8.7 15.3l-2.8 2.8"/>'),
    write: svg('<path d="M4.2 19.8l1-4.6L16.4 4a2.2 2.2 0 013.2 3.1L8.5 18.4z"/><path d="M14.4 6l3.2 3.2"/>'),
    visuals: svg('<rect x="3" y="5" width="18" height="14" rx="1.6"/><path d="M3 9h18M3 15h18"/><path d="M7 6.9v.2M12 6.9v.2M17 6.9v.2M7 16.9v.2M12 16.9v.2M17 16.9v.2"/>'),
    kit: svg('<path d="M4.4 9.2h15.2l-1 10.3H5.4z"/><path d="M9 9.2V7.4a3 3 0 016 0v1.8"/><path d="M10 13h4"/>'),
    go: svg('<path d="M5 12h13M13 7l5 5-5 5"/>')
  };

  /* ---- Pressing the app's own controls -------------------------------------------------------
     The app has no public router, so the kit works the way a hand would: it presses the
     workspace switcher, the command list and the library that React already renders.
     While it does, `fk-quiet` keeps those intermediate surfaces from flashing on screen. */
  const DESTS = ['atlas', 'develop', 'write', 'visuals', 'sequence', 'breakdown'];
  const tick = () => { try { if (!still.matches) navigator.vibrate?.(8); } catch { /* no haptics */ } };
  const frames = (n) => new Promise((done) => { const step = () => (n-- > 0 ? requestAnimationFrame(step) : done()); step(); });
  async function waitFor(find, tries = 40) {
    for (let i = 0; i < tries; i++) { const hit = find(); if (hit) return hit; await frames(1); }
    return null;
  }
  let quietDepth = 0;
  async function quietly(run) {
    quietDepth++; html.classList.add('fk-quiet');
    try { return await run(); }
    finally { await frames(2); if (--quietDepth === 0) html.classList.remove('fk-quiet'); }
  }
  function goTo(id) {
    const index = DESTS.indexOf(id);
    const button = $$('.mobile-workspace-switcher .workspace-sheet nav button')[index];
    if (!button) return false;
    button.click();
    return true;
  }
  const byText = (list, text) => list.find((el) => el.textContent.trim().toLowerCase().startsWith(text.toLowerCase()));
  // One entry of "Go anywhere", by its label
  const command = (label) => quietly(async () => {
    const trigger = $('.studio .command-trigger');
    if (!trigger) return false;
    trigger.click();
    const item = await waitFor(() => byText($$('dialog.dialog button'), label));
    if (!item) { $('dialog.dialog [aria-label="Close dialog"]')?.click(); return false; }
    item.click();
    return true;
  });
  // A section of the world (Characters, Locations, Props, Research) as its own room
  const section = (title) => quietly(async () => {
    if (!$('.studio .binder')) { if (!(await command('World library'))) return false; }
    const choice = await waitFor(() => $('.studio .binder .section-choice[title="' + title + '"]'));
    if (!choice) return false;
    choice.click();
    await frames(2);
    $('.studio .binder .phone-panel-heading .icon-button')?.click();
    return true;
  });
  const press = (selector) => { const el = $(selector); if (el) el.click(); return !!el; };

  /* ---- Where we are --------------------------------------------------------------------------- */
  function current() {
    if ($('.studio .pitch-stage')) return 'pitch';
    const label = $('.mobile-workspace-switcher .workspace-current')?.textContent.trim().toLowerCase() || '';
    if (DESTS.includes(label)) return label;
    const named = $('.studio .document-section-label, .studio .collection-name');
    const field = named?.matches('input, textarea') ? named : named?.querySelector('input, textarea');
    const section = (field ? field.value : named?.textContent || '').trim().toLowerCase();
    for (const [key, words] of Object.entries({ characters: 'character', locations: 'location', props: 'prop', research: 'research' })) if (section.includes(words)) return key;
    return 'library';
  }
  const stopFor = (place) => (['atlas', 'develop', 'write', 'visuals'].includes(place) ? place : 'kit');

  /* ---- The bar --------------------------------------------------------------------------------- */
  let bar = null, mark = null, sheet = null, veil = null, lastPlace = '';
  const STOPS = [
    { id: 'atlas', label: 'Atlas', name: 'Story Atlas' },
    { id: 'develop', label: 'Develop', name: 'Develop: story foundation' },
    { id: 'write', label: 'Write', name: 'Write the screenplay' },
    { id: 'visuals', label: 'Visuals', name: 'Visual language' },
    { id: 'kit', label: 'Kit', name: 'Open the kit: more rooms and tools' }
  ];
  function buildBar() {
    bar = document.createElement('nav');
    bar.className = 'fk-bar';
    bar.setAttribute('aria-label', 'Workspace');
    bar.innerHTML = STOPS.map((s) => '<button type="button" class="fk-stop' + (s.id === 'write' ? ' fk-stop--write' : '') + '" data-fk="' + s.id + '" aria-label="' + s.name + '"' + (s.id === 'kit' ? ' aria-haspopup="dialog" aria-expanded="false"' : '') + '><span class="fk-stop__icon">' + ICON[s.id] + '</span><span class="fk-stop__label">' + s.label + '</span></button>').join('') + '<i class="fk-mark" aria-hidden="true"></i>';
    mark = $('.fk-mark', bar);
    bar.addEventListener('click', (event) => {
      const stop = event.target.closest('.fk-stop');
      if (!stop) return;
      tick();
      const id = stop.dataset.fk;
      if (id === 'kit') { sheet?.classList.contains('is-open') ? closeKit() : openKit(); return; }
      closeKit();
      if (current() === id) { $('.studio .editor-body')?.scrollTo({ top: 0, behavior: still.matches ? 'auto' : 'smooth' }); return; }
      goTo(id);
    });
    document.body.append(bar);
  }
  function placeMark(stopId) {
    const stop = $('.fk-stop[data-fk="' + stopId + '"]', bar);
    if (!stop || !mark) return;
    const x = stop.offsetLeft + stop.offsetWidth / 2;
    mark.style.transform = 'translate3d(' + Math.round(x) + 'px,0,0)';
    mark.classList.add('is-set');
  }

  /* ---- The kit sheet --------------------------------------------------------------------------- */
  const ROOMS = [
    { id: 'sequence', no: '06', title: 'Sequence', detail: 'Beats, tension and run time', run: () => goTo('sequence') },
    { id: 'breakdown', no: '07', title: 'Breakdown', detail: 'Page, frame and assets', run: () => goTo('breakdown') },
    { id: 'research', no: '08', title: 'Research', detail: 'Field notes and threads', run: () => section('Research') },
    { id: 'pitch', no: '09', title: 'Pitch', detail: 'Present the film', run: () => command('Director pitch') }
  ];
  const WORLD = [
    { id: 'characters', title: 'Characters', kind: 'character', run: () => section('Characters') },
    { id: 'locations', title: 'Locations', kind: 'location', run: () => section('Locations') },
    { id: 'props', title: 'Objects', kind: 'prop', run: () => section('Props') }
  ];
  const TOOLS = [
    { id: 'find', title: 'Find anything', detail: 'A scene, a character, a place', run: () => press('.studio .command-trigger') },
    { id: 'library', title: 'World library', detail: 'Every document, collections, the bin', run: () => command('World library') },
    { id: 'worlds', title: 'Switch or start a world', detail: 'Your projects', run: () => press('.studio .header-world') },
    { id: 'export', title: 'Export screenplay', detail: 'PDF, Fountain, Final Draft', run: () => command('Export screenplay') },
    { id: 'settings', title: 'Settings', detail: 'Title, writing environment, backups', run: () => command('Workspace settings') },
    { id: 'menu', title: 'Studio menu', detail: 'File, Edit, View, Documents and the rest', run: () => press('.studio .application-menu-trigger') }
  ];
  const ACTIONS = Object.fromEntries([...ROOMS, ...WORLD, ...TOOLS].map((a) => [a.id, a]));
  function buildKit() {
    veil = document.createElement('div');
    veil.className = 'fk-veil';
    veil.addEventListener('click', closeKit);
    sheet = document.createElement('section');
    sheet.className = 'fk-sheet';
    sheet.id = 'fk-kit';
    sheet.setAttribute('role', 'dialog');
    sheet.setAttribute('aria-modal', 'true');
    sheet.setAttribute('aria-labelledby', 'fk-kit-title');
    sheet.tabIndex = -1;
    sheet.innerHTML =
      '<div class="fk-sheet__grab" data-fk-drag><i aria-hidden="true"></i></div>' +
      '<header class="fk-sheet__head" data-fk-drag><div><p class="fk-eyebrow">Lightbox / Field kit</p><h2 id="fk-kit-title">The kit<span>.</span></h2></div><button type="button" class="fk-close" aria-label="Close the kit">' + svg('<path d="M6 6l12 12M18 6L6 18"/>') + '</button></header>' +
      '<div class="fk-sheet__body">' +
        '<p class="fk-label">Rooms</p>' +
        '<div class="fk-rooms">' + ROOMS.map((r) => '<button type="button" class="fk-room" data-fk-act="' + r.id + '"><b>' + r.no + '</b><strong>' + r.title + '</strong><small>' + r.detail + '</small></button>').join('') + '</div>' +
        '<p class="fk-label">The world</p>' +
        '<div class="fk-world">' + WORLD.map((w) => '<button type="button" class="fk-chip" data-fk-act="' + w.id + '"><strong>' + w.title + '</strong><small data-fk-count="' + w.kind + '">0</small></button>').join('') + '</div>' +
        '<p class="fk-label">Studio</p>' +
        '<div class="fk-tools">' + TOOLS.map((t) => '<button type="button" class="fk-tool" data-fk-act="' + t.id + '"><span><strong>' + t.title + '</strong><small>' + t.detail + '</small></span>' + ICON.go + '</button>').join('') + '</div>' +
      '</div>';
    sheet.addEventListener('click', (event) => {
      if (event.target.closest('.fk-close')) { closeKit(); return; }
      const act = event.target.closest('[data-fk-act]');
      if (!act) return;
      tick();
      const action = ACTIONS[act.dataset.fkAct];
      closeKit(false);
      // After this tap has finished bubbling: the app closes its menus on any outside tap
      setTimeout(() => action?.run(), 0);
    });
    sheet.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') { event.preventDefault(); closeKit(); return; }
      if (event.key !== 'Tab') return;
      const stops = $$('button', sheet).filter((b) => !b.disabled);
      const first = stops[0], last = stops[stops.length - 1];
      if (event.shiftKey && (document.activeElement === first || document.activeElement === sheet)) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    });
    dragToDismiss(sheet, closeKit);
    document.body.append(veil, sheet);
  }
  function refreshKit() {
    const project = window.LightboxStudio?.project?.();
    const nodes = project?.nodes || [];
    const bin = nodes.find((n) => n.role === 'trash')?.id;
    for (const out of $$('[data-fk-count]', sheet)) {
      const count = nodes.filter((n) => n.kind === out.dataset.fkCount && n.parent !== bin).length;
      out.textContent = String(count).padStart(2, '0');
    }
    const here = current();
    for (const b of $$('[data-fk-act]', sheet)) {
      if (b.dataset.fkAct === here) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current');
    }
  }
  let returnFocus = null;
  function openKit() {
    if (!sheet || sheet.classList.contains('is-open')) return;
    refreshKit();
    returnFocus = document.activeElement;
    sheet.style.transform = '';
    html.classList.add('fk-kit-open');
    sheet.classList.add('is-open'); veil.classList.add('is-open');
    root.inert = true;
    $('.fk-stop[data-fk="kit"]', bar)?.setAttribute('aria-expanded', 'true');
    $('.fk-sheet__body', sheet).scrollTop = 0;
    sheet.focus({ preventScroll: true });
    placeMark('kit');
  }
  function closeKit(restore = true) {
    if (!sheet || !sheet.classList.contains('is-open')) return;
    sheet.classList.remove('is-open'); veil.classList.remove('is-open');
    sheet.style.transform = '';
    html.classList.remove('fk-kit-open');
    root.inert = false;
    $('.fk-stop[data-fk="kit"]', bar)?.setAttribute('aria-expanded', 'false');
    if (restore && returnFocus?.isConnected) returnFocus.focus({ preventScroll: true });
    returnFocus = null;
    placeMark(stopFor(current()));
  }

  /* ---- Sheets follow the finger ---------------------------------------------------------------
     Drag a sheet down by its head. Past a third of a hand, or with a flick, it goes. */
  function dragToDismiss(el, dismiss, handle = '[data-fk-drag]') {
    let start = null;
    el.addEventListener('pointerdown', (event) => {
      if (!event.isPrimary || (event.pointerType === 'mouse' && event.button !== 0)) return;
      const grip = event.target.closest(handle);
      if (!grip || !el.contains(grip) || event.target.closest('button, input, select, textarea, a, label')) return;
      start = { y: event.clientY, t: event.timeStamp, dy: 0, id: event.pointerId, lastY: event.clientY, lastT: event.timeStamp, v: 0 };
    });
    el.addEventListener('pointermove', (event) => {
      if (!start || event.pointerId !== start.id) return;
      const dy = Math.max(0, event.clientY - start.y);
      if (!start.moving && dy < 6) return;
      if (!start.moving) { start.moving = true; el.classList.add('is-dragging'); try { el.setPointerCapture(start.id); } catch { /* fine */ } }
      const dt = Math.max(1, event.timeStamp - start.lastT);
      start.v = .7 * ((event.clientY - start.lastY) / dt) + .3 * start.v;
      start.lastY = event.clientY; start.lastT = event.timeStamp; start.dy = dy;
      el.style.transform = 'translate3d(0,' + dy + 'px,0)';
    });
    const end = (event) => {
      if (!start || event.pointerId !== start.id) return;
      const { dy, v, moving } = start;
      start = null;
      if (!moving) return;
      el.classList.remove('is-dragging');
      if (event.type === 'pointerup' && (dy > 120 || v > .55)) {
        el.classList.add('is-leaving');
        el.style.transform = 'translate3d(0,110%,0)';
        setTimeout(() => { el.classList.remove('is-leaving'); dismiss(); }, still.matches ? 0 : 170);
      } else el.style.transform = '';
    };
    el.addEventListener('pointerup', end);
    el.addEventListener('pointercancel', end);
  }
  // The app's own dialogs and its library become sheets in CSS; give them the same gesture.
  const armed = new WeakSet();
  function armAppSheets() {
    for (const dialog of $$('.studio dialog.dialog[open], .studio aside.binder')) {
      if (armed.has(dialog)) continue;
      armed.add(dialog);
      const isLibrary = dialog.matches('.binder');
      dragToDismiss(dialog, () => {
        dialog.style.transform = '';
        (isLibrary ? $('.phone-panel-heading .icon-button', dialog) : $('.dialog-heading [aria-label="Close dialog"]', dialog))?.click();
      }, isLibrary ? '.phone-panel-heading' : '.dialog-heading');
    }
  }

  /* ---- The keyboard ----------------------------------------------------------------------------
     When the keyboard is up, the bar leaves and the page gets its room back. */
  let tallest = 0;
  function measureKeyboard() {
    const vv = window.visualViewport;
    const height = vv ? vv.height : window.innerHeight;
    if (!tallest || Math.abs(window.innerWidth - measureKeyboard.width) > 1) { tallest = 0; measureKeyboard.width = window.innerWidth; }
    tallest = Math.max(tallest, height, window.innerHeight);
    const editing = document.activeElement?.matches?.('input:not([type=checkbox]):not([type=radio]):not([type=range]):not([type=file]), textarea, select, [contenteditable="true"], [contenteditable=""]');
    const typing = !!editing && tallest - height > 140;
    html.classList.toggle('fk-typing', typing);
    // How much of the layout the keyboard covers, so sheets can sit on top of it
    const covered = vv ? Math.max(0, window.innerHeight - vv.height - vv.offsetTop) : 0;
    html.style.setProperty('--fk-kb', (typing ? Math.round(covered) : 0) + 'px');
  }
  measureKeyboard.width = 0;

  /* ---- Keeping in step with the app ------------------------------------------------------------ */
  let queued = false;
  function sync() {
    queued = false;
    if (!phone.matches) return;
    const working = !!$('.studio .mobile-workspace-switcher');
    html.classList.toggle('fk-has-bar', working);
    if (!working) { closeKit(false); lastPlace = ''; return; }
    const place = current();
    if (place !== lastPlace) {
      lastPlace = place;
      html.dataset.fkPlace = place;
      const stop = stopFor(place);
      for (const b of $$('.fk-stop', bar)) {
        if (b.dataset.fk === stop && stop !== 'kit') b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current');
      }
      $('.fk-stop[data-fk="kit"]', bar)?.classList.toggle('is-here', stop === 'kit');
      if (!sheet?.classList.contains('is-open')) placeMark(stop);
    }
    armAppSheets();
  }
  const queue = () => { if (!queued) { queued = true; requestAnimationFrame(sync); } };
  const observer = new MutationObserver(queue);

  function mount() {
    html.classList.add('fk');
    if (!bar) { buildBar(); buildKit(); }
    observer.observe(root, { childList: true, subtree: true, characterData: true });
    lastPlace = '';
    sync();
    measureKeyboard();
  }
  function unmount() {
    observer.disconnect();
    closeKit(false);
    html.classList.remove('fk', 'fk-has-bar', 'fk-typing', 'fk-quiet', 'fk-kit-open');
    delete html.dataset.fkPlace;
    html.style.removeProperty('--fk-kb');
    bar?.remove(); sheet?.remove(); veil?.remove();
    bar = mark = sheet = veil = null;
  }
  const apply = () => (phone.matches ? mount() : unmount());
  phone.addEventListener('change', apply);
  window.visualViewport?.addEventListener('resize', measureKeyboard);
  window.addEventListener('resize', () => { measureKeyboard(); if (bar && lastPlace) placeMark(sheet?.classList.contains('is-open') ? 'kit' : stopFor(lastPlace)); });
  document.addEventListener('focusin', measureKeyboard);
  document.addEventListener('focusout', () => setTimeout(measureKeyboard, 60));
  document.addEventListener('lightbox:project', queue);

  // For the browser checks: a read-only window onto the kit.
  window.LightboxFieldKit = {
    version: 1,
    active: () => html.classList.contains('fk'),
    place: () => (phone.matches ? current() : null),
    open: openKit, close: closeKit, go: goTo
  };
  apply();
})();
