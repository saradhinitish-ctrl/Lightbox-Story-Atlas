import type { VisualDirection } from './visual-language';
import { referenceSceneIds, assignReference, VISUAL_CATEGORIES } from './visual-language';
import type { MoodCard, BeatMeta } from './director-model';
import type { ScreenplayTitlePage } from './screenplay-metadata';
export type NodeKind = 'folder' | 'text' | 'screenplay' | 'character' | 'location' | 'prop' | 'file';
export type ViewMode = 'editor' | 'scrivenings' | 'corkboard' | 'outline' | 'moodboard' | 'beats';
export interface Note { id: string; text: string; quote: string; created: string; resolved?: boolean; type?: 'comment' | 'footnote' }
export interface Bookmark { id: string; title: string; url: string }
export interface Asset { id: string; url: string; name: string; mime: string; size: number }
export type ProfileKind = 'character'|'location'|'prop';
export const isProfileKind=(kind:string):kind is ProfileKind=>['character','location','prop'].includes(kind);
export interface ProfileImage {id:string;asset:Asset;caption:string}
export interface DeskNode {
 id: string; parent: string | null; order: number; title: string; kind: NodeKind; role?: string;
 html: string; synopsis: string; notes: string; label: string; status: string; keywords: string[];
 include: boolean; sectionType: string; target: number; created: string; updated: string;
 fields: Record<string, string>; bookmarks: Bookmark[]; comments: Note[]; asset?: Asset; images?:ProfileImage[];
 x?: number; y?: number; previousParent?: string | null;
}
export interface Collection { id: string; title: string; ids: string[]; query?: string }
export interface Project { id: string; title: string; author: string; description: string; template: string; nodes: DeskNode[]; collections: Collection[]; customFields: string[]; target: number; created: string; updated: string; archived?: boolean; titlePage?:Partial<ScreenplayTitlePage>; activeDraftId?:string; scratch?:string; moodboard?:MoodCard[]; visualDirections?:Record<string,VisualDirection>; sceneBeats?:Record<string,BeatMeta>; beatOrders?:Record<string,string[]> }
export interface Snapshot { id: string; projectId: string; nodeId: string; title: string; html: string; created: string }
export interface Workspace { version: 3; editorVersion?: number; projects: Project[]; snapshots: Snapshot[]; scratch: string; history: Record<string, Record<string, number>>; pendingAssetDeletes?:string[] }
export const now = () => new Date().toISOString();
export const uid = () => crypto.randomUUID();
export const emptyWorkspace = (): Workspace => ({ version: 3, editorVersion: 2, projects: [], snapshots: [], scratch: '', history: {} });
export const escape = (s: string) => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
export function plain(html: string) { return html.replace(/<br\s*\/?\s*>/gi, '\n').replace(/<\/(p|div|h\d|li)>/gi, '\n').replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&'); }
export function wordCount(html: string) { return plain(html).trim().split(/\s+/u).filter(Boolean).length; }
export const paragraphs = (s: string) => s.split(/\r?\n/).map(x => '<p>' + (escape(x) || '<br>') + '</p>').join('');
export function node(title: string, kind: NodeKind, parent: string | null, order = 0, extra: Partial<DeskNode> = {}): DeskNode { return { id: uid(), parent, order, title, kind, html: '', synopsis: '', notes: '', label: 'None', status: 'No status', keywords: [], include: kind === 'screenplay' || kind === 'text', sectionType: 'Scene', target: 0, created: now(), updated: now(), fields: {}, bookmarks: [], comments: [], ...extra }; }
export function createProject(title: string, template = 'screenplay'): Project {
 const draft = node(template === 'novel' ? 'Manuscript' : 'Draft', 'folder', null, 0, { role: 'draft' });
 const research = node('Research', 'folder', null, 3, { role: 'research', include: false });
 const trash = node('Trash', 'folder', null, 4, { role: 'trash', include: false });
 const nodes = [draft, research, trash];
 if (template !== 'blank') {
   nodes.push(node('Characters', 'folder', null, 1, { role: 'characters', include: false }), node('Locations', 'folder', null, 2, { role: 'locations', include: false }));
 }
 nodes.push(node(template === 'screenplay' ? 'Untitled scene' : 'Untitled document', template === 'screenplay' ? 'screenplay' : 'text', draft.id));
 const project:Project={ id: uid(), title, author: '', description: '', template, nodes, collections: [], customFields: [], target: 0, created: now(), updated: now() };ensureDevelopment(project);ensureProps(project);return project;
}
export function ensureDevelopment(p:Project){
 let root=p.nodes.find(n=>n.role==='development'),added=false;const createdRoot=!root;
 if(!root){root=node('Development','folder',null,-1,{role:'development',include:false});p.nodes.push(root);added=true;}
 const foundation=p.nodes.find(n=>n.fields['development.kind']==='foundation'&&!inTrash(p,n));
 if(!foundation){p.nodes.push(node('Story Foundation','text',root.id,0,{include:false,fields:{'development.kind':'foundation'}}));added=true;}
 else if(foundation.kind!=='text'){foundation.kind='text';foundation.include=false;added=true;}
 if(createdRoot)p.nodes.push(node('Free Exploration','text',root.id,1,{include:false}));
 return added;
}
export function ensureProps(p:Project){if(p.nodes.some(n=>n.role==='props'))return false;p.nodes.push(node('Props','folder',null,2.5,{role:'props',include:false}));return true;}
export function startingNode(p:Project,remembered?:string|null){return p.nodes.find(n=>n.id===remembered&&!inTrash(p,n))||p.nodes.find(n=>n.fields['development.kind']==='foundation'&&!inTrash(p,n))||p.nodes.find(n=>n.kind!=='folder'&&!inTrash(p,n))||p.nodes[0];}
export const children = (p: Project, id: string | null) => p.nodes.filter(n => n.parent === id).sort((a, b) => a.order - b.order);
export function descendants(p: Project, id: string): DeskNode[] { const seen = new Set<string>(); const out: DeskNode[] = []; const walk = (parent: string) => { for (const n of children(p, parent)) { if (seen.has(n.id)) continue; seen.add(n.id); out.push(n); walk(n.id); } }; walk(id); return out; }
export function inTrash(p: Project, n: DeskNode): boolean { const seen = new Set<string>(); let current: DeskNode | undefined = n; while (current && !seen.has(current.id)) { if (current.role === 'trash') return true; seen.add(current.id); current = p.nodes.find(x => x.id === current!.parent); } return false; }
export const activeNodes = (p: Project) => p.nodes.filter(n => !inTrash(p, n));
export function containerRole(p: Project, id: string | null): string { const visited = new Set<string>(); let n = p.nodes.find(n => n.id === id); while (n && !visited.has(n.id)) { if (n.role) return n.role; visited.add(n.id); n = p.nodes.find(x => x.id === n!.parent); } return ''; }
export function contextualKind(p: Project, id: string | null): NodeKind { const role = containerRole(p, id); return role === 'characters' ? 'character' : role === 'locations' ? 'location' : role==='props'?'prop': ['draft','draft-version'].includes(role) && p.template === 'screenplay' ? 'screenplay' : 'text'; }
export function creationTarget(p: Project, id: string | null, requested: NodeKind | 'auto'): { kind: NodeKind; parent: string } {
 const context = p.nodes.find(n => n.id === id), folder = context?.kind === 'folder' ? context : p.nodes.find(n => n.id === context?.parent), kind = requested === 'auto' ? contextualKind(p, folder?.id || null) : requested;
 let parent = folder || p.nodes.find(n => n.role === 'draft')!;
 const role = kind === 'screenplay' ? 'draft' : kind === 'character' ? 'characters' : kind === 'location' ? 'locations' : kind==='prop'?'props':'';
 if(role==='draft'&& !['draft','draft-version'].includes(containerRole(p,parent.id)))parent=activeDraftRoot(p)||parent;
 if (role && role!=='draft' && containerRole(p, parent.id) !== role) parent = p.nodes.find(n => n.role === role) || p.nodes.find(n => n.role === 'research')!;
 if (inTrash(p, parent)) parent = p.nodes.find(n => n.role === 'draft')!;
 return { kind, parent: parent.id };
}
export function upgradeDocumentTypes(state: Workspace): boolean {
 let added=false;for(const p of state.projects){const development=ensureDevelopment(p),props=ensureProps(p);added=development||props||added;}
 if ((state.editorVersion || 0) >= 2) return added;
 for (const p of state.projects) for (const n of p.nodes) { if (n.kind !== 'screenplay' && n.kind !== 'text') continue; const role = containerRole(p, n.parent);
  if (role === 'characters' || role === 'locations') { n.kind = role === 'characters' ? 'character' : 'location'; n.include = false; if (/^Untitled (scene|document)$/.test(n.title)) n.title = role === 'characters' ? 'Untitled character' : 'Untitled location'; }
  else if (role === 'research' && n.kind === 'screenplay' && !plain(n.html).trim()) { n.kind = 'text'; n.include = false; if (n.title === 'Untitled scene') n.title = 'Untitled note'; }
 }
 state.editorVersion = 2; return true;
}
export function moveNode(p: Project, id: string, parent: string | null, before?: string): boolean {
 const moving = p.nodes.find(n => n.id === id); if (!moving || moving.role || parent === id || descendants(p, id).some(n => n.id === parent)) return false;
 const target = parent ? p.nodes.find(n => n.id === parent) : null; if (parent && (!target || target.kind !== 'folder')) return false;
 if (before === id) return false;
 moving.parent = parent;
 const peers = children(p, parent).filter(n => n.id !== id), index = before ? peers.findIndex(n => n.id === before) : -1;
 peers.splice(index < 0 ? peers.length : index, 0, moving); peers.forEach((n, i) => n.order = i); moving.updated = now(); return true;
}
export function trashNode(p: Project, id: string): boolean { const n = p.nodes.find(x => x.id === id), bin = p.nodes.find(x => x.role === 'trash'); if (!n || n.role || !bin) return false; n.previousParent = n.parent; return moveNode(p, id, bin.id); }
export function restoreNode(p: Project, id: string): boolean { const n = p.nodes.find(x => x.id === id); if (!n) return false; const prev = p.nodes.find(x => x.id === n.previousParent && !inTrash(p, x)); return moveNode(p, id, prev?.id || p.nodes.find(x => x.role === 'research')!.id); }
export function permanentDelete(w:Workspace,p:Project,requested:string[]){
 const deleting=new Set<string>();for(const id of requested){const n=p.nodes.find(n=>n.id===id);if(!n||n.role||!inTrash(p,n))continue;[n,...descendants(p,id)].forEach(n=>{if(!n.role)deleting.add(n.id);});}
 const removed=p.nodes.filter(n=>deleting.has(n.id)),snapshots=w.snapshots.filter(s=>s.projectId===p.id&&deleting.has(s.nodeId));
 const assets=new Set(removed.flatMap(n=>[...(n.asset?[n.asset.id]:[]),...(n.images||[]).map(i=>i.asset.id)]));for(const html of [...removed.map(n=>n.html),...snapshots.map(s=>s.html)])for(const match of html.matchAll(/\/api\/assets\/([\w-]+)/g))assets.add(match[1]);
 p.nodes=p.nodes.filter(n=>!deleting.has(n.id));p.collections.forEach(c=>c.ids=c.ids.filter(id=>!deleting.has(id)));w.snapshots=w.snapshots.filter(s=>s.projectId!==p.id||!deleting.has(s.nodeId));
 for(const n of p.nodes)n.bookmarks=n.bookmarks.filter(b=>!b.url.startsWith('#document:')||!deleting.has(b.url.slice(10)));
 if(assets.size)w.pendingAssetDeletes=[...new Set([...(w.pendingAssetDeletes||[]),...assets])];return [...deleting];
}
export function draftRootForNode(p:Project,id:string){const seen=new Set<string>();let n=p.nodes.find(n=>n.id===id);while(n&&!seen.has(n.id)){if(n.role==='draft'||n.role==='draft-version')return n;seen.add(n.id);n=p.nodes.find(x=>x.id===n!.parent);}return undefined;}
export function activeDraftRoot(p:Project){return p.nodes.find(n=>n.id===p.activeDraftId&&n.role==='draft-version'&&!inTrash(p,n))||p.nodes.find(n=>n.role==='draft');}
export function draftVersions(p:Project){return p.nodes.filter(n=>(n.role==='draft'||n.role==='draft-version')&&!inTrash(p,n));}
export function compileNodes(p:Project){const root=activeDraftRoot(p);if(!root)return[];return descendants(p,root.id).filter(n=>n.kind!=='folder'&&n.kind!=='file'&&n.include&&!inTrash(p,n)&&!(root.role==='draft'&&containerRole(p,n.parent)==='draft-version'));}
export function createDraftVersion(p:Project,title:string){
 const sourceRoot=activeDraftRoot(p),root=p.nodes.find(n=>n.role==='draft')!,docs=compileNodes(p),version=node(title,'folder',root.id,children(p,root.id).length,{role:'draft-version'});
 const copies=docs.map((n,i)=>({...structuredClone(n),id:uid(),parent:version.id,order:i,fields:{...n.fields,'revision.origin':n.fields['revision.origin']||n.id},created:now(),updated:now()}));
 for(let i=0;i<copies.length;i++)for(const [key,value] of Object.entries(p.sceneBeats||{}))if(key.startsWith(docs[i].id+'/')){p.sceneBeats||={};p.sceneBeats[copies[i].id+key.slice(docs[i].id.length)]=structuredClone(value);}
 const order=p.beatOrders?.[sourceRoot?.id||''];if(order){p.beatOrders||={};p.beatOrders[version.id]=order.map(id=>{const i=docs.findIndex(n=>id.startsWith(n.id+'/'));return i<0?id:copies[i].id+id.slice(docs[i].id.length);});}
 const sceneCopies=new Map<string,string>();
 for(const card of p.moodboard||[])for(const id of referenceSceneIds(card)){const i=docs.findIndex(n=>id.startsWith(n.id+'/'));if(i>=0)sceneCopies.set(id,copies[i].id+id.slice(docs[i].id.length));}
 p.moodboard=p.moodboard?.map(card=>{const ids=referenceSceneIds(card),extra=ids.flatMap(id=>sceneCopies.has(id)?[sceneCopies.get(id)!]:[]);return extra.length?assignReference(card,'scenes',[...ids,...extra]):card;});
 for(const [id,brief] of Object.entries(p.visualDirections||{})){const i=docs.findIndex(n=>id.startsWith(n.id+'/'));if(i>=0){p.visualDirections||={};p.visualDirections[copies[i].id+id.slice(docs[i].id.length)]=structuredClone(brief);}}
 p.nodes.push(version,...(copies.length?copies:[node('Untitled scene','screenplay',version.id)]));p.activeDraftId=version.id;return version;
}
export function searchNodes(p: Project, query: string) { const q = query.trim().toLocaleLowerCase(); return activeNodes(p).filter(n => n.kind !== 'folder' && [n.title, plain(n.html), n.synopsis, n.notes, n.status, n.label, ...n.keywords, ...Object.values(n.fields)].join(' ').toLocaleLowerCase().includes(q)); }
function validDirectorData(p:Project){
 const record=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
 const strings=(v:unknown):v is string[]=>Array.isArray(v)&&v.every(x=>typeof x==='string');
 if(p.moodboard!==undefined){
  if(!Array.isArray(p.moodboard))return false;const ids=new Set<string>();
  for(const c of p.moodboard){
   if(!c||typeof c.id!=='string'||ids.has(c.id)||!['image','note','palette','shot','link'].includes(c.kind)||typeof c.title!=='string'||typeof c.text!=='string')return false;ids.add(c.id);
   if(c.notesHtml!==undefined&&typeof c.notesHtml!=='string')return false;
   if(c.profileIds!==undefined&&!strings(c.profileIds))return false;
   if(c.sceneId!==undefined&&typeof c.sceneId!=='string')return false;
   if(c.sceneIds!==undefined&&!strings(c.sceneIds))return false;
   if(c.scope!==undefined&&!['film','scenes','unassigned'].includes(c.scope))return false;
   if(c.category!==undefined&&!VISUAL_CATEGORIES.some(x=>x.id===c.category))return false;
   if(['purpose','moment','source','url'].some(k=>k in c&&typeof (c as unknown as Record<string,unknown>)[k]!=='string'))return false;
   if(c.mediaType!==undefined&&!['video','audio','web'].includes(c.mediaType))return false;
   if(c.size!==undefined&&!['standard','wide','hero'].includes(c.size))return false;
   if(c.colors!==undefined&&(!strings(c.colors)||c.colors.some(v=>!/^#[0-9a-f]{6}$/i.test(v))))return false;
   if(c.asset!==undefined&&(!c.asset||typeof c.asset.id!=='string'||typeof c.asset.url!=='string'||typeof c.asset.mime!=='string'||typeof c.asset.name!=='string'||typeof c.asset.size!=='number'))return false;
  }
 }
 if(p.visualDirections!==undefined){if(!record(p.visualDirections))return false;for(const brief of Object.values(p.visualDirections)){if(!record(brief)||Object.values(brief).some(v=>typeof v!=='string'))return false;}}
 if(p.sceneBeats!==undefined){
  if(!record(p.sceneBeats))return false;
  for(const beat of Object.values(p.sceneBeats)){
   if(!record(beat))return false;
   if(['title','summary','emotion','location'].some(k=>k in beat&&typeof beat[k]!=='string'))return false;
   if(['tension','pressure','minutes'].some(k=>k in beat&&(typeof beat[k]!=='number'||!Number.isFinite(beat[k]))))return false;
   if(beat.characters!==undefined&&!strings(beat.characters))return false;if(beat.props!==undefined&&!strings(beat.props))return false;
  }
 }
 if(p.beatOrders!==undefined&&(!record(p.beatOrders)||Object.values(p.beatOrders).some(v=>!strings(v))))return false;
 return true;
}
export function validWorkspace(w: unknown): w is Workspace {
 if (!w || typeof w !== 'object') return false; const s = w as Workspace;
 if (s.version !== 3 || !Array.isArray(s.projects) || !Array.isArray(s.snapshots) || typeof s.scratch !== 'string' || !s.history || typeof s.history !== 'object') return false;
 const ids = new Set<string>();
 for (const p of s.projects) { if (typeof p.id !== 'string' || ids.has(p.id) || typeof p.title !== 'string' || !Array.isArray(p.nodes) || !Array.isArray(p.collections) || !Array.isArray(p.customFields)) return false; ids.add(p.id);
 if(!validDirectorData(p))return false;
 const nids = new Set<string>(); for (const n of p.nodes) { if (typeof n.id !== 'string' || nids.has(n.id) || typeof n.html !== 'string' || typeof n.title !== 'string' || !['folder','text','screenplay','character','location','prop','file'].includes(n.kind) || !Array.isArray(n.keywords) || !Array.isArray(n.comments) || !Array.isArray(n.bookmarks) || typeof n.notes !== 'string' || typeof n.synopsis !== 'string') return false; if(n.images!==undefined&&(!Array.isArray(n.images)||n.images.some(i=>!i||typeof i.id!=='string'||typeof i.caption!=='string'||!i.asset||typeof i.asset.id!=='string'||typeof i.asset.url!=='string'||typeof i.asset.mime!=='string'||typeof i.asset.name!=='string'||typeof i.asset.size!=='number')))return false;nids.add(n.id); } for (const n of p.nodes) { if (n.parent !== null && !nids.has(n.parent)) return false; const visited = new Set<string>(); let x: DeskNode | undefined = n; while (x) { if (visited.has(x.id)) return false; visited.add(x.id); x = p.nodes.find(y => y.id === x!.parent); } } }
 return s.snapshots.every(x => typeof x.id === 'string' && typeof x.html === 'string' && typeof x.projectId === 'string' && typeof x.nodeId === 'string');
}
