export interface ScreenplayTitlePage { title:string; author:string; credit?:string; source?:string; contact?:string; draftDate?:string; notes?:string }
export interface ScreenplayExportOptions extends ScreenplayTitlePage { titlePage:boolean }
export function fountainTitlePage(o:ScreenplayTitlePage){return ([['Title',o.title],['Credit',o.credit||'Written by'],['Author',o.author],['Source',o.source],['Draft date',o.draftDate],['Contact',o.contact],['Notes',o.notes]] as const).filter(([,v])=>v?.trim()).map(([k,v])=>k+': '+v!.replace(/\r/g,'').replace(/\n/g,'\n    ')).join('\n')+'\n\n';}
