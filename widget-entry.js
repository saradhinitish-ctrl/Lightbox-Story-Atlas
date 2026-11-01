/* Lightbox distribution: browser studio OR one native Android APK with widgets.
 * Chrome's "Install app" creates a PWA shortcut; it is not the native APK.
 * This file never intercepts or replaces the browser install prompt.
 */
(() => {
  'use strict';
  const root = document.getElementById('root');
  if (!root) return;
  const android = /\bAndroid\b/i.test(navigator.userAgent || '');
  const apkUrl = '/android-downloads/lightbox-studio.apk';
  const managerFallback = encodeURIComponent('https://lightbox-studio.vercel.app/widgets.html?native=unavailable#install');
  const manager = 'intent://manager#Intent;scheme=lightboxwidget;package=com.saradhinitish.lightbox;S.browser_fallback_url=' + managerFallback + ';end';

  const styleId = 'lightbox-native-download-style';
  if (!document.getElementById(styleId)) {
    const sheet = document.createElement('style');
    sheet.id = styleId;
    sheet.textContent = [
      '.lb-native-choice{box-sizing:border-box;margin:20px 0 24px;padding:20px;border:1px solid #181916;background:#f1efe7;color:#181916;max-width:650px;box-shadow:4px 5px 0 #181916;border-radius:4px;text-align:left}',
      '.lb-native-choice *{box-sizing:border-box}',
      '.lb-native-choice__tag{font:800 10px/1.4 monospace;letter-spacing:.08em;color:#55594f}',
      '.lb-native-choice__title{font:700 clamp(22px,3vw,30px)/1.1 Georgia,serif;letter-spacing:-.025em;margin:12px 0 8px}',
      '.lb-native-choice__desc{font:13px/1.6 Arial,sans-serif;color:#53564d;margin:0 0 15px}',
      '.lb-native-choice__actions{display:flex;flex-wrap:wrap;gap:10px;align-items:center}',
      '.lb-native-choice__download{display:inline-flex;align-items:center;justify-content:center;text-decoration:none;min-height:46px;padding:11px 15px;background:#c6ff00;border:1.5px solid #181916;border-radius:3px;color:#181916;font:800 11px/1.25 monospace}',
      '.lb-native-choice__browser{font:12px/1.6 Arial,sans-serif;color:#53564d}',
      '.lb-native-choice__notice{font:11px/1.55 Arial,sans-serif;color:#666c60;margin:14px 0 0}',
      '.lb-widgets-link{display:inline-flex;align-items:center;justify-content:center;min-height:42px;padding:9px 14px;border:1.5px solid #181916;border-radius:4px;background:#C6FF00;color:#181916;font:800 11px/1.2 monospace;letter-spacing:.035em;text-decoration:none;white-space:nowrap}',
      '@media(max-width:600px){.lb-native-choice{width:100%;margin:18px 0;padding:17px}.lb-native-choice__actions{flex-direction:column;align-items:stretch}.lb-native-choice__download{width:100%;min-height:48px}}'
    ].join('\n');
    document.head.appendChild(sheet);
  }

  function nativeChoice() {
    const card = document.createElement('section');
    card.className = 'lb-native-choice';
    card.setAttribute('aria-label', 'Android APK download and browser options');
    const tag = document.createElement('div');
    tag.className = 'lb-native-choice__tag';
    tag.textContent = 'LIGHTBOX / CHOOSE YOUR EXPERIENCE';
    const title = document.createElement('h3');
    title.className = 'lb-native-choice__title';
    title.textContent = 'On the web. Or on your home screen.';
    const desc = document.createElement('p');
    desc.className = 'lb-native-choice__desc';
    desc.textContent = 'Use the filmmaking workspace here in your browser, or download the separate native Android app with three home-screen widget sizes.';
    const actions = document.createElement('div');
    actions.className = 'lb-native-choice__actions';
    const download = document.createElement('a');
    download.className = 'lb-native-choice__download';
    download.href = apkUrl;
    download.setAttribute('download', 'Lightbox-Studio-Android.apk');
    download.textContent = 'DOWNLOAD ANDROID APK  ↓';
    const browser = document.createElement('span');
    browser.className = 'lb-native-choice__browser';
    browser.textContent = 'Already on Lightbox? Keep using it here — no download needed.';
    actions.append(download, browser);
    const note = document.createElement('p');
    note.className = 'lb-native-choice__notice';
    note.textContent = "Android APK beta: currently being updated after launch failures on some Oppo/ColorOS phones. Chrome's Install App is a browser shortcut without native widgets. Back up projects; Chrome and APK storage are separate."
    card.append(tag, title, desc, actions, note);
    return card;
  }
  function managerButton(kind) {
    const a = document.createElement('a');
    a.className = 'lb-widgets-link lb-widgets-' + kind;
    a.href = android ? manager : '/widgets.html';
    a.textContent = kind === 'atlas' ? 'ADD WIDGETS ↗' : 'ANDROID WIDGETS ↗';
    a.setAttribute('aria-label', 'Open Lightbox Android widget manager');
    return a;
  }
  let queued = false;
  function enhance() {
    root.querySelectorAll('.studio.atlas-shell .welcome .install-app').forEach(el => {
      if (!el.querySelector('.lb-native-choice')) el.appendChild(nativeChoice());
    });
    root.querySelectorAll('.studio.atlas-shell .welcome').forEach(el => {
      if (!el.querySelector('.lb-native-choice')) el.appendChild(nativeChoice());
    });
    root.querySelectorAll('.studio.atlas-shell .story-atlas > .install-app').forEach(el => {
      if (!el.querySelector('.lb-native-choice')) el.appendChild(nativeChoice());
    });
    root.querySelectorAll('.studio.atlas-shell .atlas-caption').forEach(el => {
      if (!el.querySelector('.lb-widgets-atlas')) {
        const link = managerButton('atlas');
        link.style.marginLeft = 'auto';
        el.appendChild(link);
      }
    });
    root.querySelectorAll('.studio.atlas-shell .install-app').forEach(el => {
      if (!el.querySelector('.lb-widgets-install')) {
        const link = managerButton('install');
        link.style.marginTop = '12px';
        el.appendChild(link);
      }
      if (!el.closest('.welcome,.story-atlas') && !el.querySelector('.lb-native-choice')) {
        el.appendChild(nativeChoice());
      }
    });
  }
  const observer = new MutationObserver(() => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => { queued = false; enhance(); });
  });
  observer.observe(root, { childList: true, subtree: true });
  enhance();
})();
