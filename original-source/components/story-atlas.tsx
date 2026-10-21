'use client';
import { useEffect, useState } from 'react';
import { ArrowUpRight, ArrowRight, Lightbulb, Film, Palette, UserRound, MapPin, Package, BookOpen, Plus, Pencil, ChevronLeft, ChevronRight, Play, Layers, Search } from 'lucide-react';
import { activeNodes, compileNodes, plain, wordCount, type Project } from '@/lib/desk-model';
import { scenesForDraft, type DirectorScene } from '@/lib/director-model';
import { referenceInScene } from '@/lib/visual-language';
import { safeUrl } from '@/lib/desk-client';

export type StageMode = 'atlas' | 'breakdown' | 'pitch' | null;
type Props = {
 project: Project; view: Exclude<StageMode,null>; onRename:(title:string)=>void;
 onFoundation:()=>void; onWrite:()=>void; onMoodboard:(sceneId?:string)=>void; onBeats:()=>void;
 onSection:(role:string)=>void; onOpen:(id:string)=>void; onScene:(id:string,key?:string)=>void;
 onView:(view:StageMode)=>void;
};

function SceneStrip({scenes,onScene}:{scenes:DirectorScene[];onScene:Props['onScene']}){
 return <div className="atlas-scene-strip" aria-label="Scene reel">{scenes.length?scenes.map((scene,i)=><button key={scene.id} onClick={()=>onScene(scene.documentId,scene.key)}><span>{String(i+1).padStart(2,'0')}</span><strong>{scene.meta.title||scene.heading}</strong><small>{scene.words} words<ArrowUpRight size={12}/></small></button>):<p>Your scene reel appears here as you write.</p>}</div>;
}

