'use client';
// World Building — characters, locations and objects.
// Each kind has its own questions and its own room: a casting session, a
// location recce, an evidence tag. Answers use the same `profile.*` fields as
// before (plus `secret`, `history` for places, and `moment` for objects), so
// saved profiles and the Linked profile preview read them unchanged.
import * as LbxR from 'react';
import { type ReactNode } from 'react';
import { type DeskNode } from '@/lib/desk-model';
import { LbxText, lbxWordCount } from '@/components/development-sheet';

type Patch=(id:string,p:Partial<DeskNode>)=>void;
interface Q{key:string;tag:string;q:string;placeholder:string;notes:string[]}
interface Act{no:string;title:string;line:string;qs:Q[]}
interface Room{eyebrow:string;untitled:string;namePrompt:string;lede:string;loose:string;acts:Act[]}

const ROOMS:Record<'character'|'location'|'prop',Room>={
 character:{eyebrow:'The casting session',untitled:'Untitled character',namePrompt:'Who is this?',lede:'Nine questions, from the face we see first to the person on the last page. Answer them in any order.',loose:'Scenes they belong in, lines of theirs you’ve overheard, contradictions worth keeping.',acts:[
  {no:'I',title:'The surface',line:'What we notice first.',qs:[
   {key:'role',tag:'The role',q:'Who are they in this story, in a single line?',placeholder:'The one who…',notes:['What would a stranger assume about them in the first five seconds?','Are they driving the story, or being driven by it?']},
   {key:'want',tag:'The want',q:'What do they want so badly they’d embarrass themselves to get it?',placeholder:'Something we can watch them chase.',notes:['And what do they actually need — that they can’t see yet?','What will they do in the first ten pages to get it?']},
   {key:'voice',tag:'The voice',q:'How do they talk when they’re lying?',placeholder:'Rhythm, the words they lean on, what they never say.',notes:['Write one line only they would say.','What do they do with their hands when they’re cornered?']}]},
  {no:'II',title:'The pressure',line:'What pushes back.',qs:[
   {key:'obstacle',tag:'The wall',q:'What stands between them and what they want — outside them, and inside?',placeholder:'The people, the rules, the habits in their way.',notes:['Which is harder for them to beat: the wall outside or the one inside?','Who benefits if they fail?']},
   {key:'relationships',tag:'The orbit',q:'Who can hurt them most, and who would they protect at any cost?',placeholder:'The people who bend their choices.',notes:['Who do they lie to? Who sees through it?','Which relationship changes the most by the end?']},
   {key:'secret',tag:'The secret',q:'What do they know that nobody else does?',placeholder:'The thing they’d never say aloud.',notes:['Who would be most damaged if it came out?','Does the audience learn it before the other characters, or after?']}]},
  {no:'III',title:'The depth',line:'What the story has to earn.',qs:[
   {key:'fear',tag:'The fear',q:'What are they most afraid someone will find out?',placeholder:'The thing they protect at their own expense.',notes:['Where did that fear come from?','Which scene forces them to face it?']},
   {key:'background',tag:'The before',q:'What happened before page one that still runs their life?',placeholder:'The event they haven’t finished living through.',notes:['Who was there when it happened?','What object, place or song still carries it?']},
   {key:'change',tag:'The turn',q:'Who are they on the last page?',placeholder:'The person the story leaves behind.',notes:['What do they lose to become that person?','Where do we first see the change begin?']}]}
 ]},
 location:{eyebrow:'The location recce',untitled:'Untitled location',namePrompt:'Name this place',lede:'Walk in with the camera before anyone else does. Look, listen, then work out what this place does to people.',loose:'Scenes set here, a sketch of the layout, what you noticed on a visit.',acts:[
  {no:'I',title:'The first look',line:'Walk in with the camera.',qs:[
   {key:'context',tag:'Where & when',q:'Where exactly are we, and at what hour do we find it?',placeholder:'The place, the season, the time of day.',notes:['Why this hour and not another?','How far is it from where your characters feel safe?']},
   {key:'appearance',tag:'The wide shot',q:'What does the camera see first?',placeholder:'Scale, light, colour, the shape of the space.',notes:['Now the detail only someone who lives here would notice.','What is broken here, and what has been repaired?']},
   {key:'atmosphere',tag:'Room tone',q:'Close your eyes. What do you hear, smell, and feel on your skin?',placeholder:'Sound, air, temperature, what never stops moving.',notes:['What sound would make someone here look up?','What is the light doing to people’s faces?']}]},
  {no:'II',title:'The story here',line:'What the place does.',qs:[
   {key:'purpose',tag:'What it does to people',q:'How does this place change the people who enter it?',placeholder:'Who belongs, who is watched, who wants to leave.',notes:['Who belongs here, and who is trespassing?','Which scene could only happen here?']},
   {key:'history',tag:'What it remembers',q:'What happened here before the story began?',placeholder:'The history in the walls.',notes:['Who still carries that history?','What trace of it can the camera find?']},
   {key:'continuity',tag:'Over time',q:'How does it change across the story?',placeholder:'Light, season, damage, who is allowed in.',notes:['What does it look like the last time we see it?','What has the story taken from this place?']}]},
  {no:'III',title:'The recce',line:'Getting the shot.',qs:[
   {key:'practical',tag:'On the day',q:'What will the crew need to know?',placeholder:'Access, power, noise, permits, where the camera can stand.',notes:['Where is the sun at the hour you need?','What could you build instead of finding?']},
   {key:'references',tag:'References',q:'Which real places, photographs or films is it drawn from?',placeholder:'Addresses, links, titles, photographers.',notes:['What would you photograph on a scouting trip?','Which reference is closest — and what must be different?']}]}
 ]},
 prop:{eyebrow:'The evidence tag',untitled:'Untitled prop',namePrompt:'Name this object',lede:'Pick it up. Turn it over. Every object on screen is evidence of someone.',loose:'Where it appears, measurements, sketches, things to ask the props team.',acts:[
  {no:'I',title:'The object',line:'Hold it in your hand.',qs:[
   {key:'appearance',tag:'Describe it',q:'What would your hand notice first?',placeholder:'Size, weight, material, wear, markings.',notes:['What is the one detail that makes it this object and no other?','What does it sound like when it’s put down?']},
   {key:'ownership',tag:'Whose it is',q:'Who owns it, who wants it, and who should never touch it?',placeholder:'Owner, keeper, thief.',notes:['Does it change hands? When?','Who would steal it — and why?']},
   {key:'history',tag:'Where it’s been',q:'How did it get here, and what has it survived?',placeholder:'Its life before the story, and what it means to its owner.',notes:['What does it mean to the person who holds it?','What would be lost if it broke?']}]},
  {no:'II',title:'The charge',line:'What it does to the story.',qs:[
   {key:'purpose',tag:'What it changes',q:'What becomes possible — or impossible — because it exists?',placeholder:'Its job in the plot.',notes:['What happens if it disappears halfway through?','Is it a promise, a threat, or a clue?']},
   {key:'moment',tag:'Its moment',q:'Describe the shot where it matters most.',placeholder:'Frame size, light, whose hand, what we hear.',notes:['Where do we see it first, before it matters?','What should the audience notice that the characters don’t?']}]},
  {no:'III',title:'The props table',line:'Keeping it true.',qs:[
   {key:'continuity',tag:'Continuity',q:'Where is it in each scene, and how does its condition change?',placeholder:'Scene by scene: where it is, what state it’s in.',notes:['When is it damaged, and is that on screen?','Who is holding it at the end?']},
   {key:'practical',tag:'Props department',q:'What will the props team need to make it work?',placeholder:'Sourcing, duplicates, handling, safety.',notes:['How many do you need if a take goes wrong?','Does an actor need to use it, or only carry it?']},
   {key:'references',tag:'References',q:'What is it modelled on?',placeholder:'Real objects, museum pieces, photographs, links.',notes:['Where could you see the real thing?','What would make it unmistakably from this world?']}]}
 ]}
};
const lbwPad=(i:number)=>String(i+1).padStart(2,'0');
const lbwLine=(s:string)=>s.trim().split(/\n/)[0].replace(/\s+/g,' ');
// A scene heading's time of day, read from the writer's own words.
const lbwHour=(s:string)=>(s.match(/\b(pre-dawn|dawn|sunrise|morning|noon|midday|afternoon|day|dusk|sunset|twilight|evening|night|midnight|magic hour)\b/i)?.[1]||'day').toUpperCase();

