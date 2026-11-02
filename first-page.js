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
    if(eyebrow && eyebrow.textContent!=='LIGHTBOX / YOUR STORY STARTS HERE')
      eyebrow.textContent='LIGHTBOX / YOUR STORY STARTS HERE';
    const h=welcome.querySelector(':scope > h1');
    if(h && h.dataset.lbFirstPage!=='1') {
      // Preserve React's existing text and em elements rather than replacing the button tree.
      const first=Array.from(h.childNodes).find(n=>n.nodeType===Node.TEXT_NODE);
      if(first) first.nodeValue='Every story';
      const em=h.querySelector('em');
      if(em) em.textContent='starts here.';
      h.dataset.lbFirstPage='1';
    }
    const intro=welcome.querySelector(':scope > p:not(.welcome-identity)');
    if(intro && intro.textContent!=='A place for the first idea, the first scene, and everything that follows.')
      intro.textContent='A place for the first idea, the first scene, and everything that follows.';
    const create=welcome.querySelector(':scope > button.primary');
    if(create && !create.textContent.includes('Create a story')) {
      const text=Array.from(create.childNodes).find(n=>n.nodeType===Node.TEXT_NODE);
      if(text) text.nodeValue='Create a story';
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
