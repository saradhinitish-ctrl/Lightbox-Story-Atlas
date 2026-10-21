/* Daily archive view. Published records remain the source of truth. */
window.DAYVAULT = (() => {
  const monthNames={JAN:1,FEB:2,MAR:3,APR:4,MAY:5,JUN:6,JUL:7,AUG:8,SEP:9,OCT:10,NOV:11,DEC:12};
  function isoDate(value){
    const raw=String(value||'').trim();
    let iso=raw.match(/^\d{4}-\d{2}-\d{2}(?:$|T)/)?.[0]?.slice(0,10);
    if(!iso){const m=raw.toUpperCase().match(/^(\d{1,2})\s+([A-Z]{3})\s+(\d{4})$/);if(m&&monthNames[m[2]])iso=`${m[3]}-${String(monthNames[m[2]]).padStart(2,'0')}-${m[1].padStart(2,'0')}`;}
    if(!iso)return null;
    const date=new Date(iso+'T12:00:00Z');
    return Number.isFinite(date.getTime())&&date.toISOString().slice(0,10)===iso?iso:null;
  }
  function dayInfo(iso,months,start='2026-10-11'){
    const date=isoDate(iso),month=months.find(m=>date>=m.from&&date<=m.to);
    const number=date?Math.round((new Date(date+'T12:00:00Z')-new Date(start+'T12:00:00Z'))/86400000)+1:null;
    return {date,month:month?.n||null,number:number>0?number:null,label:number>0?'Day '+number:'Undated work',displayDate:date?new Intl.DateTimeFormat('en-IN',{day:'numeric',month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(date+'T12:00:00Z')):'Date not assigned'};
  }
  function entries(legacy,published){
    const byId=new Map();
    for(const x of [...(Array.isArray(legacy)?legacy:[]),...(Array.isArray(published)?published:[])]){
      if(!x||!x.id||String(x.id).startsWith('seed-note-'))continue;
      byId.set(String(x.id),{...x,id:String(x.id),type:x.type||x.block||'Other',content:x.content||x.text||x.output||'',archiveDate:isoDate(x.archiveDate||x.date)});
    }
    return [...byId.values()];
  }
  function group(rows,prepared,months,start){
    const byDate=new Map();
    function ensure(raw){const date=isoDate(raw)||'undated';if(!byDate.has(date))byDate.set(date,{...dayInfo(date,months,start),key:date,items:[]});return byDate.get(date);}
    for(const x of Array.isArray(prepared)?prepared:[])if(isoDate(x.date||x))ensure(x.date||x);
    for(const row of rows){const day=ensure(row.archiveDate||row.date);day.items.push(row);if(!day.month&&row.month)day.month=Number(row.month);}
    return [...byDate.values()].sort((a,b)=>a.key==='undated'?1:b.key==='undated'?-1:b.key.localeCompare(a.key));
  }
  function isWork(item){return item.status!=='ready'&&item.status!=='template';}
  function category(item){const t=String(item.type||'').toLowerCase();return t.includes('korean')?'Korean':t.includes('study')?'Study':/screenplay|scene|prose|outline|treatment|revision|observation/.test(t)?'Writing':'Other work';}
  function sections(items){return ['Study','Writing','Korean','Other work'].map(title=>({title,items:items.filter(x=>category(x)===title)})).filter(s=>s.items.length);}
  function filter(days,month,type){return days.filter(d=>(!month||String(d.month)===String(month))&&(!type||d.items.some(x=>x.type===type)));}
  return {isoDate,dayInfo,entries,group,isWork,category,sections,filter};
})();
