/* Lightbox distribution: browser studio OR one native Android APK with widgets.
 * Chrome's "Install app" creates a PWA shortcut; it is not the native APK.
 * This file never intercepts or replaces the browser install prompt.
 */
(() => {
  'use strict';
  const root = document.getElementById('root');
  if (!root) return;
  const android = /\bAndroid\b/i.test(navigator.userAgent || '');
  const nativeApp = document.documentElement.classList.contains('lb-native-shell');
  const apkUrl = '/android-downloads/lightbox-studio-1.0.7.apk';

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
      '.lb-android-footer{display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:16px;margin:40px 0 95px;padding:22px 0;border-top:1px solid #B7B7AE;color:#53564D;font:700 10px/1.5 monospace;letter-spacing:.07em}',
      '.lb-android-footer a{display:inline-block;color:#181916;text-decoration:underline;text-underline-offset:5px;font:700 12px/1.5 monospace;letter-spacing:0}',
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
    download.setAttribute('download', 'Lightbox-Studio-1.0.7.apk');
    download.textContent = 'DOWNLOAD LIGHTBOX STUDIO 1.0.7 ↓';
    const browser = document.createElement('span');
    browser.className = 'lb-native-choice__browser';
    browser.textContent = 'Already on Lightbox? Keep using it here — no download needed.';
    actions.append(download, browser);
    const note = document.createElement('p');
    note.className = 'lb-native-choice__notice';
    note.textContent = "Lightbox Studio 1.0.7 includes three functional native widgets: Quick Capture, Scene Desk, and Director Desk. You can save notes, open the workspace, start or finish a writing session, and manually sync story progress. Chrome's Install App is only a browser shortcut without native widgets. If you are moving from 1.0.5, export your worlds and copy any saved notes before removing the old app."
    card.append(tag, title, desc, actions, note);
    return card;
  }
  function managerButton(kind) {
    const a = document.createElement('a');
    a.className = 'lb-widgets-link lb-widgets-' + kind;
    // Browser visitors see setup information, not an Android install/intent error.
    // Only the native WebView uses the app-owned deep link.
    a.href = nativeApp ? 'lightboxwidget://manager' : apkUrl;
    if (!nativeApp) a.setAttribute('download', 'Lightbox-Studio-1.0.7.apk');
    a.textContent = nativeApp ? 'ADD WIDGETS ↗' : 'DOWNLOAD LIGHTBOX STUDIO ↓';
    a.setAttribute('aria-label', nativeApp ? 'Open native widget manager' : 'Download Lightbox Studio 1.0.7 APK with built-in widgets');
    return a;
  }
  let queued = false;
  function enhance() {
    // A single direct APK download offer for browser users.
    // The old PWA/Chrome installation component is suppressed by install-app.css.
    // Native app users never see a download or installation prompt.
    const cards=Array.from(root.querySelectorAll('.lb-native-choice'));
    if (nativeApp) {
      cards.forEach(card=>card.remove());
    } else {
      const welcome=root.querySelector('.studio.atlas-shell .welcome');
      // Only the first-use welcome view uses a card; active projects get a
      // single, obvious direct-download action in the Atlas header.
      const host=welcome;
      cards.slice(1).forEach(card=>card.remove());
      if (host) {
        if (cards.length===0) host.appendChild(nativeChoice());
        else if (cards[0].parentElement!==host) host.appendChild(cards[0]);
      } else if (cards.length>0) cards[0].remove();
    }
    // Never place widget management in the Story Atlas header.
    root.querySelectorAll('.studio.atlas-shell .atlas-caption .lb-widgets-atlas')
      .forEach(link=>link.remove());

    // In the installed app, the native bottom dock owns the widgets action.
    // In Chrome, a quiet utility link near the BOTTOM of the Story Atlas
    // downloads the standalone APK rather than attempting a PWA install.
    root.querySelectorAll('.studio.atlas-shell .story-atlas').forEach(atlas => {
      let footer=atlas.querySelector(':scope > .lb-android-footer');
      if(nativeApp) {
        if(footer) footer.remove();
        return;
      }
      if(!footer) {
        footer=document.createElement('div');
        footer.className='lb-android-footer';
        const copy=document.createElement('span');
        copy.textContent='LIGHTBOX / ON ANDROID';
        const download=document.createElement('a');
        download.href=apkUrl;
        download.download='Lightbox-Studio-1.0.7.apk';
        download.textContent='DOWNLOAD LIGHTBOX STUDIO ↓';
        footer.append(copy,download);
        atlas.appendChild(footer);
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
