'use client';
import { useEffect, useRef, useState } from 'react';
import { Search, ArrowUpRight, FileText, Command } from 'lucide-react';
import { searchNodes, type Project } from '@/lib/desk-model';
export default function StudioCommand({project,onOpen,commands}:{project:Project|null;onOpen:(id:string)=>void;commands:{label:string;detail:string;run:()=>void}[]}){
 const [query,setQuery]=useState(''),[active,setActive]=useState(0),list=useRef<HTMLDivElement>(null);
 const actions=commands.filter(c=>(c.label+' '+c.detail).toLowerCase().includes(query.toLowerCase())).map(c=>({...c,kind:'command'}));
 const docs=project&&query.trim()?searchNodes(project,query).slice(0,20).map(n=>({label:n.title,detail:n.kind,kind:'document',run:()=>onOpen(n.id)})):[];
 const results=[...actions,...docs];
 useEffect(()=>{list.current?.querySelector('[data-active=true]')?.scrollIntoView({block:'nearest'});},[active]);
 return <div className="studio-command"><label><Search size={19}/><input autoFocus aria-label="Search commands and documents" placeholder="A scene, a character, a place…" value={query} onChange={e=>{setQuery(e.target.value);setActive(0);}} onKeyDown={e=>{if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();setActive(a=>Math.max(0,Math.min(results.length-1,a+(e.key==='ArrowDown'?1:-1))));}if(e.key==='Enter'){e.preventDefault();results[active]?.run();}}}/><kbd>ESC</kbd></label><div className="command-results" ref={list}>{results.map((r,i)=><button key={r.kind+r.label+i} data-active={active===i} onMouseEnter={()=>setActive(i)} onClick={r.run}>{r.kind==='document'?<FileText size={17}/>:<Command size={17}/>}<span><strong>{r.label}</strong><small>{r.detail}</small></span><ArrowUpRight size={15}/></button>)}{!results.length&&<p>No results. Try a title or a workspace name.</p>}</div><footer>↑ ↓ Navigate <span>↵ Open</span><span>Esc Close</span></footer></div>;
}
