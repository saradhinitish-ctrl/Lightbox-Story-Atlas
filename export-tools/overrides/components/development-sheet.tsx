'use client';
// Story Foundation — "The spark".
// One question at a time, like takes on a slate. Every answer is stored in the
// same `development.*` field it always used, so existing foundations open
// unchanged and the Atlas card still reads `development.premise` / `.logline`.
// React is imported as a namespace so the bundle's shared React bindings keep
// their names (see docs/writing-rooms.md).
import * as LbxReact from 'react';
import { type ReactNode } from 'react';
import { type DeskNode } from '@/lib/desk-model';

type Patch=(id:string,p:Partial<DeskNode>)=>void;

/* ---- Shared writing helpers (also used by planning-sheet.tsx) ------------ */
export const lbxWordCount=(s:string)=>(s.trim().match(/\S+/g)||[]).length;
const fieldSizing=typeof CSS!=='undefined'&&!!CSS.supports?.('field-sizing','content');
/** A borderless textarea that grows with its text. */
export function LbxText({value,onChange,className='',label,placeholder,onKeyDown,inputRef,minRows=2,id}:{value:string;onChange:(v:string)=>void;className?:string;label:string;placeholder?:string;onKeyDown?:(e:LbxReact.KeyboardEvent<HTMLTextAreaElement>)=>void;inputRef?:LbxReact.Ref<HTMLTextAreaElement>|((el:HTMLTextAreaElement|null)=>void);minRows?:number;id?:string}){
 const own=LbxReact.useRef<HTMLTextAreaElement|null>(null);
 LbxReact.useLayoutEffect(()=>{const el=own.current;if(!el||fieldSizing)return;el.style.height='auto';el.style.height=el.scrollHeight+'px';},[value]);
 const setRef=(el:HTMLTextAreaElement|null)=>{own.current=el;if(typeof inputRef==='function')inputRef(el);else if(inputRef)(inputRef as LbxReact.MutableRefObject<HTMLTextAreaElement|null>).current=el;};
 return <textarea id={id} ref={setRef} className={'lbx-text '+className} rows={minRows} aria-label={label} placeholder={placeholder} value={value} spellCheck onChange={e=>onChange(e.target.value)} onKeyDown={onKeyDown}/>;
}
const reduceMotion=()=>typeof matchMedia!=='undefined'&&matchMedia('(prefers-reduced-motion: reduce)').matches;
export const lbxReveal=(el:Element|null)=>{if(el)(el as HTMLElement).scrollIntoView({block:'nearest',behavior:reduceMotion()?'auto':'smooth'});};

