import {readdir,readFile,stat} from 'node:fs/promises';
import {join,resolve,sep} from 'node:path';
const root=resolve('dist');
const stored=JSON.parse(await readFile('.cache/snapshot.json','utf8'));
const base=stored.basePath;
const shipping=JSON.parse(await readFile('dist/deployment.json','utf8'));
if(shipping.version!==stored.contentVersion||shipping.articles!==stored.articles.length)throw Error('The release marker does not match the validated snapshot');
const feed=JSON.parse(await readFile('dist/data/feed.json','utf8'));
if(feed.mode!==(stored.demo?'demo':'live')||feed.articles.length!==stored.articles.length||feed.articles.some(x=>x.blocks))throw Error('Invalid public search index');
const verified=new Set();
async function verifyRef(input){
 const path=input.split(/[?#]/,1)[0];
 if(!path.startsWith('/')||path.startsWith('//'))return;
 if(base&&!(path===base||path.startsWith(base+'/')))throw Error('A site link leaves the configured GitHub Pages path');
 const relative=decodeURIComponent(path.slice(base.length)).replace(/^\/+/,'');
 if(/^api\//.test(relative))throw Error('A page still calls a Sites-only endpoint');
 const file=resolve(root,relative);
 if(file!==root&&!file.startsWith(root+sep))throw Error('A link points outside the static output');
 if(verified.has(file))return;
 const entry=await stat(file);
 if(entry.isDirectory())await stat(join(file,'index.html'));
 verified.add(file);
}
let pages=0,localPdfs=0;
async function verifyFolder(dirname){
 for(const item of await readdir(dirname,{withFileTypes:true})){
  const path=join(dirname,item.name);
  if(item.isSymbolicLink())throw Error('A symlink would make the Pages archive invalid');
  if(item.isDirectory()){await verifyFolder(path);continue;}
  if(item.name.endsWith('.pdf')){
   localPdfs++;if((await readFile(path)).subarray(0,5).toString()!=='%PDF-')throw Error('Invalid PDF asset');
  }
  if(item.name.endsWith('.html')){
   const html=await readFile(path,'utf8');
   // Search Console expects a plain-text file at the project root, not a blog page.
   if(dirname===root&&/^google[0-9a-f]{16}\.html$/.test(item.name)){
    if(html.replace(/\r?\n$/,'')!==`google-site-verification: ${item.name}`)throw Error('Invalid Search Console verification file');
    continue;
   }
   pages++;
   if(!html.includes('id="donnie-data"')||!/<h1(?:\s[^>]*)?>/.test(html)||/X-Amz-(?:Signature|Credential)=|"(?:browser_hash|encrypted_config)"\s*:/i.test(html))throw Error('An HTML output is missing content or contains temporary credentials');
   const rendered=html.replace(/<script id="donnie-data"[\s\S]*?<\/script>/,'');
   for(const [,ref] of rendered.matchAll(/(?:src|href)="([^"]+)"/g))await verifyRef(ref);
  }else if(path.endsWith('.css')){
   for(const [,ref] of (await readFile(path,'utf8')).matchAll(/url\(["']?(\/[^"')]+)/g))await verifyRef(ref);
  }
 }
}
await verifyFolder(root);
if(pages!==(4+stored.articles.length)*4+1)throw Error('Homepage, archive, about, settings or language-specific article routes are missing');
console.log('Checked '+pages+' routes, '+verified.size+' local links/assets and '+localPdfs+' bundled PDFs.');
