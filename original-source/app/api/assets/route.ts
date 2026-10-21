import { env } from 'cloudflare:workers';
export const dynamic = 'force-dynamic';
export async function POST(request: Request) {
 const user=request.headers.get('oai-authenticated-user-id');if(!user)return Response.json({error:'Sign in to import files.'},{status:401});
 if(request.headers.get('origin')&&request.headers.get('origin')!==new URL(request.url).origin)return Response.json({error:'Invalid upload origin. Refresh the studio and retry.'},{status:403});
 if(!env.BUCKET)return Response.json({error:'File storage is unavailable. Retry the import shortly.'},{status:503});
 const length=Number(request.headers.get('content-length')||0);if(length>26*1024*1024)return Response.json({error:'Choose a file smaller than 25 MB.'},{status:413});
 let data:FormData;try{data=await request.formData();}catch{return Response.json({error:'The file could not be read. Select it again and retry.'},{status:400});}
 const file=data.get('file');if(!file||typeof file==='string'||typeof file.arrayBuffer!=='function')return Response.json({error:'Select a file to import.'},{status:400});
 if(file.size>25*1024*1024)return Response.json({error:'Choose a file smaller than 25 MB.'},{status:413});
 const id=crypto.randomUUID(),mime=file.type||(/\.pdf$/i.test(file.name)?'application/pdf':'application/octet-stream');
 try{const bytes=await file.arrayBuffer();await env.BUCKET.put(user+'/'+id,bytes,{httpMetadata:{contentType:mime},customMetadata:{name:file.name.slice(0,500)}});}
 catch{return Response.json({error:'The file could not be saved to storage. Retry the import. Your existing writing has not changed.'},{status:503});}
 return Response.json({id,url:'/api/assets/'+id,name:file.name,mime,size:file.size});
}
