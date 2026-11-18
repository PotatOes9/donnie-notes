import {createHash} from 'node:crypto';
import {readFile,writeFile} from 'node:fs/promises';
const manifest=JSON.parse(await readFile('public/fonts/manifest.json','utf8'));
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
let index=0,downloaded=0;
await Promise.all(Array.from({length:6},async()=>{
 for(let i;(i=index++)<manifest.length;){
  const {file,url,sha256,bytes}=manifest[i],source=new URL(url);
  if(!/^noto-sans(?:-sc)?-[a-f0-9]+\.woff2$/.test(file)||source.origin!=='https://fonts.gstatic.com'||!source.pathname.endsWith('.woff2')||!/^[a-f0-9]{64}$/.test(sha256)||bytes>250000)throw Error('Invalid pinned font metadata');
  const path='public/fonts/'+file,verify=data=>data.length===bytes&&sha(data)===sha256;
  if(await readFile(path).then(verify,()=>false))continue;
  const response=await fetch(source,{redirect:'error',signal:AbortSignal.timeout(20000)});
  if(!response.ok)throw Error('A pinned font could not be downloaded');
  const data=Buffer.from(await response.arrayBuffer());if(!verify(data))throw Error('Pinned font integrity mismatch');
  await writeFile(path,data);downloaded++;
 }
}));
console.log('Verified '+manifest.length+' bundled font subsets ('+downloaded+' downloaded).');
