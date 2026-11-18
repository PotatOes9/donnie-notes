import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {handle,type Database} from '../worker/index.ts';
import {reportsForDays} from '../worker/reports.ts';

const homeOrigin='https://one-pages.test',article='4b2560a1-4b9e-4d43-91a7-200b4688195c',none='520f56a1-4b9e-4d43-91a7-200b4688195c';
test('Separate site counters reject other origins and unlisted posts, and retry once',async()=>{
 const db=new DatabaseSync(':memory:');
 db.exec(readFileSync(new URL('../worker/schema.sql',import.meta.url),'utf8'));
 db.prepare('INSERT INTO visitor_state(id,total,started_at,updated_at,home_views_started_at,views_started_at) VALUES(1,0,?,?,?,?)').run(...Array(4).fill('2026-11-12T00:00:00Z'));
 const binding={
  prepare(sql:string){
   let values: any[]=[];
   return {
    bind(...x:any[]){values=x;return this;},
    async first(){return db.prepare(sql).get(...values)||null;},
    async run(){db.prepare(sql).run(...values);return {success:true};},
    query(){return {results:db.prepare(sql).all(...values),success:true};}
   };
  },
  async batch(statements:any[]){
   db.exec('BEGIN IMMEDIATE');try{const r=statements.map(s=>s.query());db.exec('COMMIT');return r;}
   catch(error){db.exec('ROLLBACK');throw error;}
  }
 } as Database;
 const original=globalThis.fetch,env={DB:binding,PAGES_URL:homeOrigin+'/blog',TRACKING_ACTIVE:'true'};
 globalThis.fetch=async(input)=>{
  assert.equal(String(input),homeOrigin+'/blog/data/analytics-manifest.json');
  return Response.json({version:'a'.repeat(64),articleIds:[article],flags:{visitors:true,home:true,articles:true}});
 };
 const call=(path:string,body?:Record<string,unknown>,origin=homeOrigin,agent='Mozilla/5.0')=>handle(new Request('https://counter.test'+path,{method:body?'POST':'GET',headers:{origin,'user-agent':agent,...(body?{'content-type':'application/json'}:{})},body:body?JSON.stringify(body):undefined}),env);
 try{
  const event={eventId:crypto.randomUUID(),openedAt:Date.now()},browser=crypto.randomUUID();
  assert.equal((await call('/api/visitors',{visitorId:browser},'https://other.test')).status,403);
  assert.equal((await call('/api/article-views',{...event,articleId:none})).status,404);
  assert.equal((await call('/api/home-views',{...event,pagePath:'/ja/post/'+article})).status,400);
  assert.equal((await call('/api/home-views',{...event,pagePath:'/ja'},homeOrigin,'Googlebot')).status,200);
  await call('/api/visitors',{visitorId:browser});await call('/api/visitors',{visitorId:browser});
  await call('/api/home-views',{...event,pagePath:'/ja'});await call('/api/home-views',{...event,pagePath:'/ja'});
  await call('/api/article-views',{...event,eventId:crypto.randomUUID(),articleId:article});
  assert.deepEqual([...(await call('/api/visitors').then(r=>r.json()).then(js=>[js.total,js.homeViews,js.articleViews]))],[1,1,1]);
  assert.equal((await call('/api/article-views?articleId='+article).then(r=>r.json())).postViews,1);
 }finally{globalThis.fetch=original;db.close();}
});
test('Tokyo daily reports subtract today, keep each baseline separate and skip known incomplete dates',()=>{
 const dt=new Date('2026-11-17T23:17:00.000Z');
 const state={total:10,home_views:14,article_views:28,started_at:'2026-11-01T00:00:00.000Z',home_views_started_at:'2026-11-16T15:00:00.000Z',views_started_at:'2026-11-12T20:00:00.000Z'};
 const hours=Array.from({length:48},(_,i)=>new Date(Date.parse('2026-11-15T15:00:00.000Z')+i*3600000).toISOString().slice(0,13));
 const activity=[{date:'2026-11-16',new_visitors:2,home_views:0,article_views:2},{date:'2026-11-17',new_visitors:2,home_views:2,article_views:6},{date:'2026-11-18',new_visitors:2,home_views:12,article_views:9}];
 assert.deepEqual(reportsForDays(state,activity,hours.slice(0,47),dt),[{date:'2026-11-16',newVisitors:2,endVisitors:6,home:null,endHome:null,articles:2,endArticles:13}]);
 assert.deepEqual(reportsForDays(state,activity,hours,dt).at(-1),{date:'2026-11-17',newVisitors:2,endVisitors:8,home:2,endHome:2,articles:6,endArticles:19});
 assert.throws(()=>reportsForDays({...state,home_views:11},activity,hours,dt));
 assert.throws(()=>reportsForDays({...state,views_started_at:null},activity,hours,dt));
});