/* ---- The eight takes ---------------------------------------------------- */
interface Take{key:string;label:string;short:string;q:string;hint:string;placeholder:string;notes:string[];refs?:string[]}
const TAKES:Take[]=[
 {key:'seed',label:'The seed',short:'Seed',q:'What image won’t leave you alone?',hint:'Not the plot yet. The picture, the overheard line, the feeling that started all of this. Describe it as a single shot.',placeholder:'Describe the first frame you saw.',notes:['Why this image — and why does it belong to you?','What is just outside the frame?','If this were the last shot of the film instead of the first, what would it mean?']},
 {key:'world',label:'The world',short:'World',q:'Where are we, and what counts as normal here?',hint:'The place, the era, the rules everyone obeys without noticing. What would surprise a stranger on their first day?',placeholder:'Set the scene and its unwritten rules.',notes:['What does everyone here believe that isn’t true?','Who holds the power here, and who pays for it?','What does an ordinary morning sound like?']},
 {key:'conflict',label:'The trouble',short:'Trouble',q:'What breaks the ordinary day?',hint:'The arrival, the loss, the discovery, the decision. The moment after which nothing can go back to how it was.',placeholder:'Name the crack in the day.',notes:['Who is hurt first if nobody acts?','Why does it happen now — not a year ago, not a year from now?','What is the worst possible way this could go?']},
 {key:'premise',label:'The premise',short:'Premise',q:'Who wants what, and what stands in the way?',hint:'Put a person inside the trouble. Give them a goal we can watch them chase, and a price if they fail.',placeholder:'Write the premise in a sentence or two.',notes:['Is the goal something a camera can watch them chase?','What does winning cost them — even if they win?','Give the obstacle a face. Who is it?'],refs:['seed','conflict']},
 {key:'theme',label:'Why you',short:'Why you',q:'What are you trying to find out by telling this?',hint:'Not the moral. The question you can’t answer yet — about people, or about yourself. The film is how you’ll go looking for it.',placeholder:'Write the question underneath the story.',notes:['What would you argue if you had to take the other side?','Which character is closest to you — and which one frightens you?','What would you be embarrassed to admit this film is about?']},
 {key:'tone',label:'The feeling',short:'Feeling',q:'How should it feel to sit in the dark with this?',hint:'Genre, pace, texture, temperature. Name the films, songs or photographs it lives beside — and what it must never feel like.',placeholder:'Describe the feeling in the room.',notes:['What should the audience feel in the final ten seconds?','Where should they laugh?','What is the one rule of style you won’t break?']},
 {key:'logline',label:'One breath',short:'Logline',q:'Now say the whole film in one breath.',hint:'One sentence someone could repeat to a friend. Thirty-five words or fewer. You can rewrite it every day.',placeholder:'One sentence. The whole film.',notes:['Cut every adjective. Does it still work?','Is the central question in there?','Read it aloud. Where did you run out of breath?'],refs:['premise']},
 {key:'questions',label:'The unknown',short:'Unknown',q:'What don’t you know yet?',hint:'The open questions, the versions you’re torn between, the facts you still need. Unknowns are where research begins.',placeholder:'List what you still have to find out.',notes:['Which unknown, if you answered it, would change everything else?','What are you putting off deciding?','What do you need to see with your own eyes?']}
];
const ONE_BREATH=35;
const lbsPad=(i:number)=>String(i+1).padStart(2,'0');
// Remember the take per foundation for this session, so returning picks up where you left off.
const lastTake=new Map<string,number>();

