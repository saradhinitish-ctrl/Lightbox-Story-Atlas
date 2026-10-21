'use client';
import { useRef, useState } from 'react';
import { ImagePlus, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import { type DeskNode, type ProfileImage, uid } from '@/lib/desk-model';
import { safeUrl } from '@/lib/desk-client';
import { readUploadResponse } from '@/lib/asset-upload';
export default function ProfileImages({n,mutate}:{n:DeskNode;mutate?:(fn:(images:ProfileImage[])=>ProfileImage[],removed?:string[])=>void}){
 const input=useRef<HTMLInputElement>(null),[busy,setBusy]=useState(false),[error,setError]=useState('');const images=n.images||[];
 async function upload(files:FileList|File[]|null){
  if(!files?.length||busy||!mutate)return;setBusy(true);setError('');const failures:string[]=[];
  try{for(const file of [...files]){
   if(!file.type.startsWith('image/')){failures.push(file.name+': choose an image.');continue;}
   if(file.size>25*1024*1024){failures.push(file.name+': choose an image smaller than 25 MB.');continue;}
   try{const form=new FormData();form.append('file',file);const asset=await readUploadResponse(await fetch('/api/assets',{method:'POST',body:form}));mutate(images=>[...images,{id:uid(),asset,caption:''}]);}
   catch(e){failures.push(file.name+': '+(e instanceof Error?e.message:'Upload failed.'));}
  }}finally{setBusy(false);setError(failures.join('\n'));if(input.current)input.current.value='';}
 }
 function move(id:string,delta:number){mutate?.(images=>{const at=images.findIndex(i=>i.id===id),next=at+delta;if(at<0||next<0||next>=images.length)return images;const copy=[...images];[copy[at],copy[next]]=[copy[next],copy[at]];return copy;});}
 if(!mutate&&!images.length)return null;
 return <section className={'profile-gallery '+(!mutate?'read-only':'')} aria-label={n.title+' images'} onDragOver={e=>{if(mutate&&e.dataTransfer.types.includes('Files'))e.preventDefault();}} onDrop={e=>{if(mutate&&e.dataTransfer.files.length){e.preventDefault();e.stopPropagation();void upload(e.dataTransfer.files);}}}>
  <div className="profile-gallery-heading"><div><span className="section-label">VISUAL REFERENCES</span>{mutate&&<small>Drop images here. The first image is the card cover.</small>}</div>{mutate&&<button className="button secondary" disabled={busy} onClick={()=>input.current?.click()}><ImagePlus size={14}/>{busy?'Uploading…':'Add images'}</button>}</div>
  {mutate&&<input ref={input} type="file" accept="image/*" multiple hidden aria-label={'Upload images for '+n.title} onChange={e=>void upload(e.target.files)}/>}
  {error&&<div className="tool-error" role="alert">{error}</div>}
  {!images.length&&mutate&&<button className="profile-image-drop" disabled={busy} onClick={()=>input.current?.click()}><ImagePlus size={23}/><span>Add a face, a setting, or an object reference.</span></button>}
  <div className="profile-image-grid">{images.map((image,index)=><figure key={image.id}>
   <a href={safeUrl(image.asset.url)} target="_blank" rel="noreferrer"><img src={safeUrl(image.asset.url)} alt={image.caption||n.title+' reference '+(index+1)}/></a>
   {mutate?<><input aria-label={'Image caption '+(index+1)} value={image.caption} placeholder="Add a caption…" onChange={e=>mutate(images=>images.map(i=>i.id===image.id?{...i,caption:e.target.value}:i))}/><div className="profile-image-actions"><span>{index===0?'COVER':String(index+1).padStart(2,'0')}</span><button title="Move image earlier" disabled={index===0} onClick={()=>move(image.id,-1)}><ChevronLeft size={13}/></button><button title="Move image later" disabled={index===images.length-1} onClick={()=>move(image.id,1)}><ChevronRight size={13}/></button><button className="delete-control" aria-label={'Delete image '+(index+1)} onClick={()=>{if(window.confirm('Remove this image from '+n.title+'?'))mutate(images=>images.filter(i=>i.id!==image.id),[image.asset.id]);}}><Trash2 size={12}/>Delete</button></div></>:image.caption&&<figcaption>{image.caption}</figcaption>}
  </figure>)}</div>
 </section>;
}
