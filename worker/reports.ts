import {visitorDay} from '../lib/visitor-counter.ts';
import type {Database} from './index.ts';
const DAY=86400000,HOUR=3600000;
type State={total:number;home_views:number;article_views:number;started_at:string;home_views_started_at:string|null;views_started_at:string|null};
type Daily={date:string;new_visitors:number;home_views:number;article_views:number};
export type Report={date:string;newVisitors:number;endVisitors:number;home:number|null;endHome:number|null;articles:number|null;endArticles:number|null};
export interface ReportEnv{
 DB:Database;
 NOTION_REPORT_TOKEN?:string;
 NOTION_REPORT_SOURCE_ID?:string;
 REPORTS_ACTIVE?:string;
}
const safe=(n:unknown):n is number=>typeof n==='number'&&Number.isSafeInteger(n)&&n>=0;
function enabledDay(value:string|null,now:Date){
 if(!value||!Number.isFinite(Date.parse(value))||Date.parse(value)>now.getTime())throw Error('A metric is not initialized');
 return visitorDay(new Date(value));
}
function completeDay(day:string,healthy:Set<string>){
 const start=Date.parse(day+'T00:00:00+09:00');
 return Array.from({length:24},(_,hour)=>new Date(start+hour*HOUR).toISOString().slice(0,13)).every(hour=>healthy.has(hour));
}
export function reportsForDays(state:State,daily:Daily[],hours:string[],now:Date):Report[]{
 const today=visitorDay(now),first=visitorDay(new Date(now.getTime()-7*DAY));
 const totals=[state.total,state.home_views,state.article_views];
 if(totals.some(x=>!safe(x)))throw Error('Invalid current counters');
 const started=[enabledDay(state.started_at,now),enabledDay(state.home_views_started_at,now),enabledDay(state.views_started_at,now)];
 const rows=new Map<string,number[]>();
 for(const {date,new_visitors,home_views,article_views} of daily){
  const values=[new_visitors,home_views,article_views];
  if(date<first||date>today||!/^\d{4}-\d{2}-\d{2}$/.test(date)||new Date(date+'T00:00:00Z').toISOString().slice(0,10)!==date||rows.has(date)||
   values.some((x,i)=>!safe(x)||x>totals[i]||date<started[i]&&x>0))throw Error('Incomplete or inconsistent daily counts');
  rows.set(date,values);
 }
 const healthy=new Set(hours),out:Report[]=[];
 const ending=[...totals];
 for(let n=0;n<=7;n++){
  const date=visitorDay(new Date(now.getTime()-n*DAY)),d=rows.get(date)||[0,0,0];
  if(d.some((x,i)=>x>ending[i]))throw Error('Daily counts exceed current totals');
  if(n!==0&&date>=started[0]&&completeDay(date,healthy))out.push({date,newVisitors:d[0],endVisitors:ending[0],
   home:date>=started[1]?d[1]:null,endHome:date>=started[1]?ending[1]:null,
   articles:date>=started[2]?d[2]:null,endArticles:date>=started[2]?ending[2]:null});
  d.forEach((x,i)=>ending[i]-=x);
 }
 return out.reverse();
}
export async function healthHour(db:Database,at:Date){
 const result=await db.prepare('INSERT OR IGNORE INTO counter_health (hour) VALUES (?)').bind(at.toISOString().slice(0,13)).run();
 if(!result.success)throw Error('Cannot record counter health');
}
const field=(name:string,type:string)=>({name,type});
const props=[field('记录','title'),field('统计日期','date'),field('新增访客','number'),field('累计访客','number'),
 field('主页浏览量','number'),field('累计主页浏览量','number'),field('文章浏览量','number'),field('累计文章浏览量','number'),
 field('时区','rich_text'),field('数据来源','rich_text'),field('归档时间','date'),field('备注','rich_text')];
