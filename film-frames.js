/* Lightbox Studio — film frames on the Visual Language scene boards only.
 *
 * Each scene-board frame (.vl-scene-cover) gets sprocket holes (CSS, in
 * light-table-rooms.css) and a small edge code, made up from the project:
 *
 *   SWEET DRIFT ◆ SC 02 ◆ TK 03 ◆ 0042+08
 *   title         scene    take     footage at the head of the scene
 *
 * The take is the number of references on that scene's board (at least 01).
 * The footage is the screen time before the scene, at 24 frames a second and
 * 16 frames a foot, as edge numbers count along a 35mm roll. Read-only: it
 * only sets a data-edge attribute on the frame.
 */
(() => {
  'use strict';
  const root = document.getElementById('root');
  if (!root) return;
  const pad = (n, w = 2) => String(n).padStart(w, '0');

  function codes() {
    const api = window.LightboxStudio;
    const project = api?.project?.();
    if (!project) return null;
    let scenes = [];
    try { scenes = api.scenes(); } catch { return null; }
    const title = (project.title || 'UNTITLED').toUpperCase().replace(/\s+/g, ' ').trim().slice(0, 22);
    let seconds = 0;
    return scenes.map((scene, i) => {
      const refs = (project.moodboard || []).filter((c) => { try { return api.referenceInScene(c, scene.id); } catch { return false; } }).length;
      const frames = Math.round(seconds * 24);
      try { seconds += api.timing(scene).seconds; } catch { seconds += 60; }
      return title + ' ◆ SC ' + pad(i + 1) + ' ◆ TK ' + pad(Math.max(1, refs)) + ' ◆ ' + pad(Math.floor(frames / 16), 4) + '+' + pad(frames % 16);
    });
  }
  function apply() {
    const covers = root.querySelectorAll('.visual-language .vl-scene-board .vl-scene-cover');
    if (!covers.length) return;
    const list = codes();
    if (!list) return;
    covers.forEach((cover) => {
      // The board's own label says which scene it is ("SCENE 02"), even when filtered.
      const label = cover.closest('.vl-scene-board')?.querySelector('.vl-eyebrow')?.textContent || '';
      const n = parseInt(label.replace(/\D+/g, ''), 10);
      const code = list[n - 1];
      if (code && cover.dataset.edge !== code) cover.dataset.edge = code;
      cover.classList.add('lbx-film');
    });
  }
  let queued = false;
  const schedule = () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => { queued = false; apply(); });
  };
  new MutationObserver((records) => {
    if (records.some((r) => r.type === 'childList' && (r.target.closest?.('.visual-language') || [...r.addedNodes].some((n) => n.nodeType === 1 && (n.matches?.('.visual-language') || n.querySelector?.('.vl-scene-cover')))))) schedule();
  }).observe(root, { childList: true, subtree: true });
  document.addEventListener('lightbox:project', schedule);
  schedule();
})();
