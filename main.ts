// BRASS TIDE: deterministic artifact handoff. Node 22+, standard library only.
import {cpSync,mkdirSync,readdirSync,lstatSync,writeFileSync,rmSync} from 'node:fs';
import {join,resolve,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {buildDossier} from './vendor/makefun-threejs.ts';
const root=fileURLToPath(new URL('.',import.meta.url));
const output=resolve(process.env.MAKEFUN_OUTPUT_DIR??'/output');
if(output===resolve(root))throw new Error('Output must not be the repository root');
function copyTree(from:string,to:string){
 mkdirSync(to,{recursive:true});
 for(const name of readdirSync(from).sort()){
  const source=join(from,name),target=join(to,name),stat=lstatSync(source);
  if(stat.isSymbolicLink())throw new Error(`Symlink refused: ${source}`);
  if(stat.isDirectory())copyTree(source,target);
  else if(stat.isFile())cpSync(source,target);
  else throw new Error(`Special file refused: ${source}`);
 }
}
const shotCount=readdirSync(join(root,'screenshots')).filter(n=>!n.startsWith('.')).length;
if(shotCount<3||shotCount>4)throw new Error('Exactly 3 or 4 real screenshots are required');
// Refresh only our output subtrees, never arbitrary files beside them.
for(const name of ['game','screenshots']){
 if(output===resolve(root,name)||output.startsWith(resolve(root,name)+sep))throw new Error('Output overlaps source assets');
 rmSync(join(output,name),{recursive:true,force:true});
}
copyTree(join(root,'game'),join(output,'game'));
copyTree(join(root,'screenshots'),join(output,'screenshots'));
const dossier=buildDossier(output,{text_max_bytes:163840,screenshots:{max:4,max_bytes:262144},game_max_files:993,game_max_bytes:50331648,game_path_max_bytes:1000});
if(dossier.byteLength>1572864)throw new Error('Dossier exceeds competition limit');
writeFileSync(join(output,'dossier.json'),dossier);
console.log(`BRASS TIDE artifact ready: ${dossier.byteLength} dossier bytes`);
