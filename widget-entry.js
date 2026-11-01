/* Lightbox Studio · widgets entry, shared by site and native TWA.
 * One native Android installation contains all 3 widgets.
 * The Chrome-installed PWA cannot register native widget providers.
 */
(() => {
  'use strict';
  const root = document.getElementById('root');
  if (!root) return;
  const android = /\bAndroid\b/i.test(navigator.userAgent || '');
  const fallback = encodeURIComponent('https://lightbox-studio.vercel.app/widgets.html?native=unavailable#install');
  const manager = 'intent://manager#Intent;scheme=lightboxwidget;package=com.saradhinitish.lightbox;S.browser_fallback_url=' + fallback + ';end';
  function make(kind) {
    const a=document.createElement('a');
    a.className='lb-widgets-link lb-widgets-'+kind;
    a.href = android ? manager : '/widgets.html';
    a.textContent = kind==='atlas' ? 'ADD WIDGETS ↗' : 'HOME-SCREEN WIDGETS ↗';
    a.setAttribute('aria-label','Add Lightbox home-screen widgets');
    a.style.cssText='display:inline-flex;align-items:center;justify-content:center;min-height:42px;margin:0;padding:9px 14px;border:1.5px solid #181916;border-radius:4px;background:#C6FF00;color:#181916;font:800 11px/1.2 monospace;letter-spacing:.035em;text-decoration:none;white-space:nowrap;';
    return a;
  }
  let queued=false;
  function enhance(){
    // Native call-to-action on the Studio Atlas, without covering the editor.
    root.querySelectorAll('.studio.atlas-shell .atlas-caption').forEach(el=>{
      if(el.querySelector('.lb-widgets-atlas'))return;
      const a=make('atlas');a.style.marginLeft='auto';el.appendChild(a);
    });
    // Reuse existing Install App panel for discovery, rather than a second floating dock.
    root.querySelectorAll('.studio.atlas-shell .install-app').forEach(el=>{
      if(el.querySelector('.lb-widgets-install'))return;
      const a=make('install');a.style.marginTop='12px';el.appendChild(a);
    });
  }
  const observer = new MutationObserver(()=>{
    if(queued)return;queued=true;
    requestAnimationFrame(()=>{queued=false;enhance()});
  });
  observer.observe(root,{childList:true,subtree:true});
  enhance();
})();