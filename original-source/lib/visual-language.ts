import type { MoodCard } from './director-model';
export const FILM_BOARD = '$film';
export const LIBRARY_BOARD = '$library';
export const UNFILED_BOARD = '$unfiled';
export const VISUAL_CATEGORIES = [
  { id:'atmosphere', label:'Feeling & atmosphere' },
  { id:'light', label:'Light' },
  { id:'colour', label:'Colour & texture' },
  { id:'camera', label:'Camera & rhythm' },
  { id:'space', label:'Space & design' },
  { id:'performance', label:'People & performance' },
  { id:'sound', label:'Sound & silence' },
] as const;
export type VisualCategory = typeof VISUAL_CATEGORIES[number]['id'];
export interface VisualDirection {
  intention?: string; opening?: string; closing?: string;
  light?: string; camera?: string; sound?: string; avoid?: string;
}
export function referenceSceneIds(card:MoodCard):string[] {
  return [...new Set(card.sceneIds ?? (card.sceneId ? [card.sceneId] : []))];
}
export function referenceScope(card:MoodCard):'film'|'scenes'|'unassigned' {
  return card.scope ?? (referenceSceneIds(card).length ? 'scenes' : 'film');
}
export function referenceInScene(card:MoodCard,sceneId?:string) {
  return !!sceneId && referenceScope(card)==='scenes' && referenceSceneIds(card).includes(sceneId);
}
export function referenceCategory(card:MoodCard):VisualCategory {
  return card.category ?? (card.kind==='palette'?'colour':card.kind==='shot'?'camera':card.mediaType==='audio'?'sound':'atmosphere');
}
export function referenceInBoard(card:MoodCard,board:string,activeSceneIds:string[]):boolean {
  if(board===LIBRARY_BOARD)return true;
  if(board===FILM_BOARD)return referenceScope(card)==='film';
  if(board===UNFILED_BOARD)return referenceScope(card)==='unassigned'||(referenceScope(card)==='scenes'&&!referenceSceneIds(card).some(id=>activeSceneIds.includes(id)));
  return referenceInScene(card,board);
}
export function assignReference(card:MoodCard,scope:'film'|'scenes'|'unassigned',ids:string[]=[]):MoodCard {
  const sceneIds=scope==='scenes'?[...new Set(ids)]:[];
  return {...card,scope:scope==='scenes'&&!sceneIds.length?'unassigned':scope,sceneIds,sceneId:sceneIds[0]};
}
export function remapVisualScene(card:MoodCard,from:string,to:string):MoodCard {
  return referenceSceneIds(card).includes(from)?assignReference(card,'scenes',referenceSceneIds(card).map(id=>id===from?to:id)):card;
}
export function externalReferenceUrl(value:string):string {
  try{const url=new URL(value);return ['https:','http:'].includes(url.protocol)?url.href:'';}catch{return '';}
}
export function referenceEmbed(value:string):string {
  const safe=externalReferenceUrl(value);if(!safe)return '';
  const url=new URL(safe),host=url.hostname.replace(/^www\./,'');
  if(host==='youtu.be'||host==='youtube.com'||host==='m.youtube.com'){
    const id=host==='youtu.be'?url.pathname.slice(1):url.searchParams.get('v')||url.pathname.match(/^\/(?:embed|shorts)\/([^/]+)/)?.[1]||'';
    return /^[\w-]{11}$/.test(id)?'https://www.youtube-nocookie.com/embed/'+id:'';
  }
  if(host==='vimeo.com'){const id=url.pathname.match(/^\/(\d+)/)?.[1];return id?'https://player.vimeo.com/video/'+id:'';}
  if(host==='soundcloud.com')return 'https://w.soundcloud.com/player/?url='+encodeURIComponent(safe);
  return '';
}
/** Preserve visual ownership when a recovered project receives new document IDs. */
export function remapVisualDocuments(project:import('./desk-model').Project,documents:Map<string,string>) {
  const remap=(id:string)=>{const slash=id.indexOf('/');return slash<0?id:(documents.get(id.slice(0,slash))||id.slice(0,slash))+id.slice(slash);};
  project.moodboard=project.moodboard?.map(card=>referenceSceneIds(card).length?assignReference(card,'scenes',referenceSceneIds(card).map(remap)):card);
  if(project.visualDirections)project.visualDirections=Object.fromEntries(Object.entries(project.visualDirections).map(([id,brief])=>[id.startsWith('$')?id:remap(id),brief]));
}
