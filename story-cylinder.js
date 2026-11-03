/* Lightbox Studio — Story Cylinder v2.
 * Presentation only. Every destination is opened through the real React control.
 * No writes to IndexedDB, project state, or the editor tree. */
(() => {
  'use strict';
  const root = document.getElementById('root');
  if (!root) return;
  const STEPS = [
    {id:'script', label:'01 / THE SCREENPLAY', title:'Make it a scene.', detail:'The writing room', action:'.atlas-script'},
    {id:'foundation', label:'02 / STORY DEVELOPMENT', title:'The spark.', detail:'Premise, theme, and the first idea', action:'.atlas-foundation'},
    {id:'research', label:'03 / RESEARCH', title:'Follow the threads.', detail:'Research and exploration', action:'.atlas-research'},
    {id:'visual', label:'04 / VISUAL LANGUAGE', title:'Think in frames.', detail:'Scene boards and visual references', action:'.atlas-visual'},
    {id:'sequence', label:'05 / SEQUENCE', title:'Shape the rhythm.', detail:'Scenes, beats, and structure', action:'.atlas-reel .stage-section-heading button'},
    {id:'world', label:'06 / WORLD BUILDING', title:'Build the world.', detail:'Characters, places, and objects', action:'.atlas-world .world-index button'}
  ];
  const N = STEPS.length;
  const STEP = 360 / N;
  const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)');
  const clamp = (x,a,b) => Math.max(a,Math.min(b,x));
  const mod = (n,m) => (n%m+m)%m;
  const esc = str => String(str ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let selectedAngle = 0;
  let cylinder = null;
  let entered = false;
  let opening = false;
  let activeTransition = null;
  let scheduled = false;
  let back = null;

  function sourceNode(selector) {
    return root.querySelector('.story-atlas ' + selector);
  }
  function nativeOpen(id, option) {
    let target;
    if (id === 'world') {
      const index = option === 'locations' ? 1 : option === 'props' ? 2 : 0;
      target = root.querySelectorAll('.story-atlas .atlas-world .world-index button')[index];
    } else target = sourceNode(STEPS.find(s => s.id === id)?.action || '.__missing__');
    if (!target || !target.isConnected) return false;
    target.click(); // React owns the action and subsequent workspace lifecycle.
    return true;
  }
  function summary(id) {
    const clean = selector => sourceNode(selector)?.textContent?.trim() || '';
    if (id === 'script') return clean('.atlas-script > p') || 'Your screenplay, draft by draft.';
    if (id === 'foundation') return clean('.atlas-foundation .spark-note p') || 'A story begins with an idea.';
    if (id === 'research') return clean('.atlas-research .research-card-body small') || 'Keep every question worth asking.';
    if (id === 'visual') return clean('.atlas-visual .atlas-visual-board-footer') || 'Make a visual language for your film.';
    if (id === 'sequence') return clean('.atlas-reel .stage-section-heading > span') || 'Every scene has a pulse.';
    return clean('.atlas-world .world-card-heading small') || 'People, places, and the objects between.';
  }
  function worldOptions() {
    const controls = root.querySelectorAll('.story-atlas .atlas-world .world-index button');
    const ids = ['characters','locations','props'];
    return `<div class="lb-cylinder-world-links">${ids.map((id,i) => {
      const count = controls[i]?.querySelector('.world-index-count')?.textContent?.trim() || '0';
      const name = id === 'props' ? 'Objects' : id[0].toUpperCase()+id.slice(1);
      return `<button type="button" data-world-option="${id}" tabindex="0"><span>${esc(name)}</span><small>${esc(count)}</small><b aria-hidden="true">↗</b></button>`;
    }).join('')}</div>`;
  }
  function content(step, i) {
    const isWorld = step.id === 'world';
    const extra = step.id === 'script' ? `<div class="lb-cylinder-script-rule"><span>INT. YOUR STORY — DAY</span><i></i><i></i><i></i></div>` :
      step.id === 'foundation' ? '<div class="lb-cylinder-spark">✳</div>' :
      step.id === 'visual' ? '<div class="lb-cylinder-frame"><span>FRAME / 001</span><i></i><i></i></div>' :
      step.id === 'sequence' ? '<div class="lb-cylinder-beats" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i></div>' :
      step.id === 'research' ? '<div class="lb-cylinder-quote" aria-hidden="true">“</div>' : '';
    return `<div class="lb-cylinder-card-inner"><div class="lb-cylinder-top"><span>${esc(step.label)}</span><span class="lb-cylinder-cross" aria-hidden="true">✣</span></div><div class="lb-cylinder-body"><span class="lb-cylinder-number">${String(i+1).padStart(2,'0')}</span>${extra}<h2>${esc(step.title)}</h2><p>${esc(summary(step.id))}</p>${isWorld ? worldOptions() : ''}</div><div class="lb-cylinder-foot"><span>${esc(step.detail)}</span><span aria-hidden="true">↗</span></div></div>`;
  }
  function getSelectedIndex() { return mod(Math.round(selectedAngle / STEP), N); }
  function decorateButtons(state) {
    const active = mod(Math.round(state.angle/STEP),N);
    state.cards.forEach((card,i)=>{
      const delta = ((i - state.angle/STEP + N*50 + N/2) % N) - N/2;
      const facing = Math.cos(delta * Math.PI*2/N);
      const muted = facing < -0.15;
      card.classList.toggle('is-current',i===active);
      card.classList.toggle('is-rear',muted);
      card.style.setProperty('--light',String(clamp(0.7 + facing*.3,.50,1)));
      card.style.zIndex = String(Math.round((facing+1)*100));
      card.setAttribute('aria-current',i===active?'true':'false');
      card.tabIndex = muted ? -1 : 0;
    });
    state.counter.textContent = String(active+1).padStart(2,'0') + ' / ' + String(N).padStart(2,'0');
  }
  function paint(state) {
    if (!state.host.isConnected) return;
    state.rotor.style.transform = `translateZ(${-state.radius}px) rotateY(${-state.angle}deg)`;
    decorateButtons(state);
  }
  function animate(state) {
    if (state.raf) return;
    const frame = () => {
      state.raf = 0;
      if (!state.host.isConnected) return;
      if (reduceMotion?.matches) {state.angle=state.target;state.velocity=0;paint(state);return;}
      const error = state.target - state.angle;
      state.velocity = state.velocity * .73 + error * .085;
      state.angle += state.velocity;
      if (Math.abs(error)<.025 && Math.abs(state.velocity)<.018) {state.angle=state.target;state.velocity=0;paint(state);return;}
      paint(state);
      state.raf = requestAnimationFrame(frame);
    };
    state.raf = requestAnimationFrame(frame);
  }
  function settle(state, anticipated=0) {
    state.target = Math.round((state.target + anticipated)/STEP)*STEP;
    selectedAngle = state.target;
    animate(state);
  }
  function go(state, index) {
    const current = state.target / STEP;
    const difference = ((index - Math.round(current) + N*100 + N/2) % N) - N/2;
    state.target = (Math.round(current)+difference)*STEP;
    selectedAngle=state.target;
    animate(state);
  }
  function next(state, direction) {
    if (opening) return;
    if (state.wheelTimer) clearTimeout(state.wheelTimer);
    state.target = Math.round(state.target/STEP)*STEP + direction*STEP;
    selectedAngle=state.target;
    animate(state);
  }
  function size(state) {
    if (!state.host.isConnected) return;
    const w=state.view.clientWidth || innerWidth;
    const h=state.view.clientHeight || 560;
    const width=clamp(w-56, 220, w<640?326:358);
    const height=clamp(h-95, 300, w<640?422:476);
    state.radius = Math.ceil(width/(2*Math.sin(Math.PI/N)) + (w<640?52:72));
    state.host.style.setProperty('--lb-card-width',width+'px');
    state.host.style.setProperty('--lb-card-height',height+'px');
    state.host.style.setProperty('--lb-radius',state.radius+'px');
    state.cards.forEach((card,i)=>{card.style.transform=`rotateY(${i*STEP}deg) translateZ(${state.radius}px)`;});
    paint(state);
  }
  function transitionOpen(state,index,option) {
    if (opening || !state.host.isConnected) return;
    opening=true;
    const step=STEPS[index];
    go(state,index);
    const execute=()=>{
      if (!state.host.isConnected) {opening=false;return;}
      const card=state.cards[index];
      const rect=card.getBoundingClientRect();
      const reduced=!!reduceMotion?.matches;
      const overlay=card.cloneNode(true);
      overlay.className='lb-cylinder-opening-card lb-cylinder-card lb-cylinder-'+step.id;
      overlay.removeAttribute('tabindex');
      overlay.setAttribute('aria-hidden','true');
      overlay.querySelectorAll('button').forEach(btn=>btn.tabIndex=-1);
      overlay.style.cssText=`position:fixed;z-index:99999;left:${rect.left}px;top:${rect.top}px;width:${rect.width}px;height:${rect.height}px;transform:none;pointer-events:none;`;
      document.body.append(overlay);
      activeTransition=overlay;
      const finish=()=>{
        if (!state.host.isConnected) {overlay.remove();opening=false;return;}
        const ok=nativeOpen(step.id,option);
        if (!ok) console.error('Lightbox cylinder: native destination not found for',step.id);
        setTimeout(()=>{overlay.remove();if(activeTransition===overlay) activeTransition=null;opening=false;sync();},180);
      };
      if (reduced) {overlay.remove();activeTransition=null;finish();return;}
      const anim=overlay.animate([
        {left:rect.left+'px',top:rect.top+'px',width:rect.width+'px',height:rect.height+'px',transform:'perspective(1200px) rotateY(0deg)',opacity:1,borderRadius:'3px'},
        {offset:.43,left:Math.max(18,(innerWidth-rect.width)/2)+'px',top:Math.max(20,(innerHeight-rect.height)/2)+'px',width:rect.width+'px',height:rect.height+'px',transform:'perspective(1200px) rotateY(-13deg) scale(1.025)',opacity:1,borderRadius:'3px'},
        {left:'0px',top:'0px',width:innerWidth+'px',height:innerHeight+'px',transform:'perspective(1200px) rotateY(0deg)',opacity:1,borderRadius:'0px'}
      ],{duration:490,easing:'cubic-bezier(.22,.72,.19,1)',fill:'forwards'});
      anim.onfinish=finish;
      anim.oncancel=finish;
    };
    if (reduceMotion?.matches || Math.abs(state.target-state.angle)<2) execute();
    else setTimeout(execute,370);
  }
  function mount(atlas) {
    const viewport=atlas.querySelector('.atlas-viewport');
    if (!viewport || !atlas.querySelector('.atlas-script') || viewport.querySelector('.lb-cylinder')) return;
    const host=document.createElement('section');
    host.className='lb-cylinder';
    host.setAttribute('aria-label','Story Cylinder — choose a workspace');
    host.innerHTML=`<div class="lb-cylinder-environment"><div class="lb-cylinder-ground" aria-hidden="true"></div><div class="lb-cylinder-contact" aria-hidden="true"></div><div class="lb-cylinder-view" tabindex="0" role="region" aria-roledescription="3D carousel" aria-label="Swipe horizontally or use arrow keys to rotate the story cards"><div class="lb-cylinder-rotor"></div></div></div><nav class="lb-cylinder-controls" aria-label="Story Cylinder controls"><button type="button" class="lb-cylinder-prev" aria-label="Previous story card">←</button><span class="lb-cylinder-control-label">STORY CYLINDER <small class="lb-cylinder-counter" aria-live="off">01 / 06</small></span><button type="button" class="lb-cylinder-next" aria-label="Next story card">→</button></nav>`;
    viewport.append(host);
    const state={host,view:host.querySelector('.lb-cylinder-view'),rotor:host.querySelector('.lb-cylinder-rotor'),counter:host.querySelector('.lb-cylinder-counter'),cards:[],angle:selectedAngle,target:selectedAngle,velocity:0,radius:0,raf:0,wheelTimer:0,down:null,ignoreClick:0};
    STEPS.forEach((step,i)=>{
      const card=document.createElement('div');
      card.className='lb-cylinder-card lb-cylinder-'+step.id;
      card.setAttribute('role',step.id==='world'?'group':'button');
      card.setAttribute('aria-label',step.title+' — '+step.detail);
      card.tabIndex=0;
      card.dataset.index=String(i);
      card.innerHTML=content(step,i);
      state.rotor.append(card);
      state.cards.push(card);
      card.addEventListener('click',e=>{
        const option=e.target.closest('[data-world-option]')?.dataset.worldOption;
        e.preventDefault();
        e.stopPropagation();
        if (Date.now()<state.ignoreClick || state.down?.moved) return;
        transitionOpen(state,i,option);
      });
      card.addEventListener('keydown',e=>{
        if (['Enter',' '].includes(e.key) && e.target===card){e.preventDefault();transitionOpen(state,i);}
      });
    });
    host.querySelector('.lb-cylinder-prev').addEventListener('click',()=>next(state,-1));
    host.querySelector('.lb-cylinder-next').addEventListener('click',()=>next(state,1));
    state.view.addEventListener('keydown',e=>{
      if (e.target !== state.view && !e.target.classList.contains('lb-cylinder-card')) return;
      if (e.key==='ArrowRight'||e.key==='ArrowLeft') {e.preventDefault();next(state,e.key==='ArrowRight'?1:-1);}
    });
    state.view.addEventListener('wheel',e=>{
      if (opening || Math.abs(e.deltaX)<2 || Math.abs(e.deltaX)<Math.abs(e.deltaY)*.65) return;
      e.preventDefault();
      const factor=e.deltaMode===1?2.1:e.deltaMode===2?9:.17;
      state.target+=clamp(e.deltaX*factor,-45,45);
      animate(state);
      clearTimeout(state.wheelTimer);
      state.wheelTimer=setTimeout(()=>settle(state),155);
    },{passive:false});
    state.view.addEventListener('pointerdown',e=>{
      if (opening || (e.pointerType==='mouse'&&e.button!==0)) return;
      if (e.target.closest('button') && !e.target.closest('.lb-cylinder-card')) return;
      const card=e.target.closest('.lb-cylinder-card');
      const option=e.target.closest('[data-world-option]')?.dataset.worldOption;
      state.down={pointerId:e.pointerId,x:e.clientX,y:e.clientY,lastX:e.clientX,lastTime:performance.now(),velocity:0,origin:state.target,card,option,moved:false};
      state.view.setPointerCapture?.(e.pointerId);
    });
    state.view.addEventListener('pointermove',e=>{
      const down=state.down;if(!down||down.pointerId!==e.pointerId) return;
      const dx=e.clientX-down.x,dy=e.clientY-down.y;
      if (!down.moved && Math.abs(dx)<7) return;
      if (!down.moved && Math.abs(dy)>Math.abs(dx)*1.35) return;
      down.moved=true;
      e.preventDefault();
      const now=performance.now(),dt=Math.max(8,now-down.lastTime);
      down.velocity=clamp((e.clientX-down.lastX)/dt,-3,3);
      down.lastTime=now;down.lastX=e.clientX;
      state.target=down.origin-dx*.24;
      animate(state);
    });
    const release=e=>{
      const down=state.down;if(!down||down.pointerId!==e.pointerId) return;
      state.down=null;
      if (state.view.hasPointerCapture?.(e.pointerId))state.view.releasePointerCapture(e.pointerId);
      if (down.moved) {
        state.ignoreClick=Date.now()+400;
        settle(state,clamp(-down.velocity*30,-35,35));
      } else if (down.card && Math.abs(e.clientY-down.y)<14) {
        state.ignoreClick=Date.now()+360;
        transitionOpen(state,Number(down.card.dataset.index),down.option);
      }
    };
    state.view.addEventListener('pointerup',release);
    state.view.addEventListener('pointercancel',e=>{if(state.down?.pointerId===e.pointerId){state.down=null;settle(state);}});
    window.addEventListener('resize',()=>{if(state.host.isConnected)size(state);},{passive:true});
    atlas.classList.add('lb-cylinder-mounted');
    const studio=atlas.closest('.studio');studio?.classList.add('lb-cylinder-atlas');
    cylinder=state;entered=true;
    size(state);
    animate(state);
  }
  function sync() {
    const studio=root.querySelector('.studio.atlas-shell');
    const atlas=studio?.querySelector('.story-atlas');
    if (cylinder && !cylinder.host.isConnected) {cylinder=null;opening=false;if(activeTransition){activeTransition.remove();activeTransition=null;}}
    if (atlas) {
      studio.classList.add('lb-cylinder-atlas');
      mount(atlas);
    } else studio?.classList.remove('lb-cylinder-atlas');
    if (!back) {
      back=document.createElement('button');back.type='button';back.className='lb-cylinder-back';back.textContent='←  STORY CYLINDER';
      back.setAttribute('aria-label','Return to Story Cylinder');
      back.addEventListener('click',()=>{
        const button=root.querySelector('.studio.atlas-shell .app-wordmark');
        if(button)button.click();
      });
      document.body.append(back);
    }
    const show=!!(entered && studio && !atlas && !studio.classList.contains('composition') && studio.querySelector('.main-editor .editor-body'));
    back.hidden=!show;
  }
  const observer=new MutationObserver(()=>{
    if(scheduled)return;
    scheduled=true;
    requestAnimationFrame(()=>{scheduled=false;sync();});
  });
  observer.observe(root,{childList:true,subtree:true});
  sync();
})();