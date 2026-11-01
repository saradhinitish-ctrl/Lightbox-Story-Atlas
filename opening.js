/* Lightbox Studio / transient intro; no impact on storage, editor or navigation */
(() => {
  'use strict';
  const opener = document.getElementById('lb-opener');
  if (!opener) return;
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) { opener.remove(); return; }
  let closing = false, disposed = false, autoClose, removeTimer;
  const cleanup = () => {
    if (disposed) return;
    disposed = true;
    clearTimeout(autoClose);
    clearTimeout(removeTimer);
    opener.remove();
  };
  const close = () => {
    if (closing || disposed) return;
    closing = true;
    clearTimeout(autoClose);
    opener.classList.add('is-exiting');
    removeTimer = setTimeout(cleanup, 650);
  };
  opener.querySelector('.lb-opener__skip')?.addEventListener('click', cleanup, {once: true});
  opener.addEventListener('animationend', event => {
    if (event.animationName === 'lb-op-exit') cleanup();
  });
  const start = () => {
    if (disposed) return;
    opener.hidden = false;
    requestAnimationFrame(() => requestAnimationFrame(() => {
      if (disposed) return;
      opener.classList.add('is-playing');
      autoClose = setTimeout(close, 2700);
    }));
  };
  // Runs once per document load, never on changes inside the workspace.
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, {once: true});
  else start();
})();
