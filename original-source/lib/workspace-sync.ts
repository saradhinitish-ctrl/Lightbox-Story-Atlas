import { validWorkspace, type Workspace } from './desk-model';
const same=(a:unknown,b:unknown)=>JSON.stringify(a)===JSON.stringify(b);
const record=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const identified=(v:unknown):v is {id:string}[]=>Array.isArray(v)&&v.every(x=>record(x)&&typeof x.id==='string')&&new Set(v.map(x=>x.id)).size===v.length;
/** Reconcile against the last acknowledged cloud copy. Conflicting writing is never overwritten. */
export function reconcileWorkspace(base:Workspace,local:Workspace,remote:Workspace):{state:Workspace;conflicts:string[]}{
 const conflicts:string[]=[];
 function merge(b:unknown,l:unknown,r:unknown,path:string[]):unknown{
  if(same(l,r))return structuredClone(l);
  if(same(l,b))return structuredClone(r);
  if(same(r,b))return structuredClone(l);
  if(path.at(-1)==='updated'&&typeof l==='string'&&typeof r==='string')return l>r?l:r;
  if((b===undefined||record(b))&&record(l)&&record(r)){b=b||{};return Object.fromEntries([...new Set([...Object.keys(b as Record<string,unknown>),...Object.keys(l),...Object.keys(r)])].map(key=>[key,merge((b as Record<string,unknown>)[key],l[key],r[key],[...path,key])]).filter(([,v])=>v!==undefined));}
  if((b===undefined||identified(b))&&identified(l)&&identified(r)){
   const base=(b||[]) as {id:string}[];
   const bm=new Map(base.map(x=>[x.id,x])),lm=new Map(l.map(x=>[x.id,x])),rm=new Map(r.map(x=>[x.id,x]));
   return [...new Set([...r.map(x=>x.id),...l.map(x=>x.id)])].map(id=>merge(bm.get(id),lm.get(id),rm.get(id),[...path,id])).filter(x=>x!==undefined);
  }
  // Counts are additive; the same day's independent writing should not block synchronization.
  if(path[0]==='history'&&(b===undefined||typeof b==='number')&&typeof l==='number'&&typeof r==='number')return (l as number)+(r as number)-((b as number)||0);
  // Asset cleanup queues are sets; retain pending deletions added by either device.
  if(path.length===1&&path[0]==='pendingAssetDeletes'&&[b,l,r].every(x=>x===undefined||Array.isArray(x)))return [...new Set([...(l as string[]||[]),...(r as string[]||[])])];
  conflicts.push(path.join('.'));return structuredClone(l);
 }
 const state=merge(base,local,remote,[]) as Workspace;
 if(!conflicts.length&&!validWorkspace(state))conflicts.push('workspace structure');
 return {state,conflicts};
}
