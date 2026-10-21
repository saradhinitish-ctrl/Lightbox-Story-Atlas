import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { paginateScript, wrapScript, SCRIPT_PROFILE, COLUMN_LEFT, type ScriptBlock } from './screenplay-layout';
import type { ScreenplayExportOptions } from './screenplay-metadata';
export async function screenplayPDF(blocks:ScriptBlock[],options:ScreenplayExportOptions):Promise<Uint8Array>{
 const pdf=await PDFDocument.create();pdf.setTitle(options.title);pdf.setAuthor(options.author);pdf.setCreator('Lightbox');
 const regular=await pdf.embedFont(StandardFonts.Courier),bold=await pdf.embedFont(StandardFonts.CourierBold),italic=await pdf.embedFont(StandardFonts.CourierOblique),boldItalic=await pdf.embedFont(StandardFonts.CourierBoldOblique);
 const {width,height}=SCRIPT_PROFILE;
 const check=(text:string)=>{try{regular.encodeText(text.replace(/[\r\n\t]/g,''));}catch{throw Error('This PDF font supports Latin text. Export FDX or DOCX to preserve this script’s non-Latin characters.');}};
 for(const b of blocks)check(b.text);for(const v of [options.title,options.author,options.credit,options.source,options.contact,options.draftDate,options.notes])if(v)check(v);
 if(options.titlePage){
  const page=pdf.addPage([width,height]);
  const group=[...wrapScript(options.title.toUpperCase(),60).map(l=>l.text),'',...(options.author?[options.credit?.trim()||'Written by','',...wrapScript(options.author,60).map(l=>l.text)]:[]),...(options.source?.trim()?['',...wrapScript(options.source,60).map(l=>l.text)]:[])];
  if(group.length>22)throw Error('Title-page title, author, and source are too long. Shorten these fields before exporting.');
  group.forEach((text,i)=>{if(text)page.drawText(text,{x:(width-regular.widthOfTextAtSize(text,12))/2,y:430+group.length*6-i*16,size:12,font:regular,color:rgb(0,0,0)});});
  const footer=[...(options.contact?.trim()?wrapScript(options.contact,32).map(l=>l.text):[]),...(options.notes?.trim()?['',...wrapScript(options.notes,32).map(l=>l.text)]:[])];
  if(footer.length>12)throw Error('Contact details and notes exceed 12 title-page lines. Shorten them before exporting.');
  footer.forEach((text,i)=>{if(text)page.drawText(text,{x:108,y:72+(footer.length-1-i)*14,size:12,font:regular});});
  const date=options.draftDate?.trim()?wrapScript(options.draftDate,23):[];if(date.length>6)throw Error('The draft date/version is too long.');date.forEach((l,i)=>page.drawText(l.text,{x:width-72-regular.widthOfTextAtSize(l.text,12),y:72+(date.length-1-i)*14,size:12,font:regular}));
 }
 const pages=paginateScript(blocks);
 pages.forEach((scriptPage,index)=>{const page=pdf.addPage([width,height]);if(index>0){const label=(index+1)+'.';page.drawText(label,{x:width-72-regular.widthOfTextAtSize(label,12),y:height-36,size:12,font:regular});}
  for(const line of scriptPage.lines){const y=height-72-9-line.line*12;let x=line.x??COLUMN_LEFT[line.type];if(line.type==='transition'&&line.x===undefined)x=width-72-regular.widthOfTextAtSize(line.text,12);
   const b=blocks[line.block],runs=b?.runs;if(!runs?.length||line.generated||line.type==='parenthetical'){page.drawText(line.text,{x,y,size:12,font:regular});continue;}
   let offset=0,cursor=x;for(const run of runs){const start=Math.max(line.start,offset),end=Math.min(line.end,offset+run.text.length);if(end>start){const rawText=run.text.slice(start-offset,end-offset),text=['scene','character','shot','transition'].includes(line.type)?rawText.toUpperCase():rawText,font=run.bold&&run.italic?boldItalic:run.bold?bold:run.italic?italic:regular;page.drawText(text,{x:cursor,y,size:12,font});const length=font.widthOfTextAtSize(text,12);if(run.underline)page.drawLine({start:{x:cursor,y:y-2},end:{x:cursor+length,y:y-2},thickness:.5});cursor+=length;}offset+=run.text.length;}
  }
 });return pdf.save();
}
