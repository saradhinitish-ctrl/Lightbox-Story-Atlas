(() => {
'use strict';
const $=id=>document.getElementById(id), select=$('project'),status=$('status'),summary=$('summary'),launch=$('launch');
let projects=[];
function openWorkspace(){
 return new Promise((resolve,reject)=>{
  const request=indexedDB.open('lightbox-portable-v64',1);
  request.onupgradeneeded=()=>request.transaction.abort();
  request.onerror=()=>reject(request.error||Error('Project storage unavailable'));
  request.onsuccess=()=>{
   const db=request.result;
   if(!db.objectStoreNames.contains('workspace')){db.close();reject(Error('No workspace found in this browser'));return;}
   const tx=db.transaction('workspace','readonly'),req=tx.objectStore('workspace').get('current');
   req.onsuccess=()=>{resolve(req.result?.state||null);db.close();};
   req.onerror=()=>{reject(req.error||Error('Could not read workspace'));db.close();};
  };
 });
}
function noTrash(p,node){
 let n=node;const seen=new Set();
 while(n&&!seen.has(n.id)){if(n.role==='trash')return false;seen.add(n.id);n=p.nodes.find(x=>x.id===n.parent);}
 return true;
}
function within(p,n,root){
 if(!root)return true;
 let curr=n;const visited=new Set();
 while(curr&&!visited.has(curr.id)){if(curr.id===root.id)return true;visited.add(curr.id);curr=p.nodes.find(x=>x.id===curr.parent);}
 return false;
}
function words(html){
 const el=document.createElement('div');el.innerHTML=html||'';
 el.querySelectorAll('br,div,p,li').forEach(node=>node.after(' '));
 const t=(el.textContent||'').trim();return t?t.split(/\s+/u).length:0;
}
function snapshot(p){
 const draftRoot=p.nodes.find(n=>n.id===p.activeDraftId&&n.role==='draft-version')||p.nodes.find(n=>n.role==='draft');
 const docs=p.nodes.filter(n=>n.kind==='screenplay'&&n.include&&!n.archived&&noTrash(p,n)&&within(p,n,draftRoot)).sort((a,b)=>a.order-b.order);
 const remembered=localStorage.getItem('desk-last-document:'+p.id);
 const active=docs.find(n=>n.id===remembered)||[...docs].sort((a,b)=>String(b.updated||'').localeCompare(String(a.updated||'')))[0];
 const number=active?String(docs.findIndex(n=>n.id===active.id)+1).padStart(2,'0'):'--';
 let heading=active?.title||'';
 if(active?.html){
  const el=document.createElement('div');el.innerHTML=active.html;
  const h=el.querySelector('[data-element="scene"]');
  if(h?.textContent?.trim())heading=h.textContent.trim();
 }
 const total=docs.reduce((sum,n)=>sum+words(n.html),0);
 return {project:p.id,node:active?.id||'',title:p.title||'Untitled story',scene:number,
  heading:heading.slice(0,110),draft:draftRoot?.title||'',
  words:total,target:Number.isFinite(+p.target)?Math.max(0,+p.target):0};
}
function update(){
 const p=projects.find(x=>x.id===select.value);
 if(!p)return;
 const s=snapshot(p);
 summary.textContent=s.scene+' / '+s.heading+'   •   '+s.words+' words'+(s.target>0?' of '+s.target+' target':'');
 const q=new URLSearchParams(Object.entries(s).map(([k,v])=>[k,String(v)]));
 launch.href='intent://sync?'+q.toString()+'#Intent;scheme=lightboxwidget;package=com.saradhinitish.lightboxstudio;end';
 launch.setAttribute('aria-disabled','false');
 launch.onclick=()=>{status.textContent=document.documentElement.classList.contains('lb-native-shell')?'Sending your selected story to the native widgets…':'Opening your installed Lightbox Android app to sync the story. Make sure the APK is installed.';};
}
async function load(){
 try{
  const ws=await openWorkspace();
  projects=(ws?.projects||[]).filter(p=>p&&!p.archived&&Array.isArray(p.nodes));
  select.replaceChildren();
  if(!projects.length)throw Error('No active projects found here. Create or restore a story in this workspace first.');
  projects.forEach(p=>{const o=document.createElement('option');o.value=p.id;o.textContent=p.title||'Untitled';select.append(o);});
  const last=localStorage.getItem('desk-last-project');
  if(projects.some(p=>p.id===last))select.value=last;
  select.disabled=false;status.textContent='Ready. A project title, scene heading, selected document ID, and word progress will be shared only when you tap Sync.';
  update();
 }catch(e){
  status.textContent=e.message||'Unable to access this browser’s workspace.';
  select.innerHTML='<option>Open Lightbox and save a project first</option>';
  summary.textContent='';
 }
}
select.addEventListener('change',update);load();
})();
