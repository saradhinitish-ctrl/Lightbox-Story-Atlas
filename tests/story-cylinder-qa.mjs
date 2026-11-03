// Story Cylinder VII browser smoke tests (isolated temp browser profile).
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
const sizes=[320,390,768,1200,1440,1920];
const sleep=(ms)=>new Promise(done=>setTimeout(done,ms));
try{
 for(const width of sizes){
  const page=await browser.newPage({viewport:{width,height:900},deviceScaleFactor:1});
  const browserErrors=[];
  page.on('pageerror', e=>browserErrors.push(e.message));
  page.on('console', e=>{if(e.type()==='error') browserErrors.push(e.text());});
  await page.goto('http://127.0.0.1:4173/index.html',{waitUntil:'domcontentloaded'});
  const skip=page.locator('.lb-opener__skip');
  if(await skip.isVisible().catch(()=>false))await skip.click().catch(()=>{});
  // Fresh profiles should initialize with a default project. If not, fail rather
  // than mutating or importing somebody else's saved data.
  try { await page.locator('.lb-cylinder-v7').waitFor({state:'visible',timeout:30000}); }
  catch(e) {
   const body=(await page.locator('body').innerText().catch(()=>''))?.slice(0,1200);
   await page.screenshot({path:resolve(dir, 'startup-'+width+'.png'),fullPage:true});
   throw new Error('Cylinder failed to mount at '+width+'px: '+body);
  }
  const measure=await page.evaluate(()=>{
   const all=[...document.querySelectorAll('.lb-cylinder-v7 .lb-cylinder-card')];
   const stage=document.querySelector('.lb-cylinder-stage');
   const shell=document.querySelector('.lb-cylinder-body');
   return {
    width:innerWidth,screenWidth:document.documentElement.scrollWidth,
    cardCount:all.length,sourceCount:document.querySelectorAll('.lb-cylinder-v7 .lb-cylinder-source').length,
    shellCanvas:[shell.width,shell.height],
    stage:[stage.clientWidth,stage.clientHeight],
    active:all.filter(c=>c.classList.contains('is-active')).map(c=>c.dataset.index),
    rimRadius:Number(getComputedStyle(document.querySelector('.lb-cylinder-v7')).getPropertyValue('--lb-card-width').replace('px',''))
   };
  });
  assert.equal(measure.cardCount,5,'Exactly five cards at '+width);
  assert.equal(measure.sourceCount,5,'One DOM representation per card at '+width);
  assert.equal(measure.active.length,1,'Single selected card at '+width);
  assert.equal(measure.active[0],'2','Screenplay first at '+width);
  assert.ok(measure.screenWidth<=width+2,'No page overflow at '+width);
  assert.ok(measure.shellCanvas[0]>0&&measure.shellCanvas[1]>0,'Canvas visible at '+width);
  await page.screenshot({path:resolve(dir,'cylinder-'+width+'.png'),fullPage:true});
  if(width===1200){
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
   // Card clicks must navigate through native React, not placeholder interfaces.
   await page.locator('.lb-cylinder-script').click({force:true});
   await page.waitForTimeout(450);
   const atlasVisible=await page.locator('.story-atlas').isVisible().catch(()=>false);
   assert.equal(atlasVisible,false,'Screenplay leaves Atlas');
   const goBack=page.locator('.lb-cylinder-back');
   if(await goBack.isVisible().catch(()=>false)){
    await goBack.click();
    await page.locator('.lb-cylinder-v7').waitFor({state:'visible',timeout:5000});
   }
  }
  results.push({width,status:'passed',measure,errors:browserErrors});
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
