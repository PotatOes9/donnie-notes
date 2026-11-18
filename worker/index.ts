import {registrationStatements,visitorHash,validVisitorId,excludedVisitorAgent,type CounterStatement} from '../lib/visitor-counter.ts';
import {articleViewStatements} from '../lib/article-views.ts';
import {homeViewStatements,isHomePath} from '../lib/home-views.ts';
import {archive,healthHour,type ReportEnv} from './reports.ts';
import {dispatchNotionSync,type SyncEnv} from './github-sync.ts';

interface Statement {
 bind(...values:(string|number|null)[]):Statement;
 first<T=Record<string,unknown>>():Promise<T|null>;
 run():Promise<{success:boolean}>;
}
export interface Database {
 prepare(sql:string):Statement;
 batch<T=Record<string,unknown>>(statements:Statement[]):Promise<Array<{results:T[];success:boolean}>>;
}
interface Env extends ReportEnv,SyncEnv {
 DB:Database;
 PAGES_URL:string;
 TRACKING_ACTIVE?:string;
}
type Manifest={version:string;articleIds:string[];flags:{visitors:boolean;home:boolean;articles:boolean}};
const articleId=/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/;
let cache:{url:string;expires:number;manifest:Manifest}|undefined;
export async function publishedManifest(pagesUrl:string):Promise<Manifest>{
 const url=new URL(pagesUrl);
 if(url.protocol!=='https:'||url.username||url.password||url.search||url.hash)throw Error('Invalid Pages address');
 const location=url.href.replace(/\/$/,'')+'/data/analytics-manifest.json';
 if(cache?.url===location&&cache.expires>Date.now())return cache.manifest;
 const res=await fetch(location,{redirect:'error',signal:AbortSignal.timeout(7500)});
 if(!res.ok)throw Error('Published data is unavailable');
 const raw=await res.text();
 if(raw.length>100_000)throw Error('Invalid published data');
 const data=JSON.parse(raw) as Manifest;
 if(!/^[a-f0-9]{64}$/.test(data.version)||!Array.isArray(data.articleIds)||data.articleIds.length>2000||!data.articleIds.every(id=>articleId.test(id))||
  ['visitors','home','articles'].some(k=>typeof data.flags?.[k as keyof Manifest['flags']]!=='boolean'))throw Error('Invalid published data');
 cache={url:location,expires:Date.now()+120000,manifest:data};return data;
}
const pathToMetric={'/api/visitors':'visitors','/api/home-views':'home','/api/article-views':'articles'} as const;
const selectState='SELECT total,article_views AS articleViews,home_views AS homeViews,views_started_at AS articleViewsStartedAt,home_views_started_at AS homeViewsStartedAt FROM visitor_state WHERE id=1';
async function summary(db:Database){
 const state=await db.prepare(selectState).first<{total:number;articleViews:number;homeViews:number;articleViewsStartedAt:string|null;homeViewsStartedAt:string|null}>();
 if(!state||[state.total,state.articleViews,state.homeViews].some(x=>!Number.isSafeInteger(x)||x<0))throw Error('Statistics have not been initialized');
 return state;
}
async function execute(db:Database,statements:CounterStatement[]){
 const result=await db.batch(statements.map(x=>db.prepare(x.sql).bind(...x.values)));
 const row=result.at(-1)?.results[0];
 if(!row||result.some(x=>!x.success))throw Error('Counter transaction failed');
 return row;
}
// A request retry may keep the same event for up to 24 h. Records are retained for 7 days.
function freshEvent(value:unknown,now:number){
 return typeof value==='number'&&Number.isSafeInteger(value)&&value>=now-86400000&&value<=now+600000;
}
export async function handle(request:Request,env:Env){
 const url=new URL(request.url),origin=new URL(env.PAGES_URL).origin,requestOrigin=request.headers.get('origin');
 const metric=pathToMetric[url.pathname as keyof typeof pathToMetric];
 const headers={'Access-Control-Allow-Origin':origin,'Cache-Control':'no-store','Vary':'Origin','X-Content-Type-Options':'nosniff'};
 const send=(data:Record<string,unknown>,status=200)=>Response.json(data,{status,headers});
 if(url.pathname==='/health'&&request.method==='GET'){
  try{await summary(env.DB);return send({status:'ready',tracking:env.TRACKING_ACTIVE==='true'});}catch{return send({status:'unavailable'},503);}
 }
 if(!metric)return send({status:'unavailable'},404);
 if(requestOrigin!==origin)return send({status:'unavailable'},403);
 if(request.method==='OPTIONS')return new Response(null,{status:204,headers:{...headers,'Access-Control-Allow-Methods':'GET, POST, OPTIONS','Access-Control-Allow-Headers':'Content-Type','Access-Control-Max-Age':'600'}});
 if(request.method!=='POST'&&request.method!=='GET')return send({status:'unavailable'},405);
 try{
  if(request.method==='POST'&&excludedVisitorAgent(request.headers.get('user-agent')))return send({status:'excluded'});
  const manifest=await publishedManifest(env.PAGES_URL);
  if(!manifest.flags[metric])return send({status:'disabled'});
  if(request.method==='GET'){
   const data=await summary(env.DB);
   if(metric!=='articles')return send({status:'summary',...data});
   const id=url.searchParams.get('articleId')||'';
   if(!articleId.test(id)||!manifest.articleIds.includes(id))return send({status:'unavailable'},404);
   const row=await env.DB.prepare('SELECT total FROM article_view_totals WHERE article_id=?').bind(id).first<{total:number}>();
   return send({status:'summary',...data,articleId:id,postViews:row?.total||0});
  }
  if(env.TRACKING_ACTIVE!=='true')return send({status:'unavailable'},503);
  if(!request.headers.get('content-type')?.startsWith('application/json'))return send({status:'unavailable'},415);
  if(Number(request.headers.get('content-length')||0)>512)return send({status:'unavailable'},413);
  const reader=request.body?.getReader();if(!reader)return send({status:'unavailable'},400);
  let size=0,raw='';const decoder=new TextDecoder();
  for(;;){const {value,done}=await reader.read();if(done)break;
   size+=value.byteLength;if(size>512){await reader.cancel();return send({status:'unavailable'},413);}
   raw+=decoder.decode(value,{stream:true});
  }
  raw+=decoder.decode();
  let input;try{input=JSON.parse(raw);}catch{return send({status:'unavailable'},400);}
  const now=new Date(),req=crypto.randomUUID();
  if(metric==='visitors'){
   if(!validVisitorId(input?.visitorId))return send({status:'unavailable'},400);
   // Refuse to create new data until the migration's baseline has been verified.
   await summary(env.DB);
   const values=await execute(env.DB,registrationStatements(await visitorHash(input.visitorId),req,now));
   return send({status:'registered',...values,...await summary(env.DB)});
  }
  if(!validVisitorId(input?.eventId)||!freshEvent(input?.openedAt,now.getTime()))return send({status:'unavailable'},400);
  if(metric==='home'&&!isHomePath(input.pagePath))return send({status:'unavailable'},400);
  if(metric==='articles'&&(!articleId.test(input.articleId)||!manifest.articleIds.includes(input.articleId)))return send({status:'unavailable'},404);
  await summary(env.DB);
  const id=input.eventId.toLowerCase(),statements=metric==='home'?homeViewStatements(id,req,now):articleViewStatements(id,input.articleId,req,now);
  const row=await execute(env.DB,statements);
  return send({status:'recorded',...row});
 }catch{return send({status:'unavailable'},503);}
}

