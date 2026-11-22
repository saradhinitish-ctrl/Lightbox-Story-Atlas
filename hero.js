/* Lightbox hero: pointer, scroll and fallbacks for the lit-table scene (css/hero.css).
 *
 * Live: the scene leans toward the pointer (or a dragging finger) and the frames lift apart as the page scrolls.
 * One requestAnimationFrame loop, started only while the hero is on screen and the tab is visible; it writes four
 * CSS variables and nothing else, so it never forces layout. If the first frames come in slow it stands down on
 * its own and the scene settles into its static pose.
 * Static: reduced motion, Save-Data, a small device, no 3D support, or a slow first second. Same markup, one pose.
 * It reads nothing about the visitor beyond those signals and stores nothing.
 */
(() => {
  'use strict';
  const root = document.querySelector('[data-lbx]');
  if (!root) return;

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  const conn = navigator.connection || {};
  const weak = conn.saveData === true || /(^|-)2g$/.test(conn.effectiveType || '') ||
    (navigator.deviceMemory && navigator.deviceMemory <= 2) || (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 2);
  const can3d = !!(window.CSS && CSS.supports && CSS.supports('transform-style', 'preserve-3d'));

  const makeStatic = () => { root.classList.remove('is-live'); root.classList.add('is-static'); stop(); root.style.setProperty('--tx', '0deg'); root.style.setProperty('--ty', '0deg'); root.style.setProperty('--lift', '.3'); };
  if (reduce.matches || weak || !can3d) { root.classList.add('is-static'); return; }
  root.classList.add('is-live');

  // State: where we are, where we are heading. A critically damped chase, so it is smooth at any frame rate.
  let x = 0, y = 0, lift = .3, tx = 0, ty = 0, tl = .3;
  let running = false, raf = 0, last = 0, visible = true, slow = 0, frames = 0, idle = 0;
  const MAX = 9;                               // degrees of lean each way

  const aim = (clientX, clientY) => {
    const r = root.getBoundingClientRect();
    const nx = ((clientX - r.left) / r.width - .5) * 2, ny = ((clientY - r.top) / r.height - .5) * 2;
    tx = Math.max(-1, Math.min(1, nx)) * MAX;
    ty = Math.max(-1, Math.min(1, ny)) * -MAX * .7;
    root.style.setProperty('--mx', ((nx + 1) * 50).toFixed(1) + '%');
    root.style.setProperty('--my', ((ny + 1) * 50).toFixed(1) + '%');
    idle = 0;
    start();
  };
  // Scroll progress: how far the stage has travelled up the screen since the page loaded. The scene starts in its
  // resting pose wherever it sits (beside the headline on a desk, below the fold on a phone) and lifts apart as you scroll.
  const travel = () => { const r = root.getBoundingClientRect(); return (window.innerHeight - (r.top + r.height / 2)) / window.innerHeight; };
  let origin = travel();
  const scrolled = () => {
    tl = .3 + Math.max(0, Math.min(1, (travel() - origin) / .55)) * .7;
    start();
  };
  window.addEventListener('resize', () => { origin = travel() - (tl - .3) / .7 * .55; }, { passive: true });

  const frame = (now) => {
    raf = 0;
    if (!running) return;
    const dt = Math.min(.05, (now - last) / 1000 || .016);
    if (last && frames++ > 4 && frames < 50 && dt * 1000 > 34) slow++;
    if (frames === 50 && slow > 22) { makeStatic(); return; }       // too heavy for this device
    last = now;
    idle += dt;
    // when nothing is happening the scene breathes a little, so the table feels lit and alive
    const bx = Math.sin(now / 2600) * 1.6, by = Math.cos(now / 3100) * 1.1;
    const k = 1 - Math.pow(.0009, dt);         // chase rate, independent of frame rate
    const gx = tx + (idle > 1.2 ? bx : 0), gy = ty + (idle > 1.2 ? by : 0);
    x += (gx - x) * k; y += (gy - y) * k; lift += (tl - lift) * k;
    root.style.setProperty('--tx', x.toFixed(2) + 'deg');
    root.style.setProperty('--ty', y.toFixed(2) + 'deg');
    root.style.setProperty('--lift', lift.toFixed(3));
    raf = requestAnimationFrame(frame);
  };
  function start() { if (!visible || document.hidden) return; if (!running) { running = true; last = 0; } if (!raf) raf = requestAnimationFrame(frame); }
  function stop() { running = false; if (raf) cancelAnimationFrame(raf); raf = 0; }

  window.addEventListener('pointermove', (e) => { if (e.pointerType !== 'touch' || e.buttons) aim(e.clientX, e.clientY); }, { passive: true });
  root.addEventListener('pointerleave', () => { tx = 0; ty = 0; idle = 0; }, { passive: true });
  root.addEventListener('pointerdown', (e) => { if (e.pointerType === 'touch') aim(e.clientX, e.clientY); }, { passive: true });
  window.addEventListener('scroll', scrolled, { passive: true });
  document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; if (visible) start(); else stop(); }, { rootMargin: '80px' }).observe(root);
  }
  reduce.addEventListener?.('change', () => { if (reduce.matches) makeStatic(); });
  scrolled();
  start();
})();
