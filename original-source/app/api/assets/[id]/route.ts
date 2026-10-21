import { env } from 'cloudflare:workers';
export const dynamic = 'force-dynamic';
export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const user = request.headers.get('oai-authenticated-user-id'); if (!user) return new Response('Sign in required', { status: 401 });
  const { id } = await context.params;
  if (!/^[\w-]+$/.test(id) || !env.BUCKET) return new Response('Not found', { status: 404 });
  const file = await env.BUCKET.get(user + '/' + id); if (!file) return new Response('Not found', { status: 404 });
  const mime = file.httpMetadata?.contentType || 'application/octet-stream';
  const safeInline = /^(image\/(png|jpeg|webp|gif)|application\/pdf|audio\/|video\/)/.test(mime);
  return new Response(file.body, { headers: { 'Content-Type': mime, 'Content-Disposition': (safeInline ? 'inline' : 'attachment') + '; filename="' + String(file.customMetadata?.name || 'file').replace(/[^\w. -]/g, '_') + '"', 'X-Content-Type-Options': 'nosniff', 'Cache-Control': 'private, max-age=300' } });
}

export async function DELETE(request:Request,context:{params:Promise<{id:string}>}){
 const user=request.headers.get('oai-authenticated-user-id');if(!user)return Response.json({error:'Sign in required.'},{status:401});
 if(request.headers.get('origin')&&request.headers.get('origin')!==new URL(request.url).origin)return Response.json({error:'Invalid origin.'},{status:403});
 const {id}=await context.params;if(!/^[\w-]{1,100}$/.test(id))return Response.json({error:'Invalid file.'},{status:400});
 if(!env.BUCKET||!env.DB)return Response.json({error:'File cleanup is temporarily unavailable.'},{status:503});
 try{
  const rows=await env.DB.prepare('SELECT payload FROM desk_chunks WHERE owner = ? ORDER BY position').bind(user).all();
  const raw=rows.results.map(row=>String((row as {payload:string}).payload)).join('');
  if(raw){const state=JSON.parse(raw);delete state.pendingAssetDeletes;if(JSON.stringify(state).includes(id))return Response.json({error:'This file is still used elsewhere in your workspace.'},{status:409});}
  await env.BUCKET.delete(user+'/'+id);return Response.json({deleted:true});
 }catch{return Response.json({error:'File cleanup is temporarily unavailable.'},{status:503});}
}
