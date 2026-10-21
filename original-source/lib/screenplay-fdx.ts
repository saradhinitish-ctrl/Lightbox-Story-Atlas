import { dualRanges, scriptText, type ScriptBlock } from './screenplay-layout';
import type { ScreenplayExportOptions } from './screenplay-metadata';
import { escape } from './desk-model';
const names:Record<string,string>={scene:'Scene Heading',action:'Action',character:'Character',dialogue:'Dialogue',parenthetical:'Parenthetical',transition:'Transition',shot:'Shot'};
export function toFDX(blocks:ScriptBlock[],options:ScreenplayExportOptions){
 const paragraph=(b:ScriptBlock)=>'<Paragraph Type="'+names[b.type]+'">'+(b.runs?.length?b.runs.map(r=>'<Text'+([r.bold?'Bold':'',r.italic?'Italic':'',r.underline?'Underline':''].filter(Boolean).length?' Style="'+[r.bold?'Bold':'',r.italic?'Italic':'',r.underline?'Underline':''].filter(Boolean).join('+')+'"':'')+'>'+escape(['scene','character','transition','shot'].includes(b.type)?r.text.toUpperCase():r.text)+'</Text>').join(''):'<Text>'+escape(scriptText(b))+'</Text>')+'</Paragraph>';
 const pairs=new Map(dualRanges(blocks).map(r=>[r.start,r]));let body='';for(let i=0;i<blocks.length;i++){const pair=pairs.get(i);if(pair){body+='<Paragraph><DualDialogue>'+blocks.slice(pair.start,pair.end).map(paragraph).join('')+'</DualDialogue></Paragraph>';i=pair.end-1;}else body+=paragraph(blocks[i]);}
 const title=options.titlePage?'<TitlePage><Content>'+[options.title,'',options.author?(options.credit||'Written by'):'',options.author,options.source,'',options.contact,options.draftDate,options.notes].filter(v=>v!==undefined).map(v=>'<Paragraph Type="Action"><Text>'+escape(v||'')+'</Text></Paragraph>').join('')+'</Content></TitlePage>':'';
 return '<?xml version="1.0" encoding="UTF-8"?><FinalDraft DocumentType="Script" Template="No" Version="1"><Content>'+body+'</Content>'+title+'</FinalDraft>';
}
export function fromFDX(text:string):ScriptBlock[]{
 const doc=new DOMParser().parseFromString(text,'application/xml');if(doc.querySelector('parsererror'))throw Error('This Final Draft file is invalid');const content=[...doc.documentElement.children].find(n=>n.tagName==='Content');if(!content)throw Error('No screenplay content found in this Final Draft file');
 const result:ScriptBlock[]=[];for(const p of [...content.children]){
  const pair=p.querySelector('DualDialogue');const paragraphs=pair?[...pair.children]:[p];let characters=0;
  for(const para of paragraphs){const type=(Object.entries(names).find(([,v])=>v===para.getAttribute('Type'))?.[0]||'action') as ScriptBlock['type'];if(type==='character')characters++;
   const runs=[...para.querySelectorAll('Text')].map(t=>{const style=t.getAttribute('Style')||'';return {text:t.textContent||'',bold:style.includes('Bold'),italic:style.includes('Italic'),underline:style.includes('Underline')};});result.push({type,text:runs.map(r=>r.text).join(''),runs,dual:!!pair&&type==='character'&&characters===2,mode:'manual'});
  }
 }return result;
}
