// DOM-contract checks; these do not replace visual browser QA.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=fs.readFileSync('dist/index.html','utf8');
const staticHtml=html.slice(0,html.indexOf('<script>'));
const ids=[...staticHtml.matchAll(/\bid="([^"]+)"/g)].map(x=>x[1]);
assert.equal(new Set(ids).size,ids.length,'Duplicate static IDs');
class Node {
  constructor(id=''){this.id=id;this.style={};this.dataset={};this.innerHTML='';this.textContent='';this.value='';this.checked=false;this.classes=new Set();this.classList={contains:x=>this.classes.has(x),add:x=>this.classes.add(x),remove:x=>this.classes.delete(x),toggle:(x,on)=>on?this.classes.add(x):this.classes.delete(x)};}
  click(){this.onclick?.({preventDefault(){}})}
  append(){} focus(){} scrollIntoView(){}
  querySelector(q){if(q==='details')return this.detail||(this.detail=new Node());if(q==='summary')return new Node();return null;}
  closest(q){if(q==='#selectedDay')return this.scope==='selectedDay'?nodes.get('selectedDay'):null;if(q==='.task')return this;return null;}
}
const nodes=new Map(ids.map(id=>[id,new Node(id)]));
const dynamic=new Map();
function queryAll(selector){
  if(selector==='.view')return [...nodes.values()].filter(n=>n.id.startsWith('view-'));
  if(selector==='.nav button'||selector==='[data-goto]')return [];
  const attr=selector.match(/^\[data-([a-z-]+)\]$/)?.[1];if(!attr)return [];
  const key=attr.replace(/-([a-z])/g,(_,c)=>c.toUpperCase());const results=[];
  for(const [id,parent] of nodes){for(const m of parent.innerHTML.matchAll(new RegExp('<[^>]*data-'+attr+'="([^"]+)"[^>]*>','g'))){const cache=id+'|'+attr+'|'+m[1];let n=dynamic.get(cache);if(!n){n=new Node();dynamic.set(cache,n);}n.dataset[key]=m[1];n.scope=id;n.checked=/\schecked(?:\s|>)/.test(m[0]);results.push(n);}}
  return results;
}
const storage=new Map([['kartsFilmOS15_v1',JSON.stringify({done:{'m1-d1-4':true},activeMonth:1})]]);
const RealDate=Date;
class TestDate extends RealDate {constructor(...args){super(...(args.length?args:['2026-10-12T07:00:00Z']));}}
const sandbox={console,Date:TestDate,Intl,JSON,setTimeout,clearTimeout,document:{querySelector:s=>{if(s.startsWith('#')){const n=nodes.get(s.slice(1));assert(n,'Missing HTML target '+s);return n;}return queryAll(s)[0]||null;},querySelectorAll:queryAll,createElement:()=>new Node()},localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)},scrollTo(){},matchMedia:()=>({matches:true}),fetch:async()=>({ok:true,json:async()=>JSON.parse(fs.readFileSync('dist/session-vault.json','utf8'))})};
sandbox.window=sandbox;vm.createContext(sandbox);
const scripts=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(x=>x[1]);
vm.runInContext(scripts.find(s=>s.includes('window.PLAN15 =')),sandbox);
for(const file of ['studio-syllabus.js','korean-syllabus.js','curriculum-remaster.js','vault-days.js'])vm.runInContext(fs.readFileSync('dist/'+file,'utf8'),sandbox);
const app=scripts.find(s=>s.includes('const $=s=>')).replace(/^init\(\);$/m,'');
vm.runInContext(app,sandbox);
vm.runInContext('sourceData=window.SOURCE_DATA;buildMonths();populateMonthSelect();renderDaily();updateOverview();renderLibrary();',sandbox);
assert.equal(nodes.get('deskTaskTitle').textContent,'Source study');
assert.equal(nodes.get('deskTaskTime').textContent,'30m');
assert.equal(queryAll('[data-month]').length,15);
assert.equal(queryAll('[data-curriculum-month]').length,15);
assert(!nodes.get('deskTaskText').textContent.includes('undefined'));
nodes.get('resumeDesk').click();
assert.equal(vm.runInContext('selectedDay',sandbox),1,'Resume did not open October 12');
assert.equal(vm.runInContext('state.activeMonth',sandbox),1);
const input=queryAll('[data-task]').find(n=>n.scope==='selectedDay'&&n.dataset.task==='r3-m1-d2-study');
assert(input);input.checked=true;input.onchange();
assert.equal(JSON.parse(storage.get('kartsFilmOS15_v1')).done['r3-m1-d2-study'],true);
assert.equal(JSON.parse(storage.get('kartsFilmOS15_v1')).done['m1-d1-4'],true,'Day 1 override lost');
assert.equal(nodes.get('deskTaskTitle').textContent,'Studio writing','Next task did not advance');
assert(nodes.get('resourceGrid').innerHTML.includes('Knives Out'),'New study sources did not render');
assert(nodes.get('studyStandards').innerHTML.includes('Independent feedback'),'Quality standards did not render');
assert(nodes.get('selectedDay').innerHTML.includes('<strong>OPEN / PREREQUISITE</strong>'),'Daily output contract formatting missing');
const month2=queryAll('[data-month]').find(n=>n.dataset.month==='2');month2.onkeydown({key:'Enter',preventDefault(){}});
assert.equal(vm.runInContext('state.activeMonth',sandbox),2,'Roadmap keyboard navigation failed');
const month3=queryAll('[data-curriculum-month]').find(n=>n.dataset.curriculumMonth==='3');month3.click();
assert.equal(vm.runInContext('state.activeMonth',sandbox),3,'Study map navigation failed');
nodes.get('openTodayPlan').click();assert.equal(vm.runInContext('state.activeMonth',sandbox),1);assert.equal(vm.runInContext('selectedDay',sandbox),1);
vm.runInContext('const loadedArchive=JSON.parse('+JSON.stringify(fs.readFileSync('dist/session-vault.json','utf8'))+');publishedVault=loadedArchive.entries;publishedVaultDays=loadedArchive.days;populateVaultFilters();renderVault();',sandbox);
assert(nodes.get('vaultList').innerHTML.length>0,'Vault rendered empty markup');
assert.equal(queryAll('[data-vault-date]').length,3,'Prepared day folders missing');
assert.equal(nodes.get('vaultCount').textContent,'3 DAYS · 10 SAVED WORKS','Saved Day 3 work was not counted');
assert(nodes.get('vaultList').innerHTML.includes('Spider-Verse — Script to Film Study'),'Day 2 study work missing');
assert(nodes.get('vaultList').innerHTML.includes('Spider-Verse — Power Becomes Public'),'Day 3 study work missing');
assert(nodes.get('vaultList').innerHTML.includes('OPEN DRAFT 3 PDF'),'Screenplay revision attachment missing');
assert(nodes.get('vaultList').innerHTML.includes('MODEL B — Scene 1 · Drafts 4–5'),'Day 3 screenplay work missing');
assert(nodes.get('vaultList').innerHTML.includes('Plain vs Aspirated Consonants'),'Day 3 Korean work missing');
const fixtures=[
 {id:'study',date:'12 OCT 2026',month:1,type:'Film study',title:'Study analysis',content:'Complete study work'},
 {id:'scene',date:'2026-10-12',month:1,type:'Scene',title:'Scene 1 v1',content:'<script>literal screenplay text</script>'},
 {id:'korean',archiveDate:'2026-10-12',month:1,type:'Korean',title:'Korean exercises',content:'Corrected Korean work'},
 {id:'later',date:'2026-10-20',month:1,type:'Revision',title:'Day 10 revision',content:'Later revision'},
 {id:'november',date:'2026-11-12',month:2,type:'Scene',title:'Day 33 scene',content:'Month 2 work'},
 {id:'unknown',date:'unassigned',month:1,type:'Other',title:'Imported work',content:'Preserve this work'}
];
vm.runInContext('publishedVault=publishedVault.concat('+JSON.stringify(fixtures)+');state.vault=[{id:"scene",date:"12 OCT 2026",month:1,type:"Scene",title:"Stale copy",content:"Old copy"},{id:"day1",date:"11 OCT 2026",month:1,type:"Observation",title:"Day 1 observations",content:"Actual legacy work"}];populateVaultFilters();renderVault();',sandbox);
const folders=[...nodes.get('vaultList').innerHTML.matchAll(/<details class="vault-day" data-vault-date="([^"]+)"[^>]*>([\s\S]*?)<\/details>/g)];
assert.equal(folders.filter(x=>x[1]==='2026-10-12').length,1,'Same-day pieces split into different covers');
const day2=folders.find(x=>x[1]==='2026-10-12')[2];
for(const title of ['Study analysis','Scene 1 v1','Korean exercises','Spider-Verse — Script to Film Study'])assert(day2.includes(title),'Same-day work missing: '+title);
assert(day2.includes('8 works saved'),'Same-day work count is wrong');
assert(!day2.includes('Stale copy'),'Published version did not win ID collision');
assert(day2.includes('&lt;script&gt;literal screenplay text&lt;/script&gt;'),'Work text was rendered as HTML');
assert(folders.find(x=>x[1]==='2026-10-11')[2].includes('Day 1 observations'),'Legacy work lost');
assert(folders.find(x=>x[1]==='undated')[2].includes('Imported work'),'Unassigned date silently dropped');
assert.deepEqual(folders.slice(0,3).map(x=>x[1]),['2026-11-12','2026-10-20','2026-10-13'],'Day sorting is not chronological');
nodes.get('vaultFilterType').value='Korean';nodes.get('vaultFilterType').onchange();
assert.equal(queryAll('[data-vault-date]').length,1,'Type filter did not find the right day');
assert(nodes.get('vaultList').innerHTML.includes('Scene 1 v1'),'Type filter hid other work inside the matching day');
nodes.get('vaultFilterType').value='';nodes.get('vaultFilterMonth').value='2';nodes.get('vaultFilterMonth').onchange();
assert.equal(queryAll('[data-vault-date]').length,1,'Month filter included wrong days');
assert(nodes.get('vaultList').innerHTML.includes('Day 33'),'Global day numbering failed across months');
nodes.get('vaultToday').click();
assert.equal(vm.runInContext('vaultFocusedDate',sandbox),'2026-10-12','Today folder uses the wrong date');
assert(nodes.get('vaultList').innerHTML.includes('data-vault-date="2026-10-12" open'),'Today folder did not open');
assert.equal(vm.runInContext('backupPayload().archive.entries.length',sandbox),16,'Backup omitted published work');
assert.equal(vm.runInContext('backupPayload().state.vault.length',sandbox),2,'Backup omitted legacy work');
console.log('PASS: day grouping, all same-day work, filters, date ordering, ready-state counts, existing work preservation, text escaping, full-work backup, checkbox persistence and plan navigation. Layout/browser QA not performed.');
