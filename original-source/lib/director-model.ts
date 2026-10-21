import { remapVisualScene } from './visual-language';
import type { VisualCategory } from './visual-language';
import { compileNodes, activeDraftRoot, inTrash, trashNode, node, now, type Project, type DeskNode, type Asset, type ProfileKind } from './desk-model';
import { readScriptHTML, exportScriptBlocks, normalizeScriptHTML, scriptBlocksHTML } from './screenplay-html';
import type { ScriptBlock } from './screenplay-layout';
export interface MoodCard { id:string; kind:'image'|'note'|'palette'|'shot'|'link'; title:string; text:string; colors?:string[]; asset?:Asset; sceneId?:string;notesHtml?:string;profileIds?:string[]; sceneIds?:string[];scope?:'film'|'scenes'|'unassigned';category?:VisualCategory;purpose?:string;moment?:string;source?:string;url?:string;mediaType?:'video'|'audio'|'web';size?:'standard'|'wide'|'hero' }
export interface BeatMeta { title?:string; summary?:string; emotion?:string; tension?:number; pressure?:number; minutes?:number; characters?:string[]; props?:string[]; location?:string }
export interface DirectorScene { id:string; origin:string; key:string; documentId:string; blockIndex:number; heading:string; blocks:ScriptBlock[]; characters:string[]; locations:string[];props:string[]; words:number; meta:BeatMeta }
export const EMOTIONS:Record<string,string>={Neutral:'#8b9091',Hope:'#9caf88',Unease:'#cba96b',Conflict:'#bd7973',Loss:'#8999b3',Release:'#79aaa2'};
export function profileNodes(p:Project,kind?:ProfileKind){return p.nodes.filter(n=>(kind?n.kind===kind:n.kind==='character'||n.kind==='location'||n.kind==='prop')&&!inTrash(p,n));}
export function profileAlias(s:string){return s.toLocaleLowerCase().replace(/[\s_-]+/g,'');}
export function reorder<T extends {id:string}>(items:T[],moving:string,before:string){const source=items.find(i=>i.id===moving);if(!source||moving===before)return items;const next=items.filter(i=>i.id!==moving),index=next.findIndex(i=>i.id===before);next.splice(index<0?next.length:index,0,source);return next;}
export function scenesForDraft(project:Project,draftId?:string):DirectorScene[]{
 if(typeof document==='undefined')return[];
 const p=draftId?{...project,activeDraftId:draftId}:project;const result:DirectorScene[]=[];
 for(const doc of compileNodes(p).filter(n=>n.kind==='screenplay')){
  const blocks=readScriptHTML(doc.html),starts=blocks.flatMap((b,i)=>b.type==='scene'&&b.text.trim()?[i]:[]);if(!starts.length)starts.push(0);else if(starts[0]>0)starts.unshift(0);
  let headingOrdinal=0;starts.forEach((start,ordinal)=>{const group=blocks.slice(start,starts[ordinal+1]??blocks.length),first=group[0],key=first?.type==='scene'&&first.text.trim()?(first.sceneKey||'legacy-'+headingOrdinal):'document',id=doc.id+'/'+key;
   if(first?.type==='scene'&&first.text.trim())headingOrdinal++;const characters=new Set<string>(),locations=new Set<string>(),props=new Set<string>();for(const b of group){for(const run of b.runs||[]){if(run.profileId)(run.profileKind==='location'?locations:run.profileKind==='prop'?props:characters).add(run.profileId);}if(b.type==='character'){const name=b.text.replace(/^@/,'').replace(/\s*\([^)]*\)\s*$/,'').trim();profileNodes(project,'character').filter(n=>profileAlias(n.title)===profileAlias(name)).forEach(n=>characters.add(n.id));}if(b.type==='scene')profileNodes(project,'location').filter(n=>b.text.toLocaleLowerCase().includes(n.title.toLocaleLowerCase())).forEach(n=>locations.add(n.id));}
   result.push({id,origin:doc.fields['revision.origin']||doc.id,key,documentId:doc.id,blockIndex:start,heading:first?.type==='scene'&&first.text.trim()?first.text:doc.title,blocks:exportScriptBlocks(group),characters:[...characters],locations:[...locations],props:[...props],words:group.map(b=>b.text).join(' ').trim().split(/\s+/).filter(Boolean).length,meta:project.sceneBeats?.[id]||(ordinal===0?project.sceneBeats?.[doc.id+'/document']:undefined)||{summary:doc.synopsis}});
  });
 }
 return result;
}
// Beats are screenplay scenes. Keep the removed writing recoverable in Trash,
// and preserve scene keys in surviving paragraphs before cutting one scene out.
export function trashBeat(project:Project,sceneId:string){
 const scenes=scenesForDraft(project),scene=scenes.find(s=>s.id===sceneId);if(!scene)return null;
 const doc=project.nodes.find(n=>n.id===scene.documentId);if(!doc)return null;
 const siblings=scenes.filter(s=>s.documentId===doc.id);
 if(siblings.length===1){if(!trashNode(project,doc.id))return null;return doc.id;}
 const bin=project.nodes.find(n=>n.role==='trash');if(!bin)return null;
 const blocks=readScriptHTML(normalizeScriptHTML(doc.html)),index=siblings.findIndex(s=>s.id===sceneId),end=siblings[index+1]?.blockIndex??blocks.length;
 const removed=blocks.slice(scene.blockIndex,end),kept=blocks.slice(0,scene.blockIndex).concat(blocks.slice(end));
 const recovered=node(scene.meta.title||scene.heading,'screenplay',bin.id,project.nodes.filter(n=>n.parent===bin.id).length,{html:scriptBlocksHTML(removed),previousParent:doc.parent,synopsis:scene.meta.summary||'',fields:{...doc.fields,'revision.origin':doc.fields['revision.origin']||doc.id}});
 doc.html=scriptBlocksHTML(kept);doc.updated=now();project.nodes.push(recovered);
 const restoredId=recovered.id+'/'+scene.key;project.sceneBeats||={};project.sceneBeats[restoredId]=structuredClone(scene.meta);delete project.sceneBeats[sceneId];
 project.moodboard=project.moodboard?.map(c=>remapVisualScene(c,sceneId,restoredId));
 if(project.visualDirections?.[sceneId]){project.visualDirections[restoredId]=project.visualDirections[sceneId];delete project.visualDirections[sceneId];}
 if(project.beatOrders)for(const id of Object.keys(project.beatOrders))project.beatOrders[id]=project.beatOrders[id].map(value=>value===sceneId?restoredId:value);
 return recovered.id;
}
export function timelineScenes(project:Project){const scenes=scenesForDraft(project),order=project.beatOrders?.[activeDraftRoot(project)?.id||'']||[];return [...scenes].sort((a,b)=>{const ai=order.indexOf(a.id),bi=order.indexOf(b.id);return (ai<0?order.length+scenes.indexOf(a):ai)-(bi<0?order.length+scenes.indexOf(b):bi);});}
export interface DiffPart {text:string;changed:boolean}
export interface Change<T>{kind:'same'|'added'|'removed';value:T}
export function sequenceDiff<T>(a:T[],b:T[],key:(v:T)=>string,limit=600000):Change<T>[]{
 let prefix=0,suffix=0;while(prefix<a.length&&prefix<b.length&&key(a[prefix])===key(b[prefix]))prefix++;while(suffix<a.length-prefix&&suffix<b.length-prefix&&key(a[a.length-1-suffix])===key(b[b.length-1-suffix]))suffix++;
 const out:Change<T>[]=a.slice(0,prefix).map(value=>({kind:'same',value}));const x=a.slice(prefix,a.length-suffix),y=b.slice(prefix,b.length-suffix);
 if(x.length*y.length>limit){const positions=new Map<string,number[]>();y.forEach((v,i)=>positions.set(key(v),[...(positions.get(key(v))||[]),i]));let at=0;for(const value of x){const match=positions.get(key(value))?.find(i=>i>=at);if(match===undefined)out.push({kind:'removed',value});else{while(at<match)out.push({kind:'added',value:y[at++]});out.push({kind:'same',value});at++;}}while(at<y.length)out.push({kind:'added',value:y[at++]});}
 else {const rows=Array.from({length:x.length+1},()=>new Uint32Array(y.length+1));for(let i=x.length-1;i>=0;i--)for(let j=y.length-1;j>=0;j--)rows[i][j]=key(x[i])===key(y[j])?rows[i+1][j+1]+1:Math.max(rows[i+1][j],rows[i][j+1]);let i=0,j=0;while(i<x.length||j<y.length){if(i<x.length&&j<y.length&&key(x[i])===key(y[j])){out.push({kind:'same',value:x[i++]});j++;}else if(i<x.length&&(j===y.length||rows[i+1][j]>=rows[i][j+1]))out.push({kind:'removed',value:x[i++]});else out.push({kind:'added',value:y[j++]});}}
 out.push(...a.slice(a.length-suffix).map(value=>({kind:'same' as const,value})));return out;
}
export interface DiffRow {status:'same'|'added'|'removed'|'changed';left?:ScriptBlock;right?:ScriptBlock;leftParts?:DiffPart[];rightParts?:DiffPart[]}
export function blockDiff(a:ScriptBlock[],b:ScriptBlock[]):DiffRow[]{
 const edits=sequenceDiff(a.filter(b=>b.text.trim()),b.filter(b=>b.text.trim()),v=>v.type+'\0'+v.text);const rows:DiffRow[]=[];
 for(let i=0;i<edits.length;){if(edits[i].kind==='same'){rows.push({status:'same',left:edits[i].value,right:edits[i].value});i++;continue;}const removed:ScriptBlock[]=[],added:ScriptBlock[]=[];while(i<edits.length&&edits[i].kind!=='same'){(edits[i].kind==='removed'?removed:added).push(edits[i].value);i++;}for(let j=0;j<Math.max(removed.length,added.length);j++){const left=removed[j],right=added[j];if(left&&right&&left.type===right.type){const words=sequenceDiff(left.text.match(/\s+|\S+/g)||[],right.text.match(/\s+|\S+/g)||[],v=>v,80000);rows.push({status:'changed',left,right,leftParts:words.filter(v=>v.kind!=='added').map(v=>({text:v.value,changed:v.kind==='removed'})),rightParts:words.filter(v=>v.kind!=='removed').map(v=>({text:v.value,changed:v.kind==='added'}))});}else{if(left)rows.push({status:'removed',left});if(right)rows.push({status:'added',right});}}}
 return rows;
}
export interface SceneDiff {left?:DirectorScene;right?:DirectorScene;rows:DiffRow[];beatChanged:boolean}
export function compareDrafts(project:Project,leftId:string,rightId:string):SceneDiff[]{
 const left=scenesForDraft(project,leftId),right=scenesForDraft(project,rightId),shared=new Set(left.map(s=>s.origin).filter(id=>right.some(s=>s.origin===id)));
 const keys=(scenes:DirectorScene[])=>{const seen=new Map<string,number>();return scenes.map(scene=>{const base=shared.has(scene.origin)?scene.origin+'/'+scene.key:scene.heading.trim().toLocaleLowerCase();const count=seen.get(base)||0;seen.set(base,count+1);return {scene,key:base+'/'+count};});};
 const edits=sequenceDiff(keys(left),keys(right),v=>v.key);const result:SceneDiff[]=[];let li=0,ri=0;
 for(const edit of edits){if(edit.kind==='same'){const l=left[li++],r=right[ri++];result.push({left:l,right:r,rows:blockDiff(l.blocks,r.blocks),beatChanged:JSON.stringify(l.meta)!==JSON.stringify(r.meta)});}else if(edit.kind==='removed'){const l=left[li++];result.push({left:l,rows:blockDiff(l.blocks,[]),beatChanged:true});}else{const r=right[ri++];result.push({right:r,rows:blockDiff([],r.blocks),beatChanged:true});}}
 return result;
}
