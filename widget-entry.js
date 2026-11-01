/* Quiet link to the companion's optional widget setup screen.
   The existing app, editor and persistence stay untouched. */
(() => {
  'use strict';
  const root=document.getElementById('root');
  if(!root)return;
  let scheduled=false;
  function insert(){
    if(document.querySelector('.lb-widgets-link'))return;
    const target=root.querySelector('.install-app-row') || root.querySelector('.install-app');
    if(!target)return;
    const a=document.createElement('a');
    a.className='lb-widgets-link';
    a.href='/widgets.html';
    a.textContent='ANDROID WIDGETS ↗';
    a.style.cssText='display:inline-flex;align-items:center;justify-content:center;min-height:42px;margin-top:12px;padding:10px 14px;border:1.5px solid #181916;border-radius:4px;background:#C6FF00;color:#181916;font:800 11px/1.1 monospace;letter-spacing:.04em;text-decoration:none;';
    target.append(a);
  }
  const observer=new MutationObserver(()=>{
    if(scheduled)return;scheduled=true;
    requestAnimationFrame(()=>{scheduled=false;insert();});
  });
  observer.observe(root,{childList:true,subtree:true});
  insert();
})();
