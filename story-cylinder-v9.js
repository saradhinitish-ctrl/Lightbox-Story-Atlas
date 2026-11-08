/* Lightbox Studio Atlas — the light table (rack focus), with the
 * Story Cylinder IX kept as the "Classic view".
 * One intact replica per React card and five hardware-accelerated transforms.
 * Rack focus (default): the centred card is the light source; neighbours sit
 * smaller and dimmer on the table. Classic: the original 3D cylinder.
 * This module never writes project data or replaces a native workspace.
 */
(() => {
  'use strict';
  const root = document.getElementById('root');
  if (!root) return;

  const ITEMS = [
    { id: 'world', className: '.atlas-world', title: 'World Building' },
    { id: 'research', className: '.atlas-research', title: 'Research & Exploration' },
    { id: 'script', className: '.atlas-script', title: 'The Screenplay' },
    { id: 'visual', className: '.atlas-visual', title: 'Visual Language' },
    { id: 'foundation', className: '.atlas-foundation', title: 'Story Foundation' }
  ];
  const N = ITEMS.length;
  const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
  const prefersReduced = matchMedia('(prefers-reduced-motion: reduce)');
  let selectedPosition = 2;
  let active = null;
  let watching = false;
  let opening = false;
  let returnButton = null;
  let hasEnteredAtlas = false;

  /* Layout: 'rack' (light table, default) or 'classic' (the cylinder).
   * A per-browser preference, never project data. */
  const LAYOUT_KEY = 'lightbox.atlas.layout';
  let layout = 'rack';
  try { if (localStorage.getItem(LAYOUT_KEY) === 'classic') layout = 'classic'; } catch {}
  const isRack = () => layout === 'rack';

  const sourceFor = (item) => root.querySelector('.story-atlas .atlas-map ' + item.className);
  const nearest = (value, index) => index + Math.round((value - index) / N) * N;
  const wrapped = (n) => ((n % N) + N) % N;

  /* ---- Card anatomy ------------------------------------------------------
   * Every replica is re-laid into one skeleton, whatever order React renders:
   *   head    frame number · label · arrow, over a hairline
   *   title   Instrument Serif headline
   *   meta    one quiet line of context
   *   preview the card's own picture of its work (fills the remaining height)
   *   foot    the action, on a rule, always on the same baseline
   * Text always comes from the native React card (textContent only, never
   * innerHTML), so data bindings stay live; refresh() re-runs this on change.
   */
  const FRAME = { world:'01A', research:'02A', script:'03A', visual:'04A', foundation:'05A' };
  const SVG_NS = 'http://www.w3.org/2000/svg';
  const ICON = {
    up: '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 17 17 7"/><path d="M8.5 7H17v8.5"/></svg>',
    go: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 12h15"/><path d="m13.5 6.5 5.5 5.5-5.5 5.5"/></svg>',
    prev: '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m14.5 6-6 6 6 6"/></svg>',
    next: '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9.5 6 6 6-6 6"/></svg>',
    star: '<svg viewBox="0 0 30 30" aria-hidden="true"><path d="M15 1.5c1 7.6 4.1 11 13.5 13.5-9.4 2.5-12.5 5.9-13.5 13.5-1-7.6-4.1-11-13.5-13.5C10.9 12.5 14 9.1 15 1.5z" fill="currentColor"/></svg>'
  };
  const make = (tag, cls, text) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  };
  const icon = (name, cls) => {
    const n = make('span', 'lbx-icon ' + (cls || ''));
    n.innerHTML = ICON[name];
    n.setAttribute('aria-hidden', 'true');
    return n;
  };
  /* Text with <br> read as a space, whitespace collapsed */
  const words = (node) => node ? [...node.childNodes]
    .map((n) => n.nodeName === 'BR' ? ' ' : n.textContent).join('').replace(/\s+/g, ' ').trim() : '';

  function head(id, label) {
    const h = make('span', 'node-overline lbx-head');
    h.append(make('b', 'lbx-frame', FRAME[id]), make('span', 'lbx-label', label), icon('up', 'lbx-head-arrow'));
    return h;
  }
  function foot(label) {
    const f = make('span', 'node-footer lbx-foot');
    f.append(make('span', 'lbx-foot-label', label), icon('go', 'lbx-foot-arrow'));
    return f;
  }
  function preview(id) { return make('div', 'lbx-preview lbx-preview--' + id); }

  const RESEARCH_PROMPTS = ['A question to follow', 'A detail to remember'];
  const PREMISE_PROMPT = 'Add your premise in Story Foundation.';

  function shape(card, id) {
    const parts = { head: null, title: null, meta: null, body: null, foot: null };
    const footText = words(card.querySelector('.node-footer'));
    parts.head = head(id, words(card.querySelector('.node-overline')));

    if (id === 'world') {
      parts.title = make('h2', 'lbx-title', words(card.querySelector('.world-card-heading strong')));
      parts.meta = make('p', 'lbx-meta', words(card.querySelector('.world-card-heading small')));
      parts.body = preview(id);
      const map = make('div', 'lbx-map');
      map.setAttribute('aria-hidden', 'true');
      map.append(make('span', 'lbx-map-grid'), make('span', 'lbx-map-pin'), make('span', 'lbx-map-ref', 'LOC. 01 — UNSURVEYED'));
      const index = card.querySelector('.world-index');
      parts.body.append(map);
      if (index) parts.body.append(index);
      parts.foot = foot('Enter the world');
    }

    if (id === 'research') {
      parts.title = make('h2', 'lbx-title', words(card.querySelector('h2')));
      parts.meta = make('p', 'lbx-meta', words(card.querySelector('.research-card-body small')));
      parts.body = preview(id);
      const notes = [...card.querySelectorAll('.research-stack > span')].map(words);
      const tags = ['Q.', 'NOTE'];
      const board = make('div', 'lbx-notes');
      board.setAttribute('aria-hidden', 'true');
      notes.slice(0, 2).forEach((title, i) => {
        const prompt = RESEARCH_PROMPTS.includes(title);
        const untitled = !prompt && /^untitled\b/i.test(title);
        const note = make('span', 'lbx-note' + (prompt ? ' is-prompt' : '') + (untitled ? ' is-untitled' : ''));
        const tag = make('span', 'lbx-note-tag', prompt ? tags[i] : 'Nº ' + String(i + 1).padStart(2, '0'));
        const text = make('span', 'lbx-note-text', untitled ? 'Untitled note' : title);
        note.append(make('i', 'lbx-note-pin'), tag, text, make('span', 'lbx-note-lines'));
        if (untitled) note.append(make('span', 'lbx-note-draft', 'needs a title'));
        board.append(note);
      });
      // A red thread between the two pins: the threads worth keeping
      const thread = document.createElementNS(SVG_NS, 'svg');
      thread.setAttribute('class', 'lbx-thread');
      thread.setAttribute('viewBox', '0 0 100 100');
      thread.setAttribute('preserveAspectRatio', 'none');
      thread.innerHTML = '<path d="M84 9 C 99 22, 100 44, 90 60" />';
      board.append(thread);
      parts.body.append(board);
      parts.foot = foot(footText || 'Open research');
    }

    if (id === 'script') {
      parts.title = make('h2', 'lbx-title', words(card.querySelector('h2')));
      const meta = card.querySelector(':scope > p');
      parts.meta = make('p', 'lbx-meta', words(meta));
      parts.body = preview(id);
      const page = card.querySelector('.script-page-preview');
      if (page) {
        page.prepend(make('b', 'lbx-page-no', '1.'));
        parts.body.append(page);
      }
      parts.foot = foot(footText || 'Enter writing room');
    }

    if (id === 'visual') {
      parts.title = make('h2', 'lbx-title', words(card.querySelector('h2')));
      const boards = words(card.querySelector('.atlas-visual-board-footer'));
      parts.meta = make('p', 'lbx-meta', boards.replace(/\s*\/\s*/, ' of '));
      parts.body = preview(id);
      const scenes = card.querySelector('.atlas-visual-scenes');
      if (scenes) {
        scenes.querySelectorAll(':scope > span').forEach((row) => {
          const i = row.querySelector(':scope > i');
          if (i) i.classList.add('lbx-frame-thumb');
        });
        parts.body.append(scenes);
      }
      const chips = make('div', 'lbx-chips');
      chips.setAttribute('aria-hidden', 'true');
      for (let c = 0; c < 6; c++) chips.append(make('i'));
      chips.append(make('span', 'lbx-chips-label', 'COLOUR SCRIPT — 06 KEYS'));
      parts.body.append(chips);
      parts.foot = foot('Open the boards');
    }

    if (id === 'foundation') {
      parts.title = make('h2', 'lbx-title', words(card.querySelector('h2')));
      parts.meta = make('p', 'lbx-meta', 'The one idea the whole film grows from.');
      parts.body = preview(id);
      const note = card.querySelector('.spark-note');
      if (note) {
        const premise = words(note.querySelector('p'));
        const empty = !premise || premise === PREMISE_PROMPT;
        note.classList.toggle('is-empty', empty);
        note.prepend(icon('star', 'lbx-spark'));
        if (empty) {
          // A logline in four blanks: the shape of a premise, waiting for one
          const form = make('span', 'lbx-logline');
          form.setAttribute('aria-hidden', 'true');
          [['When', 'something happens'], ['a', 'someone'], ['must', 'do something'], ['or else', 'what it costs']]
            .forEach(([lead, hint]) => {
              const line = make('span', 'lbx-blank-line');
              line.append(make('span', 'lbx-lead', lead), make('span', 'lbx-blank', hint));
              form.append(line);
            });
          note.append(form);
        } else {
          const count = premise.split(/\s+/).filter(Boolean).length;
          note.append(make('span', 'lbx-count', count + (count === 1 ? ' WORD' : ' WORDS') + (count <= 35 ? ' · ONE BREATH' : '')));
        }
        parts.body.append(note);
      }
      parts.foot = foot(footText || 'Write your premise');
    }

    card.replaceChildren(...Object.values(parts).filter(Boolean));
    card.classList.add('lbx', 'lbx--' + id);
  }

  function copySource(item, interactive = true) {
    const original = sourceFor(item);
    if (!original) return null;
    const replica = original.cloneNode(true);
    replica.classList.add('lb-cylinder-source');
    replica.setAttribute('aria-hidden', String(!interactive));
    replica.removeAttribute('id');
    replica.removeAttribute('onclick');
    replica.removeAttribute('aria-hidden');
    replica.querySelectorAll('[id]').forEach((node) => node.removeAttribute('id'));
    replica.querySelectorAll('a').forEach((node) => node.removeAttribute('href'));
    replica.querySelectorAll('button,input,select,textarea,a,[tabindex]').forEach((node) => {
      node.tabIndex = -1;
    });
    if (item.id === 'world') {
      replica.querySelectorAll('.world-index button').forEach((button, index) => {
        button.dataset.worldEntry = ['characters','locations','props'][index] || 'characters';
        button.tabIndex = interactive ? 0 : -1;
      });
    } else if (replica.matches('button')) {
      replica.tabIndex = -1;
    }
    try { shape(replica, item.id); }
    catch (error) { console.warn('Story Cylinder: card kept in native layout', item.id, error); }
    return replica;
  }

  function launchNative(item, destination) {
    const source = sourceFor(item);
    if (!source || !source.isConnected) return false;
    const nativeButton = item.id === 'world'
      ? source.querySelectorAll('.world-index button')[
        destination === 'locations' ? 1 : destination === 'props' ? 2 : 0
      ]
      : source;
    if (!nativeButton) return false;
    nativeButton.click();
    return true;
  }

  // The cards themselves form the cylinder. Do not draw an enclosing wall:
  // just two quiet orbital edges and a contact shadow for physical grounding.
  // The guide curves and card orbit use the same radius; draw only on resize.
  // Only ambient light and ground contact are drawn behind the cards.
  // No explicit orbital ellipse strokes: they read as grey divider lines
  // above and below the carousel rather than believable physical shadows.
  function drawShell(s) {
    const c=s.canvas,w=s.width,h=s.height;
    const dpr=Math.min(devicePixelRatio||1,1.75);
    const pw=Math.round(w*dpr),ph=Math.round(h*dpr);
    if(c.width!==pw||c.height!==ph){c.width=pw;c.height=ph;}
    const ctx=c.getContext('2d');
    if(!ctx)return;
    ctx.setTransform(dpr,0,0,dpr,0,0);
    ctx.clearRect(0,0,w,h);

    const cx=w/2,r=s.radius;
    const base=s.centerY+s.cardHeight/2+7;

    // Fade the glow to zero *before* the stage edge, so there is never a
    // clipped horizontal band. On small phones the CSS aura is sufficient.
    if(!s.mobile){
      const auraY=s.centerY+13;
      const auraRadius=Math.min(s.cardHeight*.68,Math.max(38,h-auraY-17));
      const extent=r*1.035;
      ctx.save();
      ctx.translate(cx,auraY);
      ctx.scale(1,auraRadius/extent);
      const glow=ctx.createRadialGradient(0,0,r*.08,0,0,extent);
      glow.addColorStop(0,'rgba(183,166,192,.069)');
      glow.addColorStop(.56,'rgba(193,181,202,.03)');
      glow.addColorStop(1,'rgba(193,181,202,0)');
      ctx.fillStyle=glow;
      ctx.beginPath();ctx.arc(0,0,extent,0,Math.PI*2);ctx.fill();
      ctx.restore();
    }

    // Diffuse ambient occlusion; radial gradients reach zero alpha at the
    // edge so there is no visible elliptical outline or rectangular cutoff.
    ctx.save();
    const shadowScale=s.mobile?.075:.082;
    const shadowRadius=r*.94;
    const shadowY=Math.min(base+10,h-shadowRadius*shadowScale-9);
    ctx.translate(cx,shadowY);
    ctx.scale(1,shadowScale);
    const shadow=ctx.createRadialGradient(0,0,r*.05,0,0,shadowRadius);
    shadow.addColorStop(0,'rgba(42,33,47,.19)');
    shadow.addColorStop(.27,'rgba(53,41,57,.135)');
    shadow.addColorStop(.58,'rgba(74,59,77,.056)');
    shadow.addColorStop(.83,'rgba(74,59,77,.016)');
    shadow.addColorStop(1,'rgba(74,59,77,0)');
    ctx.fillStyle=shadow;
    ctx.beginPath();ctx.arc(0,0,r*.94,0,Math.PI*2);ctx.fill();
    ctx.restore();

    // Tighter contact directly beneath the central card, also fully faded.
    ctx.save();
    ctx.translate(cx,base+11);
    ctx.scale(1,.095);
    const contact=ctx.createRadialGradient(0,0,0,0,0,r*.34);
    contact.addColorStop(0,'rgba(43,33,48,.11)');
    contact.addColorStop(.48,'rgba(56,43,61,.046)');
    contact.addColorStop(1,'rgba(56,43,61,0)');
    ctx.fillStyle=contact;
    ctx.beginPath();ctx.arc(0,0,r*.34,0,Math.PI*2);ctx.fill();
    ctx.restore();
  }

  function resize(s) {
    if(!s.host.isConnected)return;
    const w=s.view.clientWidth||innerWidth;
    s.width=w;s.height=s.view.clientHeight||520;
    s.mobile=w<=700;
    const rack=isRack();
    s.cardWidth=s.mobile?clamp(w*(rack?.78:.705),224,rack?318:282):clamp(w*(rack?.235:.218),260,rack?340:312);
    const desiredHeight=s.mobile?clamp(w*1.065,362,420):clamp(w*.279,352,399);
    s.cardHeight=s.mobile?desiredHeight:Math.min(desiredHeight,
      innerHeight<735?300:clamp(innerHeight*.435,332,392));
    if(rack)s.cardHeight=Math.min(s.cardHeight+(s.mobile?0:14),s.height-34);
    s.radius=s.mobile?Math.max(s.cardWidth*1.43,w*.91):clamp(w*.393,470,605);
    s.pitch=2*Math.asin(clamp((s.cardWidth+26)/(2*s.radius),0,.49))*180/Math.PI*.96;
    s.centerY=s.height*(s.mobile?.514:.472);
    s.host.style.setProperty('--lb-card-width',s.cardWidth+'px');
    s.host.style.setProperty('--lb-card-height',s.cardHeight+'px');
    s.host.classList.toggle('is-compact',s.cardHeight<346);
    s.host.classList.toggle('is-phone',s.mobile);
    if(rack){
      // The light table draws nothing on the canvas: the light is CSS.
      if(s.canvas.width){s.canvas.width=0;s.canvas.height=0;}
      rackGeometry(s);
    } else drawShell(s);
    paint(s);
  }

  /* ---- Rack focus ----------------------------------------------------------
   * Three resting slots either side of centre: 0 (in focus, full size, lit),
   * 1 (neighbour: smaller, dimmer, a little out of focus), 2 (far, faint).
   * A card between slots interpolates x, scale, lift and light linearly, so
   * dragging is continuous. Only transform and opacity change per frame; the
   * out-of-focus blur is a static class that switches, never tweens.
   */
  function rackGeometry(s) {
    const W=s.cardWidth, gap=s.mobile?12:30;
    const s1=s.mobile?.86:.82, s2=s.mobile?.74:.66;
    const x1=W/2+gap+W*s1/2;
    const x2=x1+W*s1/2+gap*.55+W*s2/2;
    s.rack=[
      {x:0,scale:1,y:s.mobile?-4:-8,alpha:1,veil:0,light:1},
      {x:x1,scale:s1,y:s.mobile?4:10,alpha:1,veil:s.mobile?.30:.22,light:0},
      {x:x2,scale:s2,y:s.mobile?8:18,alpha:s.mobile?0:.7,veil:.4,light:0},
      {x:x2+W*s2*.6,scale:s2*.9,y:s.mobile?8:20,alpha:0,veil:.45,light:0}
    ];
  }
  function rackSlot(s, d) {
    const r=s.rack, i=Math.min(Math.floor(d),r.length-2), t=clamp(d-i,0,1), a=r[i], b=r[i+1];
    const mix=(k)=>a[k]+(b[k]-a[k])*t;
    return {x:mix('x'),scale:mix('scale'),y:mix('y'),alpha:mix('alpha'),veil:mix('veil'),light:mix('light')};
  }
  function paintRack(s) {
    const activeIndex = wrapped(Math.round(s.target));
    for (let i = 0; i < N; i++) {
      const card = s.cards[i];
      const rel = relativeToCenter(i, s.value);
      const d = Math.abs(rel);
      const slot = rackSlot(s, Math.min(d, 2.5));
      // Fade out as a card reaches the wrap point, so it never jumps sides in view.
      const alpha = d > 2.2 ? slot.alpha * clamp((2.5 - d) / .3, 0, 1) : slot.alpha;
      const x = Math.sign(rel) * slot.x;
      card.style.transform = 'translate3d(-50%,-50%,0) translate3d(' + x.toFixed(2) + 'px,'
        + slot.y.toFixed(2) + 'px,0) scale(' + slot.scale.toFixed(4) + ')';
      const alphaKey = Math.round(alpha * 1000);
      if (card._alpha !== alphaKey) { card.style.opacity = (alphaKey / 1000).toFixed(3); card._alpha = alphaKey; }
      const veilKey = Math.round(slot.veil * 1000);
      if (card._veil !== veilKey) { card._veilEl.style.opacity = (veilKey / 1000).toFixed(3); card._veil = veilKey; }
      const raise = Math.round(slot.light * 1000);
      if (card._raise !== raise) { card._liftEl.style.opacity = (raise / 1000).toFixed(3); card._raise = raise; }
      // Focus state follows the resting slot the card is heading for.
      const restingRel = relativeToCenter(i, s.down?.moved ? Math.round(s.value) : s.target);
      const restD = Math.round(Math.abs(restingRel));
      const focus = restD === 0 ? 'active' : restD === 1 ? 'near' : 'far';
      if (card._focus !== focus) {
        card.classList.toggle('is-near', focus === 'near');
        card.classList.toggle('is-far', focus === 'far');
        card._focus = focus;
      }
      const disabled = alpha < .05;
      if (card._disabled !== disabled) {
        card.style.pointerEvents = disabled ? 'none' : 'auto';
        card.setAttribute('aria-hidden', String(disabled));
        card._disabled = disabled;
      }
      const depth = 100 + Math.round((2.6 - d) * 12);
      if (card._depth !== depth) { card.style.zIndex = String(depth); card._depth = depth; }
      const selected = i === activeIndex;
      if (card._selected !== selected) {
        card.classList.toggle('is-active', selected);
        card.setAttribute('aria-current', String(selected));
        card._selected = selected;
      }
    }
  }

  function relativeToCenter(index, position) {
    return ((index - position + N * 100 + N / 2) % N + N) % N - N / 2;
  }
  function paint(s) {
    if (!s.host.isConnected) return;
    if (isRack()) { paintRack(s); return; }
    const radius = s.radius, rad = Math.PI / 180;
    const activeIndex = wrapped(Math.round(s.target));
    for (let i = 0; i < N; i++) {
      const card = s.cards[i];
      const rel = relativeToCenter(i, s.value);
      const angle = rel * s.pitch;
      const theta = angle * rad;
      const x = radius * Math.sin(theta);
      const z = radius * (Math.cos(theta) - 1);
      const dy = z * (s.mobile ? .026 : .035);
      // Depth falloff. The active card lifts and holds full contrast; each
      // step away it shrinks a little and recedes under a veil of table tone,
      // so the far panels read as paper in the distance rather than as
      // squeezed, half-legible text. Transform and opacity only.
      const d = Math.abs(rel);
      const near = Math.min(d, 1);
      const lift = (1 - near) * (s.mobile ? 5 : 9);
      const scale = 1 - Math.min(d, 2.2) * (s.mobile ? .045 : .038);
      card.style.transform = 'translate3d(-50%,-50%,0) translate3d('
        + x.toFixed(2) + 'px,' + (dy - lift).toFixed(2) + 'px,' + z.toFixed(2)
        + 'px) rotateY(' + angle.toFixed(3) + 'deg) scale(' + scale.toFixed(4) + ')';
      const alpha = d <= 1.15 ? 1 : clamp(1 - (d - 1.15) * .62, .32, 1);
      if (card._alpha !== alpha) { card.style.opacity = String(alpha); card._alpha = alpha; }
      const side = s.mobile ? .44 : .26;
      const veil = d <= 1 ? d * side : clamp(side + (d - 1) * .5, 0, .82);
      const veilKey = Math.round(veil * 1000);
      if (card._veil !== veilKey) { card._veilEl.style.opacity = (veilKey / 1000).toFixed(3); card._veil = veilKey; }
      const raise = Math.round((1 - near) * 1000);
      if (card._raise !== raise) { card._liftEl.style.opacity = (raise / 1000).toFixed(3); card._raise = raise; }
      const disabled = Math.abs(rel) >= 2.48;
      if (card._disabled !== disabled) {
        card.style.pointerEvents = disabled ? 'none' : 'auto';
        card.setAttribute('aria-hidden', String(disabled));
        card._disabled = disabled;
      }
      const depth = 100 + Math.round((2.6 - Math.abs(rel)) * 12);
      if (card._depth !== depth) { card.style.zIndex = String(depth); card._depth = depth; }
      const selected = i === activeIndex;
      if (card._selected !== selected) {
        card.classList.toggle('is-active', selected);
        card.setAttribute('aria-current', String(selected));
        card._selected = selected;
      }
    }
  }
  function updateControls(s) {
    const index = wrapped(Math.round(s.target));
    if (s.lastIndex === index) return;
    s.lastIndex = index;
    s.caption.textContent = ITEMS[index].title;
    s.counter.textContent = String(index + 1).padStart(2,'0') + ' / 05';
    s.live.textContent = ITEMS[index].title;
    s.dots.forEach((dot, i) => dot.classList.toggle('is-current',i===index));
    if (s.deskScene) s.deskScene.textContent = String(index + 1).padStart(2,'0');
  }
  function animate(s) {
    if (s.frame) return;
    let prev = performance.now();
    const frame = (now) => {
      s.frame = 0;
      if (!s.host.isConnected) return;
      const delta = clamp(now - prev, 1, 50);
      prev = now;
      const error = s.target - s.value;
      if (prefersReduced.matches || Math.abs(error) < .0006) {
        s.value = s.target;
        paint(s);
        return;
      }
      s.value += error * (1 - Math.exp(-delta / 150));
      paint(s);
      s.frame = requestAnimationFrame(frame);
    };
    s.frame = requestAnimationFrame(frame);
  }
  function aim(s, value) {
    const changed = Math.round(value) !== Math.round(s.target);
    s.target = value;
    selectedPosition = value;
    updateControls(s);
    // Reduced motion: no slide; the table simply fades to the new card.
    if (changed && prefersReduced.matches && isRack() && !s.down) {
      s.rotor.classList.remove('is-fading');
      void s.rotor.offsetWidth;
      s.rotor.classList.add('is-fading');
    }
    animate(s);
  }
  function navigate(s, direction) {
    if (opening) return;
    clearTimeout(s.wheelTimeout);
    aim(s, Math.round(s.target) + direction);
  }
  function snap(s, projected = 0) { aim(s, Math.round(s.target + projected)); }

  function openCard(s, i, destination) {
    if (opening || !s.host.isConnected) return;
    opening = true;
    aim(s, nearest(s.target, i));
    const complete = () => {
      if (!s.host.isConnected) { opening=false; return; }
      if (!launchNative(ITEMS[i], destination)) {
        console.error('Story Cylinder: native React destination unavailable:', ITEMS[i].id);
      }
      opening = false;
      sync();
    };
    if (prefersReduced.matches) { complete(); return; }
    const delay = Math.abs(s.value - s.target) > .2 ? 210 : 95;
    setTimeout(complete, delay);
  }

  function refresh(s, force = false) {
    if((opening&&!force)||!s.host.isConnected)return;
    ITEMS.forEach((item,i)=>{
      const source=sourceFor(item);
      if(!source)return;
      const html=source.innerHTML;
      if(html===s.snapshots[i])return;
      s.snapshots[i]=html;
      const replacement=copySource(item);
      const previous=s.cards[i].querySelector('.lb-cylinder-source');
      if(previous&&replacement)previous.replaceWith(replacement);
    });
  }


  /* ---- The desk ----------------------------------------------------------
   * Small things left on the grid paper for people who look closely. All of
   * it is aria-hidden and pointer-events:none, except two quiet toys that sit
   * in empty corners: the slate (click for another take) and the tally of
   * days at this desk (hover to read it). Nothing here touches project data;
   * the tally keeps one counter in this browser's localStorage.
   */
  const DESK_KEY = 'lightbox.desk.days';
  function timeOfDay(date = new Date()) {
    const h = date.getHours();
    return h >= 5 && h < 7 ? 'DAWN' : h >= 7 && h < 17 ? 'DAY' : h >= 17 && h < 20 ? 'DUSK' : 'NIGHT';
  }
  function daysAtDesk() {
    const today = new Date().toISOString().slice(0, 10);
    try {
      const saved = JSON.parse(localStorage.getItem(DESK_KEY) || 'null');
      const record = saved && typeof saved.n === 'number' ? saved : { n: 0, last: '' };
      if (record.last !== today) { record.n += 1; record.last = today; }
      localStorage.setItem(DESK_KEY, JSON.stringify(record));
      return record.n;
    } catch { return 1; }
  }
  function tallySvg(n) {
    const shown = Math.min(n, 20);
    let paths = '';
    for (let i = 0; i < shown; i++) {
      const group = Math.floor(i / 5), k = i % 5, gx = group * 30;
      // Wax wobbles: no two strokes quite the same
      const w = ((i * 37) % 7) / 10 - .3;
      paths += k < 4
        ? '<path d="M' + (gx + 4 + k * 5 + w).toFixed(1) + ' 3.5 L' + (gx + 3.4 + k * 5 - w).toFixed(1) + ' 21"/>'
        : '<path d="M' + (gx + 0.5) + ' 17.5 L' + (gx + 22.5) + ' 6.5"/>';
    }
    const width = Math.max(30, Math.ceil(shown / 5) * 30);
    return '<svg viewBox="0 0 ' + width + ' 24" width="' + width + '" height="24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" aria-hidden="true">' + paths + '</svg>';
  }
  function mountDesk(atlas, s) {
    if (atlas.querySelector(':scope > .lbx-desk')) return;
    // Two layers: the sheet (behind the heading) and the floor (behind the
    // drum and its controls), so every mark stays in view above the dock.
    const desk = make('div', 'lbx-desk lbx-desk--sheet');
    const floor = make('div', 'lbx-desk lbx-desk--floor');
    desk.setAttribute('aria-hidden', 'true');
    floor.setAttribute('aria-hidden', 'true');
    const days = daysAtDesk();
    desk.innerHTML =
      // Registration marks: the Atlas is a sheet laid on the light table
      '<i class="lbx-reg lbx-reg--tl"></i><i class="lbx-reg lbx-reg--tr"></i>'
      // The slate: a slug line that knows the hour, and a take counter
      + '<div class="lbx-slate">'
      + '<span class="lbx-slate-sticks"></span>'
      + '<span class="lbx-slate-slug">INT. WRITING ROOM — <b class="lbx-slate-time"></b></span>'
      + '<span class="lbx-slate-row"><span>ROLL A</span><span>SC. <b class="lbx-slate-scene">03</b></span>'
      + '<span class="lbx-slate-take">TK. <b>01</b></span></span>'
      + '<span class="lbx-slate-note">print it.</span></div>';
    floor.innerHTML =
      '<i class="lbx-reg lbx-reg--bl"></i><i class="lbx-reg lbx-reg--br"></i>'
      // A coffee ring, and the script supervisor's note beside it
      + '<span class="lbx-ring"></span>'
      + '<span class="lbx-pencil lbx-pencil--cont">cont. — cup was full in the wide</span>'
      // A rule of thumb pencilled in the margin
      + '<span class="lbx-pencil lbx-pencil--page">1 page ≈ 1 minute</span>'
      // Days at this desk, kept in grease pencil
      + '<div class="lbx-tally"><span class="lbx-tally-marks">' + tallySvg(days) + '</span>'
      + '<span class="lbx-tally-note">day ' + String(days).padStart(2, '0') + ' at the desk</span></div>'
      // Edge print, as it runs down the side of a strip of film
      + '<span class="lbx-edge">LBX 0001 ▸ 24 FPS ▸ 180° SHUTTER ▸ 1.85 : 1 ▸ SHEET 01</span>'
      // The draughtsman's warning beside the last registration mark
      + '<span class="lbx-scale">DO NOT SCALE</span>';
    atlas.append(desk);
    s.host.prepend(floor);
    const time = desk.querySelector('.lbx-slate-time');
    const setTime = () => { time.textContent = timeOfDay(); };
    setTime();
    s.deskClock = setInterval(setTime, 60000);
    s.deskScene = desk.querySelector('.lbx-slate-scene');
    const slate = desk.querySelector('.lbx-slate');
    const takeNo = desk.querySelector('.lbx-slate-take b');
    let take = 1;
    slate.addEventListener('click', (event) => {
      event.stopPropagation();
      take = take >= 7 ? 1 : take + 1;
      takeNo.textContent = String(take).padStart(2, '0');
      slate.classList.toggle('is-print', take === 7);
      if (!prefersReduced.matches) {
        slate.classList.remove('is-clap');
        void slate.offsetWidth;
        slate.classList.add('is-clap');
      }
    });
    s.desk = desk;
    s.floor = floor;
  }

  function applyLayout(s) {
    const rack = isRack();
    s.host.classList.toggle('is-rack', rack);
    s.host.classList.toggle('is-classic', !rack);
    s.host.closest('.story-atlas')?.classList.toggle('lbx-rack', rack);
    s.toggle.setAttribute('aria-pressed', String(!rack));
    s.view.setAttribute('aria-label', rack
      ? 'Story Atlas light table. Use left and right arrows or drag horizontally to bring a card into focus.'
      : 'Story Cylinder. Use left and right arrows or drag horizontally to rotate.');
    s.host.setAttribute('aria-label', rack ? 'Story Atlas' : 'Story Cylinder');
    s.cards.forEach((card) => {
      card.classList.remove('is-near', 'is-far');
      card._focus = card._alpha = card._veil = card._raise = card._disabled = card._depth = undefined;
    });
  }
  function setLayout(s, next) {
    if (next === layout) return;
    layout = next;
    try { localStorage.setItem(LAYOUT_KEY, next); } catch {}
    applyLayout(s);
    s.snapshots = [];
    refresh(s, true);
    resize(s);
  }

  function mount(atlas) {
    const viewport = atlas.querySelector('.atlas-viewport');
    if (!viewport || viewport.querySelector('.lb-cylinder-v9') || ITEMS.some((item) => !sourceFor(item))) return;
    const host = document.createElement('section');
    host.className = 'lb-cylinder-v9';
    host.setAttribute('aria-label', 'Story Cylinder');
    host.innerHTML = '<div class="lb-cylinder-studio">'
      + '<div class="lb-cylinder-aura" aria-hidden="true"></div>'
      + '<div class="lb-cylinder-stage" tabindex="0" role="region" aria-roledescription="carousel" aria-label="Story Cylinder. Use left and right arrows or drag horizontally to rotate.">'
      + '<canvas class="lb-cylinder-body" aria-hidden="true"></canvas>'
      + '<div class="lb-cylinder-rotor"></div></div></div>'
      + '<nav class="lb-cylinder-controls" aria-label="Story Cylinder navigation">'
      + '<button class="lb-cylinder-prev" type="button" aria-label="Previous card">' + ICON.prev + '</button>'
      + '<span class="lb-cylinder-control-label"><span class="lb-cylinder-control-title">THE SCREENPLAY</span><span class="lb-cylinder-dots" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></span>'
      + '<small class="lb-cylinder-counter">03 / 05</small></span>'
      + '<button class="lb-cylinder-next" type="button" aria-label="Next card">' + ICON.next + '</button></nav>'
      + '<button class="lbx-layout-toggle" type="button" aria-pressed="false" title="Switch between the light table and the classic cylinder">'
      + '<span class="lbx-layout-glyph" aria-hidden="true"></span><span>Classic view</span></button>'
      + '<span class="lb-cylinder-live sr-only" aria-live="polite"></span>';
    viewport.append(host);
    const s = {
      host, view: host.querySelector('.lb-cylinder-stage'),
      canvas: host.querySelector('.lb-cylinder-body'),
      rotor: host.querySelector('.lb-cylinder-rotor'),
      cards: [], snapshots: [], dots: [...host.querySelectorAll('.lb-cylinder-dots i')],
      caption: host.querySelector('.lb-cylinder-control-title'),
      counter: host.querySelector('.lb-cylinder-counter'),
      live: host.querySelector('.lb-cylinder-live'),
      value: selectedPosition, target: selectedPosition,
      frame: 0, wheelTimeout: 0, down: null, suppressClick: 0, lastIndex: -1
    };
    ITEMS.forEach((item, index) => {
      const card = document.createElement('div');
      card.className = 'lb-cylinder-card lb-cylinder-' + item.id;
      card.dataset.index = String(index);
      card.dataset.id = item.id;
      card.tabIndex = 0;
      card.setAttribute('role', item.id === 'world' ? 'group' : 'button');
      card.setAttribute('aria-label', item.title);
      card.innerHTML='<div class="lb-cylinder-lift" aria-hidden="true"></div>'
        + '<div class="lb-cylinder-plaque">'
        + '<div class="lb-cylinder-content"></div>'
        + '<div class="lb-cylinder-sheen" aria-hidden="true"></div>'
        + '<div class="lb-cylinder-veil" aria-hidden="true"></div></div>';
      card._liftEl = card.querySelector('.lb-cylinder-lift');
      card._veilEl = card.querySelector('.lb-cylinder-veil');
      card.querySelector('.lb-cylinder-content').append(copySource(item));
      s.snapshots[index] = sourceFor(item).innerHTML;
      s.rotor.append(card);
      s.cards.push(card);
      card.addEventListener('click', (event) => {
        event.preventDefault(); event.stopPropagation();
        if (performance.now() < s.suppressClick || s.down?.moved) return;
        // Rack focus: a neighbour comes into focus first; the lit card opens.
        if (isRack() && wrapped(Math.round(s.target)) !== index) { aim(s, nearest(s.target, index)); return; }
        const action = event.target.closest('[data-world-entry],[data-lbx-action]');
        openCard(s, index, action?.dataset.worldEntry || action?.dataset.lbxAction);
      });
      card.addEventListener('keydown', (event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        if (event.target !== card && !event.target.closest('[data-world-entry],[data-lbx-action]')) return;
        event.preventDefault();
        const action = event.target.closest('[data-world-entry],[data-lbx-action]');
        openCard(s, index, action?.dataset.worldEntry || action?.dataset.lbxAction);
      });
      // Keyboard focus brings its card to the front; pointer focus does not,
      // so a press that starts a drag never yanks the drum.
      card.addEventListener('focusin', () => {
        if (opening || s.down || !card.matches(':focus-visible,:has(:focus-visible)')) return;
        if (wrapped(Math.round(s.target)) !== index) aim(s, nearest(s.target, index));
      });
    });
    s.toggle = host.querySelector('.lbx-layout-toggle');
    s.toggle.addEventListener('click', () => setLayout(s, isRack() ? 'classic' : 'rack'));
    applyLayout(s);
    host.querySelector('.lb-cylinder-prev').addEventListener('click', () => navigate(s,-1));
    host.querySelector('.lb-cylinder-next').addEventListener('click', () => navigate(s,1));
    s.view.addEventListener('keydown', (event) => {
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
      if (event.target.closest('input,textarea,[contenteditable]')) return;
      event.preventDefault();
      navigate(s,event.key === 'ArrowRight' ? 1 : -1);
    });
    s.view.addEventListener('wheel', (event) => {
      if (opening || Math.abs(event.deltaX) < 1 || Math.abs(event.deltaX) < Math.abs(event.deltaY) * .7) return;
      event.preventDefault();
      const multiplier = event.deltaMode === 1 ? 20 : event.deltaMode === 2 ? s.cardWidth : 1;
      aim(s, s.target + clamp(event.deltaX * multiplier / (s.cardWidth * .85),-.89,.89));
      clearTimeout(s.wheelTimeout);
      s.wheelTimeout = setTimeout(() => snap(s),145);
    }, {passive:false});
    s.view.addEventListener('pointerdown', (event) => {
      if (opening || (event.pointerType === 'mouse' && event.button !== 0)) return;
      s.down = { id:event.pointerId,x:event.clientX,y:event.clientY,lastX:event.clientX,
        lastTime:performance.now(),start:s.target,velocity:0,moved:false };
    });
    s.view.addEventListener('pointermove', (event) => {
      const p = s.down;
      if (!p || p.id !== event.pointerId) return;
      const dx=event.clientX-p.x, dy=event.clientY-p.y;
      if (!p.moved) {
        if (Math.abs(dx) < 9 || Math.abs(dy) > Math.abs(dx) * 1.3) return;
        p.moved = true;
        s.view.setPointerCapture?.(event.pointerId);
        host.classList.add('is-dragging');
      }
      event.preventDefault();
      const now=performance.now();
      p.velocity = clamp((event.clientX-p.lastX)/Math.max(9,now-p.lastTime),-2.5,2.5);
      p.lastX=event.clientX;p.lastTime=now;
      aim(s,p.start-dx/(s.cardWidth*.82));
    });
    const release = (event) => {
      const p=s.down;
      if (!p || p.id !== event.pointerId) return;
      s.down=null;
      host.classList.remove('is-dragging');
      if (s.view.hasPointerCapture?.(event.pointerId)) s.view.releasePointerCapture(event.pointerId);
      if (p.moved) {
        s.suppressClick=performance.now()+400;
        snap(s,-p.velocity * .17);
      }
    };
    s.view.addEventListener('pointerup',release);
    s.view.addEventListener('pointercancel',(event) => { release(event); snap(s); });
    s.resizeObserver = new ResizeObserver(() => resize(s));
    s.resizeObserver.observe(s.view);
    atlas.closest('.studio')?.classList.add('lb-cylinder-atlas');
    atlas.classList.add('lb-cylinder-mounted');
    mountDesk(atlas, s);
    active=s;hasEnteredAtlas=true;
    resize(s);updateControls(s);paint(s);
  }

  function sync() {
    const studio = root.querySelector('.studio.atlas-shell');
    const atlas = studio?.querySelector('.story-atlas');
    if (active && (!atlas || !active.host.isConnected || !atlas.contains(active.host))) {
      active.resizeObserver?.disconnect();
      clearTimeout(active.wheelTimeout);
      if (active.frame) cancelAnimationFrame(active.frame);
      clearInterval(active.deskClock);
      active.desk?.remove();
      active.floor?.remove();
      active.host.remove();
      active=null;opening=false;
    }
    if (atlas) {
      studio.classList.add('lb-cylinder-atlas');
      if (!active) mount(atlas);
      else refresh(active);
    } else studio?.classList.remove('lb-cylinder-atlas');
    if (!returnButton) {
      returnButton=document.createElement('button');
      returnButton.type='button';
      returnButton.className='lb-cylinder-back';
      returnButton.textContent='← STORY CYLINDER';
      returnButton.setAttribute('aria-label','Return to Story Cylinder');
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
      const node=record.target;
      const element=node.nodeType===1 ? node : node.parentElement;
      if (element?.closest?.('.lb-cylinder-v9')) return false;
      if (record.type === 'attributes') return element?.matches?.('.studio.atlas-shell,.story-atlas,.breakdown-stage,.pitch-stage');
      if (element?.closest?.('.atlas-map')) return true;
      if (record.type !== 'childList') return false;
      const changed=[...record.addedNodes,...record.removedNodes];
      return changed.some((n) => n.nodeType===1
        && (n.matches?.('.studio,.story-atlas,.atlas-map,.main-editor')
          || n.querySelector?.('.story-atlas,.atlas-map,.main-editor')));
    });
    if (!relevant) return;
    watching=true;
    requestAnimationFrame(() => { watching=false; sync(); });
  });
  observer.observe(root,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:['class']});
  sync();
})();