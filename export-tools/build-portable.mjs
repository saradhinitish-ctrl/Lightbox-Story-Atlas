import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
const toolDir=path.dirname(fileURLToPath(import.meta.url));
const sourceDir=path.resolve(toolDir,'../original-source');
const deps=path.join(sourceDir,'node_modules');
const req=createRequire(path.join(toolDir,'package.json'));
const esbuild=req('esbuild');
const postcss=req('postcss');
const tw=req('@tailwindcss/postcss');
const work=path.join(toolDir,'.work');
const out=path.resolve(toolDir,'..');
fs.rmSync(work,{recursive:true,force:true});
fs.mkdirSync(work,{recursive:true});
for(const name of fs.readdirSync(sourceDir)){if(name==='node_modules'||name==='.git')continue;fs.cpSync(path.join(sourceDir,name),path.join(work,name),{recursive:true});}
fs.cpSync(path.join(toolDir,'overrides'),work,{recursive:true});
fs.symlinkSync(deps,path.join(work,'node_modules'),'junction');
await esbuild.build({absWorkingDir:work,entryPoints:['portable-entry.tsx'],outfile:out+'/script.js',bundle:true,format:'iife',platform:'browser',target:'es2022',jsx:'automatic',nodePaths:[deps],define:{'process.env.NODE_ENV':'"production"'},minify:false,legalComments:'eof',metafile:true});
if (!process.argv.includes('--scripts-only')) {
const layout=fs.readFileSync(work+'/app/layout.tsx','utf8');
const fonts=[...layout.matchAll(/import "(@fontsource\/[^"]+\.css)"/g)].map(m=>m[1]);
let css='';
for(const font of fonts)css+=`@import ${JSON.stringify(path.join(deps,font))};\n`;
for(const file of ['globals','atlas','typography','refinement','visual-language','public'])css+=`@import ${JSON.stringify(work+'/app/'+file+'.css')};\n`;
const processed=await postcss([tw({base:work})]).process(css,{from:work+'/portable.css'});
fs.writeFileSync(work+'/portable-processed.css',processed.css);
await esbuild.build({absWorkingDir:work,entryPoints:['portable-processed.css'],outfile:out+'/styles.css',bundle:true,loader:{'.woff2':'dataurl','.woff':'dataurl','.ttf':'dataurl','.png':'dataurl','.svg':'dataurl'},legalComments:'eof',minify:false});
const logo='data:image/png;base64,'+fs.readFileSync(work+'/public/brand/lightbox-approved-192.png').toString('base64');
if (!fs.existsSync(out+'/index.html')) fs.writeFileSync(out+'/index.html',`<!doctype html>\n<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"><meta name="theme-color" content="#f5efdf"><title>Lightbox — Portable workspace (v64)</title><link rel="icon" href="${logo}"><link rel="stylesheet" href="./styles.css"></head><body class="antialiased"><div id="root"></div><noscript>Enable JavaScript to use Lightbox.</noscript><script defer src="./script.js"></script></body></html>\n`);
}
fs.copyFileSync(work+'/app/screenplay-polish.css',out+'/screenplay-polish.css');
for (const file of (process.argv.includes('--scripts-only')?['script.js']:['script.js','styles.css'])) {const target=out+'/'+file;const value=fs.readFileSync(target,'utf8').replace(/[ \t]+$/gm,'').replace(/\r?\n/g,'\r\n');fs.writeFileSync(target,value);}
console.log('Portable bundle created. Existing hosting HTML preserved.');
