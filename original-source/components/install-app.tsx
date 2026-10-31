'use client';
import { useEffect, useState, useRef } from 'react';
import { Download, X } from 'lucide-react';
interface InstallPrompt extends Event { prompt:()=>Promise<void>; userChoice:Promise<{outcome:'accepted'|'dismissed'}> }
let pendingPrompt:InstallPrompt|null=null;
let installationAccepted=false;
export default function InstallApp(){
 const steps=useRef<HTMLDivElement>(null);
 const [prompt,setPrompt]=useState<InstallPrompt|null>(pendingPrompt),[installed,setInstalled]=useState(installationAccepted),[expanded,setExpanded]=useState(false),[busy,setBusy]=useState(false),[platform,setPlatform]=useState('desktop');
 useEffect(()=>{if(expanded)steps.current?.scrollIntoView({block:'nearest',behavior:'auto'});},[expanded]);
 useEffect(()=>{
  const mode=window.matchMedia('(display-mode: standalone)');
  setInstalled(installationAccepted||mode.matches||Boolean((navigator as Navigator&{standalone?:boolean}).standalone));
  const ua=navigator.userAgent;
  setPlatform(/iPad|iPhone|iPod/.test(ua)||(/Mac/.test(ua)&&navigator.maxTouchPoints>1)?'ios':/Android/.test(ua)?'android':/Mac/.test(ua)&&/Safari/.test(ua)&&!/Chrome|Chromium/.test(ua)?'safari':'desktop');
  const ready=(event:Event)=>{event.preventDefault();pendingPrompt=event as InstallPrompt;setPrompt(pendingPrompt);};
  const done=()=>{installationAccepted=true;pendingPrompt=null;setPrompt(null);setInstalled(true);};
  const changed=()=>setInstalled(installationAccepted||mode.matches||Boolean((navigator as Navigator&{standalone?:boolean}).standalone));
  window.addEventListener('beforeinstallprompt',ready);window.addEventListener('appinstalled',done);mode.addEventListener('change',changed);
  return()=>{window.removeEventListener('beforeinstallprompt',ready);window.removeEventListener('appinstalled',done);mode.removeEventListener('change',changed);};
 },[]);
 async function install(){
  if(!prompt){setExpanded(v=>!v);return;}
  const event=prompt;pendingPrompt=null;setPrompt(null);setBusy(true);
  try{await event.prompt();const result=await event.userChoice;if(result.outcome==='accepted'){installationAccepted=true;setInstalled(true);}}
  catch{setExpanded(true);}finally{setBusy(false);}
 }
 if(installed)return null;
 return <footer className="install-app" aria-label="Get the Lightbox app"><div className="install-app-row"><div><strong>Make room for the full experience.</strong><p>Keep Lightbox on your home screen or desktop.</p></div><button className="button secondary" disabled={busy} aria-expanded={expanded} aria-controls="lightbox-install-steps" onClick={()=>void install()}><Download size={16}/>{busy?'Opening…':'Download the app'}</button></div>{expanded&&<div ref={steps} id="lightbox-install-steps" className="install-app-steps"><button className="icon-button" aria-label="Close install instructions" onClick={()=>setExpanded(false)}><X size={16}/></button><strong>Install Lightbox</strong>{platform==='ios'?<p>Open Lightbox in Safari. Tap Share, then Add to Home Screen. Keep Open as Web App enabled if shown, then tap Add.</p>:platform==='android'?<p>Open your browser menu and choose Install app or Add to Home screen, then confirm. If the option is missing, try Chrome.</p>:platform==='safari'?<p>In Safari, open File → Add to Dock, then click Add.</p>:<p>In Chrome or Edge, look for the install icon in the address bar, or open the browser menu and choose Install Lightbox. In Safari on Mac, choose File → Add to Dock.</p>}<small>Installs from your browser. Your writing stays saved in this browser; export a backup before changing browsers or devices.</small></div>}</footer>;
}
