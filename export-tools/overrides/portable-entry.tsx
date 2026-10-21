// Portable entry for Lightbox v64. The original hosted source is included separately.
import React from 'react';
import { createRoot } from 'react-dom/client';
import Studio from './components/writing-studio';
import { emptyWorkspace } from './lib/desk-model';

// randomUUID is restricted to secure contexts in some browsers.
if (!crypto.randomUUID) Object.defineProperty(crypto, 'randomUUID', {value: () => {const bytes=crypto.getRandomValues(new Uint8Array(16));bytes[6]=(bytes[6]&15)|64;bytes[8]=(bytes[8]&63)|128;const hex=[...bytes].map(b=>b.toString(16).padStart(2,'0')).join('');return hex.slice(0,8)+'-'+hex.slice(8,12)+'-'+hex.slice(12,16)+'-'+hex.slice(16,20)+'-'+hex.slice(20);}});
const LOCAL_USER = 'lightbox-portable-local';
function openLocalDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('lightbox-portable-v64', 1);
    req.onupgradeneeded = () => req.result.createObjectStore('workspace');
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
function reply(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {status, headers:{'Content-Type':'application/json'}});
}
async function workspaceRequest(method: string, init?: RequestInit): Promise<Response> {
  const db = await openLocalDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('workspace', method === 'PUT' ? 'readwrite' : 'readonly');
    const store = tx.objectStore('workspace');
    const request = store.get('current');
    let result: Response;
    request.onsuccess = () => {
      const current = request.result || {revision:0, state:emptyWorkspace(), userId:LOCAL_USER};
      if (method === 'PUT') {
        try {
          const incoming = JSON.parse(String(init?.body || '{}'));
          if (incoming.revision !== current.revision) result = reply({error:'Another tab saved changes.', ...current}, 409);
          else {
            const next = {revision:current.revision + 1, state:incoming.state, userId:LOCAL_USER, updatedAt:new Date().toISOString()};
            store.put(next, 'current'); result = reply(next);
          }
        } catch { result = reply({error:'The local save request was unreadable.'}, 400); }
      } else result = reply(current);
    };
    tx.oncomplete = () => {db.close(); resolve(result);};
    tx.onerror = () => {db.close(); reject(tx.error);};
    tx.onabort = () => {db.close(); reject(tx.error || Error('Local save was cancelled.'));};
  });
}
const originalFetch = window.fetch?.bind(window);
window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
  const raw = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
  const url = new URL(raw, window.location.href);
  const method = (init?.method || (input instanceof Request ? input.method : 'GET')).toUpperCase();
  if (url.pathname === '/api/workspace') return workspaceRequest(method, init);
  if (url.pathname === '/api/assets' && method === 'POST') {
    const file = (init?.body as FormData)?.get('file');
    if (!(file instanceof File)) return reply({error:'Choose a file to import.'},400);
    if (file.size > 25 * 1024 * 1024) return reply({error:'Choose a file smaller than 25 MB.'},413);
    if (file.type === 'image/svg+xml') return reply({error:'Use a PNG, JPEG, GIF, WebP, AVIF, or BMP image.'},400);
    const data = await new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result));reader.onerror=()=>reject(reader.error);reader.readAsDataURL(file);});
    return reply({id:crypto.randomUUID(),url:data,name:file.name,mime:file.type||'application/octet-stream',size:file.size});
  }
  if (url.pathname.startsWith('/api/assets/') && method === 'DELETE') return reply({ok:true});
  if (url.pathname.startsWith('/api/')) return reply({error:'This endpoint requires the hosted Lightbox server.'},501);
  if (originalFetch) return originalFetch(input,init);
  throw Error('Network requests are unavailable.');
};

class ErrorBoundary extends React.Component<{children:React.ReactNode},{error:string}> {
  state = {error:''};
  static getDerivedStateFromError(error: Error) {return {error:error.message};}
  render() {return this.state.error ? <main style={{padding:32}}><h1>Lightbox could not open</h1><p>{this.state.error}</p><p>Use a current browser and enable site storage. See README.md for local-server instructions.</p></main> : this.props.children;}
}
createRoot(document.getElementById('root')!).render(<ErrorBoundary><Studio accountName="Local workspace" accountUserId={LOCAL_USER}/></ErrorBoundary>);
