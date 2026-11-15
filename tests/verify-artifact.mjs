import {readFileSync,readdirSync,statSync} from 'node:fs';import {join} from 'node:path';import {createHash} from 'node:crypto';import assert from 'node:assert/strict';
import {buildDossier,readGameTree,htmlFacts,importMapOf,sourceImports,resolveGamePath} from '../vendor/makefun-threejs.ts';
const hash=b=>createHash('sha256').update(b).digest('hex');
const kit=process.env.BRASS_KIT??'C:/Users/zalta/AppData/Local/hermes/cache/scratch/threejs-fps-02-kit/starter';
for(const path of ['vendor/makefun-threejs.ts','game/vendor/three/three.module.min.js','game/vendor/three/three.core.min.js']){assert.equal(hash(readFileSync(path)),hash(readFileSync(join(kit,path))));console.log('UNCHANGED',path,hash(readFileSync(path)));}
const tree=readGameTree('game',{game_max_files:993,game_max_bytes:50331648,game_path_max_bytes:1000});const source=tree.files.filter(f=>f.cls==='source');const bytes=source.reduce((n,f)=>n+f.bytes,0);assert.ok(bytes<163840);console.log('SOURCE',source.length,bytes,'bytes; game entries',tree.count,'game bytes',tree.totalBytes);
const facts=htmlFacts(readFileSync('game/index.html','utf8'));assert.equal(facts.importMaps.length,1);const map=importMapOf(facts).map;assert.equal(map.imports.three,'./vendor/three/three.module.min.js');
for(const f of tree.files.filter(f=>/\.m?js$/.test(f.path)))for(const ref of sourceImports(readFileSync(join('game',f.path),'utf8'))){const target=resolveGamePath(ref==='three'?map.imports.three:ref,ref==='three'?'index.html':f.path);assert.ok(target,`${f.path}: ${ref}`);assert.ok(statSync(join('game',target)).isFile());}
for(const ref of [...facts.links.map(x=>x.href),...facts.scripts.filter(x=>x.src).map(x=>x.src)]){const target=resolveGamePath(ref,'index.html');assert.ok(target);assert.ok(statSync(join('game',target)).isFile());}
const caps={text_max_bytes:163840,screenshots:{max:4,max_bytes:262144},game_max_files:993,game_max_bytes:50331648,game_path_max_bytes:1000};
function walk(root,path=''){return readdirSync(join(root,path),{withFileTypes:true}).sort((a,b)=>a.name<b.name?-1:1).flatMap(e=>e.isDirectory()?walk(root,join(path,e.name)):[join(path,e.name)]);}
const a=walk('out/run-a'),b=walk('out/run-b');assert.deepEqual(a,b);for(const f of a)assert.equal(hash(readFileSync(join('out/run-a',f))),hash(readFileSync(join('out/run-b',f))),f);
const expected=buildDossier('out/run-a',caps),actual=readFileSync('out/run-a/dossier.json');assert.ok(Buffer.from(expected).equals(actual));assert.ok(actual.length<=1572864);const dossier=JSON.parse(actual);assert.equal(dossier.images.length,4);assert.ok(!dossier.text.includes('[Cut at'));
console.log('DETERMINISTIC',a.length,'files; dossier',actual.length,'bytes; sha256',hash(actual));console.log('LOCAL STRUCTURAL CHECKS PASS (not the sealed server gate)');
