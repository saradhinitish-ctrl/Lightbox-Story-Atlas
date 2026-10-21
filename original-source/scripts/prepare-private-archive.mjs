import {readFileSync,readdirSync,writeFileSync} from 'node:fs';
import {join,relative} from 'node:path';
const root='private-archive';
const types={'.json':'application/json; charset=utf-8','.html':'text/html; charset=utf-8','.js':'application/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.pdf':'application/pdf','.webmanifest':'application/manifest+json; charset=utf-8'};
const assets={};
function walk(dir){for(const entry of readdirSync(dir,{withFileTypes:true})){const file=join(dir,entry.name);if(entry.isDirectory())walk(file);else if(entry.isFile()){const ext=entry.name.slice(entry.name.lastIndexOf('.'));assets['/'+relative(root,file).replaceAll('\\','/')]= {type:types[ext]||'application/octet-stream',body:readFileSync(file).toString('base64')};}else throw Error('Archive contains unsupported file type');}}
walk(root);
writeFileSync('lib/private-archive.generated.ts','// Generated server-only archive. Run scripts/prepare-private-archive.mjs.\nexport const archiveAssets:Record<string,{type:string;body:string}>='+JSON.stringify(assets)+';\n');
console.log('Prepared '+Object.keys(assets).length+' private archive files for authenticated routes.');
