'use client';
import { useEditor, EditorContent, type Editor } from '@tiptap/react';
import { Node, mergeAttributes } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { usePhoneLayout } from '@/lib/use-phone-layout';
import { PaginationPlus } from 'tiptap-pagination-plus';
import Placeholder from '@tiptap/extension-placeholder';
import { useEffect, useRef, useState, useMemo } from 'react';
import { Bold, Italic, Underline, Undo2, Redo2, ChevronDown, Film, X, Check, AlignLeft, FileText, Keyboard, PanelLeft, Columns2, SpellCheck2, MoreHorizontal } from 'lucide-react';
import { type DeskNode, type Project, plain } from '@/lib/desk-model';
import { SCRIPT_ELEMENTS, SCRIPT_NAMES, nextElement, tabElement, isElement, type ScriptElement } from '@/lib/screenplay-layout';
import { DualDialogue, DialogueColumn, toggleDualDialogue, exitDualDialogue } from '@/lib/screenplay-dual';
import { ProfileTag, type ProfileContext } from '@/lib/screenplay-profiles';
import { profileSuggestions } from '@/lib/profile-links';
import { inTrash } from '@/lib/desk-model';
import { detectElement, forcedElement, parseFountain } from '@/lib/screenplay-behavior';
import { normalizeScriptHTML, readScriptHTML } from '@/lib/screenplay-html';

