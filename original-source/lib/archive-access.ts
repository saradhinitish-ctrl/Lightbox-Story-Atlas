export function isPrivateArchivePath(pathname:string):boolean {
  try {
    let path=decodeURIComponent(pathname).replace(/\\/g,'/');
    path=new URL(path,'https://archive.local').pathname;
    return path==='/legacy'||path.startsWith('/legacy/')||path==='/session-vault.json'||path==='/vault-files'||path.startsWith('/vault-files/');
  } catch { return true; }
}

export function checkArchiveAccess(request:Request,ownerId:string|undefined):Response|null {
  if(!isPrivateArchivePath(new URL(request.url).pathname))return null;
  const userId=request.headers.get('oai-authenticated-user-id');
  if(ownerId&&userId===ownerId)return null;
  return new Response('Not found',{status:404,headers:{'Cache-Control':'private, no-store','X-Robots-Tag':'noindex, nofollow'}});
}
