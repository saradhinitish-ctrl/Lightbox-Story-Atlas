'use client';
// Beat timeline: the planning table. A reel at the top shows the film's
// running time and the shape of its tension; index cards below hold each
// scene's beat. Styles live in /beat-table.css (class prefix "btl").
import * as ReactBeat from 'react';
import { useState, type CSSProperties, type DragEvent, type KeyboardEvent } from 'react';
import { Plus, Save, RotateCcw, ArrowUpRight, Trash2, GripVertical, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { activeDraftRoot, type Project } from '@/lib/desk-model';
import { timelineScenes, profileNodes, EMOTIONS, type BeatMeta, type DirectorScene } from '@/lib/director-model';
import { filmTiming, formatDuration, formatTimecode, formatEighths, parseDuration, RUNTIME_PLACEHOLDER_MINUTES, type SceneTiming } from '@/lib/scene-runtime';

const BEAT_DRAG_TYPE = 'application/x-beat-scene';
type BeatVars = CSSProperties & Record<`--${string}`, string | number>;
const beatScore = (v: number | undefined) => v ?? 5;
const beatPlural = (n: number, word: string) => n + ' ' + word + (n === 1 ? '' : 's');

/** A smooth line through the points that never overshoots between them. */
function beatCurve(points: [number, number][]) {
 if (!points.length) return '';
 let d = `M${points[0][0].toFixed(1)},${points[0][1].toFixed(1)}`;
 for (let i = 1; i < points.length; i++) { const [x0, y0] = points[i - 1], [x1, y1] = points[i], mx = (x0 + x1) / 2; d += ` C${mx.toFixed(1)},${y0.toFixed(1)} ${mx.toFixed(1)},${y1.toFixed(1)} ${x1.toFixed(1)},${y1.toFixed(1)}`; }
 return d;
}
const beatY = (v: number) => 90 - v * 8; // 0–10 score → SVG y in a 100-high box

function BeatDurationInput({ minutes, label, onCommit }: { minutes?: number; label: string; onCommit: (minutes: number) => void }) {
 const shown = minutes === undefined ? '' : formatTimecode(minutes * 60);
 const [text, setText] = useState(shown);
 ReactBeat.useEffect(() => setText(shown), [shown]);
 function commit() {
  const value = parseDuration(text);
  if (value === null) { setText(shown); return; }
  const next = Math.max(0, Math.min(120, Math.round(value * 60) / 60));
  setText(formatTimecode(next * 60));
  if (next !== minutes) onCommit(next);
 }
 return <input className="btl-rt-input" aria-label={label} title="Type a time such as 0:45, 90s or 2 (minutes)" placeholder={formatTimecode(RUNTIME_PLACEHOLDER_MINUTES * 60)} value={text} onChange={e => setText(e.target.value)} onBlur={commit} onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur(); if (e.key === 'Escape') { setText(shown); e.currentTarget.blur(); } }} />;
}

function BeatRunTime({ timing, minutes, onMinutes }: { timing: SceneTiming; minutes?: number; onMinutes: (m: number) => void }) {
 if (timing.source === 'pages') return <span className="btl-rt" title={`Timed from the page: ${formatDuration(timing.dialogue)} of dialogue, ${formatDuration(timing.action)} of action and headings`}><b>{formatDuration(timing.seconds)}</b><small>{formatEighths(timing.eighths)} pg</small></span>;
 return <span className={'btl-rt is-' + timing.source}><BeatDurationInput minutes={minutes} label="Planned screen time for this unwritten scene" onCommit={onMinutes} /><small>{timing.source === 'manual' ? 'planned' : 'placeholder'}</small></span>;
}

function BeatScoreSlider({ label, name, value, onChange }: { label: string; name: string; value: number; onChange: (v: number) => void }) {
 return <label className="btl-score"><span>{label}</span><input type="range" min="0" max="10" step="1" aria-label={name} value={value} style={{ '--v': value * 10 + '%' } as BeatVars} onChange={e => onChange(Number(e.target.value))} /><b aria-hidden="true">{value}</b></label>;
}

