import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import sharp from 'sharp';
import {contentHash,notionStorage,publicDownload} from './public-content.ts';
import {rideMapSvgDigests} from './ride-map-svgs.ts';

type AssetKind='cover'|'image'|'document'|'media';
const fileLimit=24*1024*1024,totalLimit=700*1024*1024;
const safeLocal=/^\/(?:images\/)?[a-zA-Z0-9_.-]+\.(?:svg|jpe?g|png|ico|webp)$/;
const safeExternal=(u:URL)=>u.protocol==='https:'&&!u.username&&!u.password&&!/(?:X-Amz-|[?&](?:token|signature|secret)=)/i.test(u.search);

export function localizeAssets(base:string){
 let publishedBytes=0;const seen=new Set<string>(),pending=new Map<string,Promise<string>>();
 const local=(url:string)=>base+url;
 async function localize(value:string,kind:AssetKind){
  if(safeLocal.test(value)){await readFile('public'+value);return local(value);}
  const u=new URL(value);
  // Stable external URLs stay external. Only known Notion file stores are read during a build.
  if(!notionStorage(u)){
   if(!safeExternal(u))throw Error('A published attachment requires a supported HTTPS URL');
   return u.href;
  }
  const cacheKey=kind+':'+u.origin+u.pathname;
  if(pending.has(cacheKey))return pending.get(cacheKey)!;
  const job=(async()=>{
   const response=await publicDownload(u.href);
   const mime=(response.headers.get('content-type')||'').toLowerCase().split(';')[0];
   if(!response.body||Number(response.headers.get('content-length')||0)>fileLimit)throw Error('An uploaded file is empty or above 24 MiB. Reduce its size in Notion.');
   const chunks:Uint8Array[]=[];let size=0;
   for await(const chunk of response.body){
    size+=chunk.length;if(size>fileLimit)throw Error('An uploaded file exceeds 24 MiB. Reduce its size in Notion.');
    chunks.push(chunk);
   }
   if(!size)throw Error('Empty uploaded file');
   let content=Buffer.concat(chunks),suffix='.bin';
   if(kind==='image'&&rideMapSvgDigests.has(contentHash(content))){
    suffix='.svg';
   }else if(kind==='cover'||kind==='image'){
    const image=sharp(content,{limitInputPixels:120_000_000,animated:true});
    const info=await image.metadata();
    if(!['jpeg','png','webp','gif','svg','heif','tiff'].includes(info.format||''))throw Error('Uploaded image format is unsupported');
    if((info.pages||1)>150)throw Error('An animated image exceeds 150 frames');
    const width=kind==='cover'?1600:2560;
    content=await image.rotate().resize({width,height:width,fit:'inside',withoutEnlargement:true}).webp({quality:kind==='cover'?85:90}).toBuffer();
    suffix='.webp';
   }else if(content.subarray(0,5).toString()==='%PDF-')suffix='.pdf';
   else if(content.subarray(4,8).toString()==='ftyp')suffix=mime.startsWith('audio/')?'.m4a':'.mp4';
   else if(content.subarray(0,3).toString()==='ID3'||mime==='audio/mpeg')suffix='.mp3';
   else if(content.subarray(0,4).equals(Buffer.from([26,69,223,163]))&&mime.includes('webm'))suffix='.webm';
   else if(content.subarray(0,4).toString()==='OggS')suffix='.ogg';
   else if(content.subarray(0,4).toString()==='RIFF'&&content.subarray(8,12).toString()==='WAVE')suffix='.wav';
   // Never host untrusted HTML/SVG documents with executable MIME types on the site.
   if(kind==='media'&&suffix==='.bin')throw Error('Uploaded audio or video format is unsupported');
   const name=contentHash(content).slice(0,40)+suffix;
   if(!seen.has(name)){
    publishedBytes+=content.length;if(publishedBytes>totalLimit)throw Error('Uploaded assets exceed the 700 MiB safety limit for free hosting');
    await mkdir('public/media',{recursive:true});await writeFile(join('public/media',name),content);seen.add(name);
   }
   return local('/media/'+name);
  })();
  pending.set(cacheKey,job);return job;
 }
 return {localize,report:()=>({files:seen.size,bytes:publishedBytes})};
}
