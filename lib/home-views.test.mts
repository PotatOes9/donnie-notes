import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync,mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {Worker} from 'node:worker_threads';
import {homeViewStatements,isHomePath} from './home-views.ts';
import {trackHomeView,leaveHomeView} from './home-view-browser.ts';
import {articleViewStatements} from './article-views.ts';
import {registrationStatements,type CounterStatement} from './visitor-counter.ts';

function schema(db:DatabaseSync,from=0,to=Infinity){const j=JSON.parse(readFileSync(new URL('../drizzle/meta/_journal.json',import.meta.url),'utf8'));for(const e of j.entries.slice(from,to))db.exec(readFileSync(new URL('../drizzle/'+e.tag+'.sql',import.meta.url),'utf8'));}
function execute(db:DatabaseSync,statements:CounterStatement[]){db.exec('BEGIN IMMEDIATE');try{let last:any;for(const s of statements)last=db.prepare(s.sql).all(...s.values);db.exec('COMMIT');return last[0];}catch(error){db.exec('ROLLBACK');throw error;}}

test('Only actual homepage paths in the three languages are eligible',()=>{
  for(const path of ['/','/zh','/ja','/en','/zh/','/ja/','/en/'])assert.ok(isHomePath(path));
  for(const path of ['/post/123','/en/post/123','/archive','/about','/settings','/api/visitors','//','/en//','/#articles','https://example.com/',null,42])assert.equal(isHomePath(path),false);
});
test('Homepage openings, unique visitors and article reads remain independent',()=>{
  const db=new DatabaseSync(':memory:');schema(db);
  try{
    for(let day=0;day<10;day++)for(let browser=0;browser<10;browser++){
      const now=new Date(Date.UTC(2026,10,13+day,3));
      execute(db,registrationStatements('browser-'+browser,`visit-${day}-${browser}`,now));
      execute(db,homeViewStatements(`home-${day}-${browser}`,crypto.randomUUID(),now));
      for(let article=0;article<10;article++)execute(db,articleViewStatements(`view-${day}-${browser}-${article}`,'article-'+article,crypto.randomUUID(),now));
    }
    assert.deepEqual({...db.prepare('SELECT total,home_views,article_views FROM visitor_state').get()!},{total:10,home_views:100,article_views:1000});
    for(const row of db.prepare('SELECT total FROM article_view_totals').all())assert.equal(row.total,100);
    const daily=db.prepare('SELECT new_visitors,home_views,end_home_views,article_views FROM visitor_daily ORDER BY date').all();
    daily.forEach((row,i)=>assert.deepEqual({...row},{new_visitors:i===0?10:0,home_views:10,end_home_views:10*(i+1),article_views:100}));
    assert.deepEqual(JSON.parse(String(db.prepare('SELECT recent_home_views_json FROM visitor_state').get()!.recent_home_views_json))[0],{date:'2026-11-22',homeViews:10,endHomeViews:100});
  }finally{db.close();}
});
test('A retry increments neither homepage nor article count; a new homepage opening increments only homepage',()=>{
  const db=new DatabaseSync(':memory:');schema(db);
  try{
    const now=new Date('2026-11-13T03:00:00Z');execute(db,homeViewStatements('one','first',now));
    assert.equal(execute(db,homeViewStatements('one','retry',now)).homeViews,1);
    assert.equal(execute(db,homeViewStatements('two','refresh',now)).homeViews,2);
    assert.equal(db.prepare('SELECT article_views FROM visitor_state').get()!.article_views,0);
    assert.equal(db.prepare('SELECT COUNT(*) AS n FROM article_view_totals').get()!.n,0);
  }finally{db.close();}
});
test('Concurrent homepage openings do not lose increments or duplicate retries',async()=>{
  const directory=mkdtempSync(join(tmpdir(),'donnie-home-')),path=join(directory,'home.sqlite'),db=new DatabaseSync(path);schema(db);db.exec('PRAGMA journal_mode=WAL');
  try{
    const now=new Date('2026-11-13T03:00:00Z');
    const jobs=Array.from({length:4},(_,w)=>Array.from({length:12},(_,i)=>homeViewStatements(i<6?'shared':`home-${w}-${i}`,`request-${w}-${i}`,now)));
    await Promise.all(jobs.map(statements=>new Promise<void>((resolve,reject)=>{
      const worker=new Worker(`const {parentPort,workerData}=require('node:worker_threads');const {DatabaseSync}=require('node:sqlite');const db=new DatabaseSync(workerData.path);db.exec('PRAGMA busy_timeout=15000');for(const statements of workerData.statements){db.exec('BEGIN IMMEDIATE');try{for(const s of statements)db.prepare(s.sql).all(...s.values);db.exec('COMMIT');}catch(e){db.exec('ROLLBACK');throw e;}}db.close();parentPort.postMessage('done');`,{eval:true,workerData:{path,statements}});
      worker.once('error',reject);worker.once('exit',code=>code===0?resolve():reject(new Error('Worker exit '+code)));
    })));
    assert.equal(db.prepare('SELECT home_views FROM visitor_state').get()!.home_views,25);
    assert.equal(db.prepare('SELECT home_views FROM visitor_daily').get()!.home_views,25);
    assert.equal(db.prepare('SELECT COUNT(*) AS n FROM home_view_events').get()!.n,25);
  }finally{db.close();rmSync(directory,{recursive:true,force:true});}
});
test('The new migration preserves existing article counts and does not relabel them as homepage visits',()=>{
  const db=new DatabaseSync(':memory:');schema(db,0,4);
  try{
    const now=new Date('2026-11-12T03:00:00Z');execute(db,registrationStatements('existing','visitor',now));execute(db,articleViewStatements('old','article','old',now));
    schema(db,4);
    assert.deepEqual({...db.prepare('SELECT total,home_views,home_views_started_at,article_views FROM visitor_state').get()!},{total:1,home_views:0,home_views_started_at:null,article_views:1});
    execute(db,homeViewStatements('home','new',new Date('2026-11-13T03:00:00Z')));
    assert.equal(db.prepare('SELECT total FROM article_view_totals').get()!.total,1);
    assert.deepEqual(JSON.parse(String(db.prepare('SELECT recent_home_views_json FROM visitor_state').get()!.recent_home_views_json)),[{date:'2026-11-13',homeViews:1,endHomeViews:1}]);
  }finally{db.close();}
});
test('Homepage failures roll back all aggregates, and Tokyo dates cross at midnight',()=>{
  const db=new DatabaseSync(':memory:');schema(db);
  try{
    execute(db,homeViewStatements('before','before',new Date('2026-11-13T14:59:59Z')));
    const failed=homeViewStatements('failed','failed',new Date('2026-11-13T15:00:00Z'));failed.splice(5,0,{sql:'INSERT INTO missing_table VALUES (1)',values:[]});assert.throws(()=>execute(db,failed));
    execute(db,homeViewStatements('after','after',new Date('2026-11-13T15:00:00Z')));
    assert.equal(db.prepare('SELECT home_views FROM visitor_state').get()!.home_views,2);
    assert.equal(db.prepare('SELECT COUNT(*) AS n FROM home_view_events').get()!.n,2);
    assert.deepEqual(db.prepare('SELECT date,home_views,end_home_views FROM visitor_daily ORDER BY date').all().map(row=>({...row})),[{date:'2026-11-13',home_views:1,end_home_views:1},{date:'2026-11-14',home_views:1,end_home_views:2}]);
  }finally{db.close();}
});
test('Retries and effect replays retain one opening; unrelated routes never send a homepage event',async()=>{
  const original=globalThis.fetch,events:{eventId:string;pagePath:string}[]=[];
  Object.defineProperty(globalThis,'document',{configurable:true,value:{querySelector:()=>({content:'https://counter.test'})}});
  globalThis.fetch=async(_url,init)=>{events.push(JSON.parse(String(init?.body)));if(events.length===1)throw new Error('Lost response');return Response.json({status:'recorded',homeViews:1});};
  try{
    leaveHomeView();await trackHomeView('/en/post/article');assert.equal(events.length,0);
    const a=trackHomeView('/zh'),b=trackHomeView('/zh');assert.equal(a,b);await a;
    assert.equal(events.length,2);assert.equal(events[0].eventId,events[1].eventId);
    await trackHomeView('/zh');assert.equal(events.length,2);
    await trackHomeView('/zh',true);assert.notEqual(events[2].eventId,events[1].eventId);
    leaveHomeView();await trackHomeView('/ja');assert.notEqual(events[3].eventId,events[2].eventId);
  }finally{Reflect.deleteProperty(globalThis,'document');globalThis.fetch=original;leaveHomeView();}
});
