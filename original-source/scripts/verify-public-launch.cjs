const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),ts=require('typescript');
const React=require('react'),{renderToStaticMarkup}=require('react-dom/server');
let identity=new Headers();
const archiveOwner='archive-owner';
const cache=new Map();
function load(file){file=path.resolve(file);if(cache.has(file))return cache.get(file).exports;const module={exports:{}};cache.set(file,module);const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText;const resolve=name=>{
  if(name==='next/headers')return {headers:async()=>identity};
  if(name==='next/navigation')return {redirect:to=>{throw Error('REDIRECT:'+to);}};
  if(name==='cloudflare:workers')return {env:{LIGHTBOX_ARCHIVE_OWNER_ID:archiveOwner}};
  if(name==='@/components/writing-studio')return {default:props=>React.createElement('div',{'data-account':props.accountUserId})};
  if(name.startsWith('@/'))return local(name.slice(2));
  if(name.startsWith('.'))return local(path.resolve(path.dirname(file),name));
  return require(name);
};function local(target){if(!fs.existsSync(target))target+=fs.existsSync(target+'.ts')?'.ts':'.tsx';return load(target);}new Function('module','exports','require',code)(module,module.exports,resolve);return module.exports;}

(async()=>{
  const home=load('app/page.tsx'),join=load('app/join/page.tsx'),studio=load('app/studio/page.tsx');
  const html=renderToStaticMarkup(await home.default());
  assert.match(html,/A WORKSPACE FOR FILMMAKERS/);assert.match(html,/Sign up/);assert.match(html,/href="\/join"/);assert.match(html,/ILLUSTRATIVE PROJECT/);assert.doesNotMatch(html,/Session Vault|workspace projects/);
  const signup=renderToStaticMarkup(await join.default());assert.match(signup,/Continue with ChatGPT/);assert.match(signup,/signin-with-chatgpt\?return_to=%2Fstudio/);assert.match(signup,/target="_top"/);assert.match(signup,/workspace starts empty/);
  await assert.rejects(studio.default(),/REDIRECT:\/signin-with-chatgpt\?return_to=%2Fstudio/);
  identity=new Headers({'oai-authenticated-user-id':'new-writer','oai-authenticated-user-email':'writer@example.test'});
  await assert.rejects(home.default(),/REDIRECT:\/studio/);await assert.rejects(join.default(),/REDIRECT:\/studio/);
  const fresh=await studio.default();assert.equal(fresh.props.accountUserId,'new-writer');assert.equal(fresh.props.allowLegacyArchive,false);
  identity=new Headers({'oai-authenticated-user-id':archiveOwner,'oai-authenticated-user-email':'owner@example.test'});
  assert.equal((await studio.default()).props.allowLegacyArchive,true);
  const access=load('lib/archive-access.ts');
  for(const p of ['/legacy','/legacy/session-vault.json','/legacy/vault-files/draft.pdf','/session-vault.json','/vault-files/draft.pdf','/legacy%2fsession-vault.json','/x%2f..%2flegacy/session-vault.json']){
    assert.equal(access.isPrivateArchivePath(p),true,p);
    const request=user=>new Request('https://lightbox.test'+p,{headers:user?{'oai-authenticated-user-id':user}:{}});
    assert.equal(access.checkArchiveAccess(request(),archiveOwner).status,404,p);
    assert.equal(access.checkArchiveAccess(request('new-writer'),archiveOwner).status,404,p);
    assert.equal(access.checkArchiveAccess(request(archiveOwner),archiveOwner),null,p);
    assert.equal(access.checkArchiveAccess(request(archiveOwner),undefined).status,404,p);
  }
  for(const p of ['/','/studio','/join','/brand/lightbox-approved-192.png','/api/workspace'])assert.equal(access.isPrivateArchivePath(p),false,p);
  const {servePrivateArchive}=load('lib/private-archive.ts');
  const archiveRequest=user=>new Request('https://lightbox.test/legacy/session-vault.json',{headers:user?{'oai-authenticated-user-id':user}:{}});
  assert.equal(servePrivateArchive(archiveRequest(),'/legacy/session-vault.json').status,404);
  assert.equal(servePrivateArchive(archiveRequest('new-writer'),'/legacy/session-vault.json').status,404);
  const allowed=servePrivateArchive(archiveRequest(archiveOwner),'/legacy/session-vault.json');assert.equal(allowed.status,200);assert.equal(allowed.headers.get('Cache-Control'),'private, no-store');assert.ok(Array.isArray((await allowed.json()).entries));
  for(const file of ['public/legacy/session-vault.json','public/session-vault.json','public/vault-files'])assert.equal(fs.existsSync(file),false,'Private files must not be public assets');
  assert.match(fs.readFileSync('public/robots.txt','utf8'),/Sitemap: https:\/\/filmmaker-os-nitish\.beigeleaf64\.chatgpt\.site\/sitemap.xml/);
  assert.equal(studio.metadata.robots.index,false);
  console.log('PASS: public homepage, top-level signup, anonymous redirect, signed-in routing, new-account isolation, owner-only archive including encoded paths, and search metadata');
})().catch(e=>{console.error(e);process.exitCode=1;});
