// Keep the workspace's original controls, disabled state and event handlers.
(() => {
  const root = document.getElementById('root');
  function compose() {
    const welcome = root.querySelector('.welcome');
    if (!welcome || welcome.dataset.manuscript) return;
    const title = welcome.querySelector(':scope > h1');
    const create = welcome.querySelector(':scope > button.primary');
    if (!title || !create) return;
    welcome.dataset.manuscript = 'true';
    welcome.querySelector(':scope > .eyebrow').textContent = 'LIGHTBOX   /   STUDIO';
    title.replaceChildren('Story ', Object.assign(document.createElement('em'), {textContent:'shelf'}));
    welcome.querySelector(':scope > p').textContent = 'Your projects will appear here. Start with a working title.';
    const label = [...create.childNodes].find(n => n.nodeType === Node.TEXT_NODE);
    if (label) label.nodeValue = 'Create a story';
  }
  new MutationObserver(compose).observe(root, {childList:true, subtree:true});
  compose();
})();