const uuid=/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/;
const line=(content:string)=>[{type:'text',text:{content}}];
export async function archive(env:ReportEnv,now:Date){
 if(env.REPORTS_ACTIVE!=='true')return;
 const id=env.NOTION_REPORT_SOURCE_ID,token=env.NOTION_REPORT_TOKEN;
 if(!id||!uuid.test(id)||!token)throw Error('Reports connection is missing');
 const first=visitorDay(new Date(now.getTime()-7*DAY)),today=visitorDay(now),hour0=new Date(first+'T00:00:00+09:00').toISOString().slice(0,13);
 const results=await env.DB.batch([
  env.DB.prepare('SELECT total,home_views,article_views,started_at,home_views_started_at,views_started_at FROM visitor_state WHERE id=1'),
  env.DB.prepare('SELECT date,new_visitors,home_views,article_views FROM visitor_daily WHERE date>=? AND date<=? ORDER BY date').bind(first,today),
  env.DB.prepare('SELECT hour FROM counter_health WHERE hour>=? ORDER BY hour').bind(hour0)
 ]);
 if(results.some(x=>!x.success)||results[0].results.length!==1)throw Error('Statistics snapshot is unavailable');
 const rows=reportsForDays(results[0].results[0] as State,results[1].results as Daily[],results[2].results.map(x=>String(x.hour)),now);
 if(!rows.length)return;
 let prior=0;
 async function notion(path:string,method='GET',body?:unknown){
  const wait=350-(Date.now()-prior);if(wait>0)await new Promise(r=>setTimeout(r,wait));
  prior=Date.now();
  const response=await fetch('https://api.notion.com/v1/'+path,{method,redirect:'error',headers:{Authorization:'Bearer '+token,'Notion-Version':'2025-09-03','Content-Type':'application/json'},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(8000)});
  if(!response.ok)throw Error('Notion report operation failed: HTTP '+response.status);
  return response.json() as Promise<any>;
 }
 const schema=await notion('data_sources/'+id);
 if(!schema||schema.id!==id||props.some(p=>schema.properties?.[p.name]?.type!==p.type))throw Error('Notion report schema does not match');
 const query=async(date:string)=>{
  const result=await notion('data_sources/'+id+'/query','POST',{
   page_size:2,filter:{property:'统计日期',date:{equals:date}}
  });
  if(!Array.isArray(result.results)||result.has_more!==false||result.results.length>1)throw Error('Duplicate or incomplete Notion report rows');
  const page=result.results[0];
  if(page&&(!uuid.test(page.id)||page.properties?.['统计日期']?.date?.start!==date))throw Error('Unexpected Notion report date');
  return page;
 };
 const existing=new Map();
 for(const row of rows)existing.set(row.date,await query(row.date));
 for(const row of rows){
  const old=existing.get(row.date),properties={
   '记录':{title:line(row.date+'｜访客日报')},'统计日期':{date:{start:row.date}},
   '新增访客':{number:row.newVisitors},'累计访客':{number:row.endVisitors},
   '主页浏览量':{number:row.home},'累计主页浏览量':{number:row.endHome},
   '文章浏览量':{number:row.articles},'累计文章浏览量':{number:row.endArticles},
   '时区':{rich_text:line('Asia/Tokyo')},'数据来源':{rich_text:line('博客实时计数｜访客、主页与文章分别统计')},
   '归档时间':{date:{start:new Date().toISOString()}},'备注':{rich_text:line('已完成日期的自动归档（各项启用前留空）')},
  };
  await (old?notion('pages/'+old.id,'PATCH',{properties}):notion('pages','POST',{parent:{type:'data_source_id',data_source_id:id},properties}));
  const result=await query(row.date);
  if(!result||Object.entries(properties).some(([name,v])=>'number' in v&&result.properties?.[name]?.number!==v.number))throw Error('Archived counters did not verify');
 }
 console.log('Verified '+rows.length+' completed Tokyo-day reports');
}
