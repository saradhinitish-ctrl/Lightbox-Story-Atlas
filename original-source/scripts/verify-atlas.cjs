const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict'),ts=require('typescript');
const {JSDOM}=require('jsdom');
const dom=new JSDOM('<!doctype html><html><body><div id="editor"></div></body></html>',{url:'https://desk.test',pretendToBeVisual:true});
for(const name of ['window','document','Node','Element','HTMLElement','HTMLDivElement','DOMParser','MutationObserver','DOMRect','Range','NodeFilter','getComputedStyle'])Object.defineProperty(globalThis,name,{value:dom.window[name],configurable:true});
Object.defineProperty(globalThis,'navigator',{value:dom.window.navigator,configurable:true});globalThis.requestAnimationFrame=fn=>setTimeout(fn,0);globalThis.cancelAnimationFrame=clearTimeout;
const rect={left:0,right:0,top:0,bottom:0,width:0,height:0,x:0,y:0,toJSON(){return this;}};
Range.prototype.getBoundingClientRect=()=>rect;Range.prototype.getClientRects=()=>[];
const cache=new Map();
function load(filename){filename=path.resolve(filename);if(cache.has(filename))return cache.get(filename).exports;const module={exports:{}};cache.set(filename,module);const code=ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText;
 const resolve=(name)=>{if(name.startsWith('@/'))return load(name.slice(2)+(/\.[tj]sx?$/.test(name)?'':fs.existsSync(name.slice(2)+'.ts')?'.ts':'.tsx'));if(name.startsWith('.')){let target=path.resolve(path.dirname(filename),name);if(!fs.existsSync(target)){if(fs.existsSync(target+'.ts'))target+='.ts';else if(fs.existsSync(target+'.tsx'))target+='.tsx';else target+='.js';}return load(target);}if(name==='tiptap-pagination-plus')return load('node_modules/tiptap-pagination-plus/dist/index.js');return require(name);};
 new Function('module','exports','require',code)(module,module.exports,resolve);return module.exports;
}
const React=require('react'),{act}=React,{createRoot}=require('react-dom/client');globalThis.IS_REACT_ACT_ENVIRONMENT=true;globalThis.localStorage=window.localStorage;
globalThis.ResizeObserver=class{constructor(fn){this.fn=fn;}observe(){this.fn([{contentRect:{width:1200,height:800}}]);}disconnect(){}};
window.HTMLElement.prototype.scrollIntoView=function(){};window.HTMLElement.prototype.scrollTo=function(options){this.scrollTop=options?.top||0;this.scrollLeft=options?.left||0;};
window.HTMLDialogElement.prototype.showModal=function(){this.open=true;};window.HTMLDialogElement.prototype.close=function(){this.open=false;};
const model=load('lib/desk-model.ts'),Studio=load('components/writing-studio.tsx').default;let stored=model.emptyWorkspace();stored.projects.push(model.createProject('UI fixture'));stored.projects[0].nodes.push(model.node('Cast delete fixture','character',stored.projects[0].nodes.find(n=>n.role==='characters').id),model.node('Place delete fixture','location',stored.projects[0].nodes.find(n=>n.role==='locations').id));let revision=0,hold=false,pending=null,fail=false;
globalThis.fetch=async(url,options={})=>{assert.equal(url,'/api/workspace');if(options.method==='PUT'){const body=JSON.parse(options.body);if(hold)await new Promise(resolve=>{pending={resolve,body};});if(fail)return Response.json({error:'Test connection failed'},{status:503});stored=structuredClone(body.state);revision++;return Response.json({revision,updatedAt:new Date().toISOString()});}return Response.json({state:stored,revision});};
const host=document.getElementById('editor');let root;
const button=(text,selector='button')=>{const found=[...host.querySelectorAll(selector)].find(b=>(b.querySelector('.tree-title')?.textContent||b.textContent).trim()===text);assert.ok(found,'Missing control: '+text);return found;};
const click=async(el)=>act(async()=>{el.dispatchEvent(new window.MouseEvent('click',{bubbles:true}));await Promise.resolve();});
const write=async(el,value)=>act(async()=>{assert.ok(el,'Missing editor');if(el.editor)el.editor.commands.setContent('<p>'+model.escape(value)+'</p>');else{const setter=Object.getOwnPropertyDescriptor(el.tagName==='INPUT'?window.HTMLInputElement.prototype:window.HTMLTextAreaElement.prototype,'value').set;setter.call(el,value);el.dispatchEvent(new window.Event('input',{bubbles:true}));}});
const mount=async()=>act(async()=>{root=createRoot(host);root.render(React.createElement(Studio));await new Promise(resolve=>setTimeout(resolve,5));});