export function forceScriptElement(editor:Editor,element:ScriptElement){return editor.commands.updateAttributes('scriptBlock',{element,mode:'manual'});}
export const ScreenplayParagraph = Node.create({
 name:'scriptBlock',priority:1000,group:'block',content:'inline*',defining:true,
 addAttributes(){return {
  sceneKey:{default:null,keepOnSplit:false,parseHTML:el=>el.getAttribute('data-scene-key'),renderHTML:a=>a.sceneKey?{'data-scene-key':a.sceneKey}:{}},
  dual:{default:false,keepOnSplit:false,parseHTML:el=>el.getAttribute('data-dual')==='true',renderHTML:a=>a.dual?{'data-dual':'true'}:{}},
  element:{default:'action',keepOnSplit:true,parseHTML:el=>isElement(el.getAttribute('data-element'))?el.getAttribute('data-element'):'action',renderHTML:a=>({'data-element':a.element})},
  mode:{default:'auto',keepOnSplit:true,parseHTML:el=>el.getAttribute('data-script-mode')||((el.textContent||'').trim()&&el.getAttribute('data-element')&&el.getAttribute('data-element')!=='action'?'manual':'auto'),renderHTML:a=>({'data-script-mode':a.mode})},
  source:{default:null,keepOnSplit:true,parseHTML:el=>el.getAttribute('data-source'),renderHTML:a=>a.source?{'data-source':a.source}:{}}
 };},
 parseHTML(){return[{tag:'p'},{tag:'div:not([data-rm-pagination]):not([data-dual-dialogue]):not([data-dialogue-column])'},{tag:'h1'},{tag:'h2'},{tag:'h3'}];},
 renderHTML({HTMLAttributes}){return ['p',mergeAttributes(HTMLAttributes,{'class':'script-block'}),0];},
 addKeyboardShortcuts(){
  const set=(element:ScriptElement)=>()=>forceScriptElement(this.editor,element);
  const commands:Record<string,()=>boolean>={
   Tab:()=>{if(this.editor.view.composing)return false;const {$from}=this.editor.state.selection;const t=$from.parent.attrs.element;
    if(!$from.parent.textContent.trim())return forceScriptElement(this.editor,'character');
    if(t==='character')return scriptEnter(this.editor);
    return forceScriptElement(this.editor,t==='dialogue'?'parenthetical':'character');},
   'Shift-Tab':()=>forceScriptElement(this.editor,'action'),
   Enter:()=>scriptEnter(this.editor),
   'Shift-Enter':()=>scriptEnter(this.editor,true),
   Backspace:()=>{const {$from,empty}=this.editor.state.selection;if(empty&&$from.parentOffset===0&&$from.parent.type.name==='scriptBlock'&&!$from.parent.textContent&&$from.parent.attrs.element!=='action')return this.editor.commands.updateAttributes('scriptBlock',{element:'action',mode:'auto'});return false;},
  };SCRIPT_ELEMENTS.forEach((e,i)=>{commands['Alt-'+(i+1)]=set(e);commands['Mod-Alt-'+(i+1)]=set(e);});return commands;
 },
 addProseMirrorPlugins(){return[new Plugin({key:new PluginKey('script-normalization'),props:{handleDOMEvents:{compositionend:()=>{setTimeout(()=>{if(!this.editor.isDestroyed)this.editor.view.dispatch(this.editor.state.tr.setMeta('script-reparse',true));},0);return false;}}},appendTransaction:(transactions,old,state)=>{
  if(this.editor.view.composing||!transactions.some(t=>t.docChanged||t.getMeta('script-reparse'))||transactions.some(t=>t.getMeta('script-normalized')))return null;
  // Only inspect changed paragraphs. Opening or editing a different scene must
  // never reinterpret untouched saved writing elsewhere in the Draft.
  const unchanged=new Set<unknown>();old.doc.descendants(n=>{if(n.type.name==='scriptBlock')unchanged.add(n);});
  let tr=state.tr,changed=false;
  state.doc.descendants((n,pos)=>{
   if(n.type.name!=='scriptBlock'||(unchanged.has(n)&&!(transactions.some(t=>t.getMeta('script-reparse'))&&pos===state.selection.$from.before())))return;
   let element:ScriptElement=n.attrs.element,mode=n.attrs.mode;
   const forced=mode==='auto'&&!n.textContent.trimStart().startsWith('@')?forcedElement(n.textContent):null;
   if(forced){element=forced.element;mode='manual';const count=n.textContent.length-forced.text.length;tr=tr.delete(tr.mapping.map(pos+1),tr.mapping.map(pos+1+count));changed=true;}
   else if(mode==='auto'){const taggedCue=!['dialogue','parenthetical'].includes(element)&&n.firstChild?.marks.some(m=>m.type.name==='profileTag'&&m.attrs.kind==='character')&&n.textContent.startsWith('@')&&/^\s*(\([^)]*\))?\s*$/.test(n.textContent.slice(n.firstChild?.text?.length||0));const otherProfileCue=!['dialogue','parenthetical','scene'].includes(element)&&n.firstChild?.marks.some(m=>m.type.name==='profileTag'&&m.attrs.kind!=='character')&&/^[@#]/.test(n.textContent)&&/^\s*$/.test(n.textContent.slice(n.firstChild?.text?.length||0));element=taggedCue?'character':otherProfileCue?'action':detectElement(n.textContent,element);}
   const sceneKey=element==='scene'&&n.textContent.trim()?(n.attrs.sceneKey||crypto.randomUUID()):n.attrs.sceneKey;if(element!==n.attrs.element||mode!==n.attrs.mode||sceneKey!==n.attrs.sceneKey){tr=tr.setNodeMarkup(tr.mapping.map(pos),undefined,{...n.attrs,element,mode,sceneKey});changed=true;}
   // Automatic character detection never uppercases ordinary typed prose.
   n.descendants((text,offset)=>{if(!text.isText||!text.text)return;let from=pos+1+offset,to=from+text.nodeSize;if(forced){const cut=n.textContent.length-forced.text.length;if(offset<cut){from+=Math.min(cut-offset,text.nodeSize);if(from>=to)return;}}
    const original=text.text.slice(from-(pos+1+offset));const normalized=original.replace(/\t/g,'    ');
    const transformed=(['scene','transition','shot'].includes(element)||(element==='character'&&mode==='manual'))?normalized.toUpperCase():normalized;
    if(original!==transformed){tr=tr.replaceWith(tr.mapping.map(from),tr.mapping.map(to),state.schema.text(transformed,text.marks));changed=true;}
   });
  });
  return changed?tr.setMeta('script-normalized',true):null;
 }})];},
});
export function scriptEnter(editor:Editor,soft=false){
 if(editor.view.composing)return false;
 const {$from,$to}=editor.state.selection;if($from.parent.type.name!=='scriptBlock')return false;
 const inDual=Array.from({length:$from.depth},(_,i)=>$from.node(i+1)).some(n=>n.type.name==='dualDialogue');
 const type:ScriptElement=isElement($from.parent.attrs.element)?$from.parent.attrs.element:'action',empty=!$from.parent.textContent.trim();
 if(inDual&&!soft&&(empty||type==='dialogue')&&$from.parentOffset===$from.parent.content.size)return exitDualDialogue(editor);
 if(empty&&type!=='action'){
  let tr=editor.state.tr;// The preceding block lives one depth up.
  const before=$from.before(),previous=statePrevious(editor,before);
  if(type==='dialogue'&&previous?.node.attrs.element==='character'&&previous.node.attrs.mode==='auto'&&previous.node.attrs.source===$from.parent.attrs.source)tr=tr.setNodeMarkup(previous.pos,undefined,{...previous.node.attrs,element:'action',mode:'manual'});
  tr=tr.setNodeMarkup(before,undefined,{...$from.parent.attrs,element:'action',mode:'auto'});editor.view.dispatch(tr);return true;
 }
 // Close a parenthetical and split in one transaction, keeping undo coherent.
 const chain=editor.chain();
 if(type==='parenthetical'&&$from.parentOffset===$from.parent.content.size&&$to.pos===$from.pos){
  const text=$from.parent.textContent;chain.command(({tr})=>{const from=tr.selection.$from.start(),end=tr.selection.$from.end();if(!text.endsWith(')'))tr.insertText(')',end);if(!text.startsWith('('))tr.insertText('(',from);return true;});
 }
 const middle=$from.parentOffset<$from.parent.content.size;
 const next:ScriptElement=middle?type:soft&&['dialogue','parenthetical'].includes(type)?'dialogue':nextElement(type);
 return chain.splitBlock().updateAttributes('scriptBlock',{element:next,mode:'auto'}).run();
}
function statePrevious(editor:Editor,before:number){const node=editor.state.doc.resolve(before).nodeBefore;return node?{node,pos:before-node.nodeSize}:null;}
export function screenplayExtensions(paginated=true,profiles?:ProfileContext){return [
 StarterKit.configure({paragraph:false,heading:false,blockquote:false,codeBlock:false,bulletList:false,orderedList:false,listItem:false,horizontalRule:false,link:false,trailingNode:false}),ScreenplayParagraph,DualDialogue,DialogueColumn,ProfileTag.configure(profiles||{}),Placeholder.configure({placeholder:({node})=>node.attrs.element==='scene'?'INT. / EXT. LOCATION - DAY / NIGHT':node.attrs.element==='character'?'CHARACTER NAME':node.attrs.element==='dialogue'?'Dialogue…':node.attrs.element==='parenthetical'?'(parenthetical)':'Action…',showOnlyCurrent:true}),
 ...(paginated?[PaginationPlus.configure({pageWidth:816,pageHeight:1056,marginLeft:144,marginRight:96,marginTop:36,contentMarginTop:44,marginBottom:96,contentMarginBottom:0,pageGap:28,pageGapBorderColor:'#e9dfcc',pageBreakBackground:'#e9dfcc',headerLeft:'',headerRight:'{page}.',footerLeft:'',footerRight:'',customHeader:{1:{headerLeft:'',headerRight:'<span style="visibility:hidden">1.</span>'}}})]:[]),
 ];}
export interface ScreenplayEditorProps { n:DeskNode;project:Project;onChange:(html:string)=>void;onActivate:(el:HTMLDivElement,editor:Editor)=>void;onSelection:()=>void;zoom:number;onZoom:(z:number)=>void;dialogueFocus:boolean;fullDraft?:boolean;spellcheck?:boolean;onSpellcheck?:(enabled:boolean)=>void;onOpenProfile?:(id:string)=>void;revealScene?:{key:string;request:number} }
export default function ScreenplayEditor({n,project,onChange,onActivate,onSelection,zoom,onZoom,dialogueFocus,fullDraft=false,spellcheck=false,onSpellcheck,onOpenProfile,revealScene}:ScreenplayEditorProps){
 const phone=usePhoneLayout();
 const callbacks=useRef({onChange,onActivate,onSelection,project,onOpenProfile});callbacks.current={onChange,onActivate,onSelection,project,onOpenProfile};
 const liveEditor=useRef<Editor|null>(null);
 const shell=useRef<HTMLDivElement>(null),lastHTML=useRef(''),dismissed=useRef('');
 const [element,setElement]=useState<ScriptElement>('scene'),[tick,setTick]=useState(0),[fit,setFit]=useState(false),[available,setAvailable]=useState(900),[sceneMenu,setSceneMenu]=useState(false),[shortcuts,setShortcuts]=useState(false),[moreOpen,setMoreOpen]=useState(false),[pageCount,setPageCount]=useState(1);
 const [tagMenu,setTagMenu]=useState<{items:DeskNode[];sigil:string;index:number;from:number;to:number;left:number;top:number}|null>(null);const tagRef=useRef(tagMenu);tagRef.current=tagMenu;const acceptTag=useRef<(item:DeskNode)=>void>(()=>{});
 const [suggestions,setSuggestions]=useState<{items:string[];index:number;left:number;top:number;signature:string}|null>(null);const suggestionRef=useRef(suggestions);suggestionRef.current=suggestions;
 const completeRef=useRef<(value:string,enter:boolean)=>void>(()=>{});
 function refresh(editor:Editor){if(editor.isDestroyed)return;const {$from}=editor.state.selection,type=$from.parent.attrs.element;setElement(isElement(type)?type:'action');setTick(x=>x+1);callbacks.current.onSelection();
  const prefix=$from.parent.textBetween(0,$from.parentOffset,'',''),tag=prefix.match(/(?:^|\s)([@#])([\p{L}\p{N}_-]*)$/u);if(editor.isFocused&&tag&&!editor.view.composing){const sigil=tag[1],items=profileSuggestions(callbacks.current.project,sigil,tag[2]).slice(0,8);if(items.length){try{const c=editor.view.coordsAtPos($from.pos);setTagMenu({items,sigil,index:0,from:$from.pos-tag[1].length-tag[2].length,to:$from.pos,left:Math.max(8,Math.min(window.innerWidth-308,c.left)),top:Math.min(window.innerHeight-260,c.bottom+7)});setSuggestions(null);return;}catch{}}}setTagMenu(null);
  if(!editor.isFocused||editor.view.composing||!['character','scene','transition'].includes(type)){setSuggestions(null);return;}const text=$from.parent.textContent.toUpperCase(),signature=$from.before()+':'+text;if(signature===dismissed.current){setSuggestions(null);return;}
  const pool=new Set<string>();if(type==='character'){editor.state.doc.forEach(b=>{if(b.attrs.element==='character'&&b.textContent.trim())pool.add(b.textContent.replace(/\s*\([^)]*\)\s*$/,'').toUpperCase());});for(const p of callbacks.current.project.nodes){if(p.kind==='character'&&!p.title.startsWith('Untitled'))pool.add(p.title.toUpperCase());if(p.kind==='screenplay')for(const b of readScriptHTML(p.html))if(b.type==='character'&&b.text.trim())pool.add(b.text.replace(/\s*\([^)]*\)\s*$/,'').toUpperCase());}}
  if(type==='scene'){['INT.','EXT.','INT./EXT.'].forEach(x=>pool.add(x));const match=text.match(/^((?:INT\.?\/EXT\.?|INT\.?|EXT\.?)\s+)(.*)$/);for(const p of callbacks.current.project.nodes){if(p.kind==='location'&&!p.title.startsWith('Untitled'))pool.add((match?.[1]||'INT. ')+p.title.toUpperCase());if(p.kind==='screenplay')for(const b of readScriptHTML(p.html))if(b.type==='scene'&&b.text.trim())pool.add(b.text.toUpperCase());}if(text.includes(' - ')){const prefix=text.slice(0,text.lastIndexOf(' - ')+3);['DAY','NIGHT','CONTINUOUS','LATER','MORNING','EVENING'].forEach(x=>pool.add(prefix+x));}}
  if(type==='transition')['CUT TO:','DISSOLVE TO:','FADE OUT.','FADE TO BLACK.','SMASH CUT TO:','MATCH CUT TO:'].forEach(x=>pool.add(x));
  const items=[...pool].filter(x=>x.startsWith(text)&&x!==text).slice(0,6);if(!items.length){setSuggestions(null);return;}try{const coords=editor.view.coordsAtPos(editor.state.selection.from);setSuggestions(prev=>({items,index:prev?.signature===signature?Math.min(prev.index,items.length-1):0,left:Math.max(8,Math.min(window.innerWidth-318,coords.left)),top:Math.min(window.innerHeight-230,coords.bottom+7),signature}));}catch{setSuggestions(null);}
 }
 const editor=useEditor({immediatelyRender:false,shouldRerenderOnTransaction:false,extensions:screenplayExtensions(!phone,{getProject:()=>callbacks.current.project}),content:typeof document!=='undefined'?normalizeScriptHTML(n.html):'',editorProps:{attributes:{class:'screenplay-prosemirror','aria-label':n.title+' screenplay editor',spellcheck:String(spellcheck),autocorrect:spellcheck?'on':'off'},handleKeyDown:(view,event)=>{if(event.key==='Enter'&&(event.metaKey||event.ctrlKey)){const tag=[...view.state.selection.$from.marks(),...(view.state.selection.$from.nodeAfter?.marks||[])].find(m=>m.type.name==='profileTag');if(tag){event.preventDefault();callbacks.current.onOpenProfile?.(tag.attrs.targetId);return true;}}const tags=tagRef.current;if(tags&&!event.isComposing&&!view.composing){if(['ArrowDown','ArrowUp'].includes(event.key)){event.preventDefault();setTagMenu(t=>t?{...t,index:(t.index+(event.key==='ArrowDown'?1:t.items.length-1))%t.items.length}:t);return true;}if(event.key==='Enter'||event.key==='Tab'){event.preventDefault();acceptTag.current(tags.items[tags.index]);return true;}if(event.key==='Escape'){setTagMenu(null);return true;}}const s=suggestionRef.current;if(event.isComposing||view.composing||!s)return false;if(event.key==='ArrowDown'||event.key==='ArrowUp'){event.preventDefault();setSuggestions(x=>x?{...x,index:(x.index+(event.key==='ArrowDown'?1:x.items.length-1))%x.items.length}:x);return true;}if(event.key==='Escape'){dismissed.current=s.signature;setSuggestions(null);return true;}if(event.key==='Enter'||event.key==='Tab'){event.preventDefault();completeRef.current(s.items[s.index],event.key==='Enter');return true;}return false;},handleDOMEvents:{beforeinput:(view,event)=>{const input=event as InputEvent;if(!input.isComposing&&!view.composing&&['insertParagraph','insertLineBreak'].includes(input.inputType)){const current=liveEditor.current;if(!current||current.isDestroyed)return false;input.preventDefault();const tag=tagRef.current,suggestion=suggestionRef.current;if(tag&&input.inputType==='insertParagraph')acceptTag.current(tag.items[tag.index]);else if(suggestion&&input.inputType==='insertParagraph')completeRef.current(suggestion.items[suggestion.index],true);else scriptEnter(current,input.inputType==='insertLineBreak');return true;}return false;},click:(view,event)=>{const el=(event.target as HTMLElement).closest('[data-profile-id]');if(el){callbacks.current.onOpenProfile?.(el.getAttribute('data-profile-id')!);return true;}return false;}},handlePaste:(view,event)=>{if(event.clipboardData?.getData('text/html').includes('data-element'))return false;const text=event.clipboardData?.getData('text/plain')||'';if(!text.includes('\n'))return false;const nodes=parseFountain(text).map(b=>({type:'scriptBlock',attrs:{element:b.type,mode:b.mode,source:view.state.selection.$from.parent.attrs.source},content:[{type:'text',text:b.text}]}));if(nodes.length){editor?.chain().focus().insertContent(nodes).run();return true;}return false;}},onBlur:()=>{setSuggestions(null);setTagMenu(null);},onFocus:({editor})=>{callbacks.current.onActivate(editor.view.dom as HTMLDivElement,editor);refresh(editor);},onSelectionUpdate:({editor})=>refresh(editor),onUpdate:({editor})=>{const html=editor.getHTML();lastHTML.current=html;callbacks.current.onChange(html);refresh(editor);requestAnimationFrame(()=>{if(!editor.isDestroyed)setPageCount(editor.view.dom.querySelectorAll('[data-rm-pagination] > .rm-page-break').length||1);});}},[n.id,phone]);
 liveEditor.current=editor;
 useEffect(()=>{if(editor&&!editor.isDestroyed)editor.view.dispatch(editor.state.tr.setMeta('profile-reparse',true));},[editor,project.nodes.filter(n=>['character','location','prop'].includes(n.kind)).map(n=>n.id+n.title+n.parent).join('|')]);
 acceptTag.current=item=>{const menu=tagRef.current;if(!editor||!menu)return;editor.chain().focus().insertContentAt({from:menu.from,to:menu.to},[{type:'text',text:menu.sigil+item.title,marks:[{type:'profileTag',attrs:{targetId:item.id,kind:item.kind}}]},{type:'text',text:' '}]).run();setTagMenu(null);};
 completeRef.current=(value,enter)=>{if(!editor||editor.isDestroyed)return;const {$from}=editor.state.selection;editor.chain().focus().insertContentAt({from:$from.start(),to:$from.end()},value).run();dismissed.current=$from.before()+':'+value;setSuggestions(null);if(enter)scriptEnter(editor);};
 useEffect(()=>{if(!editor||editor.isDestroyed)return;const current=normalizeScriptHTML(editor.getHTML());if(n.html!==lastHTML.current&&normalizeScriptHTML(n.html)!==current){editor.commands.setContent(normalizeScriptHTML(n.html),{emitUpdate:false});lastHTML.current=editor.getHTML();}},[n.html,editor]);
 useEffect(()=>{if(!editor||editor.isDestroyed)return;const root=editor.view.dom;const count=()=>setPageCount(root.querySelectorAll('[data-rm-pagination] > .rm-page-break').length||1);const observer=new MutationObserver(count);observer.observe(root,{childList:true,subtree:true});count();return()=>observer.disconnect();},[editor]);
 useEffect(()=>{const el=shell.current;if(!el||!editor||editor.isDestroyed)return;const observer=new ResizeObserver(entries=>setAvailable(entries[0].contentRect.width));observer.observe(el);return()=>observer.disconnect();},[editor]);
 useEffect(()=>{if(editor&&!editor.isDestroyed)editor.view.dom.setAttribute('spellcheck',String(spellcheck));},[editor,spellcheck]);
 useEffect(()=>{if(!editor||editor.isDestroyed||!revealScene)return;let at:number|null=null;editor.state.doc.descendants((node,pos)=>{if(node.attrs.sceneKey===revealScene.key&&at===null)at=pos+1;});if(at!==null)editor.chain().focus().setTextSelection(at).scrollIntoView().run();},[editor,revealScene]);
 const scenes=useMemo(()=>{const result:{pos:number;text:string}[]=[];if(editor&&!editor.isDestroyed)editor.state.doc.descendants((node,pos)=>{if(node.attrs.element==='scene'&&node.textContent.trim())result.push({pos,text:node.textContent});});return result;},[editor,tick]);
 const scale=phone?1:fit?Math.min(1.15,Math.max(.25,(available-48)/816)):zoom/100;
 const tool=(label:string,Icon:typeof Bold,run:()=>void,active=false,disabled=false)=><button title={label} aria-label={label} aria-pressed={active} disabled={disabled} className={'script-tool '+(active?'active':'')} onMouseDown={e=>e.preventDefault()} onClick={run}><Icon size={15}/></button>;
 if(!editor||editor.isDestroyed)return <div className="script-loading">Opening screenplay editor…</div>;
 return <div className={'script-editor-shell '+(phone?'phone-script ':'')+(dialogueFocus?'script-dialogue-focus':'')} ref={shell}>
  <div className="screenplay-toolbar writing-tools" role="toolbar" aria-label="Screenplay tools"><div className="screenplay-toolbar-main"><span className="script-element-status" title="Formatting follows your typing"><i/>{SCRIPT_NAMES[element]}<small>{editor.getAttributes('scriptBlock').mode==='manual'?'Manual':'Auto'}</small></span><div className="script-desktop-tools">{tool('Bold',Bold,()=>editor.chain().focus().toggleBold().run(),editor.isActive('bold'))}{tool('Italic',Italic,()=>editor.chain().focus().toggleItalic().run(),editor.isActive('italic'))}{tool('Underline',Underline,()=>editor.chain().focus().toggleUnderline().run(),editor.isActive('underline'))}</div>{tool('Undo',Undo2,()=>editor.chain().focus().undo().run(),false,!editor.can().undo())}<div className="script-more-menu"><button className="script-tool script-more-trigger" aria-label="More screenplay tools" aria-expanded={moreOpen} onMouseDown={e=>e.preventDefault()} onClick={()=>setMoreOpen(v=>!v)}><MoreHorizontal size={18}/></button>{moreOpen&&<div className="script-more-popover" role="menu"><div className="script-mobile-emphasis">{tool('Bold',Bold,()=>editor.chain().focus().toggleBold().run(),editor.isActive('bold'))}{tool('Italic',Italic,()=>editor.chain().focus().toggleItalic().run(),editor.isActive('italic'))}{tool('Underline',Underline,()=>editor.chain().focus().toggleUnderline().run(),editor.isActive('underline'))}</div><button role="menuitem" onMouseDown={e=>e.preventDefault()} onClick={()=>{editor.chain().focus().redo().run();setMoreOpen(false);}} disabled={!editor.can().redo()}><Redo2 size={15}/>Redo</button><button role="menuitem" onMouseDown={e=>e.preventDefault()} onClick={()=>{if(!toggleDualDialogue(editor))setShortcuts(true);refresh(editor);setMoreOpen(false);}}><Columns2 size={15}/>Dual dialogue</button><button role="menuitem" onClick={()=>{onSpellcheck?.(!spellcheck);setMoreOpen(false);}}><SpellCheck2 size={15}/>Spellcheck {spellcheck?'on':'off'}</button><button role="menuitem" onClick={()=>{setSceneMenu(v=>!v);setMoreOpen(false);}}><Film size={15}/>Scene navigator</button><button role="menuitem" onClick={()=>{setShortcuts(v=>!v);setMoreOpen(false);}}><Keyboard size={15}/>Typing guide</button><label className="script-format-exception">Format this paragraph<select aria-label="Paragraph format" value={editor.getAttributes('scriptBlock').mode==='manual'?element:'auto'} onChange={e=>{editor.commands.focus();if(e.target.value==='auto')editor.commands.updateAttributes('scriptBlock',{mode:'auto'});else forceScriptElement(editor,e.target.value as ScriptElement);refresh(editor);setMoreOpen(false);}}><option value="auto">Automatic</option>{SCRIPT_ELEMENTS.map(e=><option value={e} key={e}>{SCRIPT_NAMES[e]}</option>)}</select></label></div>}</div></div>{!phone&&<div className="script-zoom-controls"><small>{pageCount} {pageCount===1?'page':'pages'}</small><select aria-label="Screenplay zoom" value={fit?'fit':String(zoom)} onChange={e=>{if(e.target.value==='fit')setFit(true);else{setFit(false);onZoom(Number(e.target.value));}}}><option value="fit">Fit width</option>{[50,75,90,100,110,125,150].map(z=><option key={z} value={z}>{z}%</option>)}</select></div>}</div>
  {shortcuts&&<div className="script-shortcuts"><span><kbd>INT. / EXT.</kbd>Scene heading</span><span><kbd>NAME</kbd>Uppercase character, then Enter for dialogue</span><span><kbd>Enter twice</kbd>Return to action</span><span><kbd>!text</kbd>Keep uppercase action</span><span><kbd>NAME ^</kbd>Pair with preceding speaker</span><span><kbd>Shift Enter</kbd>Continue dialogue</span><span><kbd>@Name</kbd>Link character / location / prop</span><span><kbd>⌘ / Ctrl Z</kbd>Undo</span><button onClick={()=>setShortcuts(false)} aria-label="Hide shortcuts"><X size={13}/></button></div>}
  {sceneMenu&&<div className="scene-navigator"><div><strong>Scenes</strong><button onClick={()=>setSceneMenu(false)} aria-label="Close scene navigator"><X size={14}/></button></div>{scenes.length?scenes.map((s,i)=><button key={s.pos} onClick={()=>{editor.chain().focus().setTextSelection(s.pos+1).scrollIntoView().run();setSceneMenu(false);}}><span>{String(i+1).padStart(2,'0')}</span>{s.text}</button>):<p>Your scene headings will appear here as you write.</p>}</div>}
  <div className="script-page-scroll"><div className="script-page-zoom" style={{zoom:scale}}><EditorContent editor={editor}/></div></div>
  {tagMenu&&<div className="script-autocomplete" role="listbox" aria-label="Link a profile" style={{left:tagMenu.left,top:tagMenu.top}}>{tagMenu.items.map((item,i)=><button role="option" aria-selected={tagMenu.index===i} className={tagMenu.index===i?'selected':''} key={item.id} onMouseDown={e=>e.preventDefault()} onClick={()=>acceptTag.current(item)}><span>{tagMenu.sigil}{item.title}</span><small>{item.kind}</small></button>)}<small>Enter / Tab to link · click a tag to review its profile</small></div>}
  {suggestions&&<div className="script-autocomplete" role="listbox" aria-label="Screenplay suggestions" style={{left:suggestions.left,top:suggestions.top}}>{suggestions.items.map((value,i)=><button role="option" aria-selected={i===suggestions.index} key={value} className={i===suggestions.index?'selected':''} onMouseDown={e=>e.preventDefault()} onClick={()=>completeRef.current(value,false)}><span>{value}</span>{i===suggestions.index&&<kbd>↵</kbd>}</button>)}<small>↑ ↓ choose · Enter accept · Esc dismiss</small></div>}
 </div>;
}
