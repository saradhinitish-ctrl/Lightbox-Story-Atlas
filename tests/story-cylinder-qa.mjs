// Story Cylinder IX browser smoke tests (isolated temp browser profile).
// Run locally with: npm install playwright && npx playwright install chromium
// then PLAYWRIGHT_MODULE=<resolved path to playwright/index.mjs> node tests/story-cylinder-qa.mjs
import {createServer} from 'node:http';
import {existsSync} from 'node:fs';
import {readFile, mkdir, writeFile} from 'node:fs/promises';
import {resolve, extname, sep} from 'node:path';
import process from 'node:process';
import assert from 'node:assert/strict';

const {chromium} = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const root = process.cwd();
// Visual regression: the canvas no longer draws the grey orbit outlines.
const cylinderSource = await readFile(resolve(root,'story-cylinder-v9.js'),'utf8');
const shellStart = cylinderSource.indexOf('function drawShell(s) {');
const shellEnd = cylinderSource.indexOf('function resize(s) {',shellStart);
assert.ok(shellStart>=0 && shellEnd>shellStart,'Story Cylinder drawing code exists');
assert.doesNotMatch(cylinderSource.slice(shellStart,shellEnd),/\.stroke\s*\(/,'No hard-edged orbit lines drawn');
const dir = resolve(root, 'qa-artifacts');
await mkdir(dir, {recursive:true});
const mime = {
 '.html':'text/html; charset=utf-8','.js':'application/javascript; charset=utf-8',
 '.css':'text/css; charset=utf-8','.json':'application/json',
 '.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg',
 '.woff2':'font/woff2','.woff':'font/woff'
};
const server=createServer(async (request,response)=>{
 const url = new URL(request.url, 'http://localhost');
 const raw = decodeURIComponent(url.pathname);
 const path = resolve(root,'.'+raw);
 if (!path.startsWith(root + sep) && path !== root) {
   response.writeHead(403);response.end();return;
 }
 try{
   const body=await readFile(path===root?resolve(root,'index.html'):path);
   response.writeHead(200,{'Content-Type':mime[extname(path)]||'application/octet-stream','Cache-Control':'no-store'});
   response.end(body);
 } catch{
   response.writeHead(404);response.end('Not found');
 }
});
await new Promise(done=>server.listen(4173,'127.0.0.1',done));
const systemBrowser=['/usr/bin/google-chrome','/usr/bin/google-chrome-stable','/usr/bin/chromium','/usr/bin/chromium-browser'].find(existsSync);
console.log('Browser executable:',systemBrowser||'Playwright bundled Chromium');
const browser=await chromium.launch({headless:true,...(systemBrowser?{executablePath:systemBrowser}:{})});
const results=[];
const errors=[];
const sizes=[[320,900],[390,900],[768,900],[1200,900],[1440,900],[1920,900],[1440,700],[1200,768]];
const sleep=(ms)=>new Promise(done=>setTimeout(done,ms));
try{
 for(const [width,height] of sizes){
  const page=await browser.newPage({viewport:{width,height},deviceScaleFactor:1});
  // These checks cover the Classic view (the cylinder); tests/atlas-light-table-qa.mjs covers the light table.
  await page.addInitScript(()=>{try{localStorage.setItem('lightbox.atlas.layout','classic');}catch{}});
  const browserErrors=[];
  page.on('pageerror', e=>browserErrors.push(e.message));
  page.on('console', e=>{if(e.type()==='error') browserErrors.push(e.text());});
  page.on('response', e=>{if(e.status()===404)browserErrors.push('HTTP 404: '+e.url());});
  await page.goto('http://127.0.0.1:4173/index.html',{waitUntil:'domcontentloaded'});
  const skip=page.locator('.lb-opener__skip');
  if(await skip.isVisible().catch(()=>false))await skip.click().catch(()=>{});
  // Start a disposable project in this fresh, isolated browser profile only.
  const begin=page.locator('.welcome > .button.primary');
  await begin.waitFor({state:'visible',timeout:15000}).catch(()=>{});
  if(await begin.isVisible().catch(()=>false)){
    await begin.click();
    await page.getByRole('button',{name:'Create world',exact:true}).click();
  }
  try { await page.locator('.lb-cylinder-v9').waitFor({state:'visible',timeout:20000}); }
  catch(e) {
   const body=(await page.locator('body').innerText().catch(()=>''))?.slice(0,1200);
   await page.screenshot({path:resolve(dir, 'startup-'+width+'.png'),fullPage:true});
   throw new Error('Cylinder failed to mount at '+width+'px: '+body);
  }
  const measure=await page.evaluate(()=>{
   const all=[...document.querySelectorAll('.lb-cylinder-v9 .lb-cylinder-card')];
   const stage=document.querySelector('.lb-cylinder-stage');
   const shell=document.querySelector('.lb-cylinder-body');
   return {
    width:innerWidth,height:innerHeight,screenWidth:document.documentElement.scrollWidth,
    cardCount:all.length,sourceCount:document.querySelectorAll('.lb-cylinder-v9 .lb-cylinder-source').length,
    shellCanvas:[shell.width,shell.height],
    shellBottomAlpha:shell.getContext('2d').getImageData(Math.floor(shell.width/2),shell.height-1,1,1).data[3],
    stage:[stage.clientWidth,stage.clientHeight],
    active:all.filter(c=>c.classList.contains('is-active')).map(c=>c.dataset.index),
    rimRadius:Number(getComputedStyle(document.querySelector('.lb-cylinder-v9')).getPropertyValue('--lb-card-width').replace('px','')),
    controlsBottom:document.querySelector('.lb-cylinder-controls').getBoundingClientRect().bottom,
    dockTop:(()=>{const dock=document.querySelector('.creative-dock');
      return dock && getComputedStyle(dock).display!=='none' ? dock.getBoundingClientRect().top : innerHeight;})()
   };
  });
  assert.equal(measure.cardCount,5,'Exactly five cards at '+width);
  if(width===1440 && height===900){
    const solidPixels=await page.locator('.lb-cylinder-body').evaluate(canvas=>{
      const ctx=canvas.getContext('2d');
      const a=ctx.getImageData(0,0,canvas.width,canvas.height).data;
      let solid=0;
      for(let p=3;p<a.length;p+=4)if(a[p]>118)solid++;
      return solid/(canvas.width*canvas.height);
    });
    assert.ok(solidPixels<.005,'No opaque giant cylinder shell behind the cards: '+solidPixels);
  }
  assert.equal(await page.locator('.lb-cylinder-segment').count(),0,'No segmented sliced cards');
  assert.equal(measure.sourceCount,5,'Only one intact native card replica per section at '+width);
  assert.equal(measure.active.length,1,'Single selected card at '+width);
  assert.equal(measure.active[0],'2','Screenplay first at '+width);
  assert.ok(measure.screenWidth<=width+2,'No page overflow at '+width);
  assert.ok(measure.shellCanvas[0]>0&&measure.shellCanvas[1]>0,'Canvas visible at '+width);
  assert.ok(measure.shellBottomAlpha<=2,'Floor shadow must fade out before the bottom edge at '+width);
  assert.ok(measure.controlsBottom <= Math.min(height,measure.dockTop)+4,
    'Rotation controls must appear above the fixed dock at '+width+'x'+height+': '+JSON.stringify(measure));
  assert.equal(await page.locator('.lb-cylinder-card .lb-cylinder-content').count(),5,'Five seamless editorial surfaces');
  await page.screenshot({path:resolve(dir,'cylinder-'+width+'x'+height+'.png'),fullPage:true});
  if(width===1200 && height===900){
   await page.locator('.lb-cylinder-next').click();
   await page.waitForTimeout(550);
   let current=await page.locator('.lb-cylinder-card.is-active').getAttribute('data-index');
   assert.equal(current,'3','Next arrow selects Visual');
   await page.locator('.lb-cylinder-prev').click();
   await page.waitForTimeout(550);
   current=await page.locator('.lb-cylinder-card.is-active').getAttribute('data-index');
   assert.equal(current,'2','Previous restores Screenplay');
   await page.locator('.lb-cylinder-stage').focus();
   await page.keyboard.press('ArrowLeft');
   await page.waitForTimeout(550);
   current=await page.locator('.lb-cylinder-card.is-active').getAttribute('data-index');
   assert.equal(current,'1','Keyboard left selects research');
   await page.locator('.lb-cylinder-stage').focus();
   await page.keyboard.press('ArrowRight');
   await page.waitForTimeout(550);
   current=await page.locator('.lb-cylinder-card.is-active').getAttribute('data-index');
   assert.equal(current,'2','Keyboard right restores screenplay');
   const stage=page.locator('.lb-cylinder-stage');
   const box=await stage.boundingBox();
   if(box){
    await page.mouse.move(box.x+box.width/2,box.y+box.height/2);
    await page.mouse.wheel(310,0);
    await page.waitForTimeout(700);
    const moved=await page.locator('.lb-cylinder-card.is-active').getAttribute('data-index');
    assert.notEqual(moved,'2','Horizontal wheel moves cylinder');
   }
   // Drag should rotate exactly once and must not open any workspace.
   await page.locator('.lb-cylinder-stage').focus();
   const dragBox=await page.locator('.lb-cylinder-stage').boundingBox();
   assert.ok(dragBox,'Drag stage exists');
   const midX=dragBox.x+dragBox.width*.5;
   const midY=dragBox.y+dragBox.height*.53;
   const beforeDrag=await page.locator('.lb-cylinder-card.is-active').getAttribute('data-index');
   await page.mouse.move(midX,midY);
   await page.mouse.down();
   await page.mouse.move(midX-260,midY,{steps:12});
   await page.mouse.up();
   await page.waitForTimeout(650);
   const afterDrag=await page.locator('.lb-cylinder-card.is-active').getAttribute('data-index');
   assert.notEqual(afterDrag,beforeDrag,'Dragging moves carousel selection');
   assert.equal(await page.locator('.story-atlas').isVisible(),true,'Drag must not open a workspace');
   // Test a REAL pointer click after centering the native Screenplay panel.
   for(let attempt=0;attempt<5;attempt++){
    const i=await page.locator('.lb-cylinder-card.is-active').getAttribute('data-index');
    if(i==='2')break;
    await page.locator('.lb-cylinder-prev').click();
    await page.waitForTimeout(150);
   }
   await page.waitForTimeout(550);
   await page.locator('.lb-cylinder-script').click();
   await page.waitForTimeout(450);
   const atlasVisible=await page.locator('.story-atlas').isVisible().catch(()=>false);
   assert.equal(atlasVisible,false,'Screenplay leaves Atlas through native action');
   const goBack=page.locator('.lb-cylinder-back');
   assert.ok(await goBack.isVisible(),'Atlas return control visible');
   await goBack.click();
   await page.locator('.lb-cylinder-v9').waitFor({state:'visible',timeout:5000});
   // World Building nested action must navigate to the original Locations view.
   for(let attempt=0;attempt<5;attempt++){
    const i=await page.locator('.lb-cylinder-card.is-active').getAttribute('data-index');
    if(i==='0')break;
    await page.locator('.lb-cylinder-prev').click();
    await page.waitForTimeout(150);
   }
   await page.waitForTimeout(550);
   await page.locator('.lb-cylinder-world .world-index button').nth(1).click();
   await page.waitForTimeout(450);
   assert.equal(await page.locator('.story-atlas').isVisible().catch(()=>false),false,
     'World Locations launches native workspace');
   await page.locator('.lb-cylinder-back').click();
   await page.locator('.lb-cylinder-v9').waitFor({state:'visible',timeout:5000});
   assert.equal(await page.locator('.lb-cylinder-card.is-active').getAttribute('data-index'),'0',
     'Return remembers selected World card');
   // Native React content changes are mirrored into the displayed Atlas.
   await page.evaluate(() => {
     const p=document.querySelector('.atlas-map .atlas-foundation .spark-note p');
     if(!p)throw new Error('Original React Foundation not found');
     p.textContent='CYLINDER QA - updated native premise';
   });
   await page.waitForFunction(()=>
     document.querySelector('.lb-cylinder-foundation .spark-note p')?.textContent?.includes('CYLINDER QA - updated native premise'),
     {timeout:3500}
   );
   // Remaining original workspace actions must remain functional, not simulated.
   for(const [index,selector] of [
     ['1','.lb-cylinder-research'],
     ['3','.lb-cylinder-visual'],
     ['4','.lb-cylinder-foundation']
   ]){
     for(let step=0;step<5;step++){
       const current=await page.locator('.lb-cylinder-card.is-active').getAttribute('data-index');
       if(current===index)break;
       await page.locator('.lb-cylinder-next').click();
       await page.waitForTimeout(95);
     }
     await page.waitForTimeout(420);
     assert.equal(await page.locator('.lb-cylinder-card.is-active').getAttribute('data-index'),index,
       'Select '+selector);
     await page.locator(selector).click();
     await page.waitForTimeout(340);
     assert.equal(await page.locator('.story-atlas').isVisible().catch(()=>false),false,
       selector+' navigates through native React');
     await page.locator('.lb-cylinder-back').click();
     await page.locator('.lb-cylinder-v9').waitFor({state:'visible',timeout:5000});
   }
   // Animation must not update every element in the document; five live cards only.
   const stats=await page.evaluate(async()=>{
     const next=document.querySelector('.lb-cylinder-next');
     const cards=[...document.querySelectorAll('.lb-cylinder-card')];
     const start=performance.now();let samples=0;let slow=0;let last=start;
     next.click();
     await new Promise(resolve=>{
       const frame=t=>{
         if(t-last>23)slow++;
         last=t;samples++;
         if(t-start<650)requestAnimationFrame(frame);else resolve();
       };
       requestAnimationFrame(frame);
     });
     return {samples,slow,replicas:document.querySelectorAll('.lb-cylinder-source').length,cards:cards.length};
   });
   assert.equal(stats.replicas,5,'Five complete native replicas and only five animated cards');
   assert.ok(stats.samples>12,'Browser rendered multiple frames');
  }
  results.push({width,height,status:'passed',measure,errors:browserErrors});
  if(browserErrors.length) errors.push({width,browserErrors});
  await page.close();
 }
} catch(error){
 results.push({status:'failed',error:String(error)});
 throw error;
} finally {
 await writeFile(resolve(dir,'results.json'),JSON.stringify({results,errors},null,2));
 await browser.close();
 await new Promise(done=>server.close(done));
 console.log('CYLINDER_QA_RESULTS '+JSON.stringify({results,errors}));
}
