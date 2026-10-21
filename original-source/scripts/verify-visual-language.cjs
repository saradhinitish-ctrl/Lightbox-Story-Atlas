const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict'),ts=require('typescript');
const {JSDOM}=require('jsdom');
const dom=new JSDOM('<!doctype html><html><body><div id="editor"></div></body></html>',{url:'https://desk.test',pretendToBeVisual:true});
for(const name of ['window','document','Node','Element','HTMLElement','HTMLDivElement','DOMParser','MutationObserver','DOMRect','Range','NodeFilter','getComputedStyle'])Object.defineProperty(globalThis,name,{value:dom.window[name],configurable:true});
Object.defineProperty(globalThis,'navigator',{value:dom.window.navigator,configurable:true});globalThis.requestAnimationFrame=fn=>setTimeout(fn,0);globalThis.cancelAnimationFrame=clearTimeout;
const rect={left:0,right:0,top:0,bottom:0,width:0,height:0,x:0,y:0,toJSON(){return this;}};
Range.prototype.getBoundingClientRect=()=>rect;Range.prototype.getClientRects=()=>[];
const cache=new Map();
function load(filename){filename=path.resolve(filename);if(cache.has(filename))return cache.get(filename).exports;const module={exports:{}};cache.set(filename,module);const code=ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText;
 const resolve=(name)=>{if(name.startsWith('@/'))return load(name.slice(2)+(/\.[tj]sx?$/.test(name)?'':fs.existsSync(name.slice(2)+'.ts')?'.ts':'.tsx'));if(name.startsWith('.')){let target=path.resolve(path.dirname(filename),name);if(!fs.existsSync(target)){if(fs.existsSync(target+'.ts'))target+='.ts';else if(fs.existsSync(target+'.tsx'))target+='.tsx';else target+='.js';}return load(target);}if(name==='tiptap-pagination-plus')return load('node_modules/tiptap-pagination-plus/dist/index.js');return require(name);};
 new Function('module','exports','require',code)(module,module.exports,resolve);return module.exports;
}

