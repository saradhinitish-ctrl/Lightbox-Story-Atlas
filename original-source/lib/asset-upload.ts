export interface UploadedAsset {id:string;url:string;name:string;mime:string;size:number}
export async function readUploadResponse(response:Response):Promise<UploadedAsset>{
 const text=await response.text();let data:Partial<UploadedAsset>&{error?:string}={};try{data=JSON.parse(text);}catch{}
 if(!response.ok){const known:Record<number,string>={401:'Your sign-in expired. Refresh the studio, then retry the import.',403:'The upload request could not be authorised. Refresh the studio and retry.',413:'This upload exceeds the file limit. Choose a file smaller than 25 MB.',503:'File storage is temporarily unavailable. Your writing is safe; retry the import.'};throw Error(data.error||known[response.status]||'The upload failed (HTTP '+response.status+'). Retry the import.');}
 if(typeof data.id!=='string'||!/^[\w-]{1,100}$/.test(data.id)||data.url!=='/api/assets/'+data.id||typeof data.name!=='string'||typeof data.mime!=='string'||typeof data.size!=='number')throw Error('The upload returned an unreadable response. The file was not added. Refresh the studio and retry.');
 return data as UploadedAsset;
}
