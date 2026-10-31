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

const React=require('react'),{act}=React,{createRoot}=require('react-dom/client');globalThis.IS_REACT_ACT_ENVIRONMENT=true;
window.HTMLElement.prototype.scrollIntoView=function(){};
window.matchMedia=()=>({matches:false,addEventListener(){},removeEventListener(){}});
const Install=load('components/install-app.tsx').default;
const host=document.createElement('div');document.body.appendChild(host);const root=createRoot(host);
(async()=>{
 await act(async()=>root.render(React.createElement(Install)));
 const button=()=>[...host.querySelectorAll('button')].find(b=>b.textContent==='Download the app');assert.ok(button());
 await act(async()=>button().click());assert.ok(host.querySelector('#lightbox-install-steps'));assert.match(host.textContent,/Chrome or Edge/);await act(async()=>host.querySelector('[aria-label="Close install instructions"]').click());assert.equal(host.querySelector('#lightbox-install-steps'),null);
 let calls=0;const event=new window.Event('beforeinstallprompt',{cancelable:true});event.prompt=async()=>{calls++;};event.userChoice=Promise.resolve({outcome:'dismissed'});await act(async()=>window.dispatchEvent(event));assert.equal(event.defaultPrevented,true);await act(async()=>button().click());assert.equal(calls,1);assert.ok(button());
 await act(async()=>button().click());assert.ok(host.querySelector('#lightbox-install-steps'));assert.equal(calls,1);
 await act(async()=>window.dispatchEvent(new window.Event('appinstalled')));assert.equal(host.querySelector('.install-app'),null);
 await act(async()=>root.unmount());console.log('PASS: install footer, manual instructions, close control, deferred native prompt, dismissal, one-shot prompt and installed state');
})().catch(e=>{console.error(e);process.exitCode=1;});
