import { inTrash, isProfileKind, type Project, type ProfileKind } from './desk-model';
const escapeRegex=(s:string)=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
export function profileSuggestions(project:Project,sigil:string,query:string){
 const key=query.toLocaleLowerCase().replace(/[\s_-]+/g,'');
 return project.nodes.filter(n=>isProfileKind(n.kind)&&(sigil!=='#'||n.kind==='location')&&n.title.trim()&&!n.title.startsWith('Untitled')&&!inTrash(project,n)&&n.title.toLocaleLowerCase().replace(/[\s_-]+/g,'').startsWith(key));
}
export function findProfileMentions(text:string,project:Project){
 const matches:{from:number;to:number;id:string;kind:ProfileKind}[]=[];
 const nodes=profileSuggestions(project,'@','').sort((a,b)=>b.title.length-a.title.length);
 for(const n of nodes)for(const prefix of n.kind==='location'?['@','#']:['@']){
  for(const alias of new Set([n.title,n.title.replace(/\s+/g,'')])){
   const regex=new RegExp('(^|[^\\p{L}\\p{N}_@#])('+escapeRegex(prefix+alias)+')(?=$|[^\\p{L}\\p{N}_])','giu');let match:RegExpExecArray|null;
   while((match=regex.exec(text))){const from=match.index+match[1].length,to=from+match[2].length;if(!matches.some(x=>from<x.to&&to>x.from))matches.push({from,to,id:n.id,kind:n.kind as ProfileKind});}
  }
 }
 return matches.sort((a,b)=>a.from-b.from);
}
