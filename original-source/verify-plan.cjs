const fs=require('node:fs');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const cp=require('node:child_process');
const html=fs.readFileSync('dist/index.html','utf8');
const context={window:{}};
const baseline={window:{}};
vm.runInNewContext(cp.execFileSync('git',['show','effd8d10d0dfc899498b0bd1eae88a98ecf23238:dist/plan15.js'],{encoding:'utf8'}),baseline);
const scripts=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(m=>m[1]);
scripts.forEach(s=>new vm.Script(s));
vm.runInNewContext(scripts.find(s=>s.includes('window.PLAN15 =')),context);
for(const file of ['studio-syllabus.js','korean-syllabus.js','curriculum-remaster.js'])vm.runInNewContext(fs.readFileSync('dist/'+file,'utf8'),context);
const months=context.window.REBUILD.months;
assert.equal(months.length,15);
assert.equal(JSON.stringify(months[0].weeks[0].days[0]),JSON.stringify(baseline.window.SOURCE_DATA.original[0].days[0]));
let expected=new Date('2026-10-11T12:00:00Z');
const ids=new Set();let count=0;
for(const m of months){
  let sessions=0;
  for(const d of m.weeks.flatMap(w=>w.days)){
    const date=d.date||'2026-10-11';
    assert.equal(date,expected.toISOString().slice(0,10),'Missing/repeated calendar day');
    expected.setUTCDate(expected.getUTCDate()+1);count++;
    const dow=new Date(date+'T12:00:00Z').getUTCDay();
    if(d.title.includes('Session')){
      assert(dow!==0&&dow!==6,'Weekday assignment on weekend');
      const match=d.title.match(/Unit (\d+) · Session (\d+)/);
      assert.equal(+match[1],Math.floor(sessions/5)+1);
      assert.equal(+match[2],sessions%5+1);sessions++;
    }
    let minutes=0;
    for(const t of d.tasks){
      assert(!ids.has(t.id),'Duplicate checkbox ID');ids.add(t.id);
      assert(t.text&&t.label,'Empty task');
      minutes+=Number(t.label.match(/(\d+)m/)?.[1]||0);
    }
    assert(minutes<=(m.n===15?60:dow===6?120:180),d.title+' exceeds budget');
  }
  if(m.n>1)assert.equal(sessions,20);
}
assert.equal(expected.toISOString().slice(0,10),'2028-01-01');
assert(html.includes("const stateKey='kartsFilmOS15_v1'"),'Progress storage changed');
assert(html.includes('function buildMonths(){months=window.REBUILD.months;plan.months=months;}'));
for(const file of ['studio-syllabus.js','korean-syllabus.js','curriculum-remaster.js','vault-days.js'])assert(html.indexOf('src="./'+file+'"')<html.indexOf('const $=s=>'));
const rebuild=context.window.REBUILD;
assert.equal(rebuild.ledger.length,300,'Missing substantial studio sessions');
const stepIds=new Set(['day1']);
for(const step of rebuild.ledger){
 assert(stepIds.has(step.dependsOn),'Future/nonexistent prerequisite: '+step.id);
 assert(!stepIds.has(step.id),'Repeated studio step');
 assert(step.output&&step.work,'Missing output contract');stepIds.add(step.id);
}
for(const m of months){
 for(const d of m.weeks.flatMap(w=>w.days)){
  if(d===months[0].weeks[0].days[0])continue;
  assert(d.tasks.some(t=>t.kind==='korean'),'No Korean work on '+d.date);
  assert(d.tasks.every(t=>!t.text.includes('undefined')),'Undefined prompt');
  assert(d.tasks.every(t=>/output:/i.test(t.text)||t.output||t.kind==='review'),'Missing substantive result on '+d.date);
 }
}
const ko=context.window.KOREAN;
const courseSlots=[];
for(let n=2;n<=11;n++)for(let u=0;u<4;u++)courseSlots.push(ko.assignment(n,u));
for(const level of ['Beginner 1','Beginner 2','Intermediate 1','Intermediate 2']){
 const sequence=courseSlots.filter(x=>x.level===level).flatMap(x=>[x.first,x.second]);
 assert.equal(sequence.join(','),Array.from({length:20},(_,i)=>i+1).join(','),'Korean source continuity: '+level);
}
const kickoff=months[0].weeks.flatMap(w=>w.days);
const laterSourceStudies=months.flatMap(m=>m.weeks.flatMap(w=>w.days)).filter(d=>d.date>'2026-10-12').flatMap(d=>d.tasks).filter(t=>t.label==='Source study · 30m');
assert(laterSourceStudies.every(t=>!t.text.includes('Day 1 covered roughly ten Spider-Verse pages')),'Stale Day 1 Spider-Verse cursor in later source study');
const laterScreenplayStudies=laterSourceStudies.filter(t=>t.text.includes('FIRST PASS:'));
assert(laterScreenplayStudies.every(t=>t.text.includes('most recent saved study entry as the cursor')),'Later screenplay study lacks current-screenplay cursor rule');
assert(kickoff.find(d=>d.date==='2026-10-22').tasks.at(-1).assignment.includes('first attempt'));
assert(kickoff.find(d=>d.date==='2026-10-24').tasks.at(-1).assignment.includes('retest'));
assert(kickoff.find(d=>d.date==='2026-10-25').tasks.at(-1).assignment.includes('First sentence'));
const mocks=months.flatMap(m=>m.weeks.flatMap(w=>w.days)).filter(d=>d.title.includes('Monthly TOPIK II'));
assert.equal(mocks.length,3);
assert(mocks.every(d=>d.tasks.map(t=>+t.label.match(/(\d+)m/)[1]).join(',')==='60,50,70'));
for(let n=1;n<=14;n++)assert(rebuild.ledger.some(s=>s.work.includes('Short '+String(n).padStart(2,'0'))),'Missing practice short '+n);
assert.equal(rebuild.resources.filter(r=>r.type.startsWith('PRIMARY SCREENPLAY')).length,6);
assert.equal(fs.readFileSync('dist/vault-records.json','utf8'),cp.execFileSync('git',['show','a0a77e881c4e4f40f2edb079174a434b0520e9b6:dist/vault-records.json'],{encoding:'utf8'}),'Legacy vault data changed');
const archive=JSON.parse(fs.readFileSync('dist/session-vault.json','utf8'));
const day2=archive.entries.filter(x=>x.archiveDate==='2026-10-12');
assert.equal(day2.length,5,'Day 2 archive is incomplete');
assert(day2.every(x=>x.status==='saved'),'Day 2 work should be saved, not marked ready');
const screenplay=day2.find(x=>x.id==='model-b-scene-1');
assert.equal(screenplay?.attachments?.length,3,'Screenplay revision attachments missing');
assert(day2.some(x=>x.id==='film-study-log'&&x.title.includes('Spider-Verse')),'Day 2 film study missing');
assert.equal(new Set(archive.entries.map(x=>x.id)).size,archive.entries.length,'Duplicate archive ID');
console.log(`PASS: ${count} consecutive dates; ${ids.size} unique tasks; 15 months; exact Day 1 preservation; budgets; 20 ordered weekday sessions/month; script syntax; unchanged progress key; complete Day 2 archive.`);
