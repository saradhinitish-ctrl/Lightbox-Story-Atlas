/* Lightbox Studio Story Cylinder VIII
 * One DOM representation per real React card, one stationary geometry-backed
 * canvas shell, five inexpensive GPU transforms during interaction.
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

  // The shell is a true projected circular cross-section, not a detached
  // decorative ellipse: rim horizontal radius, body width, and card orbit
  // all use exactly state.radius. It is painted only when the size changes.
  // Render only on resize. The front wall, lip and ground shadow share
  // the same radius as the card orbit. The shell never rotates separately.
  function drawShell(s) {
    const c=s.canvas,w=s.width,h=s.height;
    const dpr=Math.min(devicePixelRatio||1,1.75);
    c.width=Math.round(w*dpr);c.height=Math.round(h*dpr);
    const ctx=c.getContext('2d');
    if(!ctx)return;
    ctx.setTransform(dpr,0,0,dpr,0,0);
    ctx.clearRect(0,0,w,h);
    const cx=w/2,r=s.radius,ry=s.mobile?35:Math.min(53,r*.102);
    const top=s.centerY-s.cardHeight/2;
    const cy=top+(s.mobile?8:9);
    const floor=s.centerY+s.cardHeight/2+(s.mobile?14:17);
    const bottom=y=>{
      const t=(y-cx)/r;
      return floor-ry*.12+ry*.57*(1-t*t);
    };
    const wallPath=()=>{
      ctx.beginPath();ctx.moveTo(cx-r,cy);ctx.lineTo(cx+r,cy);
      ctx.lineTo(cx+r,bottom(cx+r));
      ctx.bezierCurveTo(cx+r*.42,floor+ry*.67,
        cx-r*.42,floor+ry*.67,cx-r,bottom(cx-r));
      ctx.closePath();
    };
    // Soft elliptical floor shadow; deliberately independent of the moving cards.
    ctx.save();
    ctx.translate(cx,Math.min(h-9,floor+ry*.44+10));
    ctx.scale(1,.105);
    const shadow=ctx.createRadialGradient(0,0,r*.12,0,0,r*1.12);
    shadow.addColorStop(0,'rgba(42,30,51,.29)');
    shadow.addColorStop(.42,'rgba(59,43,66,.18)');
    shadow.addColorStop(.76,'rgba(83,61,85,.07)');
    shadow.addColorStop(1,'rgba(83,61,85,0)');
    ctx.fillStyle=shadow;ctx.beginPath();ctx.arc(0,0,r*1.12,0,Math.PI*2);ctx.fill();ctx.restore();

    // Satin pearl body, darker at the circumference, softly lit at the center.
    const wall=ctx.createLinearGradient(cx-r,0,cx+r,0);
    [[0,'#9b8c9f'],[.045,'#c5b8cb'],[.15,'#ece4ed'],
     [.29,'#faf7f7'],[.48,'#fffdf9'],[.65,'#fbf6f6'],
     [.83,'#e8dfe9'],[.957,'#c0b0c8'],[1,'#93839b']]
      .forEach(([p,color])=>wall.addColorStop(p,color));
    ctx.save();
    ctx.shadowColor='rgba(55,38,62,.17)';ctx.shadowBlur=26;ctx.shadowOffsetY=15;
    wallPath();ctx.fillStyle=wall;ctx.fill();ctx.restore();
    ctx.save();wallPath();ctx.clip();
    const lavender=ctx.createLinearGradient(0,cy,0,floor+ry*.5);
    lavender.addColorStop(0,'rgba(185,153,203,.19)');
    lavender.addColorStop(.21,'rgba(215,195,224,.08)');
    lavender.addColorStop(.66,'rgba(255,255,255,0)');
    lavender.addColorStop(1,'rgba(132,100,143,.22)');
    ctx.fillStyle=lavender;ctx.fillRect(cx-r,cy,r*2,floor+ry-cy);
    const highlight=ctx.createLinearGradient(cx-r,0,cx+r,0);
    highlight.addColorStop(0,'rgba(255,255,255,0)');
    highlight.addColorStop(.22,'rgba(255,255,255,.55)');
    highlight.addColorStop(.35,'rgba(255,255,255,.04)');
    highlight.addColorStop(.58,'rgba(255,255,255,.35)');
    highlight.addColorStop(.86,'rgba(255,255,255,0)');
    ctx.fillStyle=highlight;ctx.fillRect(cx-r,cy,r*2,floor-cy+ry);
    ctx.restore();

    // One restrained lavender inner opening; not a separate giant disc.
    ctx.save();
    ctx.shadowColor='rgba(84,61,93,.12)';
    ctx.shadowBlur=14;ctx.shadowOffsetY=4;
    ctx.fillStyle='#fffdfa';
    ctx.beginPath();ctx.ellipse(cx,cy,r+5,ry+5,0,0,Math.PI*2);ctx.fill();ctx.restore();
    const well=ctx.createLinearGradient(0,cy-ry,0,cy+ry);
    well.addColorStop(0,'#f0e8f1');
    well.addColorStop(.38,'#e3d7e8');
    well.addColorStop(1,'#c0accd');
    ctx.fillStyle=well;
    ctx.beginPath();ctx.ellipse(cx,cy,r-3,ry-3,0,0,Math.PI*2);ctx.fill();
    ctx.lineWidth=s.mobile?5:6;ctx.strokeStyle='#fffefb';ctx.stroke();

    // Rear highlight and near lip are two projected halves of the same opening.
    ctx.beginPath();ctx.ellipse(cx,cy,r,ry,0,Math.PI+.08,2*Math.PI-.08);
    ctx.lineWidth=2;ctx.strokeStyle='rgba(255,255,255,.92)';ctx.stroke();
    ctx.beginPath();ctx.ellipse(cx,cy,r,ry,0,.06,Math.PI-.06);
    ctx.lineWidth=3;ctx.strokeStyle='rgba(122,94,135,.25)';ctx.stroke();

    // The lower elliptical seam is the front wall's own silhouette.
    ctx.beginPath();ctx.moveTo(cx-r,bottom(cx-r));
    ctx.bezierCurveTo(cx-r*.42,floor+ry*.67,cx+r*.42,floor+ry*.67,cx+r,bottom(cx+r));
    ctx.lineWidth=2;ctx.strokeStyle='rgba(106,84,115,.31)';ctx.stroke();
    ctx.beginPath();ctx.moveTo(cx-r,bottom(cx-r)-2);
    ctx.bezierCurveTo(cx-r*.42,floor+ry*.67-2,cx+r*.42,floor+ry*.67-2,cx+r,bottom(cx+r)-2);
    ctx.lineWidth=1.5;ctx.strokeStyle='rgba(255,255,255,.75)';ctx.stroke();
  }

  function resize(s) {
    if(!s.host.isConnected)return;
    const w=s.view.clientWidth||innerWidth;
    s.width=w;s.height=s.view.clientHeight||510;
    s.mobile=w<=700;
    s.cardWidth=s.mobile?clamp(w*.69,218,275):clamp(w*.193,245,288);
    const desiredHeight=s.mobile?clamp(w*1.04,356,408):clamp(w*.277,354,399);
    s.cardHeight=!s.mobile&&innerHeight<960
      ?Math.min(desiredHeight,clamp(innerHeight*.44,316,388)):desiredHeight;
    // A smaller radius gives genuinely radial placement. Five stations occupy
    // the visible front arc; side panels naturally narrow in projection.
    s.radius=s.mobile?Math.max(s.cardWidth*1.26,w*.83)
      :clamp(w*.352,412,547);
    s.pitch=2*Math.asin(clamp((s.cardWidth+11)/(2*s.radius),0,.49))*180/Math.PI;
    s.centerY=s.height*(s.mobile?.542:.535);
    s.host.style.setProperty('--lb-card-width',s.cardWidth+'px');
    s.host.style.setProperty('--lb-card-height',s.cardHeight+'px');
    // Each card is itself a gently curved five-segment plate. The segments
    // stay static while the entire plate moves by a single GPU transform.
    const segments=5;
    const localRadius=s.cardWidth*2.45;
    const segmentW=s.cardWidth/segments;
    s.cards.forEach(card=>{
      card.querySelectorAll('.lb-cylinder-segment').forEach((panel,j)=>{
        const theta=((j+.5)/segments-.5)*s.cardWidth/localRadius;
        const x=localRadius*Math.sin(theta);
        const z=localRadius*(Math.cos(theta)-1);
        panel.style.width=(segmentW+.38)+'px';
        panel.style.transform='translate3d(-50%,0,0) translate3d('
          +x.toFixed(3)+'px,0,'+z.toFixed(3)+'px) rotateY('
          +(theta*180/Math.PI).toFixed(4)+'deg)';
        panel.style.setProperty('--lb-slice-shift',(-j*segmentW)+'px');
        panel.style.setProperty('--lb-panel-width',s.cardWidth+'px');
      });
    });
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
      const dy = z * (s.mobile ? .045 : .067);
      card.style.transform = 'translate3d(-50%,-50%,0) translate3d('
        + x.toFixed(2) + 'px,' + dy.toFixed(2) + 'px,' + z.toFixed(2)
        + 'px) rotateY(' + angle.toFixed(3) + 'deg)';
      const alpha = clamp((2.51 - Math.abs(rel)) / .18, 0, 1);
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
      s.value += error * (1 - Math.exp(-delta / 105));
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
      s.cards[i].querySelectorAll('.lb-cylinder-segment').forEach((segment,j)=>{
        const replacement=copySource(item,j===2);
        const previous=segment.querySelector('.lb-cylinder-source');
        if(previous&&replacement)previous.replaceWith(replacement);
      });
    });
  }

  function mount(atlas) {
    const viewport = atlas.querySelector('.atlas-viewport');
    if (!viewport || viewport.querySelector('.lb-cylinder-v8') || ITEMS.some((item) => !sourceFor(item))) return;
    const host = document.createElement('section');
    host.className = 'lb-cylinder-v8';
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
      card.innerHTML = '<div class="lb-cylinder-plaque" aria-hidden="true"></div>'
        + '<div class="lb-cylinder-curvature"></div><div class="lb-cylinder-sheen" aria-hidden="true"></div>';
      const surface=card.querySelector('.lb-cylinder-curvature');
      for(let j=0;j<5;j++){
        const segment=document.createElement('div');
        segment.className='lb-cylinder-segment';
        segment.style.setProperty('--lb-slice-index',String(j));
        if(j===0)segment.classList.add('is-first');
        if(j===4)segment.classList.add('is-last');
        segment.append(copySource(item,j===2));
        surface.append(segment);
      }
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
      if (element?.closest?.('.lb-cylinder-v8')) return false;
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