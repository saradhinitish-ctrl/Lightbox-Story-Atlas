/* Appearance enhancements only. Project storage, editors and exports remain owned
   by the portable application. Reference canvas preference is stored separately. */
(() => {
  'use strict';
  const root = document.getElementById('root');
  if (!root) return;
  const preferenceKey = 'lightbox.reference-canvas.v1';
  let darkCanvas = false;
  try { darkCanvas = localStorage.getItem(preferenceKey) === 'dark'; } catch (_) {}

  function updateCanvas(board, button) {
    const mode = darkCanvas ? 'dark' : 'light';
    if (board.dataset.referenceCanvas !== mode) board.dataset.referenceCanvas = mode;
    const pressed = String(darkCanvas);
    if (button.getAttribute('aria-pressed') !== pressed) button.setAttribute('aria-pressed', pressed);
  }

  function enhance() {
    const summary = root.querySelector('.carbon-theme-summary');
    if (summary) {
      const title = summary.querySelector('strong');
      const description = summary.querySelector('p');
      if (title && title.textContent !== 'Acid Paper') title.textContent = 'Acid Paper';
      const copy = 'Warm paper, ink-black structure, and acid-lime accents. A quiet page for your writing.';
      if (description && description.textContent !== copy) description.textContent = copy;
    }
    const board = root.querySelector('.visual-language');
    const toolbar = board?.querySelector('.vl-toolbar');
    if (!board || !toolbar) return;
    let button = toolbar.querySelector('.lb-canvas-toggle');
    if (!button) {
      button = document.createElement('button');
      button.type = 'button';
      button.className = 'lb-canvas-toggle';
      button.textContent = 'Dark reference canvas';
      button.setAttribute('aria-label', 'Dark reference canvas');
      button.addEventListener('click', () => {
        darkCanvas = !darkCanvas;
        try { localStorage.setItem(preferenceKey, darkCanvas ? 'dark' : 'light'); } catch (_) {}
        updateCanvas(board, button);
      });
      toolbar.append(button);
    }
    updateCanvas(board, button);
  }

  let scheduled = false;
  const observer = new MutationObserver(() => {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => { scheduled = false; enhance(); });
  });
  observer.observe(root, { childList:true, subtree:true });
  enhance();
})();
