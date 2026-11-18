import {spawnSync} from 'node:child_process';
import {readdir,stat,rm,readFile,appendFile} from 'node:fs/promises';
function run(args){const r=spawnSync(process.execPath,args,{stdio:'inherit'});if(r.status!==0)process.exit(r.status||1);}
await rm('public/media',{recursive:true,force:true});
run(['--experimental-strip-types','scripts/sync.ts']);
const data=JSON.parse(await readFile('.cache/snapshot.json','utf8'));
if(process.env.SKIP_UNCHANGED==='true'&&data.siteUrl&&!data.demo){
 const previous=await fetch(data.siteUrl+'/deployment.json',{cache:'no-store',signal:AbortSignal.timeout(5000)}).then(x=>x.ok?x.json():null).catch(()=>null);
 if(previous?.version===data.contentVersion){
  if(process.env.GITHUB_OUTPUT)await appendFile(process.env.GITHUB_OUTPUT,'changed=false\n');
  console.log('The current release already matches Notion and the code. No publishing needed.');
  process.exit(0);
 }
}
run(['scripts/fonts.mjs']);
run(['node_modules/vite/bin/vite.js','build']);
run(['node_modules/vite/bin/vite.js','build','--ssr','src/render.tsx','--outDir','.render']);
const {prerender}=await import('../.render/render.js');await prerender();
run(['scripts/verify-build.mjs']);
async function size(path){let total=0;for(const name of await readdir(path)){const file=path+'/'+name,s=await stat(file);total+=s.isDirectory()?await size(file):s.size;}return total;}
const bytes=await size('dist');if(bytes>800*1024*1024)throw Error('Static output exceeds the free deployment size guard');
if(process.env.GITHUB_OUTPUT)await appendFile(process.env.GITHUB_OUTPUT,'changed=true\n');
console.log('Static output ready: '+Math.ceil(bytes/1024/1024)+' MiB.');
