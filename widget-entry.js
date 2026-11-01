/* Lightbox / Android Widgets entrypoints — visible on the Atlas and install section.
   The PWA remains standalone and all widget setup is opt-in. */
(() => {
 'use strict';
 const root=document.getElementById('root');
 if(!root)return;
 function createLink(kind){
   const a=document.createElement('a');a.href='/widgets.html#install';
   a.className='lb-widgets-link lb-widgets-'+kind;
   a.textContent=kind==='atlas'?'WIDGETS ↗':'GET ANDROID WIDGETS ↗';
   a.setAttribute('aria-label','Get Lightbox Android home screen widgets');
   a.style.cssText='display:inline-flex;align-items:center;justify-content:center;min-height:40px;padding:9px 13px;border:1.5px solid #181916;border-radius:4px;background:#C6FF00;color:#181916;font:800 11px/1.1 monospace;letter-spacing:.03em;text-decoration:none;white-space:nowrap;';
   return a;
 }
 let scheduled=false;
 function enhance(){
   const captions=root.querySelectorAll('.studio.atlas-shell .atlas-caption');
   captions.forEach(c=>{
     if(c.querySelector('.lb-widgets-atlas'))return;
     const a=createLink('atlas');a.style.marginLeft='auto';c.appendChild(a);
   });
   root.querySelectorAll('.studio.atlas-shell .install-app').forEach(target=>{
     if(target.querySelector('.lb-widgets-install'))return;
     const a=createLink('install');a.style.marginTop='12px';target.appendChild(a);
   });
 }
 const observer=new MutationObserver(()=>{if(scheduled)return;scheduled=true;requestAnimationFrame(()=>{scheduled=false;enhance()})});
 observer.observe(root,{childList:true,subtree:true});enhance();
})();
