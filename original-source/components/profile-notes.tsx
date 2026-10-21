'use client';
import { useEffect, useRef, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { ProfileTag } from '@/lib/screenplay-profiles';
import { profileSuggestions } from '@/lib/profile-links';
import { paragraphs, type Project, type DeskNode } from '@/lib/desk-model';
import { sanitize } from '@/lib/desk-client';
export default function ProfileNotes({project,html,text,onChange,onOpenProfile}:{project:Project;html?:string;text:string;onChange:(text:string,html:string)=>void;onOpenProfile:(id:string)=>void}){
 const callbacks=useRef({project,onChange,onOpenProfile});callbacks.current={project,onChange,onOpenProfile};const last=useRef(html||'');
 const [menu,setMenu]=useState<{items:DeskNode[];from:number;to:number;sigil:string;index:number}|null>(null),menuRef=useRef(menu);menuRef.current=menu;const choose=useRef<(n:DeskNode)=>void>(()=>{});
 function refresh(editor:NonNullable<ReturnType<typeof useEditor>>){
  const {$from}=editor.state.selection,prefix=$from.parent.textBetween(0,$from.parentOffset,'',''),match=prefix.match(/(?:^|\s)([@#])([\p{L}\p{N}_-]*)$/u);
  if(!editor.isFocused||editor.view.composing||!match){setMenu(null);return;}
  const items=profileSuggestions(callbacks.current.project,match[1],match[2]).slice(0,8);setMenu({items,from:$from.pos-match[1].length-match[2].length,to:$from.pos,sigil:match[1],index:0});
 }
 const editor=useEditor({immediatelyRender:false,shouldRerenderOnTransaction:false,extensions:[StarterKit.configure({heading:false,blockquote:false,codeBlock:false,bulletList:false,orderedList:false,listItem:false,horizontalRule:false,link:false,trailingNode:false}),ProfileTag.configure({getProject:()=>callbacks.current.project}),Placeholder.configure({placeholder:'Write a note. Type @ to link a character, location, or prop…'})],content:sanitize(html||paragraphs(text)),editorProps:{attributes:{class:'profile-notes-editor','aria-label':'Reference notes',role:'textbox','aria-multiline':'true'},handleKeyDown:(view,event)=>{
  if(event.isComposing)return false;const target=(event.target as HTMLElement).closest?.('[data-profile-id]');if(target&&event.key==='Enter'){event.preventDefault();callbacks.current.onOpenProfile(target.getAttribute('data-profile-id')!);return true;}if(event.key==='Enter'&&(event.ctrlKey||event.metaKey)){const tag=view.state.selection.$from.marks().find(m=>m.type.name==='profileTag');if(tag){callbacks.current.onOpenProfile(tag.attrs.targetId);return true;}}const m=menuRef.current;if(!m)return false;
  if(event.key==='Escape'){setMenu(null);return true;}
  if(m.items.length&&['ArrowUp','ArrowDown'].includes(event.key)){event.preventDefault();setMenu(m=>m?{...m,index:(m.index+(event.key==='ArrowDown'?1:m.items.length-1))%m.items.length}:m);return true;}
  if(m.items.length&&['Enter','Tab'].includes(event.key)){event.preventDefault();choose.current(m.items[m.index]);return true;}return false;
 },handleDOMEvents:{click:(view,event)=>{const tag=(event.target as HTMLElement).closest('[data-profile-id]');if(tag){callbacks.current.onOpenProfile(tag.getAttribute('data-profile-id')!);return true;}return false;}}},onFocus:({editor})=>refresh(editor),onSelectionUpdate:({editor})=>refresh(editor),onBlur:()=>setMenu(null),onUpdate:({editor})=>{const value=editor.getHTML();last.current=value;callbacks.current.onChange(editor.getText({blockSeparator:'\n'}),value);refresh(editor);}},[]);
 choose.current=n=>{const m=menuRef.current;if(!editor||!m)return;editor.chain().focus().insertContentAt({from:m.from,to:m.to},[{type:'text',text:m.sigil+n.title,marks:[{type:'profileTag',attrs:{targetId:n.id,kind:n.kind}}]},{type:'text',text:' '}]).run();setMenu(null);};
 useEffect(()=>{if(editor&&!editor.isDestroyed)editor.view.dispatch(editor.state.tr.setMeta('profile-reparse',true));},[editor,project.nodes.map(n=>n.id+n.title+n.parent).join('|')]);
 useEffect(()=>{if(editor&&!editor.isFocused&&html&&html!==last.current){last.current=html;editor.commands.setContent(sanitize(html),{emitUpdate:false});}},[editor,html]);
 return <div className="profile-notes-input"><EditorContent editor={editor}/>{menu&&<div className="profile-note-suggestions" role="listbox" aria-label="Link a profile">{menu.items.length?menu.items.map((n,index)=><button key={n.id} role="option" aria-selected={index===menu.index} onMouseDown={e=>e.preventDefault()} onClick={()=>choose.current(n)}><span>{menu.sigil}{n.title}</span><small>{n.kind}</small></button>):<small>No matching profiles. Add one under Characters, Locations, or Props first.</small>}</div>}</div>;
}