export default function PlanningSheet({n,patch,children,images}:{n:DeskNode;patch:Patch;children:ReactNode;images?:ReactNode}){
 const kind=(n.kind==='character'||n.kind==='location'||n.kind==='prop')?n.kind:'character';
 const room=ROOMS[kind];
 const all=room.acts.flatMap(a=>a.qs);
 const value=(k:string)=>n.fields['profile.'+k]||'';
 const answered=all.filter(q=>value(q.key).trim()).length;
 const [active,setActive]=LbxR.useState('');
 const [notes,setNotes]=LbxR.useState<Record<string,number>>({});
 const fields=LbxR.useRef<Record<string,HTMLTextAreaElement|null>>({});
 const untitled=!n.title.trim()||n.title===room.untitled||/^Untitled (character|location|prop|object|document)$/i.test(n.title);

 function write(k:string,v:string){patch(n.id,{fields:{...n.fields,['profile.'+k]:v}});}
 function jump(k:string){const el=fields.current[k];if(!el)return;const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
  el.closest('.lbw-q')?.scrollIntoView({block:'center',behavior:reduce?'auto':'smooth'});el.focus({preventScroll:true});el.setSelectionRange(el.value.length,el.value.length);}
 function keys(k:string){return (e:LbxR.KeyboardEvent<HTMLTextAreaElement>)=>{if(!((e.metaKey||e.ctrlKey)&&e.key==='Enter'))return;e.preventDefault();const i=all.findIndex(q=>q.key===k);const next=all[i+(e.shiftKey?-1:1)];if(next)jump(next.key);};}

 // The line under the name: how this profile reads at a glance.
 const caption=kind==='character'?(lbwLine(value('role'))||''):kind==='location'?'':(lbwLine(value('ownership'))||'');
 let number=0;
 return <div className={'lbw lbw--'+kind}>
  <header className="lbw-head">
   <div className="lbw-eyebrow"><span className="lbw-dot" aria-hidden="true"/>WORLD BUILDING <span aria-hidden="true">/</span> {room.eyebrow.toUpperCase()}</div>
   <input className="lbw-name" aria-label={kind==='prop'?'Object name':kind==='location'?'Location name':'Character name'} placeholder={room.namePrompt} value={untitled?'':n.title}
    onChange={e=>patch(n.id,{title:e.target.value||room.untitled})} spellCheck={false}/>
   {kind==='location'
    ?<p className="lbw-slug" aria-label="As a scene heading"><small>AS A SCENE HEADING</small><span>INT./EXT. {(untitled?'THIS PLACE':n.title).toUpperCase()} — {lbwHour(value('context'))}</span></p>
    :<p className="lbw-caption"><small>{kind==='character'?'CAST AS':'BELONGS TO'}</small><span className={caption?'':'is-empty'}>{caption||(kind==='character'?'Answer “The role” to cast them.':'Answer “Whose it is” to tag it.')}</span></p>}
   <p className="lbw-lede">{room.lede}</p>
   <div className="lbw-meter" aria-label={answered+' of '+all.length+' questions answered'}>
    <span className="lbw-meter-pips" aria-hidden="true">{all.map(q=><i key={q.key} className={value(q.key).trim()?'is-on':''}/>)}</span>
    <span className="lbw-meter-text">{answered}/{all.length} ANSWERED</span>
   </div>
  </header>

  <div className="lbw-body">
   <aside className="lbw-side">
    <div className="lbw-cover">{images}</div>
    <nav className="lbw-index" aria-label="Questions">
     {room.acts.map(a=><div key={a.no} className="lbw-index-act"><small>ACT {a.no} · {a.title.toUpperCase()}</small>
      <ol>{a.qs.map(q=>{const i=all.indexOf(q);return <li key={q.key}><button type="button" className={(value(q.key).trim()?'is-done ':'')+(active===q.key?'is-active':'')} onClick={()=>jump(q.key)}>
       <b>{lbwPad(i)}</b><span>{q.tag}</span><i aria-hidden="true"/><em className="lbw-sr">{value(q.key).trim()?' — answered':' — not answered'}</em>
      </button></li>;})}</ol>
     </div>)}
     <p className="lbw-keys" aria-hidden="true"><kbd>⌘</kbd><kbd>↵</kbd> next question</p>
    </nav>
   </aside>

   <div className="lbw-main">
    {room.acts.map(a=><section key={a.no} className="lbw-act" aria-label={'Act '+a.no+': '+a.title}>
     <header className="lbw-act-head"><span>ACT {a.no}</span><h3>{a.title}</h3><p>{a.line}</p></header>
     {a.qs.map(q=>{const i=number++;const text=value(q.key),w=lbxWordCount(text),note=notes[q.key]||0,show=w>=6,id='lbw-'+n.id+'-'+q.key;
      return <div key={q.key} className={'lbw-q'+(text.trim()?' is-done':'')+(active===q.key?' is-active':'')} onFocus={()=>setActive(q.key)}>
       <div className="lbw-q-tag"><b>{lbwPad(i)}</b><span>{q.tag.toUpperCase()}</span>{text.trim()&&<i className="lbw-tick" aria-hidden="true"/>}</div>
       <label className="lbw-q-text" htmlFor={id}>{q.q}</label>
       <LbxText id={id} className="lbw-answer" label={q.tag} placeholder={q.placeholder} value={text} minRows={kind==='character'&&q.key==='role'?1:2}
        inputRef={el=>{fields.current[q.key]=el;}} onChange={v=>write(q.key,v)} onKeyDown={keys(q.key)}/>
       <div className="lbw-q-foot">
        <p className={'lbw-note'+(show?' is-on':'')} aria-live="polite">{show&&q.notes[note%q.notes.length]}</p>
        {show&&q.notes.length>1&&<button type="button" className="lbw-another" onClick={()=>setNotes(s=>({...s,[q.key]:note+1}))}>Another note</button>}
       </div>
      </div>;})}
    </section>)}
    <section className="lbw-free" aria-label="Free notes">
     <div className="lbw-free-head"><span>LOOSE PAGES</span><p>{room.loose}</p></div>
     {children}
    </section>
   </div>
  </div>
 </div>;
}

