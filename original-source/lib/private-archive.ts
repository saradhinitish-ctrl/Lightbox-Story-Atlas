import {env} from 'cloudflare:workers';
import {archiveAssets} from './private-archive.generated';
import {checkArchiveAccess} from './archive-access';

export function servePrivateArchive(request:Request,path:string):Response {
  const denied=checkArchiveAccess(request,env.LIGHTBOX_ARCHIVE_OWNER_ID);
  if(denied)return denied;
  const asset=archiveAssets[path];
  const headers={'Cache-Control':'private, no-store','X-Robots-Tag':'noindex, nofollow','X-Content-Type-Options':'nosniff'};
  if(!asset)return new Response('Not found',{status:404,headers});
  const bytes=Uint8Array.from(atob(asset.body),c=>c.charCodeAt(0));
  return new Response(request.method==='HEAD'?null:bytes,{headers:{...headers,'Content-Type':asset.type}});
}
