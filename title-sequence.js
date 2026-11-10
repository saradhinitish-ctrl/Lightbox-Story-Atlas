/* The title sequence (phones): film runs through the gate, the lamp strikes, the title is marked.
   Built here so it paints before the app loads; it never touches storage or the workspace.
   Wider screens keep the original opening untouched. See title-sequence.css. */
(() => {
  'use strict';
  if (!window.matchMedia || !matchMedia('(max-width: 767px)').matches) return;
  // On a phone this replaces the older opening, whatever happens next.
  document.getElementById('lb-opener')?.remove();
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const el = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; };
  const ts = el('div', 'ts');
  ts.id = 'lb-title';
  ts.setAttribute('role', 'img');
  ts.setAttribute('aria-label', 'Lightbox Studio. From page to frame.');

  const frame = (no, kicker, word) => {
    const f = el('div', 'ts-frame');
    f.setAttribute('aria-hidden', 'true');
    if (!no) return f;
    const w = el('div', 'ts-word');
    w.append(el('small', '', kicker), document.createTextNode(word));
    f.append(el('b', '', no), w, el('i', '', 'LBX 0001'));
    return f;
  };
  const title = el('div', 'ts-frame ts-frame--title');
  title.setAttribute('aria-hidden', 'true');
  const lit = el('div', 'ts-lit');
  const h = el('p', 'ts-title');
  h.append(document.createTextNode('Lightbox'), el('span', '', '.'));
  const NS = 'http://www.w3.org/2000/svg';
  const circle = document.createElementNS(NS, 'svg');
  circle.setAttribute('class', 'ts-circle');
  circle.setAttribute('viewBox', '0 0 300 120');
  circle.setAttribute('preserveAspectRatio', 'none');
  for (const d of ['M38 84C14 46 88 12 176 13c74 1 112 26 104 54-9 31-92 45-170 39C62 102 30 88 34 62', 'M52 92C30 60 96 22 178 21c62-1 98 20 94 44']) {
    const path = document.createElementNS(NS, 'path');
    path.setAttribute('d', d);
    path.setAttribute('pathLength', '1');
    circle.append(path);
  }
  h.append(circle);
  const sub = el('p', 'ts-sub');
  sub.append(document.createTextNode('Studio'), el('br'), document.createTextNode('From page to frame'));
  const edge = el('div', 'ts-edge');
  edge.append(el('b', '', '04A'), document.createTextNode('24 FPS ▸ 1.85 : 1'));
  lit.append(el('p', 'ts-eyebrow', 'A filmmaking workspace'), h, sub, edge);
  title.append(lit);

  const film = el('div', 'ts-film');
  film.append(frame(), frame('01A', 'It begins with', 'the page'), frame('02A', 'It grows into', 'a world'), frame('03A', 'It becomes', 'the frame'), title, frame());
  const gate = el('div', 'ts-gate');
  gate.append(el('div', 'ts-spill'), film);
  const skip = el('button', 'ts-skip lb-opener__skip', 'Tap to skip');
  skip.type = 'button';
  skip.setAttribute('aria-label', 'Skip the opening');
  ts.append(el('div', 'ts-room'), gate, el('div', 'ts-vignette'), el('div', 'ts-grain'), skip);

  let done = false, timers = [];
  const remove = () => { timers.forEach(clearTimeout); ts.remove(); };
  const leave = (skipped) => {
    if (done) return;
    done = true;
    timers.forEach(clearTimeout);
    ts.classList.add(skipped ? 'is-skipped' : 'is-leaving');
    timers = [setTimeout(remove, skipped ? 220 : 640)];
  };
  ts.addEventListener('pointerdown', () => leave(true));
  skip.addEventListener('click', () => leave(true));
  ts.addEventListener('animationend', (event) => { if (event.target === ts && event.animationName === 'ts-out') remove(); });

  const mount = () => {
    document.body.prepend(ts);
    requestAnimationFrame(() => requestAnimationFrame(() => {
      ts.classList.add('is-playing');
      timers.push(setTimeout(() => leave(false), 3350));
    }));
  };
  if (document.body) mount(); else document.addEventListener('DOMContentLoaded', mount, { once: true });
})();
