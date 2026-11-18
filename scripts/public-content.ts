import {createHash} from 'node:crypto';
import {lookup} from 'node:dns/promises';
import {isIP} from 'node:net';
import type {NotionObject} from '../lib/notion-core.ts';
export function escapeJson(value:unknown){return JSON.stringify(value).replace(/</g,'\\u003c').replace(/\u2028/g,'\\u2028').replace(/\u2029/g,'\\u2029');}
export function contentHash(value:unknown){return createHash('sha256').update(value instanceof Uint8Array?value:typeof value==='string'?value:JSON.stringify(value)).digest('hex');}
export function privateAddress(ip:string){
 if(ip.includes(':'))return !/^2[0-9a-f]{3}:/i.test(ip)||/^2001:(db8|0):/i.test(ip);
 const p=ip.split('.').map(Number);return p.length!==4||p.some(x=>!Number.isInteger(x)||x<0||x>255)||[0,10,127].includes(p[0])||p[0]>=224||p[0]===169&&p[1]===254||p[0]===172&&p[1]>=16&&p[1]<=31||p[0]===192&&(p[1]===168||p[1]===0)||p[0]===100&&p[1]>=64&&p[1]<=127||p[0]===198&&[18,19].includes(p[1]);
}
export function notionStorage(u:URL){
 const host=u.hostname;
 return u.protocol==='https:'&&!u.username&&!u.password&&(!u.port||u.port==='443')&&
  (/(^|\.)notion-static\.com$/.test(host)||/^(?:file|files|img)\.notion\.(?:so|com)$/.test(host)||
  /^prod-files-secure\.(?:s3(?:[.-][a-z0-9-]+)?|[a-z0-9-]+)\.amazonaws\.com$/.test(host)||
  /^s3(?:[.-][a-z0-9-]+)?\.amazonaws\.com$/.test(host)&&/^\/(?:secure\.notion-static\.com|prod-files-secure)\//.test(u.pathname));
}
export async function publicDownload(value:string):Promise<Response>{
 let url=new URL(value);
 for(let hop=0;hop<5;hop++){
  if(!notionStorage(url))throw Error('Notion asset storage host is unsupported');
  const host=url.hostname.replace(/^\[|\]$/g,'');
  const addresses=isIP(host)?[{address:host}]:await lookup(host,{all:true});
  if(!addresses.length||addresses.some(x=>privateAddress(x.address)))throw Error('Private asset address rejected');
  const response=await fetch(url,{redirect:'manual',signal:AbortSignal.timeout(30000)});
  if([301,302,303,307,308].includes(response.status)){const next=response.headers.get('location');if(!next)throw Error('Incomplete asset redirect');url=new URL(next,url);continue;}
  if(!response.ok)throw Error('A published asset could not be downloaded: HTTP '+response.status);
  return response;
 }
 throw Error('Too many asset redirects');
}
const allowedData=new Set(['rich_text','caption','color','is_toggleable','language','expression','checked','has_column_header','has_row_header','cells','width_ratio','name','url','type','icon','synced_from','page_id','page','mention']);
function rich(items:any[]=[]){return items.map(x=>({type:x.type,plain_text:x.plain_text,annotations:x.annotations,href:x.href,text:x.text?{content:x.text.content,link:x.text.link?{url:x.text.link.url}:null}:undefined,equation:x.equation,mention:x.mention?{type:x.mention.type,page:x.mention.page?{id:x.mention.page.id}:undefined,date:x.mention.date?{start:x.mention.date.start,end:x.mention.date.end}:undefined}:undefined}));}
export function publicBlock(block:NotionObject):NotionObject{
 const type=String(block.type),raw=block[type]||{},data:Record<string,unknown>={};
 if(['child_page','child_database'].includes(type)||type==='synced_block'&&raw.synced_from!==null)return {id:block.id,type,[type]:{},children:[]};
 for(const [key,value] of Object.entries(raw))if(allowedData.has(key)){
  if(key==='rich_text'||key==='caption')data[key]=rich(value as any[]);
  else if(key==='cells')data[key]=(value as any[][]).map(rich);
  else if(key==='icon'){const icon=value as any;data.icon=icon?.type==='emoji'?{type:'emoji',emoji:icon.emoji}:{type:icon?.type,staticSrc:icon?.staticSrc};}
  else data[key]=value;
 }
 return {id:block.id,type,[type]:data,staticSrc:block.staticSrc,children:(block.children||[]).filter((x:any)=>!x.archived&&!x.in_trash).map(publicBlock)};
}
export function validatePublicSnapshot(value:unknown){
 const json=JSON.stringify(value);
 if(/(?:X-Amz-(?:Credential|Signature)|"(?:token|encrypted_config|owner_id|created_by|last_edited_by|visitorId|browser_hash)"\s*:)/i.test(json)||/(?:ntn_|secret_)[A-Za-z0-9_-]{24,}/.test(json))throw Error('Private or temporary material in public snapshot');
}
export function publicationIsProtected(page:NotionObject){
 return Object.entries(page.properties||{}).some(([name,prop])=>{
  if(!/^(?:password|passcode|密码|密碼|パスワード)$/i.test(name.trim()))return false;
  const setting=prop as NotionObject;
  return (setting[setting.type]||[]).some?.((item:NotionObject)=>String(item.plain_text??item.text?.content??'').trim().length>0)??Boolean(setting[setting.type]);
 });
}
