import {servePrivateArchive} from '@/lib/private-archive';
export const dynamic='force-dynamic';
export function GET(request:Request){return servePrivateArchive(request,'/session-vault.json');}
export const HEAD=GET;
