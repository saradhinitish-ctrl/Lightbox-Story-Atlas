/* Lightbox Studio / Story Cylinder V — physically curved cylindrical card surfaces.
 * The native React Atlas remains mounted and owns every workspace, project, and save.
 * Clone only its visual cards; relay activations to the corresponding original controls. */
(() => {
  'use strict';
  const root = document.getElementById('root');
  if (!root) return;

  // These are the five cards in the original Story Atlas. No synthetic sixth section.
  const PANELS = [
    { id:'world',      source:'.atlas-world',      label:'World Building' },
    { id:'research',   source:'.atlas-research',   label:'Research & Exploration' },
    { id:'script',     source:'.atlas-script',     label:'Screenplay' },
    { id:'visual',     source:'.atlas-visual',     label:'Visual Language' },
    { id:'foundation', source:'.atlas-foundation', label:'Story Foundation' }
  ];
  const TOTAL = PANELS.length;
  const UNIT = 360 / TOTAL; // indexing; geometry uses a separate, true front-facing circular arc
  const PITCH = 24;  // degrees between panel centres along the cylindrical wall
  const PANEL_ARC = 22.8; // each panel occupies a curved segment, with a deliberate hairline gap
  const SLICES = 11; // eleven tangent slices form genuinely curved, not flat, card faces
  const clamp = (n,min,max) => Math.min(max,Math.max(min,n));
  const wrap = (n,m) => (n % m + m) % m;
  const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)');
  let savedAngle = UNIT * 2; // Screenplay is the opening hero card.
  let current = null;
  let entered = false;
  let opening = false;
  let cloneOverlay = null;
  let observerScheduled = false;
  let returnButton = null;

  function original(panel) {
    return root.querySelector('.story-atlas .atlas-map ' + panel.source);
  }

  function nativeOpen(id,option) {
    const panel = PANELS.find(p=>p.id===id);
    if(!panel)return false;
    const source = original(panel);
    if(!source || !source.isConnected)return false;
    const target = id === 'world'
      ? source.querySelectorAll('.world-index button')[option==='locations'?1:option==='props'?2:0]
      : source;
    if(!target)return false;
    target.click(); // The ORIGINAL React action changes mode; we do not imitate editors.
    return true;
  }

  function copyOriginal(panel) {
    const source = original(panel);
    if(!source)return null;
    const replica = source.cloneNode(true);
    replica.classList.add('lb-cylinder-source');
    replica.removeAttribute('onclick');
    // React handlers do not travel in cloneNode; all real actions are delegated.
    // Keep world sub-buttons accessible, but avoid two tabs for the outer four buttons.
    if(replica.matches('button')){replica.tabIndex=-1;replica.setAttribute('aria-hidden','true');}
    for(const el of replica.querySelectorAll('[id]'))el.removeAttribute('id');
    for(const el of replica.querySelectorAll('a'))el.removeAttribute('href');
    // A curved card has 11 visual cuts of one source; never create 11 tab stops.
    replica.querySelectorAll('button,a,input,textarea,select').forEach(n=>n.tabIndex=-1);
    if(panel.id==='world') {
      replica.querySelectorAll('.world-index button').forEach((btn,i)=>{
        btn.dataset.cylinderWorld = ['characters','locations','props'][i] || 'characters';
        btn.setAttribute('aria-label', ['Open characters','Open locations','Open objects'][i] || 'Open characters');
      });
    }
    return replica;
  }

  function refreshReplicas(state){
    if(!state.host.isConnected || opening)return;
    for(let i=0;i<TOTAL;i++){
      const panel=PANELS[i],source=original(panel),card=state.cards[i];
      if(!source||!card)continue;
      // Only update when the ORIGINAL React content actually changed.
      const markup=source.innerHTML;
      if(state.snapshots[i]===markup)continue;
      state.snapshots[i]=markup;
      const replacement=copyOriginal(panel);
      if(!replacement)continue;
      // Every slice displays its own clipped portion of the current ORIGINAL React card.
      const fragments=card.querySelectorAll('.lb-cylinder-slice > .lb-cylinder-source');
      fragments.forEach((old,j)=>{
        const newReplica=j===0?replacement:copyOriginal(panel);
        if(newReplica){newReplica.style.left=old.style.left;old.replaceWith(newReplica);}
      });
    }
  }

  function activeIndex(state){return wrap(Math.round(state.target / UNIT),TOTAL);}
  function decorate(state){
    const currentIndex=activeIndex(state);
    state.cards.forEach((card,i)=>{
      const position=wrap(i-state.angle/UNIT+TOTAL*20+TOTAL/2,TOTAL)-TOTAL/2;
      const distance=Math.abs(position);
      const isCurrent=i===currentIndex;
      card.classList.toggle('is-active',isCurrent);
      card.classList.toggle('is-behind',false);
      card.classList.toggle('is-outer',distance>1.5);
      const hidden=distance>2.38;
      card.tabIndex=hidden?-1:0;
      card.setAttribute('aria-current',isCurrent?'true':'false');
      card.setAttribute('aria-hidden',hidden?'true':'false');
      card.style.zIndex=String(100+Math.round((3-distance)*30));
      card.style.setProperty('--distance',String(distance));
      if(isCurrent)state.liveLabel.textContent=PANELS[i].label;
    });
    state.counter.textContent=String(currentIndex+1).padStart(2,'0')+' / 05';
    state.dots.forEach((dot,i)=>dot.classList.toggle('is-current',i===currentIndex));
  }
  function paint(state){
    if(!state.host.isConnected)return;
    const w=state.cardWidth, R=state.radius;
    for(let i=0;i<TOTAL;i++){
      // The nearest front five panels are distributed around the *actual* ellipse
      // of a vertical cylindrical wall. Their yaw, depth and position all derive
      // from the SAME theta, rather than unrelated offsets and flat card scaling.
      const position=wrap(i-state.angle/UNIT+TOTAL*20+TOTAL/2,TOTAL)-TOTAL/2;
      const theta=position*PITCH*Math.PI/180;
      const x=R*Math.sin(theta);
      const z=R*(Math.cos(theta)-1);
      const yaw=theta*180/Math.PI;
      const rise=Math.abs(position)*12.5;
      const card=state.cards[i];
      card.style.transform=`translate3d(calc(-50% + ${x.toFixed(3)}px), calc(-50% - ${rise.toFixed(2)}px), ${z.toFixed(3)}px) rotateY(${yaw.toFixed(3)}deg)`;
      // Rear travel fades through the unseen side of the shell rather than
      // teleporting visibly between left and right boundaries.
      const distance=Math.abs(position);
      const opacity=clamp((2.51-distance)/.24,0,1);
      card.style.opacity=String(opacity);
      card.style.pointerEvents=opacity>.45?'auto':'none';
    }
    decorate(state);
  }
  function tick(state){
    if(state.raf)return;
    const frame=()=>{
      state.raf=0;
      if(!state.host.isConnected)return;
      if(reduced?.matches){state.angle=state.target;state.velocity=0;paint(state);return;}
      const err=state.target-state.angle;
      state.velocity=state.velocity*.75+err*.09;
      state.angle+=state.velocity;
      if(Math.abs(err)<.026&&Math.abs(state.velocity)<.017){state.angle=state.target;state.velocity=0;paint(state);return;}
      paint(state);
      state.raf=requestAnimationFrame(frame);
    };
    state.raf=requestAnimationFrame(frame);
  }
  function select(state,index){
    const from=Math.round(state.target/UNIT);
    let delta=wrap(index-wrap(from,TOTAL),TOTAL);
    if(delta>TOTAL/2)delta-=TOTAL;
    state.target=(from+delta)*UNIT;
    savedAngle=state.target;
    tick(state);
  }
  function advance(state,side){
    if(opening)return;
    clearTimeout(state.wheelTimer);
    state.target=Math.round(state.target/UNIT)*UNIT+side*UNIT;
    savedAngle=state.target;
    tick(state);
  }
  function snap(state,inertia=0){
    state.target=Math.round((state.target+inertia)/UNIT)*UNIT;
    savedAngle=state.target;
    tick(state);
  }
  function resize(state){
    if(!state.host.isConnected)return;
    const w=state.view.clientWidth||innerWidth;
    const mobile=w<=700;
    // The radius derives from the surface arc and actual card width, ensuring
    // adjacent panel seams follow one continuous circular surface.
    const width=mobile?clamp(w*.77,232,290):clamp(w*.232,249,304);
    const height=mobile?clamp(w*1.10,360,418):clamp(w*.276,392,405);
    const radius=width/(2*Math.sin(PANEL_ARC*Math.PI/360));
    state.cardWidth=width;
    state.cardHeight=height;
    state.radius=radius;
    state.host.style.setProperty('--lb-card-width',width+'px');
    state.host.style.setProperty('--lb-card-height',height+'px');
    state.host.style.setProperty('--lb-radius',radius+'px');
    // A card itself bends through 32.2 degrees; each sub-panel is a tangent to
    // the same cylinder. Source markup is clipped, never redrawn as a texture.
    state.cards.forEach(card=>{
      const strips=card.querySelectorAll('.lb-cylinder-slice');
      strips.forEach((strip,j)=>{
        const alpha=((j+.5)/SLICES-.5)*PANEL_ARC*Math.PI/180;
        const xx=radius*Math.sin(alpha);
        const zz=radius*(Math.cos(alpha)-1);
        const panel=strip.querySelector('.lb-cylinder-source');
        strip.style.width=(width/SLICES+1.1)+'px';
        strip.style.transform=`translate3d(calc(-50% + ${xx.toFixed(3)}px), 0px, ${zz.toFixed(3)}px) rotateY(${(alpha*180/Math.PI).toFixed(3)}deg)`;
        if(panel){panel.style.width=width+'px';panel.style.left=(-j*width/SLICES)+'px';}
      });
    });
    paint(state);
  }
  function openCard(state,index,section){
    if(opening||!state.host.isConnected)return;
    opening=true;
    select(state,index);
    const panel=PANELS[index];
    const start=performance.now();
    const ready=()=>{
      if(!state.host.isConnected){opening=false;return;}
      if(!reduced?.matches&&Math.abs(state.angle-state.target)>.32&&performance.now()-start<820){
        requestAnimationFrame(ready);return;
      }
      state.angle=state.target;
      state.velocity=0;
      paint(state);
      const card=state.cards[index];
      let completed=false;
      const finish=()=>{
        if(completed)return;
        completed=true;
        state.host.classList.remove('lb-cylinder-entering');
        const ok=nativeOpen(panel.id,section);
        if(!ok)console.error('Lightbox Story Cylinder: original React control unavailable',panel.id,section);
        setTimeout(()=>{opening=false;sync();},80);
      };
      if(reduced?.matches){finish();return;}
      state.host.classList.add('lb-cylinder-entering');
      // Animate the real curved surface, not a detached flat reproduction.
      const anim=card.animate([
        {filter:'brightness(1)',opacity:1},
        {filter:'brightness(1.07)',opacity:1,offset:.50},
        {filter:'brightness(1.1)',opacity:.48}
      ],{duration:280,easing:'cubic-bezier(.22,.84,.25,1)'});
      anim.onfinish=finish;
      anim.oncancel=finish;
    };
    requestAnimationFrame(ready);
  }
  function mount(atlas){
    const viewport=atlas.querySelector('.atlas-viewport');
    if(!viewport||viewport.querySelector('.lb-cylinder')||PANELS.some(p=>!original(p)))return;
    const host=document.createElement('section');
    host.className='lb-cylinder';
    host.setAttribute('aria-label','Story Cylinder');
    host.innerHTML=`<div class="lb-cylinder-environment"><div class="lb-cylinder-rim" aria-hidden="true"></div><div class="lb-cylinder-shell" aria-hidden="true"></div><div class="lb-cylinder-horizon" aria-hidden="true"></div><div class="lb-cylinder-ground" aria-hidden="true"></div><div class="lb-cylinder-contact" aria-hidden="true"></div><div class="lb-cylinder-view" tabindex="0" role="region" aria-roledescription="3D carousel" aria-label="Story Cylinder. Drag or swipe horizontally, or use arrow keys, to rotate the original story cards."><div class="lb-cylinder-rotor"></div></div></div><nav class="lb-cylinder-controls" aria-label="Story Cylinder navigation"><button class="lb-cylinder-prev" type="button" aria-label="Previous card">‹</button><span class="lb-cylinder-control-label">ROTATE THE STORY CYLINDER <span class="lb-cylinder-dots" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></span><small class="lb-cylinder-counter sr-only" aria-live="off">03 / 05</small></span><button class="lb-cylinder-next" type="button" aria-label="Next card">›</button></nav><span class="lb-cylinder-live sr-only" aria-live="polite"></span>`;
    viewport.append(host);
    const state={host,view:host.querySelector('.lb-cylinder-view'),rotor:host.querySelector('.lb-cylinder-rotor'),cards:[],counter:host.querySelector('.lb-cylinder-counter'),dots:[...host.querySelectorAll('.lb-cylinder-dots i')],liveLabel:host.querySelector('.lb-cylinder-live'),snapshots:[],angle:savedAngle,target:savedAngle,velocity:0,radius:0,raf:0,wheelTimer:0,down:null,ignoreClick:0};
    PANELS.forEach((panel,i)=>{
      const card=document.createElement('div');
      card.className='lb-cylinder-card lb-cylinder-'+panel.id;
      card.dataset.index=String(i);
      card.setAttribute('role',panel.id==='world'?'group':'button');
      card.setAttribute('aria-label',panel.label);
      card.tabIndex=0;
      state.snapshots[i]=original(panel).innerHTML;
      const bent=document.createElement('div');
      bent.className='lb-cylinder-bent';
      for(let j=0;j<SLICES;j++){
        const strip=document.createElement('div');
        strip.className='lb-cylinder-slice';
        strip.dataset.slice=String(j);
        if(j!==Math.floor(SLICES/2))strip.setAttribute('aria-hidden','true');
        strip.style.setProperty('--slice-index',String(j));
        const replica=copyOriginal(panel);
        strip.append(replica);
        // World actions are pointer-accessible through the slices; the single
        // card container is the keyboard destination, avoiding 33 duplicate tabs.
        replica.querySelectorAll('button,a,input,textarea,select').forEach(n=>n.tabIndex=-1);
        bent.append(strip);
      }
      card.append(bent);
      state.rotor.append(card);
      state.cards.push(card);
      card.addEventListener('click',e=>{
        e.preventDefault();e.stopPropagation();
        if(Date.now()<state.ignoreClick||state.down?.moved)return;
        const option=e.target.closest('[data-cylinder-world]')?.dataset.cylinderWorld;
        openCard(state,i,option);
      });
      card.addEventListener('keydown',e=>{
        if(!['Enter',' '].includes(e.key))return;
        if(e.target!==card&&!e.target.closest('[data-cylinder-world]'))return;
        e.preventDefault();
        const option=e.target.closest('[data-cylinder-world]')?.dataset.cylinderWorld;
        openCard(state,i,option);
      });
    });
    host.querySelector('.lb-cylinder-prev').addEventListener('click',()=>advance(state,-1));
    host.querySelector('.lb-cylinder-next').addEventListener('click',()=>advance(state,1));
    state.view.addEventListener('keydown',e=>{
      if(!['ArrowLeft','ArrowRight'].includes(e.key))return;
      if(e.target.closest('input,textarea,[contenteditable]'))return;
      e.preventDefault();
      advance(state,e.key==='ArrowRight'?1:-1);
    });
    state.view.addEventListener('wheel',e=>{
      if(opening||Math.abs(e.deltaX)<2||Math.abs(e.deltaX)<Math.abs(e.deltaY)*.64)return;
      e.preventDefault();
      const factor=e.deltaMode===1?3:e.deltaMode===2?10:.38;
      state.target+=clamp(e.deltaX*factor,-50,50);
      tick(state);
      clearTimeout(state.wheelTimer);
      state.wheelTimer=setTimeout(()=>snap(state),155);
    },{passive:false});
    state.view.addEventListener('pointerdown',e=>{
      if(opening||(e.pointerType==='mouse'&&e.button!==0))return;
      const option=e.target.closest('[data-cylinder-world]')?.dataset.cylinderWorld;
      const card=e.target.closest('.lb-cylinder-card');
      state.down={id:e.pointerId,x:e.clientX,y:e.clientY,lastX:e.clientX,lastTime:performance.now(),origin:state.target,velocity:0,moved:false,card,option};
      state.view.setPointerCapture?.(e.pointerId);
    });
    state.view.addEventListener('pointermove',e=>{
      const p=state.down;if(!p||p.id!==e.pointerId)return;
      const dx=e.clientX-p.x,dy=e.clientY-p.y;
      if(!p.moved&&Math.abs(dx)<8)return;
      if(!p.moved&&Math.abs(dy)>Math.abs(dx)*1.35)return;
      p.moved=true;
      e.preventDefault();
      const now=performance.now(),delta=Math.max(8,now-p.lastTime);
      p.velocity=clamp((e.clientX-p.lastX)/delta,-3,3);
      p.lastTime=now;p.lastX=e.clientX;
      state.target=p.origin-dx*.24;
      tick(state);
    });
    const end=e=>{
      const p=state.down;if(!p||p.id!==e.pointerId)return;
      state.down=null;
      if(state.view.hasPointerCapture?.(e.pointerId))state.view.releasePointerCapture(e.pointerId);
      if(p.moved){state.ignoreClick=Date.now()+380;snap(state,clamp(-p.velocity*29,-30,30));}
      else if(p.card&&Math.abs(e.clientY-p.y)<14){state.ignoreClick=Date.now()+360;openCard(state,Number(p.card.dataset.index),p.option);}
    };
    state.view.addEventListener('pointerup',end);
    state.view.addEventListener('pointercancel',e=>{if(state.down?.id===e.pointerId){state.down=null;snap(state);}});
    // ResizeObserver watches the local stage (including browser rotations and split view).
    state.resizeObserver=new ResizeObserver(()=>resize(state));
    state.resizeObserver.observe(state.view);
    const studio=atlas.closest('.studio');
    studio?.classList.add('lb-cylinder-atlas');
    atlas.classList.add('lb-cylinder-mounted');
    current=state;entered=true;
    resize(state);tick(state);
  }
  function sync(){
    const studio=root.querySelector('.studio.atlas-shell');
    const atlas=studio?.querySelector('.story-atlas');
    if(current&&!current.host.isConnected){
      current.resizeObserver?.disconnect();
      // The Atlas may be detached then reattached by React; remove the stale
      // cylinder from that detached subtree so it can remount with live wiring.
      current.host.remove();
      clearTimeout(current.wheelTimer);
      if(current.raf)cancelAnimationFrame(current.raf);
      current=null;opening=false;
      cloneOverlay?.remove();cloneOverlay=null;
    }
    if(atlas){
      studio.classList.add('lb-cylinder-atlas');
      if(!current)mount(atlas);
      else refreshReplicas(current);
    }else studio?.classList.remove('lb-cylinder-atlas');
    if(!returnButton){
      returnButton=document.createElement('button');
      returnButton.type='button';
      returnButton.className='lb-cylinder-back';
      returnButton.textContent='←  STORY CYLINDER';
      returnButton.setAttribute('aria-label','Return to Story Cylinder');
      returnButton.addEventListener('click',()=>root.querySelector('.studio.atlas-shell .app-wordmark')?.click());
      document.body.append(returnButton);
    }
    returnButton.hidden=!(entered&&studio&&!atlas&&!studio.classList.contains('composition')&&studio.querySelector('.main-editor .editor-body'));
  }
  const observer=new MutationObserver(()=>{
    if(observerScheduled)return;
    observerScheduled=true;
    requestAnimationFrame(()=>{observerScheduled=false;sync();});
  });
  observer.observe(root,{childList:true,subtree:true,characterData:true});
  sync();
})();