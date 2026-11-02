// Android edition. The main workspace owns navigation, this link stays in its scroll flow.
(() => {
  const root = document.getElementById('root');
  function attach() {
    const host = root.querySelector('.welcome, .story-atlas');
    if (!host || host.querySelector(':scope > .native-utilities')) return;
    const footer = document.createElement('footer');
    footer.className = 'native-utilities';
    const link = document.createElement('a');
    link.href = 'lightboxwidget://manager';
    link.textContent = 'Widgets';
    footer.append(link);
    host.append(footer);
  }
  let queued = false;
  new MutationObserver(() => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => { queued = false; attach(); });
  }).observe(root, {childList:true, subtree:true});
  attach();
})();
