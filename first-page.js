/* Lightbox first-project polish.
   Retains the original React actions for creating/restoring projects.
   Only adjusts visible presentation copy; never touches project storage. */
(() => {
  'use strict';
  const root=document.getElementById('root');
  if(!root) return;
  let queued=false;
  function improve() {
    const welcome=root.querySelector('.studio.atlas-shell .welcome');
    if(!welcome) return;
    const eyebrow=welcome.querySelector(':scope > .eyebrow');
    if(eyebrow && eyebrow.textContent!=='LIGHTBOX  /  THE FIRST FRAME')
      eyebrow.textContent='LIGHTBOX  /  THE FIRST FRAME';
    const h=welcome.querySelector(':scope > h1');
    if(h && h.dataset.lbFirstPage!=='1') {
      // Preserve React's existing text and em elements rather than replacing the button tree.
      const first=Array.from(h.childNodes).find(n=>n.nodeType===Node.TEXT_NODE);
      if(first) first.nodeValue='Before the frame,';
      const em=h.querySelector('em');
      if(em) em.textContent='there is a world.';
      h.dataset.lbFirstPage='1';
    }
    const intro=welcome.querySelector(':scope > p:not(.welcome-identity)');
    if(intro && intro.textContent!=='An idea, a scene, a world. This is where they become a film.')
      intro.textContent='An idea, a scene, a world. This is where they become a film.';
    const create=welcome.querySelector(':scope > button.primary');
    if(create && !create.textContent.includes('Begin a story')) {
      const text=Array.from(create.childNodes).find(n=>n.nodeType===Node.TEXT_NODE);
      if(text) text.nodeValue='Begin a story';
    }
  }
  const observer=new MutationObserver(()=>{
    if(queued) return;
    queued=true;
    requestAnimationFrame(()=>{queued=false;improve();});
  });
  observer.observe(root,{childList:true,subtree:true,characterData:false});
  improve();
})();