const model=load('lib/desk-model.ts'), director=load('lib/director-model.ts'), visual=load('lib/visual-language.ts');
const p=model.createProject('The last train'),doc=model.compileNodes(p)[0],originalDraft=model.activeDraftRoot(p).id;
doc.html='<p data-element="scene" data-scene-key="arrival">INT. WAITING ROOM — DUSK</p><p data-element="action">Mara waits beneath the only lamp still burning. Outside, the platform empties.</p><p data-element="scene" data-scene-key="platform">EXT. PLATFORM — NIGHT</p><p data-element="action">The last light goes out. A train arrives without a sound.</p><p data-element="scene" data-scene-key="carriage">INT. CARRIAGE — NIGHT</p><p data-element="action">She sits opposite a man who seems to know her.</p>';
const scenes=director.scenesForDraft(p),[a,b,c]=scenes.map(s=>s.id);
p.sceneBeats={[a]:{title:'The waiting room',summary:'A familiar place starts to feel unfamiliar.'},[b]:{title:'The empty platform'},[c]:{title:'A stranger in the carriage'}};
p.visualDirections={[a]:{intention:'Warmth that feels almost safe. Darkness quietly takes the edges.',opening:'A fragile sense of safety',closing:'The feeling of being watched',light:'One practical lamp. Let the corners fall away.',camera:'Hold the frame. Let the unease arrive before we move.'},[b]:{intention:'The world opens up, but the air becomes harder to breathe.'},[visual.FILM_BOARD]:{intention:'A quiet film about the distance between remembering and returning.'}};
p.moodboard=[
 {id:'frame',kind:'image',title:'A pool of light',text:'',purpose:'Take the small island of warmth, surrounded by a room we cannot fully see.',category:'light',scope:'scenes',sceneIds:[a,b],sceneId:a,source:'Lighting study · practical tungsten',size:'wide',asset:{id:'qa-frame',url:'/qa-frame.png',name:'Light.png',mime:'image/png',size:100}},
 {id:'note',kind:'note',title:'Let the room listen',text:'',purpose:'No rush to the next shot. Let the stillness become uncomfortable.',category:'atmosphere',scope:'scenes',sceneIds:[a],sceneId:a},
 {id:'palette',kind:'palette',title:'Warmth at the edge',text:'',purpose:'Amber, worn tobacco, and a blue that only enters at the edges.',colors:['#302e31','#74664f','#b88a4a','#d7bf8d','#8f9ca3'],scope:'scenes',sceneIds:[a],sceneId:a,category:'colour'},
 {id:'camera',kind:'shot',title:'Keep our distance',text:'',purpose:'A locked, slightly distant frame. No push-in until she looks toward the door.',scope:'scenes',sceneIds:[a],sceneId:a,category:'camera',moment:'Before the footsteps'},
 {id:'shared',kind:'note',title:'Restraint',text:'Leave room for the audience to look.',scope:'film'},
 {id:'legacy',kind:'note',title:'Legacy scene note',text:'Original material.',sceneId:b},
 {id:'orphan',kind:'note',title:'An earlier idea',text:'Keep this.',scope:'scenes',sceneIds:['old/scene']}
];
assert.equal(visual.referenceScope(p.moodboard[4]),'film');assert.equal(visual.referenceScope(p.moodboard[5]),'scenes');
assert.ok(visual.referenceInScene(p.moodboard[0],a)&&visual.referenceInScene(p.moodboard[0],b));assert.equal(visual.referenceInScene(p.moodboard[0],c),false);assert.equal(visual.referenceInScene(p.moodboard[4],a),false);
assert.ok(visual.referenceInBoard(p.moodboard[6],visual.UNFILED_BOARD,[a,b,c]));assert.ok(!visual.referenceInBoard(p.moodboard[0],visual.UNFILED_BOARD,[a,b,c]));
const unassigned=visual.assignReference(p.moodboard[0],'unassigned');assert.deepEqual(visual.referenceSceneIds(unassigned),[]);assert.ok(visual.referenceInBoard(unassigned,visual.UNFILED_BOARD,[a,b,c]));
const film=visual.assignReference(p.moodboard[0],'film');assert.equal(film.asset,p.moodboard[0].asset);assert.ok(visual.referenceInBoard(film,visual.FILM_BOARD,[a,b,c]));
const copy=model.createDraftVersion(p,'Draft 2'),newScenes=director.scenesForDraft(p),newA=newScenes[0].id,newB=newScenes[1].id;
assert.deepEqual(visual.referenceSceneIds(p.moodboard[0]),[a,b,newA,newB]);assert.deepEqual(p.visualDirections[newA],p.visualDirections[a]);p.visualDirections[newA].intention='Different intention';assert.notEqual(p.visualDirections[a].intention,p.visualDirections[newA].intention);
p.activeDraftId=originalDraft;const recoveredDoc=director.trashBeat(p,a),recoveredId=recoveredDoc+'/arrival';assert.ok(visual.referenceInScene(p.moodboard[0],recoveredId));assert.ok(visual.referenceInScene(p.moodboard[0],b));assert.ok(!visual.referenceInScene(p.moodboard[0],a));assert.equal(p.visualDirections[recoveredId].opening,'A fragile sense of safety');assert.ok(model.restoreNode(p,recoveredDoc));assert.ok(director.scenesForDraft(p).some(s=>s.id===recoveredId));
const recovered=structuredClone(p),map=new Map(recovered.nodes.map(n=>[n.id,'new-'+n.id]));visual.remapVisualDocuments(recovered,map);assert.ok(visual.referenceInScene(recovered.moodboard[0],'new-'+recoveredId));assert.ok(recovered.visualDirections['new-'+recoveredId]);assert.deepEqual(recovered.visualDirections[visual.FILM_BOARD],p.visualDirections[visual.FILM_BOARD]);
const w=model.emptyWorkspace();w.projects.push(p);const roundtrip=JSON.parse(JSON.stringify(w));assert.ok(model.validWorkspace(roundtrip));assert.deepEqual(roundtrip.projects[0].moodboard,p.moodboard);assert.deepEqual(roundtrip.projects[0].visualDirections,p.visualDirections);
for(const [field,value] of [['sceneIds','wrong'],['scope','other'],['category','vibes'],['mediaType','script'],['purpose',42],['size','giant']]){const bad=structuredClone(w);bad.projects[0].moodboard[0][field]=value;assert.equal(model.validWorkspace(bad),false,field);}
const bad=structuredClone(w);bad.projects[0].visualDirections[a]={intention:99};assert.equal(model.validWorkspace(bad),false);
assert.equal(visual.externalReferenceUrl('javascript:alert(1)'),'');assert.equal(visual.referenceEmbed('https://youtube.com.evil.test/watch?v=dQw4w9WgXcQ'),'');assert.equal(visual.referenceEmbed('https://youtu.be/dQw4w9WgXcQ'),'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ');assert.equal(visual.referenceEmbed('https://vimeo.com/123456'),'https://player.vimeo.com/video/123456');assert.equal(model.createProject('Another world').moodboard,undefined);
console.log('PASS: legacy ownership, explicit scene isolation, shared references, Film direction, unassigned recovery, draft copy, independent briefs, scene trash/restore, recovered document mapping, validation, roundtrip and safe media links');
