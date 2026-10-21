import {servePrivateArchive} from '@/lib/private-archive';
export const dynamic='force-dynamic';
export async function GET(request:Request,{params}:{params:Promise<{path:string[]}>}){const {path}=await params;return servePrivateArchive(request,'/vault-files/'+path.join('/'));}
export const HEAD=GET;