export default function BeatTimeline({ project, onBeat, onOrder, onAdd, onOpen, onDelete, onSave, saving, saveLabel }: { project: Project; onBeat: (id: string, change: Partial<BeatMeta>) => void; onOrder: (ids: string[]) => void; onAdd: () => void; onOpen: (id: string, key?: string) => void; onDelete: (id: string) => void; onSave: () => void; saving: boolean; saveLabel: string }) {
 const [character, setCharacter] = useState(''), [open, setOpen] = useState<Record<string, boolean>>({});
 const rootRef = ReactBeat.useRef<HTMLDivElement>(null), refocus = ReactBeat.useRef(''), reveal = ReactBeat.useRef('');
 const scenes = timelineScenes(project), people = profileNodes(project, 'character'), places = profileNodes(project, 'location'), props = profileNodes(project, 'prop');
 const names = new Map(people.map(p => [p.id, p.title]));
 const timing = filmTiming(scenes), timeOf = new Map(scenes.map((s, i) => [s.id, timing.scenes[i]]));
 const cast = (s: DirectorScene) => new Set([...s.characters, ...(s.meta.characters || [])]);
 const visible = scenes.filter(s => !character || cast(s).has(character));
 const root = activeDraftRoot(project), customOrder = (project.beatOrders?.[root?.id || ''] || []).length > 0;
 const number = (id: string) => String(scenes.findIndex(s => s.id === id) + 1).padStart(2, '0');
 const color = (s: DirectorScene) => EMOTIONS[s.meta.emotion || 'Neutral'] || EMOTIONS.Neutral;

 // The reel: each scene's frame is as wide as its share of the running time,
 // with a floor so a five-second scene is still a frame you can see and click.
 const total = timing.seconds || 1, floor = Math.min(.03, .5 / Math.max(1, scenes.length));
 const raw = timing.scenes.map(t => Math.max(t.seconds / total, floor)), rawSum = raw.reduce((a, b) => a + b, 0) || 1;
 const shares = raw.map(v => v / rawSum), starts = shares.map((_, i) => shares.slice(0, i).reduce((a, b) => a + b, 0));
 const line = (key: 'tension' | 'pressure') => scenes.length === 1 ? beatCurve([[150, beatY(beatScore(scenes[0].meta[key]))], [850, beatY(beatScore(scenes[0].meta[key]))]]) : beatCurve(scenes.map((s, i) => [(starts[i] + shares[i] / 2) * 1000, beatY(beatScore(s.meta[key]))]));

 function move(from: string, to: string) { const ids = scenes.map(s => s.id), start = ids.indexOf(from), end = ids.indexOf(to); if (start < 0 || end < 0 || start === end) return; ids.splice(start, 1); ids.splice(end, 0, from); onOrder(ids); }
 function step(id: string, by: number) { const ids = scenes.map(s => s.id), i = ids.indexOf(id), j = i + by; if (i < 0 || j < 0 || j >= ids.length) return; refocus.current = id; move(id, ids[j]); }
 const find = (id: string, attr = 'data-scene') => rootRef.current?.querySelector<HTMLElement>(`.btl-board [${attr}="${CSS.escape(id)}"]`);
 // Hovering a card lights its frame on the reel, and the reverse.
 function link(id: string) { rootRef.current?.querySelectorAll('.is-linked').forEach(e => e.classList.remove('is-linked')); if (id) rootRef.current?.querySelectorAll(`[data-scene="${CSS.escape(id)}"]`).forEach(e => e.classList.add('is-linked')); }
 function showCard(id: string) {
  const card = find(id);
  if (!card) { reveal.current = id; setCharacter(''); return; }
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  card.scrollIntoView({ behavior: still ? 'auto' : 'smooth', block: 'center' });
  card.classList.remove('is-called'); void card.offsetWidth; card.classList.add('is-called');
  card.querySelector<HTMLElement>('.btl-title')?.focus({ preventScroll: true });
 }
 ReactBeat.useEffect(() => {
  if (refocus.current) { find(refocus.current, 'data-grip')?.focus(); refocus.current = ''; }
  if (reveal.current && find(reveal.current)) { const id = reveal.current; reveal.current = ''; showCard(id); }
 });

 function gripKeys(e: KeyboardEvent, id: string) {
  const by = e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : 0;
  if (by) { e.preventDefault(); step(id, by); }
 }
 function dragOver(e: DragEvent<HTMLElement>) { if (!e.dataTransfer.types.includes(BEAT_DRAG_TYPE)) return; e.preventDefault(); e.dataTransfer.dropEffect = 'move'; e.currentTarget.classList.add('is-drop'); }
 function drop(e: DragEvent<HTMLElement>, id: string) { e.currentTarget.classList.remove('is-drop'); const from = e.dataTransfer.getData(BEAT_DRAG_TYPE); if (from) { e.preventDefault(); move(from, id); } }

 const parts = [timing.written > 0 && formatDuration(timing.written) + ' timed from pages', timing.planned > 0 && formatDuration(timing.planned) + ' planned' + (timing.placeholders ? ` (${beatPlural(timing.placeholders, 'placeholder')})` : '')].filter(Boolean).join(' · ');
 const filtered = character ? names.get(character) || 'this character' : '';

 return <div className="btl" ref={rootRef}>
  <header className="btl-head">
   <div className="btl-head-copy">
    <div className="btl-eyebrow">{project.title}<span aria-hidden="true">/</span>{root?.role === 'draft' ? 'Original draft' : root?.title}</div>
    <h1>Beat timeline</h1>
    <p>Plan each scene before the pages. Headings and linked profiles stay connected to the screenplay.</p>
   </div>
   <div className="btl-save"><small aria-live="polite">{saveLabel}</small><button className="btl-btn" disabled={saving} onClick={onSave}><Save size={14} />{saving ? 'Saving…' : 'Save beats'}</button></div>
  </header>

  <section className="btl-reel" aria-label="The shape of the film">
   <div className="btl-reel-head">
    <div>
     <h2 className="btl-label">The shape of the film</h2>
     <div className="btl-legend" aria-hidden={scenes.length < 1}><span><i className="is-tension" />Story tension</span><span><i className="is-pressure" />Character pressure</span></div>
    </div>
    <div className="btl-runtime">
     <span className="btl-label">Running time</span>
     <strong>{scenes.length ? formatDuration(timing.seconds) : '—'}</strong>
     {parts && <small>{parts}</small>}
    </div>
   </div>
   <div className="btl-strip">
    {scenes.length ? <>
     <div className="btl-frames">{scenes.map((s, i) => { const t = timing.scenes[i], dim = character && !cast(s).has(character); return <button key={s.id} type="button" data-scene={s.id} className={'btl-cell' + (t.source !== 'pages' ? ' is-planned' : '') + (dim ? ' is-dim' : '')} style={{ width: shares[i] * 100 + '%', '--beat': color(s) } as BeatVars} aria-label={`Scene ${number(s.id)}: ${s.meta.title || s.heading}, ${formatDuration(t.seconds)}${t.source === 'pages' ? '' : ' ' + (t.source === 'manual' ? 'planned' : 'placeholder')}, ${s.meta.emotion || 'Neutral'}. Show its card`} title={`${number(s.id)}  ${s.meta.title || s.heading}\n${formatDuration(t.seconds)}${t.source === 'pages' ? '' : ' (' + (t.source === 'manual' ? 'planned' : 'placeholder') + ')'} · ${s.meta.emotion || 'Neutral'} · tension ${beatScore(s.meta.tension)} · pressure ${beatScore(s.meta.pressure)}`} onClick={() => showCard(s.id)} onMouseEnter={() => link(s.id)} onMouseLeave={() => link('')} onFocus={() => link(s.id)} onBlur={() => link('')}>{shares[i] > .045 && <span className="btl-cell-no">{number(s.id)}</span>}{shares[i] > .085 && <span className="btl-cell-time">{formatDuration(t.seconds)}</span>}</button>; })}</div>
     <svg className="btl-arc" viewBox="0 0 1000 100" preserveAspectRatio="none" aria-hidden="true">
      <line x1="0" x2="1000" y1={beatY(10)} y2={beatY(10)} /><line x1="0" x2="1000" y1={beatY(5)} y2={beatY(5)} /><line x1="0" x2="1000" y1={beatY(0)} y2={beatY(0)} />
      <path className="is-pressure" d={line('pressure')} /><path className="is-tension" d={line('tension')} />
     </svg>
     {scenes.length > 1 && <div className="btl-dots" aria-hidden="true">{scenes.map((s, i) => <i key={s.id} className="btl-dot" aria-hidden="true" style={{ left: (starts[i] + shares[i] / 2) * 100 + '%', top: beatY(beatScore(s.meta.tension)) + '%' }} />)}</div>}
    </> : <p className="btl-leader">Plan your opening scene and the film's shape starts here.</p>}
   </div>
   <div className="btl-ruler" aria-hidden="true"><span>0:00</span><span>{scenes.length ? beatPlural(scenes.length, 'scene') : ''}</span><span>{formatTimecode(scenes.length ? timing.seconds : 0)}</span></div>
   <p className="btl-method">Written scenes are timed from their pages: dialogue at speaking pace, action by its length on the page. Scenes without pages use the time you plan on their card.</p>
  </section>

  <section className="btl-board" aria-label="Scene board">
   <div className="btl-board-bar">
    <h2 className="btl-label">Scene board <b>{String(visible.length).padStart(2, '0')}</b></h2>
    <div className="btl-tools">
     {customOrder && <button className="btl-text" onClick={() => onOrder([])}><RotateCcw size={12} />Screenplay order</button>}
     {people.length > 0 && <select className="btl-filter" aria-label="Show scenes with a character" value={character} onChange={e => setCharacter(e.target.value)}><option value="">All characters</option>{people.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}</select>}
     <button className="btl-btn is-ink" onClick={onAdd}><Plus size={14} />Plan a scene</button>
    </div>
   </div>

   {!scenes.length && <button className="btl-ghost" onClick={onAdd}><Plus size={22} strokeWidth={1.25} /><span>Plan the first scene</span></button>}
   {!visible.length && scenes.length > 0 && <p className="btl-empty">No scenes with {filtered} yet. <button className="btl-text" onClick={() => setCharacter('')}>Show all scenes</button></p>}

   <div className="btl-grid" role="list">{visible.map(scene => {
    const id = scene.id, n = number(id), t = timeOf.get(id)!, present = cast(scene), emotion = scene.meta.emotion || 'Neutral', expanded = !!open[id];
    const title = scene.meta.title || scene.heading, who = [...present].map(p => names.get(p)).filter(Boolean);
    const panel = 'btl-details-' + n;
    return <article key={id} role="listitem" data-scene={id} className={'btl-card' + (t.source !== 'pages' ? ' is-planned' : '')} style={{ '--beat': color(scene) } as BeatVars}
     onMouseEnter={() => link(id)} onMouseLeave={() => link('')} onDragOver={dragOver} onDragLeave={e => e.currentTarget.classList.remove('is-drop')} onDrop={e => drop(e, id)}>
     <span className="btl-tape" aria-hidden="true" />
     <header className="btl-card-head">
      <button type="button" className="btl-grip" data-grip={id} draggable aria-label={`Move scene ${n}. Drag, or use the arrow keys`} title="Drag to reorder"
       onDragStart={e => { e.dataTransfer.setData(BEAT_DRAG_TYPE, id); e.dataTransfer.effectAllowed = 'move'; const card = e.currentTarget.closest('article'); if (card) { e.dataTransfer.setDragImage(card, 28, 28); requestAnimationFrame(() => card.classList.add('is-dragging')); } }}
       onDragEnd={e => e.currentTarget.closest('article')?.classList.remove('is-dragging')} onKeyDown={e => gripKeys(e, id)}><GripVertical size={14} /></button>
      <span className="btl-num">{n}</span>
      <span className="btl-slug" title={scene.heading}>{title !== scene.heading ? scene.heading : t.source === 'pages' ? beatPlural(scene.words, 'word') + ' on the page' : 'Not yet written'}</span>
      <button type="button" className="btl-icon" title="Open scene in screenplay" aria-label={'Open scene ' + n + ' in the screenplay'} onClick={() => onOpen(scene.documentId, scene.key)}><ArrowUpRight size={16} /></button>
     </header>
     <input className="btl-title" aria-label={'Beat title for scene ' + n} value={title} onChange={e => onBeat(id, { title: e.target.value })} onFocus={() => link(id)} />
     <textarea className="btl-summary" rows={3} aria-label={'Beat summary for ' + scene.heading} placeholder="What changes in this scene? What turns, breaks, or becomes possible?" value={scene.meta.summary || ''} onChange={e => onBeat(id, { summary: e.target.value })} />
     <div className="btl-emotion" role="radiogroup" aria-label="Emotional beat">
      {Object.entries(EMOTIONS).map(([name, c]) => <button key={name} type="button" role="radio" aria-checked={emotion === name} aria-label={name} title={name} style={{ '--c': c } as BeatVars} onClick={() => onBeat(id, { emotion: name })} />)}
      <span>{emotion}</span>
     </div>
     <div className="btl-scores">
      <BeatScoreSlider label="Tension" name="Story tension" value={beatScore(scene.meta.tension)} onChange={v => onBeat(id, { tension: v })} />
      <BeatScoreSlider label="Pressure" name="Character pressure" value={beatScore(scene.meta.pressure)} onChange={v => onBeat(id, { pressure: v })} />
     </div>
     <footer className="btl-card-foot">
      <BeatRunTime timing={t} minutes={scene.meta.minutes} onMinutes={m => onBeat(id, { minutes: m })} />
      <span className="btl-who" title={who.join(', ')}>{who.join(', ')}</span>
      <button type="button" className="btl-more" aria-expanded={expanded} aria-controls={panel} onClick={() => setOpen(o => ({ ...o, [id]: !o[id] }))}>Details<ChevronDown size={13} /></button>
     </footer>
     {expanded && <div className="btl-details" id={panel}>
      <div className="btl-group"><span className="btl-label">Characters</span><div className="btl-chips">{people.length ? people.map(p => { const scripted = scene.characters.includes(p.id), on = present.has(p.id); return <button key={p.id} type="button" disabled={scripted} aria-pressed={on} className={on ? 'is-on' : ''} title={scripted ? 'Linked in the screenplay' : 'Toggle planned character presence'} onClick={() => { const manual = new Set(scene.meta.characters || []); if (manual.has(p.id)) manual.delete(p.id); else manual.add(p.id); onBeat(id, { characters: [...manual] }); }}>{p.title}{scripted && <small>script</small>}</button>; }) : <small>Add character profiles, then link them here or use @Name in the script.</small>}</div></div>
      {props.length > 0 && <div className="btl-group"><span className="btl-label">Props</span><div className="btl-chips">{props.map(p => { const scripted = scene.props.includes(p.id), on = scripted || (scene.meta.props || []).includes(p.id); return <button key={p.id} type="button" disabled={scripted} aria-pressed={on} className={on ? 'is-on' : ''} title={scripted ? 'Linked in the screenplay' : 'Toggle planned prop presence'} onClick={() => onBeat(id, { props: on ? (scene.meta.props || []).filter(x => x !== p.id) : [...(scene.meta.props || []), p.id] })}>{p.title}{scripted && <small>script</small>}</button>; })}</div></div>}
      <label className="btl-group"><span className="btl-label">Location</span><select className="btl-select" value={scene.meta.location || scene.locations[0] || ''} onChange={e => onBeat(id, { location: e.target.value })}><option value="">Not assigned</option>{places.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}</select></label>
      <div className="btl-detail-actions">
       <button type="button" className="btl-text" disabled={n === '01'} onClick={() => step(id, -1)}><ChevronLeft size={13} />Earlier</button>
       <button type="button" className="btl-text" disabled={Number(n) === scenes.length} onClick={() => step(id, 1)}>Later<ChevronRight size={13} /></button>
       <button type="button" className="btl-text is-danger" aria-label={'Delete beat ' + title} onClick={() => onDelete(id)}><Trash2 size={12} />Delete beat</button>
      </div>
     </div>}
    </article>;
   })}</div>
  </section>
 </div>;
}