/* ---- Research & Exploration — a page from the field notebook -------------
   The note's own writing stays in `html` (so search, compile and export read it
   as before). The page adds a kind, a source, why it matters, the next
   question and a thread status as `research.*` fields. */
const NOTE_KINDS=[
 {key:'question',label:'Question',title:'What do you need to find out?',body:'Write down what you already suspect, and where you could look.'},
 {key:'fact',label:'Fact',title:'State the fact in one line.',body:'The detail, the number, the date. Note how sure you are.'},
 {key:'quote',label:'Quote',title:'Who said it, and where?',body:'Copy the words exactly. Then who said them, to whom, and when.'},
 {key:'place',label:'Place',title:'Name the place.',body:'What you saw, heard and smelled there. How people moved through it.'},
 {key:'person',label:'Person',title:'Who is this?',body:'Who they are, what they know, how they talk, how to reach them.'},
 {key:'image',label:'Image',title:'Caption the image.',body:'Paste or describe the image. What in it belongs in the film?'},
 {key:'lead',label:'Lead',title:'Where does this lead?',body:'Who or what to follow next, and what you hope to find.'}
] as const;
const NOTE_STATUS=[{key:'open',label:'Open thread'},{key:'followed',label:'Followed up'},{key:'dead',label:'Dead end'}] as const;
const lbnDate=(iso:string)=>{const d=new Date(iso);if(isNaN(+d))return '';return String(d.getDate()).padStart(2,'0')+' '+d.toLocaleString('en-GB',{month:'short'}).toUpperCase()+' '+d.getFullYear()+' · '+String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0');};

export function FieldNoteSheet({n,patch,children}:{n:DeskNode;patch:Patch;children:ReactNode}){
 const get=(k:string)=>n.fields['research.'+k]||'';
 const set=(k:string,v:string)=>patch(n.id,{fields:{...n.fields,['research.'+k]:v}});
 const kind=NOTE_KINDS.find(k=>k.key===get('kind'));
 const status=get('status')||'open';
 const untitled=!n.title.trim()||/^Untitled (note|document|scene)$/i.test(n.title);
 const page=LbxR.useRef<HTMLElement|null>(null);
 const go=(sel:string)=>{const el=page.current?.querySelector(sel) as HTMLElement|null;el?.focus();};
 const enterTo=(sel:string)=>(e:LbxR.KeyboardEvent<HTMLTextAreaElement>)=>{if(e.key==='Enter'&&!e.shiftKey&&!e.nativeEvent.isComposing){e.preventDefault();go(sel);}};
 const nextOnCmd=(sel:string)=>(e:LbxR.KeyboardEvent<HTMLTextAreaElement>)=>{if((e.metaKey||e.ctrlKey)&&e.key==='Enter'){e.preventDefault();go(sel);}};
 const logged=lbnDate(n.created);
 return <div className="lbn" data-kind={kind?.key||'none'} data-status={status}>
  <header className="lbn-head">
   <div className="lbn-eyebrow"><span className="lbn-dot" aria-hidden="true"/>RESEARCH &amp; EXPLORATION <span aria-hidden="true">/</span> FIELD NOTES</div>
   <div className="lbn-log" aria-label={'Note '+(n.order+1)+(logged?', logged '+logged:'')}><b>Nº {String(n.order+1).padStart(2,'0')}</b>{logged&&<span>LOGGED {logged}</span>}</div>
  </header>
  <article className="lbn-page" ref={page}>
   <span className="lbn-holes" aria-hidden="true"/>
   <div className="lbn-kinds" role="group" aria-label="What kind of note is this?">
    {NOTE_KINDS.map(k=><button type="button" key={k.key} aria-pressed={kind?.key===k.key} onClick={()=>set('kind',kind?.key===k.key?'':k.key)}>{k.label}</button>)}
   </div>
   {kind&&<span className="lbn-stamp" key={kind.key} aria-hidden="true">{kind.label}</span>}
   <LbxText className="lbn-title" label="Note title" placeholder={kind?.title||'What did you find?'} value={untitled?'':n.title} minRows={1}
    onChange={v=>patch(n.id,{title:v.replace(/\s*\n\s*/g,' ')||'Untitled note'})} onKeyDown={enterTo('.lbn-source')}/>
   <div className="lbn-source-row"><span aria-hidden="true">SOURCE</span>
    <LbxText className="lbn-source" label="Source" placeholder="Book and page, a link, a conversation, or your own eyes." value={get('source')} minRows={1} onChange={v=>set('source',v.replace(/\s*\n\s*/g,' '))} onKeyDown={enterTo('.lbn-body .rich-editor')}/>
   </div>
   <section className="lbn-body" aria-label="The note">
    <div className="lbn-body-head"><span>THE NOTE</span><p>{kind?.body||'Get it down while it’s fresh: exact words, numbers, what surprised you.'}</p></div>
    {children}
   </section>
   <div className="lbn-q">
    <label htmlFor={'lbn-why-'+n.id}><span>WHY IT MATTERS</span>How could this change a scene, a character, or the ending?</label>
    <LbxText id={'lbn-why-'+n.id} className="lbn-answer lbn-why" label="Why it matters" placeholder="Name the scene or the person it touches." value={get('why')} onChange={v=>set('why',v)} onKeyDown={nextOnCmd('.lbn-next')}/>
   </div>
   <div className="lbn-q">
    <label htmlFor={'lbn-next-'+n.id}><span>THE NEXT QUESTION</span>What does this make you want to find out next?</label>
    <LbxText id={'lbn-next-'+n.id} className="lbn-answer lbn-next" label="The next question" placeholder="Follow the thread one step further." value={get('next')} onChange={v=>set('next',v)}/>
   </div>
   <footer className="lbn-status" role="group" aria-label="Where this thread stands">
    {NOTE_STATUS.map(s=><button type="button" key={s.key} data-status={s.key} aria-pressed={status===s.key} onClick={()=>set('status',s.key)}><i aria-hidden="true"/>{s.label}</button>)}
   </footer>
  </article>
 </div>;
}
