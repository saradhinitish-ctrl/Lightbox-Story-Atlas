import { Node, mergeAttributes, type Editor } from '@tiptap/core';
import { Plugin, PluginKey, TextSelection } from '@tiptap/pm/state';
import { Fragment, type Node as PMNode } from '@tiptap/pm/model';
import { dualRanges, type ScriptBlock } from './screenplay-layout';

export const DialogueColumn=Node.create({
 name:'dialogueColumn',priority:900,content:'scriptBlock+',isolating:true,
 addAttributes(){return {side:{default:'left',parseHTML:el=>el.getAttribute('data-dialogue-column'),renderHTML:a=>({'data-dialogue-column':a.side})}};},
 parseHTML(){return [{tag:'div[data-dialogue-column]'}];},renderHTML({HTMLAttributes}){return ['div',mergeAttributes(HTMLAttributes),0];}
});
function children(node:PMNode){const nodes:PMNode[]=[];node.forEach(n=>nodes.push(n));return nodes;}
function wrapPair(editor:Editor,start:number,middle:number,end:number){
 const {state}=editor;const all=children(state.doc),offsets:number[]=[];state.doc.forEach((_,pos)=>offsets.push(pos));
 const left=all.slice(start,middle).filter(n=>n.textContent.trim()),right=all.slice(middle,end);if(!left.length||!right.length)return false;
 const cue=right[0],text=cue.textContent.replace(/\s*\^\s*$/,'');
 right[0]=cue.type.create({...cue.attrs,dual:true},cue.content.cut(0,text.length),cue.marks);
 const l=state.schema.nodes.dialogueColumn.create({side:'left'},left),r=state.schema.nodes.dialogueColumn.create({side:'right'},right),pair=state.schema.nodes.dualDialogue.create(null,[l,r]);
 const pos=offsets[start],to=end<all.length?offsets[end]:state.doc.content.size;
 const tr=state.tr.replaceWith(pos,to,pair);tr.setSelection(TextSelection.create(tr.doc,pos+l.nodeSize+3+text.length));editor.view.dispatch(tr);return true;
}
export function toggleDualDialogue(editor:Editor):boolean {
 const {$from}=editor.state.selection;
 for(let depth=$from.depth;depth>0;depth--){if($from.node(depth).type.name==='dualDialogue'){
  const pair=$from.node(depth),pos=$from.before(depth),flat=children(pair).flatMap(col=>children(col).map(n=>n.type.create({...n.attrs,dual:false},n.content,n.marks)));
  const tr=editor.state.tr.replaceWith(pos,pos+pair.nodeSize,Fragment.fromArray(flat));tr.setSelection(TextSelection.create(tr.doc,pos+1));editor.view.dispatch(tr);return true;
 }}
 const all=children(editor.state.doc);let index=0;editor.state.doc.forEach((n,pos,i)=>{if(pos<=$from.pos&&pos+n.nodeSize>=$from.pos)index=i;});
 let cue=index;while(cue>=0&&all[cue]?.type.name==='scriptBlock'&&['dialogue','parenthetical'].includes(all[cue].attrs.element))cue--;
 if(cue<0||all[cue]?.attrs.element!=='character')return false;
 const candidates=all.map((n,i)=>({type:n.attrs.element,text:n.textContent,dual:i===cue})) as ScriptBlock[];const pair=dualRanges(candidates).find(r=>r.middle===cue);if(!pair)return false;
 if(all.slice(pair.start,pair.end).some(n=>n.type.name!=='scriptBlock'))return false;
 return wrapPair(editor,pair.start,pair.middle,pair.end);
}
export function exitDualDialogue(editor:Editor){const {$from}=editor.state.selection;for(let d=$from.depth;d>0;d--){if($from.node(d).type.name==='dualDialogue'){
 const after=$from.after(d),block=editor.state.schema.nodes.scriptBlock.create({element:'action',mode:'auto',source:$from.parent.attrs.source});const tr=editor.state.tr.insert(after,block);tr.setSelection(TextSelection.create(tr.doc,after+1));editor.view.dispatch(tr);return true;
 }}return false;}
export const DualDialogue=Node.create({
 name:'dualDialogue',priority:900,group:'block',content:'dialogueColumn dialogueColumn',isolating:true,
 parseHTML(){return [{tag:'div[data-dual-dialogue]'}];},renderHTML(){return ['div',{'data-dual-dialogue':'true'},0];},
 addKeyboardShortcuts(){return {'Mod-Shift-2':()=>toggleDualDialogue(this.editor)};},
 addProseMirrorPlugins(){return [new Plugin({key:new PluginKey('automatic-dual-dialogue'),appendTransaction:(transactions,old,state)=>{
  if(this.editor.view.composing||!transactions.some(t=>t.docChanged)||transactions.some(t=>t.getMeta('dual-wrapped')))return null;
  const all=children(state.doc),blocks=all.map(n=>({type:n.attrs.element,text:n.textContent,dual:n.attrs.dual})) as ScriptBlock[];
  const pairs=dualRanges(blocks).filter(r=>all.slice(r.start,r.end).every(n=>n.type.name==='scriptBlock'));if(!pairs.length)return null;
  const offsets:number[]=[];state.doc.forEach((_,pos)=>offsets.push(pos));let tr=state.tr;
  for(const pair of pairs.reverse()){
   const left=all.slice(pair.start,pair.middle).filter(n=>n.textContent.trim()),right=all.slice(pair.middle,pair.end),cue=right[0],text=cue.textContent.replace(/\s*\^\s*$/,'');
   right[0]=cue.type.create({...cue.attrs,dual:true},cue.content.cut(0,text.length),cue.marks);
   const l=state.schema.nodes.dialogueColumn.create({side:'left'},left),r=state.schema.nodes.dialogueColumn.create({side:'right'},right),group=state.schema.nodes.dualDialogue.create(null,[l,r]);
   const pos=offsets[pair.start],to=pair.end<all.length?offsets[pair.end]:state.doc.content.size;tr=tr.replaceWith(tr.mapping.map(pos),tr.mapping.map(to),group);
   if(state.selection.from>=offsets[pair.middle]&&state.selection.from<=to)tr.setSelection(TextSelection.create(tr.doc,tr.mapping.map(pos,-1)+l.nodeSize+3+text.length));
  }
  return tr.setMeta('dual-wrapped',true);
 }})];}
});
