// Keep the workspace's original controls, disabled state and event handlers.
(() => {
  const root = document.getElementById('root');
  let pendingTitle = null;
  function compose() {
    // Let the original form perform validation and save the project. Forward
    // the title through the same input event as typing in the project dialog.
    if (pendingTitle !== null) {
      const dialogTitle = root.querySelector('form input[placeholder="Name this world"]');
      if (dialogTitle) {
        const value = pendingTitle;
        pendingTitle = null;
        Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(dialogTitle, value);
        dialogTitle.dispatchEvent(new Event('input', {bubbles:true}));
      }
    }
    const welcome = root.querySelector('.welcome');
    const shell = root.querySelector('.studio');
    if (shell) shell.classList.toggle('manuscript-shelf', Boolean(welcome));
    if (!welcome || welcome.dataset.manuscript) return;
    const title = welcome.querySelector(':scope > h1');
    const create = welcome.querySelector(':scope > button.primary');
    if (!title || !create) return;
    welcome.dataset.manuscript = 'true';
    welcome.querySelector(':scope > .eyebrow').textContent = 'LIGHTBOX   /   STUDIO';
    const switcher = root.querySelector('.header-world');
    if (switcher) {
      const projects = document.createElement('button');
      projects.className = 'shelf-projects';
      projects.type = 'button';
      projects.textContent = 'Projects';
      projects.addEventListener('click', () => switcher.click());
      welcome.querySelector(':scope > .eyebrow').append(projects);
    }
    title.replaceChildren('Story ', Object.assign(document.createElement('em'), {textContent:'shelf'}));
    welcome.querySelector(':scope > p').textContent = 'Give your first story a working title. Choose its format on the next page.';
    const label = [...create.childNodes].find(n => n.nodeType === Node.TEXT_NODE);
    if (label) label.nodeValue = 'Create a story';
    const titleField = document.createElement('label');
    titleField.className = 'manuscript-title';
    titleField.append('Working title');
    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = 'Untitled story';
    input.autocomplete = 'off';
    input.enterKeyHint = 'go';
    titleField.append(input);
    welcome.insertBefore(titleField, create);
    create.addEventListener('click', () => { pendingTitle = input.value.trim() || null; });
    input.addEventListener('keydown', event => {
      if (event.key === 'Enter' && !event.isComposing && !create.disabled) {
        event.preventDefault();
        create.click();
      }
    });
  }
  new MutationObserver(compose).observe(root, {childList:true, subtree:true});
  compose();
})();