export default function StoryAtlas(props:Props){
 const {project,onFoundation,onWrite,onMoodboard,onBeats,onSection,onOpen,onScene,onRename,view,onView}=props;
 const nodes=activeNodes(project),foundation=nodes.find(n=>n.fields['development.kind']==='foundation');
 const premise=foundation?.fields['development.premise']?.trim()||'';
 const idea=foundation?.fields['development.logline']?.trim()||premise||project.description;
 const scenes=scenesForDraft(project),draft=compileNodes(project),words=draft.reduce((a,n)=>a+wordCount(n.html),0);
 const firstScene=scenes[0],sceneExcerpt=firstScene?.blocks.filter(block=>block.type==='action'&&block.text.trim()).slice(0,2)||[];
 const images=(project.moodboard||[]).filter(c=>c.asset?.mime.startsWith('image/'));
 const researchRoot=nodes.find(n=>n.role==='research');
 const researchNotes=nodes.filter(n=>n.parent===researchRoot?.id&&n.kind!=='folder').slice(0,2);
 const counts={characters:nodes.filter(n=>n.kind==='character').length,locations:nodes.filter(n=>n.kind==='location').length,props:nodes.filter(n=>n.kind==='prop').length};
 const recent=[...nodes].filter(n=>n.kind!=='folder'&&(plain(n.html).trim()||n.synopsis||Object.values(n.fields).some(v=>v&&v!=='foundation'))).sort((a,b)=>b.updated.localeCompare(a.updated)).slice(0,3);
 const [sceneId,setSceneId]=useState(''),[sceneQuery,setSceneQuery]=useState(''),[slide,setSlide]=useState(0);
 const matched=scenes.filter(s=>(s.heading+' '+(s.meta.title||'')).toLowerCase().includes(sceneQuery.toLowerCase()));
 const selectedScene=matched.find(s=>s.id===sceneId)||matched[0];
 useEffect(()=>{const down=(e:KeyboardEvent)=>{if((e.target as HTMLElement).closest('input,textarea,[contenteditable=true],dialog'))return;if(view==='pitch'&&(e.key==='ArrowRight'||e.key==='ArrowLeft')){e.preventDefault();setSlide(s=>Math.max(0,Math.min(images.length,s+(e.key==='ArrowRight'?1:-1))));}};window.addEventListener('keydown',down);return()=>window.removeEventListener('keydown',down);},[view,images.length]);
 useEffect(()=>{setSlide(0);setSceneId('');},[project.id]);

 if(view==='pitch'){
  const card=images[Math.max(0,slide-1)];
  return <div className="pitch-stage"><div className="pitch-label"><Play size={14}/>DIRECTOR'S PITCH<span>{String(slide+1).padStart(2,'0')} / {String(images.length+1).padStart(2,'0')}</span></div>
   {slide===0?<div className="pitch-title"><span className="atlas-eyebrow">A FILM IN DEVELOPMENT</span><h1>{project.title}</h1><p>{idea||'Add a premise or logline in Story Foundation to introduce your film.'}</p>{project.author&&<small>A film by {project.author}</small>}{!images.length&&<button className="pitch-add-frames" onClick={()=>onMoodboard()}><Palette size={15}/>Add visual frames to this pitch<ArrowUpRight size={14}/></button>}</div>:card&&<figure className="pitch-frame"><img src={safeUrl(card.asset!.url)} alt={card.title}/><figcaption><strong>{card.title}</strong><p>{card.purpose||plain(card.notesHtml||'')||card.text}</p></figcaption></figure>}
   <div className="pitch-controls"><button onClick={()=>onView('atlas')}><Layers size={16}/>Back to atlas</button><span>Arrow keys to navigate</span><button aria-label="Previous pitch slide" disabled={slide===0} onClick={()=>setSlide(s=>s-1)}><ChevronLeft size={20}/></button><button aria-label="Next pitch slide" disabled={slide>=images.length} onClick={()=>setSlide(s=>s+1)}><ChevronRight size={20}/></button></div>
  </div>;
 }

 if(view==='breakdown'){
  const refs=(project.moodboard||[]).filter(c=>referenceInScene(c,selectedScene?.id));
  const linkedIds=new Set([...(selectedScene?.characters||[]),...(selectedScene?.locations||[]),...(selectedScene?.props||[])]);
  const linked=nodes.filter(n=>linkedIds.has(n.id));
  return <div className="breakdown-stage"><header className="stage-heading"><div><span className="atlas-eyebrow">SCRIPT → FRAME</span><h1>Inside the scene.</h1><p>Writing, references, and linked assets in one view.</p></div><button className="button secondary" onClick={onBeats}>Open beat timeline<ArrowUpRight size={15}/></button></header>
   <div className="breakdown-picker"><label><Search size={16}/><input value={sceneQuery} onChange={e=>setSceneQuery(e.target.value)} placeholder="Find a scene…" aria-label="Find a breakdown scene"/></label><select aria-label="Breakdown scene" value={selectedScene?.id||''} onChange={e=>setSceneId(e.target.value)}>{matched.length?matched.map((s,i)=><option key={s.id} value={s.id}>{String(i+1).padStart(2,'0')} · {s.heading}</option>):<option value="">No scenes</option>}</select></div>
   {selectedScene?<div className="breakdown-columns"><section className="breakdown-script"><div className="stage-section-heading"><span>01 / THE PAGE</span><button onClick={()=>onScene(selectedScene.documentId,selectedScene.key)}>Edit scene<ArrowUpRight size={14}/></button></div><h2>{selectedScene.heading}</h2><div>{selectedScene.blocks.map((block,i)=><p className={'breakdown-block type-'+block.type} key={i}>{block.text||'\u00a0'}</p>)}</div></section><section className="breakdown-frames"><div className="stage-section-heading"><span>02 / THE FRAME</span><button onClick={()=>onMoodboard(selectedScene?.id)}>Link references<Plus size={14}/></button></div>{refs.length?refs.map(card=><article className="breakdown-reference" key={card.id}>{card.asset&&<img src={safeUrl(card.asset.url)} alt={card.title}/>}<strong>{card.title}</strong><p>{card.purpose||plain(card.notesHtml||'')||card.text}</p>{card.colors&&<div className="breakdown-swatches">{card.colors.map((color,i)=><span key={i} style={{background:color}} title={color}/>)}</div>}</article>):<div className="stage-empty"><Palette size={26}/><p>No references linked to this scene.</p><button onClick={()=>onMoodboard(selectedScene?.id)}>Open this scene’s visual board<ArrowRight size={14}/></button></div>}<div className="stage-section-heading"><span>03 / LINKED ASSETS</span></div><div className="breakdown-assets">{linked.length?linked.map(n=><button key={n.id} onClick={()=>onOpen(n.id)}>{n.kind==='character'?<UserRound size={14}/>:n.kind==='location'?<MapPin size={14}/>:<Package size={14}/>}<span>{n.title}<small>{n.kind}</small></span><ArrowUpRight size={13}/></button>):<p>Link profiles with @ in your screenplay. Detected character and location matches also appear here; review them before production.</p>}</div></section></div>:<div className="stage-empty"><Film size={34}/><h2>{sceneQuery?'No matching scene.':'Start with a scene.'}</h2><p>{sceneQuery?'Try a different title.':'Write a scene heading to begin your breakdown.'}</p><button className="button primary" onClick={onWrite}>Open screenplay</button></div>}
  </div>;
 }

 return <div className="story-atlas"><header className="atlas-heading"><div><div className="atlas-eyebrow"><span className="live-dot"/>YOUR WORLD / IN DEVELOPMENT</div><label className="atlas-world-name"><input aria-label="World name" value={project.title} onChange={e=>onRename(e.target.value)} onBlur={()=>{if(!project.title.trim())onRename('Untitled world');}} placeholder="Name your world"/><Pencil size={17}/></label><p>{idea||'An idea becomes a world. Make room for yours.'}</p></div><button className="pitch-launch" onClick={()=>onView('pitch')}><Play size={16}/><span>Pitch view</span><ArrowUpRight size={14}/></button></header>
  <div className="atlas-caption"><span><Layers size={14}/>STORY ATLAS</span><small>One world. Every part connected.</small></div>
  <div className="atlas-viewport" aria-label="Story map">
   <div className="atlas-map">
    <div className="atlas-lane lane-one">01 — THE IDEA</div><div className="atlas-lane lane-two">02 — THE STORY</div><div className="atlas-lane lane-three">03 — THE WORLD</div>
    <button className="atlas-node atlas-foundation" onClick={onFoundation}><span className="node-overline"><Lightbulb size={16}/>STORY FOUNDATION<ArrowUpRight size={15}/></span><h2>The spark.</h2><div className="spark-note"><small>YOUR PREMISE</small><p>{premise||'Add your premise in Story Foundation.'}</p></div><span className="node-footer">{premise?'Edit premise':'Write your premise'}<ArrowRight size={15}/></span></button>
    <button className="atlas-node atlas-research" onClick={()=>onSection('research')}><span className="node-overline"><BookOpen size={16}/>THE FIELD NOTES<ArrowUpRight size={15}/></span><div className="research-card-body"><div><h2>Research &<br/>exploration.</h2><small>{researchNotes.length?`${researchNotes.length} notes in view`:'Follow the threads worth keeping.'}</small></div><div className="research-stack" aria-hidden="true"><span>{researchNotes[0]?.title||'A question to follow'}</span><span>{researchNotes[1]?.title||'A detail to remember'}</span></div></div><span className="node-footer">Open research<ArrowRight size={15}/></span></button>
    <button className="atlas-node atlas-script" onClick={onWrite}><span className="node-overline"><Film size={16}/>THE SCREENPLAY<ArrowUpRight size={15}/></span><div className="script-page-preview" aria-hidden="true"><span>FADE IN:</span><strong>{firstScene?.heading||'INT. THE FIRST SCENE — DAY'}</strong><div className="script-page-excerpt">{sceneExcerpt.length?sceneExcerpt.map((block,i)=><p key={i}>{block.text}</p>):<p>{firstScene?'The scene is ready for its first action.':'Your first scene begins here.'}</p>}</div><em>SCENE 01 / {scenes.length||'—'} PLANNED</em></div><h2>Make it a scene.</h2><p>{words.toLocaleString()} words <span>·</span> {scenes.length} {scenes.length===1?'scene':'scenes'}</p><span className="node-footer">Enter writing room<ArrowRight size={15}/></span></button>
    <button className="atlas-node atlas-visual atlas-scene-visual" onClick={()=>onMoodboard()}><span className="node-overline"><Palette size={15}/>VISUAL LANGUAGE<ArrowUpRight size={15}/></span><h2>Scene by scene.</h2><div className="atlas-visual-scenes">{scenes.slice(0,2).map((scene,i)=>{const refs=(project.moodboard||[]).filter(c=>referenceInScene(c,scene.id)),image=refs.find(c=>c.asset?.mime.startsWith('image/'));return <span key={scene.id}>{image?<img src={safeUrl(image.asset!.url)} alt=""/>:<i>{String(i+1).padStart(2,'0')}</i>}<strong>{scene.meta.title||scene.heading}</strong><small>{refs.length} refs</small></span>;})}{!scenes.length&&<p>Build a visual direction for each scene.</p>}</div><span className="atlas-visual-board-footer">{scenes.filter(scene=>(project.moodboard||[]).some(c=>referenceInScene(c,scene.id))).length} / {scenes.length} scene boards started<ArrowRight size={14}/></span></button>
    <div className="atlas-node atlas-world"><span className="node-overline">THE PEOPLE. THE PLACES.</span><div className="world-card-heading"><strong>Build the world.</strong><small>Every person and place leaves a trace.</small></div><div className="world-index">{([['characters','Characters',UserRound],['locations','Locations',MapPin],['props','Objects',Package]] as const).map(([role,label,Icon],i)=><button key={role} onClick={()=>onSection(role)}><span className="world-index-number">0{i+1}</span><Icon size={17}/><strong>{label}</strong><span className="world-index-count">{counts[role]}</span><ArrowUpRight size={14}/></button>)}</div></div>
   </div>
  </div>
  <section className="atlas-reel"><div className="stage-section-heading"><span>SCENE REEL / {String(scenes.length).padStart(2,'0')}</span><button onClick={onBeats}>Shape the sequence<ArrowUpRight size={14}/></button></div><SceneStrip scenes={scenes} onScene={onScene}/></section>
  {recent.length>0&&<div className="atlas-recent"><span>PICK UP A THREAD</span>{recent.map(n=><button key={n.id} onClick={()=>onOpen(n.id)}>{n.title}<ArrowUpRight size={12}/></button>)}</div>}
 </div>;
}