(async()=>{
 const damaged=model.createProject('Recovery fixture'),oldFoundation=damaged.nodes.find(n=>n.fields['development.kind']==='foundation');oldFoundation.parent=damaged.nodes.find(n=>n.role==='trash').id;assert.equal(model.ensureDevelopment(damaged),true);assert.ok(damaged.nodes.some(n=>n.fields['development.kind']==='foundation'&&!model.inTrash(damaged,n)),'Missing Foundation document is repaired');
 const project=stored.projects[0],foundation=project.nodes.find(n=>n.fields['development.kind']==='foundation'),scene=model.compileNodes(project)[0];
 foundation.fields['development.logline']='A filmmaker follows a missing frame.';foundation.fields['development.premise']='A missing frame changes the story.';
 scene.html='<p data-element="scene">INT. STUDIO - NIGHT</p><p data-element="action">A single frame is missing.</p>';
 project.nodes.push(model.node('Object fixture','prop',project.nodes.find(n=>n.role==='props').id),model.node('Research fixture','text',project.nodes.find(n=>n.role==='research').id));
 localStorage.setItem('desk-writing-preferences',JSON.stringify({palette:'midnight',atlasVersion:1,font:'Georgia'}));
 const originalHtml=scene.html,originalIds=project.nodes.map(n=>n.id);
 await mount();assert.equal(JSON.parse(localStorage.getItem('desk-writing-preferences')).font,'DM Sans','Legacy default migrates to the new story face');assert.equal(JSON.parse(localStorage.getItem('desk-writing-preferences')).typographyVersion,1);assert.ok(host.querySelector('.story-atlas'));assert.equal(host.querySelector('.section-library'),null);assert.equal(host.querySelector('.inspector'),null);
 assert.ok(host.textContent.includes('A missing frame changes the story.'));assert.ok(host.querySelector('.script-page-preview').textContent.includes('INT. STUDIO - NIGHT'));
 assert.ok(host.querySelector('[aria-label="Creative workspace modes"]'));
 await write(host.querySelector('[aria-label="World name"]'),'The Missing Frame');await click(host.querySelector('[aria-label^="Save project"]'));
 assert.equal(stored.projects[0].title,'The Missing Frame');assert.deepEqual(stored.projects[0].nodes.map(n=>n.id),originalIds);assert.equal(stored.projects[0].nodes.find(n=>n.id===scene.id).html,originalHtml);
 await click(button('Develop','.creative-dock button'));assert.ok(host.querySelector('[aria-label="Logline"]'));await write(host.querySelector('[aria-label="Logline"]'),'A new premise survives the redesign.');assert.equal(host.querySelector('.document-save-bar'),null);await click(host.querySelector('[aria-label^="Save project"]'));assert.equal(stored.projects[0].nodes.find(n=>n.id===foundation.id).fields['development.logline'],'A new premise survives the redesign.');
 await click(button('Breakdown','.creative-dock button'));assert.ok(host.querySelector('.breakdown-stage'));assert.ok(host.textContent.includes('INT. STUDIO - NIGHT'));assert.ok(host.textContent.includes('A single frame is missing.'));
 await write(host.querySelector('[aria-label="Find a breakdown scene"]'),'nonexistent');assert.ok(host.textContent.includes('No matching scene.'));await write(host.querySelector('[aria-label="Find a breakdown scene"]'),'STUDIO');assert.ok(host.querySelector('.breakdown-script'));
 await click(button('Atlas','.creative-dock button'));await click(button('Pitch view'));assert.ok(host.querySelector('.pitch-title'));assert.ok(host.textContent.includes('A new premise survives the redesign.'));assert.ok(host.querySelector('[aria-label="Next pitch slide"]').disabled);assert.ok(host.querySelector('.pitch-add-frames'));await click(button('Back to atlas'));
 await click(host.querySelector('[aria-label="Application menu"]'));await click(button('Documents','.application-menu-grid button'));await click(button('Story development','.application-menu-popover .dropdown button'));assert.ok(host.querySelector('[aria-label="Premise"]'),'Documents menu opens Story Foundation');
 await click(host.querySelector('[aria-label="Search and commands"]'));assert.ok(host.querySelector('.studio-command'));await write(host.querySelector('[aria-label="Search commands and documents"]'),'moodboard');await act(async()=>{host.querySelector('[aria-label="Search commands and documents"]').dispatchEvent(new window.KeyboardEvent('keydown',{key:'Enter',bubbles:true}));});assert.ok(host.querySelector('.moodboard-view'));assert.equal(host.querySelector('dialog'),null);
 await click(button('Write','.creative-dock button'));assert.ok(host.querySelector('.screenplay-prosemirror'));assert.ok(host.textContent.includes('A single frame is missing.'));
 await click(host.querySelector('[aria-label="Show / hide Binder"]'));assert.ok(host.querySelector('.section-library'));await click(host.querySelector('[aria-label="Close library"]'));assert.equal(host.querySelector('.section-library'),null);
 assert.equal(host.querySelector('.studio').dataset.palette,'carbon');
 for(const section of ['Development','Characters','Locations','Props','Research']){
  await click(host.querySelector('[aria-label="Show / hide Binder"]'));
  await click(button(section,'.library-sections button'));
  assert.ok(host.querySelector('.collection-workspace'),'Shared collection layout: '+section);
  assert.equal(host.querySelector('.compact-document-heading'),null,'No duplicate collection title strip');
  assert.ok(host.querySelector('.collection-add-card'),'Visible creation affordance');
  assert.ok(host.querySelector('.collection-card .collection-open'),'Existing document accessible');
  if(section==='Locations'){
   await write(host.querySelector('.collection-card textarea'),'A location synopsis that survives a layout change.');
   await click(host.querySelector('[aria-label^="Save project"]'));
   assert.equal(stored.projects[0].nodes.find(n=>n.kind==='location').synopsis,'A location synopsis that survives a layout change.');
  }
  await click(host.querySelector('.collection-card .collection-open'));assert.ok(host.querySelector('.editor-body [role="textbox"]')||host.querySelector('.planning-sheet'),'Document opens: '+section);
  if(section==='Locations')assert.ok(host.querySelector('.location-sheet'));
 }
 await click(host.querySelector('[aria-label="Show / hide Binder"]'));await click(button('Locations','.library-sections button'));await click(host.querySelector('.collection-create'));assert.ok(host.querySelector('.location-sheet'));await click(host.querySelector('[aria-label^="Save project"]'));assert.ok(stored.projects[0].nodes.some(n=>n.title==='Untitled location'&&n.kind==='location'));
 await click(host.querySelector('.header-actions [aria-label="Workspace settings"]'));assert.ok(host.querySelector('.carbon-theme-summary'));assert.equal(host.querySelector('[aria-label="Studio color palette"]'),null);await click(host.querySelector('[aria-label="Close dialog"]'));
 await act(async()=>root.unmount());await mount();assert.equal(host.querySelector('.studio').dataset.palette,'carbon');assert.ok(host.querySelector('.story-atlas'));assert.equal(host.querySelector('[aria-label="World name"]').value,'The Missing Frame');
 await act(async()=>root.unmount());
 // Preserve both a pre-existing custom face and an explicit post-migration Georgia choice.
 for(const preferences of [{font:'Arial'}, {font:'Georgia',typographyVersion:1}]){
  localStorage.setItem('desk-writing-preferences',JSON.stringify(preferences));await mount();
  assert.equal(JSON.parse(localStorage.getItem('desk-writing-preferences')).font,preferences.font,'Custom writing font survives migration/reload');
  assert.equal(stored.projects[0].nodes.find(n=>n.id===scene.id).html,originalHtml,'Typography migration preserves screenplay content');
  await act(async()=>root.unmount());
 }
 // A different account opening this device offline must not load the previous writer's recovery copy.
 const client=load('lib/desk-client.ts'),originalRead=client.recoverRead,originalFetch=globalThis.fetch,readKeys=[];
 client.recoverRead=async key=>{readKeys.push(key);return key==='workspace:previous-writer'?{state:stored,revision,pending:true}:null;};
 localStorage.setItem('desk-recovery-account','workspace:previous-writer');globalThis.fetch=async()=>{throw Error('Offline fixture');};
 await act(async()=>{root=createRoot(host);root.render(React.createElement(Studio,{accountUserId:'new-writer'}));await new Promise(resolve=>setTimeout(resolve,5));});
 assert.ok(readKeys.length);assert.ok(readKeys.every(key=>key==='workspace:new-writer'));assert.equal(host.querySelector('[aria-label="World name"]'),null);assert.equal(host.textContent.includes('The Missing Frame'),false);
 await act(async()=>root.unmount());client.recoverRead=originalRead;globalThis.fetch=originalFetch;
 const legacy=fs.readFileSync('private-archive/legacy/index.html','utf8');assert.match(legacy,/window.location.replace\("\/"\)/);assert.equal(JSON.parse(fs.readFileSync('public/manifest.webmanifest')).start_url,'/studio');assert.equal(JSON.parse(fs.readFileSync('private-archive/legacy/manifest.webmanifest')).start_url,'/');
 console.log('PASS: Atlas loads without sidebars; rename preserves all documents; Foundation save and menu navigation; scene breakdown/filter; pitch; command routing; screenplay engine; library drawer; Carbon migration; all five collection sections; profile creation and synopsis saving; legacy launch redirect; typography default migration and custom font preservation.');
})().catch(async e=>{console.error(e);if(root)await act(async()=>root.unmount());process.exitCode=1;});
