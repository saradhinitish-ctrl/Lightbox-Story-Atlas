/* Lightbox Studio Story Cylinder IX
 * One intact replica per React card, one stationary subtle orbital guide,
 * and five hardware accelerated transforms. No segmented card seams.
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

  const sourceFor = (item) => root.querySelector('.story-atlas .atlas-map ' + item.className);
  const nearest = (value, index) => index + Math.round((value - index) / N) * N;
  const wrapped = (n) => ((n % N) + N) % N;

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
    s.cardWidth=s.mobile?clamp(w*.705,224,282):clamp(w*.218,260,312);
    const desiredHeight=s.mobile?clamp(w*1.065,362,420):clamp(w*.279,352,399);
    s.cardHeight=s.mobile?desiredHeight:Math.min(desiredHeight,
      innerHeight<735?300:clamp(innerHeight*.435,332,392));
    s.radius=s.mobile?Math.max(s.cardWidth*1.43,w*.91):clamp(w*.393,470,605);
    s.pitch=2*Math.asin(clamp((s.cardWidth+26)/(2*s.radius),0,.49))*180/Math.PI*.96;
    s.centerY=s.height*(s.mobile?.514:.472);
    // Side cards are farther from the camera, so perspective shortens them.
    // Compensate for that shortening at their shared FOOT line, not their
    // centers: every panel appears to stand on the same physical floor.
    // These values match .lb-cylinder-card top and .lb-cylinder-stage camera.
    const panelCenterY=s.height*(s.mobile?.514:.50);
    const cameraOriginY=s.height*(s.mobile?.47:.46);
    const cameraDistance=s.mobile?1100:1850;
    s.floorLevelFactor=(panelCenterY+s.cardHeight/2-cameraOriginY)/cameraDistance;
    s.host.style.setProperty('--lb-card-width',s.cardWidth+'px');
    s.host.style.setProperty('--lb-card-height',s.cardHeight+'px');
    drawShell(s);paint(s);
  }

  function relativeToCenter(index, position) {
    return ((index - position + N * 100 + N / 2) % N + N) % N - N / 2;
  }
  function paint(s) {
    if (!s.host.isConnected) return;
    const radius = s.radius, rad = Math.PI / 180;
    const activeIndex = wrapped(Math.round(s.target));
    for (let i = 0; i < N; i++) {
      const card = s.cards[i];
      const rel = relativeToCenter(i, s.value);
      const angle = rel * s.pitch;
      const theta = angle * rad;
      const x = radius * Math.sin(theta);
      const z = radius * (Math.cos(theta) - 1);
      // z is negative at the sides. Shift those cards DOWN just enough for
      // their projected lower edges to match the centered card's baseline.
      const dy = -z * s.floorLevelFactor;
      card.style.transform = 'translate3d(-50%,-50%,0) translate3d('
        + x.toFixed(2) + 'px,' + dy.toFixed(2) + 'px,' + z.toFixed(2)
        + 'px) rotateY(' + angle.toFixed(3) + 'deg)';
      // The outermost panels turn almost edge-on: quiet their stray clipped text.
      const alpha = Math.abs(rel) <= 1.35 ? 1 : clamp(1-(Math.abs(rel)-1.35)*.65,.34,1);
      if (card._alpha !== alpha) { card.style.opacity = String(alpha); card._alpha = alpha; }
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
      s.value += error * (1 - Math.exp(-delta / 130));
      paint(s);
      s.frame = requestAnimationFrame(frame);
    };
    s.frame = requestAnimationFrame(frame);
  }
  function aim(s, value) {
    s.target = value;
    selectedPosition = value;
    updateControls(s);
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

  function refresh(s) {
    if(opening||!s.host.isConnected)return;
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
      + '<button class="lb-cylinder-prev" type="button" aria-label="Previous card">‹</button>'
      + '<span class="lb-cylinder-control-label"><span class="lb-cylinder-control-title">THE SCREENPLAY</span><span class="lb-cylinder-dots" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></span>'
      + '<small class="lb-cylinder-counter">03 / 05</small></span>'
      + '<button class="lb-cylinder-next" type="button" aria-label="Next card">›</button></nav>'
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
      card.tabIndex = 0;
      card.setAttribute('role', item.id === 'world' ? 'group' : 'button');
      card.setAttribute('aria-label', item.title);
      card.innerHTML='<div class="lb-cylinder-plaque">'
        + '<div class="lb-cylinder-content"></div>'
        + '<div class="lb-cylinder-sheen" aria-hidden="true"></div></div>';
      card.querySelector('.lb-cylinder-content').append(copySource(item));
      s.snapshots[index] = sourceFor(item).innerHTML;
      s.rotor.append(card);
      s.cards.push(card);
      card.addEventListener('click', (event) => {
        event.preventDefault(); event.stopPropagation();
        if (performance.now() < s.suppressClick || s.down?.moved) return;
        const action = event.target.closest('[data-world-entry]');
        openCard(s, index, action?.dataset.worldEntry);
      });
      card.addEventListener('keydown', (event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        if (event.target !== card && !event.target.closest('[data-world-entry]')) return;
        event.preventDefault();
        const action = event.target.closest('[data-world-entry]');
        openCard(s, index, action?.dataset.worldEntry);
      });
    });
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
    active=s;hasEnteredAtlas=true;
    resize(s);updateControls(s);paint(s);
  }

  function sync() {
    const studio = root.querySelector('.studio.atlas-shell');
    const atlas = studio?.querySelector('.story-atlas');
    if (active && !active.host.isConnected) {
      active.resizeObserver?.disconnect();
      clearTimeout(active.wheelTimeout);
      if (active.frame) cancelAnimationFrame(active.frame);
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
  observer.observe(root,{childList:true,subtree:true,characterData:true});
  sync();
})();