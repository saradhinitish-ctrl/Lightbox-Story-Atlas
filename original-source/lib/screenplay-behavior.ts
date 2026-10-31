import { type ScriptBlock, type ScriptElement, scriptText } from './screenplay-layout';

// Independent implementation of the documented Fountain / Beat writing rules.
export function isSceneHeading(text:string){return /^(?:(?:INT\.?\/EXT\.?|EXT\.?\/INT\.?|INT\.?|EXT\.?|EST\.?|I\/E\.?)\s|(?:INT\.\/EXT\.|EXT\.\/INT\.|INT\.|EXT\.|EST\.|I\/E\.?)$)/i.test(text.trim());}
export function isCharacterCue(text:string){
 const name=text.trim().replace(/\s*\^\s*$/,'').replace(/\s*\([^)]*\)?\s*$/,'');
 return !!name && name===name.toUpperCase() && /\p{Lu}/u.test(name) && !/[.!?:]$/.test(name) && !text.includes('\n');
}
export function forcedElement(text:string):{element:ScriptElement;text:string}|null {
 if(/^!!\s*\S/.test(text))return {element:'shot',text:text.replace(/^!!\s*/,'')};
 if(text.startsWith('!!'))return null;
 const m=text.match(/^([!@.>])\s*(\S[\s\S]*)$/);if(!m)return null;
 if(m[1]==='.'&&m[2].startsWith('.'))return null;
 return {element:({'!':'action','@':'character','.':'scene','>':'transition'} as const)[m[1] as '!'|'@'|'.'|'>'],text:m[2]};
}
export function detectElement(text:string,current:ScriptElement):ScriptElement {
 if(!text.trim())return current;
 // Dialogue context wins over capitalization: shouted dialogue stays dialogue.
 if(current==='dialogue'||current==='parenthetical')return text.trimStart().startsWith('(')?'parenthetical':'dialogue';
 if(isSceneHeading(text))return 'scene';
 if(/^[^a-z]*TO:$/.test(text.trim())||/^(FADE (?:IN|OUT)\.|FADE TO BLACK\.)$/i.test(text.trim()))return 'transition';
 if(isCharacterCue(text))return 'character';
 return 'action';
}
export function parseFountain(text:string):ScriptBlock[]{
 const lines=text.replace(/\r\n?/g,'\n').split('\n');const result:ScriptBlock[]=[];let dialogue=false;
 let start=0;if(/^(?:Title|Credit|Authors?|Source|Draft date|Contact|Notes):/i.test(lines[0]||'')){while(start<lines.length&&lines[start].trim())start++;}
 for(let i=start;i<lines.length;i++){
  const line=lines[i].trim();if(!line){dialogue=false;continue;}
  const forced=forcedElement(line);let type:ScriptElement;
  if(forced)type=forced.element;
  else if(dialogue)type=line.startsWith('(')?'parenthetical':'dialogue';
  else if(isSceneHeading(line))type='scene';
  else if(/^[^a-z]*TO:$/.test(line)||/^FADE (?:IN|OUT)\.$/.test(line))type='transition';
  else if(isCharacterCue(line)&&!!lines[i+1]?.trim())type='character';
  else type='action';
  const dual=type==='character'&&/\^\s*$/.test(line);const value=(forced?.text||line).replace(type==='character'?/\s*\^\s*$/:/$^/,'');
  result.push({type,text:value,dual,mode:forced?'manual':'auto'});
  dialogue=['character','dialogue','parenthetical'].includes(type);
 }
 return result;
}
export function toFountain(blocks:ScriptBlock[]){
 let result='',previous:ScriptElement|null=null;
 for(const b of blocks){if(!b.text.trim())continue;let text=scriptText(b);
  if(b.type==='action'&&(isCharacterCue(text)||isSceneHeading(text)||/TO:$/.test(text)))text='!'+text;
  if(b.type==='scene'&&!isSceneHeading(text))text='.'+text;
  if(b.type==='character'&&!isCharacterCue(text))text='@'+text;
  if(b.type==='transition'&&!/TO:$/.test(text))text='> '+text;
  if(b.type==='shot')text='!!'+text;
  if(b.type==='character'&&b.dual)text+=' ^';
  const continues=(b.type==='dialogue'||b.type==='parenthetical')&&previous!==null&&['character','dialogue','parenthetical'].includes(previous);
  result+=(result?(continues?'\n':'\n\n'):'')+text;previous=b.type;
 }
 return result+'\n';
}