export default {
 fetch:handle,
 async scheduled(event:{scheduledTime:number;cron:string},env:Env){
  if(event.cron==='23 * * * *')await dispatchNotionSync(env,new Date(event.scheduledTime)).catch(error=>console.warn(error instanceof Error?error.message:'GitHub dispatch failed'));
  if(env.TRACKING_ACTIVE!=='true')return;
  if(event.cron==='23 * * * *'){
   try{const manifest=await publishedManifest(env.PAGES_URL);await summary(env.DB);
    if(!Object.values(manifest.flags).every(Boolean))return;
    await healthHour(env.DB,new Date(event.scheduledTime));
   }catch{console.warn('Counter health check failed');}
  }
  if(event.cron==='17 23 * * *'){
   const before=new Date(event.scheduledTime-7*86400000).toISOString();
   try{await env.DB.batch([
    env.DB.prepare('DELETE FROM article_view_events WHERE viewed_at<?').bind(before),
    env.DB.prepare('DELETE FROM home_view_events WHERE viewed_at<?').bind(before),
    env.DB.prepare('DELETE FROM counter_health WHERE hour<?').bind(new Date(event.scheduledTime-15*86400000).toISOString().slice(0,13)),
   ]);}catch{console.warn('Counter event cleanup stopped');}
   if(env.NOTION_REPORT_TOKEN&&env.NOTION_REPORT_SOURCE_ID)await archive(env,new Date(event.scheduledTime));
  }
 }
};
