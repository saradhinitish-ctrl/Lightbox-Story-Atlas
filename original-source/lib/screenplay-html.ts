import { isElement, dualRanges, type ScriptBlock, type ScriptRun, scriptText } from './screenplay-layout';
import { sanitize } from './desk-client';
import { escape } from './desk-model';
export function readScriptHTML(html:string,source?:string):ScriptBlock[]{
 const el=document.createElement('div');el.innerHTML=sanitize(html);const result:ScriptBlock[]=[];
 const visit=(p:Element)=>{
  if(p.matches('[data-dual-dialogue],[data-dialogue-column]')){[...p.children].forEach(visit);return;}
  if(p.tagName==='HR')return;
  const runs:ScriptRun[]=[];function walk(n:Node,marks:Omit<ScriptRun,'text'>){if(n.nodeType===3){runs.push({text:n.textContent||'',...marks});return;}if(n.nodeType!==1)return;const e=n as HTMLElement;if(e.tagName==='BR'){runs.push({text:'\n',...marks});return;}const next={...marks,bold:marks.bold||['B','STRONG'].includes(e.tagName),italic:marks.italic||['I','EM'].includes(e.tagName),underline:marks.underline||e.tagName==='U',profileId:e.getAttribute('data-profile-id')||marks.profileId,profileKind:(e.getAttribute('data-profile-kind')||marks.profileKind) as ScriptRun['profileKind']};[...e.childNodes].forEach(child=>walk(child,next));}
  [...p.childNodes].forEach(n=>walk(n,{}));let text=runs.map(r=>r.text).join('');if(text==='\n')text='';const raw=p.getAttribute('data-element');result.push({type:isElement(raw)?raw:'action',text,runs,dual:p.getAttribute('data-dual')==='true',sceneKey:p.getAttribute('data-scene-key')||undefined,mode:p.getAttribute('data-script-mode')==='manual'?'manual':p.getAttribute('data-script-mode')==='auto'?'auto':undefined,source:p.getAttribute('data-source')||source});
 };
 [...el.children].forEach(visit);return result.length?result:[{type:'scene',text:el.textContent||'',source}];
}
export function scriptBlockHTML(b:ScriptBlock){
 let content='';if(b.text){if(b.runs?.length)content=b.runs.map(r=>{let text=escape(['scene','character','transition','shot'].includes(b.type)?r.text.toUpperCase():r.text).replace(/\n/g,'<br>');if(r.underline)text='<u>'+text+'</u>';if(r.italic)text='<em>'+text+'</em>';if(r.bold)text='<strong>'+text+'</strong>';if(r.profileId)text='<span data-profile-id="'+escape(r.profileId)+'" data-profile-kind="'+(r.profileKind||'character')+'">'+text+'</span>';return text;}).join('');else content=escape(scriptText(b)).replace(/\n/g,'<br>');if(b.type==='parenthetical'&&b.runs?.length){if(!b.text.trim().startsWith('('))content='('+content;if(!b.text.trim().endsWith(')'))content+=')';}}
 return '<p data-element="'+b.type+'"'+(b.mode?' data-script-mode="'+b.mode+'"':'')+(b.dual?' data-dual="true"':'')+(b.sceneKey?' data-scene-key="'+escape(b.sceneKey)+'"':'')+(b.source?' data-source="'+escape(b.source)+'"':'')+'>'+content+'</p>';
}
export function scriptBlocksHTML(blocks:ScriptBlock[]){
 const pairs=new Map(dualRanges(blocks).map(r=>[r.start,r]));let html='';for(let i=0;i<blocks.length;i++){const pair=pairs.get(i);if(pair){html+='<div data-dual-dialogue="true"><div data-dialogue-column="left">'+blocks.slice(pair.start,pair.middle).map(scriptBlockHTML).join('')+'</div><div data-dialogue-column="right">'+blocks.slice(pair.middle,pair.end).map(b=>scriptBlockHTML({...b,dual:b===blocks[pair.middle]})).join('')+'</div></div>';i=pair.end-1;}else html+=scriptBlockHTML(blocks[i]);}return html;
}
export function normalizeScriptHTML(html:string,source?:string){let ordinal=0;return scriptBlocksHTML(readScriptHTML(html,source).map(b=>{const sceneKey=b.type==='scene'&&b.text.trim()?(b.sceneKey||'legacy-'+ordinal):b.sceneKey;if(b.type==='scene'&&b.text.trim())ordinal++;return {...b,source:source||b.source,sceneKey};}));}
export function combineScriptHTML(documents:{id:string;html:string}[]){return scriptBlocksHTML(documents.flatMap(d=>readScriptHTML(normalizeScriptHTML(d.html,d.id),d.id).map(b=>({...b,source:d.id}))));}
export function splitScriptHTML(html:string,fallback:string,allowed?:string[]):Map<string,string>{const byId=new Map<string,ScriptBlock[]>();for(const b of readScriptHTML(html)){let id=b.source||fallback;if(allowed&&!allowed.includes(id))id=fallback;byId.set(id,[...(byId.get(id)||[]),{...b,source:undefined}]);}return new Map([...byId].map(([id,blocks])=>[id,scriptBlocksHTML(blocks)]));}

export function exportScriptBlocks(blocks:ScriptBlock[]):ScriptBlock[]{return blocks.map(b=>{if(!b.runs?.some(r=>r.profileId))return b;const runs=b.runs.map(r=>({...r,text:r.profileId?r.text.replace(/^[@#]/,''):r.text,profileId:undefined,profileKind:undefined}));return {...b,runs,text:runs.map(r=>r.text).join('')};});}
