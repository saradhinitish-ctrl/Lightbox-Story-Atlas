import { Mark, mergeAttributes } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import type { Project } from './desk-model';
import { inTrash } from './desk-model';
export interface ProfileContext {getProject:()=>Project|null}
export { findProfileMentions } from './profile-links';
import { findProfileMentions } from './profile-links';
export const ProfileTag=Mark.create<Partial<ProfileContext>>({
 name:'profileTag',inclusive:false,excludes:'profileTag',
 addOptions(){return {getProject:()=>null};},
 addAttributes(){return {targetId:{default:null,parseHTML:el=>el.getAttribute('data-profile-id'),renderHTML:a=>a.targetId?{'data-profile-id':a.targetId}:{}},kind:{default:'character',parseHTML:el=>el.getAttribute('data-profile-kind'),renderHTML:a=>({'data-profile-kind':a.kind})}};},
 parseHTML(){return [{tag:'span[data-profile-id]'}];},renderHTML({HTMLAttributes}){return ['span',mergeAttributes(HTMLAttributes,{class:'script-profile-tag',role:'link',tabindex:'0',title:'Open profile · Ctrl/⌘ Enter'}),0];},
 addProseMirrorPlugins(){return [new Plugin({key:new PluginKey('script-profile-tags'),appendTransaction:(transactions,old,state)=>{
  if(!transactions.some(t=>t.docChanged||t.getMeta('profile-reparse'))||transactions.some(t=>t.getMeta('profile-tags'))||this.editor.view.composing)return null;const p=this.options.getProject?.();if(!p)return null;let tr=state.tr,changed=false;
  state.doc.descendants((node,pos)=>{if(!node.isText||!node.text||node.marks.some(m=>m.type.name==='profileTag'))return;for(const mention of findProfileMentions(node.text,p)){tr=tr.addMark(pos+mention.from,pos+mention.to,state.schema.marks.profileTag.create({targetId:mention.id,kind:mention.kind}));changed=true;}});
  return changed?tr.setMeta('profile-tags',true):null;
 }})];}
});
