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
      if (title && title.textContent !== 'Projection Room') title.textContent = 'Projection Room';
      const copy = 'A dark studio lit by one amber light. Your screenplay page stays paper.';
      if (description && description.textContent !== copy) description.textContent = copy;
    }
    enhanceExport();
    enhanceBreakdown();
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

  function enhanceBreakdown() {
    const stage = root.querySelector('.breakdown-stage');
    if (!stage) return;
    const updateText = (selector, text) => {
      const element = stage.querySelector(selector);
      if (element && element.textContent !== text) element.textContent = text;
    };
    updateText('.stage-heading h1', 'Scene breakdown');
    updateText('.stage-heading p', 'Read the scene alongside its visual references and production assets.');
    updateText('.breakdown-script .stage-section-heading>span', 'THE SCREENPLAY');
    const frameHeadings = stage.querySelectorAll('.breakdown-frames .stage-section-heading>span');
    ['VISUAL REFERENCES', 'CAST, LOCATIONS & PROPS'].forEach((text, index) => {
      if (frameHeadings[index] && frameHeadings[index].textContent !== text) frameHeadings[index].textContent = text;
    });
    const title = stage.querySelector('.breakdown-script>h2');
    const slugline = stage.querySelector('.breakdown-script .breakdown-block.type-scene');
    if (title) title.hidden = !!slugline && title.textContent.trim() === slugline.textContent.trim();
  }

  // An illustrative title sheet reads the existing form; the export engine owns output.
  function enhanceExport() {
    const manifest = root.querySelector('.compile-manifest');
    if (!manifest) return;
    const form = root.querySelector('.title-page-form');
    let proof = manifest.querySelector('.lb-title-proof');
    if (!proof) {
      proof = document.createElement('div');
      proof.className = 'lb-title-proof';
      proof.setAttribute('aria-hidden', 'true');
      proof.append(document.createElement('strong'), document.createElement('span'), document.createElement('small'));
      proof.lastChild.textContent = 'TITLE PAGE';
      manifest.prepend(proof);
    }
    proof.hidden = !form;
    if (!form) return;
    const fields = form.querySelectorAll('input');
    const title = fields[0]?.value.trim() || 'Untitled screenplay';
    const author = fields[1]?.value.trim();
    const credit = fields[2]?.value.trim() || 'Written by';
    const line = author ? credit + '\n' + author : '';
    if (proof.children[0].textContent !== title) proof.children[0].textContent = title;
    if (proof.children[1].textContent !== line) proof.children[1].textContent = line;
  }
  root.addEventListener('input', event => {
    if (event.target.closest('.title-page-form')) enhanceExport();
  });

  let scheduled = false;
  const observer = new MutationObserver(() => {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => { scheduled = false; enhance(); });
  });
  observer.observe(root, { childList:true, subtree:true });
  enhance();
})();
