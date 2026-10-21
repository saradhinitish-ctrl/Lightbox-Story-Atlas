/** One fixed Letter / Courier 12 profile shared by script export and layout checks. */
export type ScriptElement = 'scene' | 'action' | 'character' | 'dialogue' | 'parenthetical' | 'transition' | 'shot';
export interface ScriptRun { text: string; bold?: boolean; italic?: boolean; underline?: boolean; profileId?:string; profileKind?:'character'|'location'|'prop' }
export interface ScriptBlock { type: ScriptElement; text: string; runs?: ScriptRun[]; source?: string; mode?: 'auto' | 'manual'; dual?: boolean; sceneKey?:string }
export interface ScriptLine { type: ScriptElement; text: string; line: number; start: number; end: number; block: number; generated?: boolean; x?:number; dual?: 'left' | 'right' }
export interface ScriptPage { lines: ScriptLine[] }
export const SCRIPT_PROFILE = { width: 612, height: 792, fontSize: 12, lineHeight: 12, left: 108, right: 72, top: 72, bottom: 72, lines: 54 } as const;
export const SCRIPT_ELEMENTS: ScriptElement[] = ['scene','action','character','dialogue','parenthetical','transition','shot'];
export const SCRIPT_NAMES: Record<ScriptElement,string> = { scene:'Scene heading',action:'Action',character:'Character',dialogue:'Dialogue',parenthetical:'Parenthetical',transition:'Transition',shot:'Shot' };
export const COLUMN_CHARS: Record<ScriptElement,number> = { scene:60, action:60, character:38, dialogue:35, parenthetical:25, transition:60, shot:60 };
export const COLUMN_LEFT: Record<ScriptElement,number> = { scene:108, action:108, character:266.4, dialogue:180, parenthetical:223.2, transition:108, shot:108 };
export const isElement = (s:unknown):s is ScriptElement => SCRIPT_ELEMENTS.includes(s as ScriptElement);
export function scriptText(block:ScriptBlock) { let s=(block.type==='character'?block.text.replace(/\s*\^\s*$/,''):block.text).replace(/\r\n/g,'\n').replace(/\t/g,'    '); if(['scene','character','transition','shot'].includes(block.type))s=s.toUpperCase();if(block.type==='parenthetical'&&s.trim()){s=s.trim();if(!s.startsWith('('))s='('+s;if(!s.endsWith(')'))s+=')';}return s; }
export function nextElement(type:ScriptElement,empty=false):ScriptElement { if(empty)return 'action';return ({scene:'action',action:'action',character:'dialogue',dialogue:'action',parenthetical:'dialogue',transition:'scene',shot:'action'} as const)[type]; }
export function tabElement(type:ScriptElement,back=false):ScriptElement { if(back)return SCRIPT_ELEMENTS[(SCRIPT_ELEMENTS.indexOf(type)+SCRIPT_ELEMENTS.length-1)%SCRIPT_ELEMENTS.length];return ({scene:'action',action:'character',character:'parenthetical',dialogue:'parenthetical',parenthetical:'dialogue',transition:'scene',shot:'action'} as const)[type]; }
export function wrapScript(text:string,width:number):{text:string;start:number;end:number}[] {
 const result:{text:string;start:number;end:number}[]=[]; let sourceOffset=0;
 for(const logical of text.split('\n')) {const points=Array.from(logical);let at=0;const offsets=[0];for(const c of points)offsets.push(offsets.at(-1)!+c.length);
  if(!points.length)result.push({text:'',start:sourceOffset,end:sourceOffset});
  while(at<points.length){let end=Math.min(at+width,points.length);if(end<points.length){let space=end;while(space>at&&!/\s/.test(points[space]))space--;if(space>at)end=space;}
   const value=points.slice(at,end).join('').replace(/[ \t]+$/,'');result.push({text:value,start:sourceOffset+offsets[at],end:sourceOffset+offsets[at]+value.length});at=end;while(at<points.length&&points[at]===' ')at++;
  } sourceOffset+=logical.length+1;
 }return result;
}
export interface DualRange { start:number; middle:number; end:number }
export function dualRanges(blocks:Pick<ScriptBlock,'type'|'text'|'dual'>[]):DualRange[]{
 const ranges:DualRange[]=[];let used=-1;
 for(let middle=0;middle<blocks.length;middle++){
  const b=blocks[middle];if(b.type!=='character'||!(b.dual||/\^\s*$/.test(b.text)))continue;
  let previous=middle-1;while(previous>=0&&!blocks[previous].text.trim())previous--;
  while(previous>=0&&['dialogue','parenthetical'].includes(blocks[previous].type))previous--;
  if(previous<0||previous<=used||blocks[previous].type!=='character')continue;
  let end=middle+1;while(end<blocks.length&&['dialogue','parenthetical'].includes(blocks[end].type))end++;
  ranges.push({start:previous,middle,end});used=end-1;
 }
 return ranges;
}
export function paginateScript(input:ScriptBlock[]):ScriptPage[] {
 const blocks=input.map(b=>({...b,text:scriptText(b)}));while(blocks.length>1&&!blocks.at(-1)!.text.trim())blocks.pop();
 const pairs=new Map(dualRanges(input).map(r=>[r.start,r]));
 const pages:ScriptPage[]=[{lines:[]}];let row=0,speaker='';
 const newPage=()=>{if(pages.at(-1)!.lines.length){pages.push({lines:[]});row=0;}};
 const add=(line:Omit<ScriptLine,'line'>)=>{pages.at(-1)!.lines.push({...line,line:row++});};
 for(let i=0;i<blocks.length;i++){
  const pair=pairs.get(i);
  if(pair){
   type Item=Omit<ScriptLine,'line'>;
   const column=(start:number,end:number,side:'left'|'right'):Item[]=>{const out:Item[]=[];for(let j=start;j<end;j++){const b=blocks[j];if(!b.text.trim())continue;const x=(side==='left'?108:342)+(b.type==='character'?36:b.type==='parenthetical'?18:0);const width=b.type==='character'?22:b.type==='parenthetical'?22:27;for(const l of wrapScript(b.text,width))out.push({...l,type:b.type,block:j,x,dual:side});}return out;};
   const left=column(pair.start,pair.middle,'left'),right=column(pair.middle,pair.end,'right');let li=0,ri=0;
   if(row&&54-row<5)newPage();else if(row)row++;
   while(li<left.length||ri<right.length){
    if(54-row<4)newPage();
    const available=54-row;
    const segment=(items:Item[],at:number,side:'left'|'right',cue:number):{items:Item[];next:number}=>{
     if(at>=items.length)return {items:[],next:at};const out:Item[]=[];
     if(at>0){const text=blocks[cue].text.replace(/\s*\(CONT['’]D\)$/i,'')+" (CONT'D)";for(const l of wrapScript(text,22))out.push({...l,type:'character',block:cue,x:(side==='left'?144:378),dual:side,generated:true});}
     const room=Math.max(1,available-out.length);const continues=items.length-at>room;const take=Math.min(items.length-at,Math.max(1,room-(continues?1:0)));
     out.push(...items.slice(at,at+take));if(continues)out.push({type:'parenthetical',text:'(MORE)',block:cue,start:0,end:0,x:(side==='left'?126:360),dual:side,generated:true});return {items:out,next:at+take};
    };
    const l=segment(left,li,'left',pair.start),r=segment(right,ri,'right',pair.middle);
    l.items.forEach((item,j)=>pages.at(-1)!.lines.push({...item,line:row+j}));r.items.forEach((item,j)=>pages.at(-1)!.lines.push({...item,line:row+j}));
    row+=Math.max(l.items.length,r.items.length);li=l.next;ri=r.next;if(li<left.length||ri<right.length)newPage();
   }
   i=pair.end-1;speaker='';continue;
  }
  const b=blocks[i],lines=wrapScript(b.text,COLUMN_CHARS[b.type]);if(b.type==='character')speaker=b.text;
  let gap=row>0&&b.type!=='dialogue'&&b.type!=='parenthetical'?1:0;
  let minimum=1;if(b.type==='scene'||b.type==='shot')minimum=lines.length+Math.min(2,blocks[i+1]?wrapScript(blocks[i+1].text,COLUMN_CHARS[blocks[i+1].type]).length:0);
  if(b.type==='character'){minimum=lines.length;let j=i+1;if(blocks[j]?.type==='parenthetical'){minimum+=wrapScript(blocks[j].text,25).length;j++;}if(blocks[j]?.type==='dialogue')minimum+=Math.min(3,wrapScript(blocks[j].text,35).length);}
  if(row+gap+Math.min(minimum,54)>54){newPage();gap=0;}row+=gap;
  let at=0;while(at<lines.length){if(row>=54)newPage();let available=54-row,remaining=lines.length-at;
   if(b.type==='dialogue'&&remaining>available&&speaker){if(available<3){newPage();available=54;if(remaining<=available){for(;at<lines.length;at++)add({...lines[at],type:b.type,block:i});continue;}}const take=Math.max(1,available-1);for(let k=0;k<take&&at<lines.length;k++,at++)add({...lines[at],type:b.type,block:i});add({text:'(MORE)',type:'parenthetical',block:i,start:0,end:0,generated:true});newPage();const cue=speaker.replace(/\s*\(CONT['’]D\)$/i,'')+" (CONT'D)";for(const l of wrapScript(cue,38))add({...l,type:'character',block:i,generated:true});}
   else {const take=Math.min(available,remaining);for(let k=0;k<take;k++,at++)add({...lines[at],type:b.type,block:i});if(at<lines.length)newPage();}
  }
 }
 return pages;
}