export default function DevelopmentSheet({n,patch,children}:{n:DeskNode;patch:Patch;children:ReactNode}){
 const value=(k:string)=>n.fields['development.'+k]||'';
 const answered=TAKES.map(t=>!!value(t.key).trim());
 const done=answered.filter(Boolean).length;
 const firstOpen=answered.indexOf(false);
 const [take,setTake]=LbxReact.useState(()=>lastTake.get(n.id)??(firstOpen<0?0:firstOpen));
 const [view,setView]=LbxReact.useState<'reel'|'sheet'>(()=>done===TAKES.length&&!lastTake.has(n.id)?'sheet':'reel');
 const [dir,setDir]=LbxReact.useState(1);
 const [note,setNote]=LbxReact.useState(0);
 const field=LbxReact.useRef<HTMLTextAreaElement|null>(null);
 const strip=LbxReact.useRef<HTMLDivElement|null>(null),stage=LbxReact.useRef<HTMLElement|null>(null);
 const wantFocus=LbxReact.useRef(false);
 const t=TAKES[take],text=value(t.key),words=lbxWordCount(text);

 LbxReact.useEffect(()=>{lastTake.set(n.id,take);setNote(0);
  // Keep the current frame visible inside the strip (phones scroll it sideways) without moving the page.
  const s=strip.current,f=s?.querySelector('[aria-current="step"]') as HTMLElement|null;
  if(s&&f&&s.scrollWidth>s.clientWidth)s.scrollTo({left:f.offsetLeft-(s.clientWidth-f.offsetWidth)/2,behavior:reduceMotion()?'auto':'smooth'});
  const st=stage.current;if(wantFocus.current&&st&&st.getBoundingClientRect().top<0)st.scrollIntoView({block:'start',behavior:reduceMotion()?'auto':'smooth'});
  if(wantFocus.current&&field.current){wantFocus.current=false;const el=field.current;el.focus({preventScroll:true});el.setSelectionRange(el.value.length,el.value.length);}
 },[take,n.id,view]);

 function go(i:number,focus=true){const next=Math.max(0,Math.min(TAKES.length-1,i));if(next===take&&view==='reel')return;setDir(next>=take?1:-1);wantFocus.current=focus;setView('reel');setTake(next);}
 function write(v:string){patch(n.id,{fields:{...n.fields,['development.'+t.key]:v}});}
 function keys(e:LbxReact.KeyboardEvent<HTMLTextAreaElement>){
  if((e.metaKey||e.ctrlKey)&&e.key==='Enter'){e.preventDefault();if(e.shiftKey)go(take-1);else if(take===TAKES.length-1){setView('sheet');}else go(take+1);}
 }
 function stripKeys(e:LbxReact.KeyboardEvent<HTMLDivElement>){
  if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();
  const i=e.key==='Home'?0:e.key==='End'?TAKES.length-1:take+(e.key==='ArrowRight'?1:-1);
  go(i,false);requestAnimationFrame(()=>(strip.current?.querySelector('[aria-current="step"]') as HTMLElement|null)?.focus());
 }
 // A director's note appears once there is something to push against.
 const showNote=words>=6;
 const breath=t.key==='logline'&&words>0;

 return <div className="lbs" data-view={view}>
  <header className="lbs-head">
   <div className="lbs-titles">
    <div className="lbs-eyebrow"><span className="lbs-dot" aria-hidden="true"/>STORY FOUNDATION <span aria-hidden="true">/</span> THE SPARK</div>
    <h2 className="lbs-title">The spark<span aria-hidden="true">.</span></h2>
    <p className="lbs-lede">Eight questions, one at a time. Answer in any order; the strip fills in as you go.</p>
   </div>
   <div className="lbs-slate" aria-hidden="true">
    <span className="lbs-slate-bar" key={view+take}/>
    <dl><div><dt>ROLL</dt><dd>A</dd></div><div><dt>SC.</dt><dd>{view==='sheet'?'—':lbsPad(take)}</dd></div><div><dt>TK.</dt><dd>01</dd></div></dl>
    <span className="lbs-slate-count">{done}/{TAKES.length} EXPOSED</span>
   </div>
  </header>

  <div className="lbs-bar">
   <div className="lbs-strip" ref={strip} role="toolbar" aria-label="The spark’s eight questions" onKeyDown={stripKeys}>
    {TAKES.map((x,i)=><button key={x.key} type="button" className={'lbs-frame'+(answered[i]?' is-exposed':'')} aria-current={view==='reel'&&i===take?'step':undefined} tabIndex={(view==='reel'?i===take:i===0)?0:-1} onClick={()=>go(i)} title={x.label+(answered[i]?' — written':' — not yet written')}>
     <b>{lbsPad(i)}A</b><span>{x.short}</span><i aria-hidden="true"/>
    </button>)}
   </div>
   <div className="lbs-views" role="group" aria-label="View">
    <button type="button" aria-pressed={view==='reel'} onClick={()=>{wantFocus.current=true;setView('reel');}}>Take by take</button>
    <button type="button" aria-pressed={view==='sheet'} onClick={()=>setView('sheet')}>Contact sheet</button>
   </div>
  </div>

  {view==='reel'?<section className="lbs-stage" ref={stage} aria-label={t.label}>
   <div className="lbs-take" key={t.key} data-dir={dir>0?'next':'prev'}>
    <p className="lbs-slug"><b>SC. {lbsPad(take)}</b><span aria-hidden="true"> — </span>{t.label.toUpperCase()}</p>
    <label className="lbs-q" htmlFor={'lbs-'+n.id}>{t.q}</label>
    <p className="lbs-hint">{t.hint}</p>
    {t.key==='premise'&&<p className="lbs-guide" aria-label="A shape to try: When something happens, someone must do something, or else it costs them.">
     When <i>something happens</i>, a <i>someone</i> must <i>do something</i>, or else <i>it costs them</i>.
    </p>}
    {t.refs&&t.refs.some(k=>value(k).trim())&&<div className="lbs-refs" aria-label="Your earlier answers">
     {t.refs.filter(k=>value(k).trim()).map(k=>{const r=TAKES.find(x=>x.key===k)!;return <button type="button" key={k} className="lbs-ref" onClick={()=>go(TAKES.indexOf(r))}><small>ON THE TABLE · {r.label.toUpperCase()}</small><span>{value(k)}</span></button>;})}
    </div>}
    <div className="lbs-page">
     <LbxText id={'lbs-'+n.id} inputRef={field} className="lbs-answer" label={t.label} placeholder={t.placeholder} value={text} onChange={write} onKeyDown={keys} minRows={3}/>
    </div>
    <div className="lbs-under">
     <span className={'lbs-count'+(breath&&words<=ONE_BREATH?' is-breath':'')+(breath&&words>ONE_BREATH?' is-long':'')} aria-live="polite">
      {words?words+(words===1?' word':' words'):'Not written yet'}
      {breath&&(words<=ONE_BREATH?' · one breath':' · '+(words-ONE_BREATH)+' over one breath')}
     </span>
     {showNote&&<button type="button" className="lbs-another" onClick={()=>setNote(x=>(x+1)%t.notes.length)}>Another note</button>}
    </div>
    <p className={'lbs-note'+(showNote?' is-on':'')} aria-live="polite">{showNote&&<><small>DIRECTOR’S NOTE</small>{t.notes[note]}</>}</p>
   </div>
   <footer className="lbs-nav">
    <button type="button" className="lbs-step" onClick={()=>go(take-1)} disabled={take===0}><span aria-hidden="true">←</span> {take>0?TAKES[take-1].label:'Previous'}</button>
    <span className="lbs-keys" aria-hidden="true"><kbd>⌘</kbd><kbd>↵</kbd> next take</span>
    {take<TAKES.length-1
     ?<button type="button" className="lbs-step is-next" onClick={()=>go(take+1)}>{TAKES[take+1].label} <span aria-hidden="true">→</span></button>
     :<button type="button" className="lbs-step is-next" onClick={()=>setView('sheet')}>See the contact sheet <span aria-hidden="true">→</span></button>}
   </footer>
  </section>
  :<section className="lbs-sheet" aria-label="Contact sheet">
   <p className="lbs-sheet-cap">{done===TAKES.length?'Every frame exposed. Circle the ones you’d print.':done?`${done} of ${TAKES.length} frames exposed. Choose a frame to keep shooting.`:'Nothing exposed yet. Choose any frame to begin.'}</p>
   <ol className="lbs-sheet-grid">
    {TAKES.map((x,i)=><li key={x.key}><button type="button" className={'lbs-print'+(answered[i]?' is-exposed':'')} onClick={()=>go(i)}>
     <span className="lbs-print-head"><b>{lbsPad(i)}A</b>{x.label.toUpperCase()}</span>
     <span className="lbs-print-body">{value(x.key).trim()||x.q}</span>
     <span className="lbs-print-foot">{answered[i]?lbxWordCount(value(x.key))+' words':'Not shot yet'}</span>
    </button></li>)}
   </ol>
  </section>}

  <section className="lbs-margins" aria-label="The margins">
   <div className="lbs-margins-head"><span>THE MARGINS</span><p>Everything that doesn’t fit a question: fragments, scenes you can already see, lines of dialogue.</p></div>
   {children}
  </section>
 </div>;
}
