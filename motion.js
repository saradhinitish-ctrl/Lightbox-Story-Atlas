/* Lightbox motion: touch feedback.
 *
 * Every control gives a little under your finger: it sinks on press (scale, which runs on the compositor) and
 * eases back on release. One listener on the document; no per-control code. Skipped with reduced motion,
 * on text fields and the writing surface, and inside the darkroom, whose prints have their own physics.
 * It uses the Web Animations API and the individual `scale` property, so it never touches an element's
 * own `transform` or transitions. It reads nothing from, and writes nothing to, the project.
 */
(() => {
  'use strict';
  if (!('animate' in Element.prototype)) return;
  const quiet = window.matchMedia('(prefers-reduced-motion: reduce)');
  const TARGET = 'button, a[href], summary, [role="button"], [role="tab"], [role="menuitem"], [role="option"], label.button';
  const SKIP = 'input, textarea, select, [contenteditable], .ProseMirror, .lbd-darkroom, [data-no-press], [disabled], [aria-disabled="true"]';
  const EASE = 'cubic-bezier(.2, .8, .2, 1)';
  let held = null;          // { el, anim }

  // Small things sink more than large ones: a key gives, a card barely moves.
  const depth = (el) => {
    const r = el.getBoundingClientRect(), m = Math.min(r.width, r.height);
    return m < 64 ? .93 : m < 200 ? .965 : .985;
  };
  const pick = (node) => {
    const el = node instanceof Element ? node.closest(TARGET) : null;
    return el && !el.matches(SKIP) && !el.closest(SKIP) ? el : null;
  };
  const press = (event) => {
    if (quiet.matches || event.button > 0 || !event.isPrimary) return;
    const el = pick(event.target);
    if (!el) return;
    release();
    const to = depth(el);
    const anim = el.animate([{ scale: '1' }, { scale: String(to) }], { duration: 140, easing: EASE, fill: 'forwards' });
    held = { el, anim, to };
  };
  const release = () => {
    if (!held) return;
    const { el, anim } = held;
    held = null;
    const current = getComputedStyle(el).scale;
    anim.cancel();
    const back = el.animate([{ scale: current === 'none' ? '1' : current }, { scale: '1' }], { duration: 300, easing: 'cubic-bezier(.2, .9, .25, 1.04)' });
    back.onfinish = back.oncancel = () => back.cancel();
  };

  document.addEventListener('pointerdown', press, { passive: true, capture: true });
  for (const type of ['pointerup', 'pointercancel', 'dragstart', 'contextmenu']) document.addEventListener(type, release, { passive: true, capture: true });
  window.addEventListener('blur', release);
  quiet.addEventListener?.('change', release);
})();
