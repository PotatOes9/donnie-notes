import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync,mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {Worker} from 'node:worker_threads';
import {articleViewStatements} from './article-views.ts';
import {articleViewAttempt,leaveArticleView,trackArticleView} from './article-view-browser.ts';
import {registrationStatements,type CounterStatement} from './visitor-counter.ts';

function schema(db:DatabaseSync,from=0,to=Infinity){
  const journal=JSON.parse(readFileSync(new URL('../drizzle/meta/_journal.json',import.meta.url),'utf8'));
  for(const entry of journal.entries.slice(from,to))db.exec(readFileSync(new URL('../drizzle/'+entry.tag+'.sql',import.meta.url),'utf8'));
}
function execute(db:DatabaseSync,statements:CounterStatement[]){
  db.exec('BEGIN IMMEDIATE');
  try{let last:any;for(const s of statements)last=db.prepare(s.sql).all(...s.values);db.exec('COMMIT');return last[0];}
  catch(error){db.exec('ROLLBACK');throw error;}
}
test('10 browsers reading 10 articles a day for 10 days produce 10 visitors and 1,000 views',()=>{
  const db=new DatabaseSync(':memory:');schema(db);
  try{
    for(let day=0;day<10;day++)for(let browser=0;browser<10;browser++){
      const now=new Date(Date.UTC(2026,10,13+day,3));
      execute(db,registrationStatements('browser-'+browser,`visit-${day}-${browser}`,now));
      for(let article=0;article<10;article++)execute(db,articleViewStatements(`view-${day}-${browser}-${article}`,'article-'+article,crypto.randomUUID(),now));
    }
    assert.deepEqual({...db.prepare('SELECT total,article_views FROM visitor_state').get()!},{total:10,article_views:1000});
    const daily=db.prepare('SELECT new_visitors,article_views,end_article_views FROM visitor_daily ORDER BY date').all();
    assert.equal(daily.length,10);
    daily.forEach((row,i)=>assert.deepEqual({...row},{new_visitors:i===0?10:0,article_views:100,end_article_views:100*(i+1)}));
    const articles=db.prepare('SELECT total FROM article_view_totals').all();
    assert.equal(articles.length,10);for(const row of articles)assert.equal(row.total,100);
    const recent=JSON.parse(String(db.prepare('SELECT recent_views_json FROM visitor_state').get()!.recent_views_json));
    assert.equal(recent.length,10);assert.deepEqual(recent[0],{date:'2026-11-22',articleViews:100,endArticleViews:1000});
  }finally{db.close();}
});
test('Retrying one event counts once; a fresh opening of the same article counts again',()=>{
  const db=new DatabaseSync(':memory:');schema(db);
  try{
    const now=new Date('2026-11-13T03:00:00Z');
    execute(db,articleViewStatements('one','article','first',now));
    let result=execute(db,articleViewStatements('one','article','retry',now));
    assert.equal(result.articleViews,1);assert.equal(result.postViews,1);
    result=execute(db,articleViewStatements('two','article','reopen',now));
    assert.equal(result.articleViews,2);assert.equal(result.postViews,2);
    assert.equal(db.prepare('SELECT COUNT(*) AS n FROM article_view_events').get()!.n,2);
    assert.equal(db.prepare('SELECT article_views FROM visitor_daily').get()!.article_views,2);
  }finally{db.close();}
});
test('Concurrent connections never lose views or double-count a retried event',async()=>{
  const directory=mkdtempSync(join(tmpdir(),'donnie-views-')),path=join(directory,'views.sqlite'),db=new DatabaseSync(path);schema(db);db.exec('PRAGMA journal_mode=WAL');
  try{
    const now=new Date('2026-11-13T03:00:00Z');
    const jobs=Array.from({length:4},(_,w)=>Array.from({length:12},(_,i)=>articleViewStatements(i<6?'shared':`view-${w}-${i}`,'article',`request-${w}-${i}`,now)));
    await Promise.all(jobs.map(statements=>new Promise<void>((resolve,reject)=>{
      const worker=new Worker(`const {parentPort,workerData}=require('node:worker_threads');const {DatabaseSync}=require('node:sqlite');const db=new DatabaseSync(workerData.path);db.exec('PRAGMA busy_timeout=15000');for(const statements of workerData.statements){db.exec('BEGIN IMMEDIATE');try{for(const s of statements)db.prepare(s.sql).all(...s.values);db.exec('COMMIT');}catch(e){db.exec('ROLLBACK');throw e;}}db.close();parentPort.postMessage('done');`,{eval:true,workerData:{path,statements}});
      worker.once('error',reject);worker.once('exit',code=>code===0?resolve():reject(new Error('Worker exit '+code)));
    })));
    assert.equal(db.prepare('SELECT article_views FROM visitor_state').get()!.article_views,25);
    assert.equal(db.prepare('SELECT total FROM article_view_totals').get()!.total,25);
    assert.equal(db.prepare('SELECT article_views FROM visitor_daily').get()!.article_views,25);
    assert.equal(db.prepare('SELECT COUNT(*) AS n FROM article_view_events').get()!.n,25);
  }finally{db.close();rmSync(directory,{recursive:true,force:true});}
});
test('A failed write rolls back the event and every aggregate together',()=>{
  const db=new DatabaseSync(':memory:');schema(db);
  try{
    const now=new Date('2026-11-13T03:00:00Z');execute(db,articleViewStatements('ok','article','ok',now));
    const statements=articleViewStatements('failed','article','failed',now);
    statements.splice(6,0,{sql:'INSERT INTO missing_table VALUES (1)',values:[]});
    assert.throws(()=>execute(db,statements));
    assert.equal(db.prepare('SELECT article_views FROM visitor_state').get()!.article_views,1);
    assert.equal(db.prepare('SELECT total FROM article_view_totals').get()!.total,1);
    assert.equal(db.prepare('SELECT article_views FROM visitor_daily').get()!.article_views,1);
    assert.equal(db.prepare('SELECT COUNT(*) AS n FROM article_view_events').get()!.n,1);
  }finally{db.close();}
});
test('Article daily totals cross the Tokyo date boundary independently of visitor registration',()=>{
  const db=new DatabaseSync(':memory:');schema(db);
  try{
    execute(db,articleViewStatements('before','article','before',new Date('2026-11-13T14:59:59Z')));
    execute(db,articleViewStatements('after','article','after',new Date('2026-11-13T15:00:00Z')));
    assert.deepEqual(db.prepare('SELECT date,article_views,new_visitors FROM visitor_daily ORDER BY date').all().map(row=>({...row})),[
      {date:'2026-11-13',article_views:1,new_visitors:0},{date:'2026-11-14',article_views:1,new_visitors:0},
    ]);
  }finally{db.close();}
});
test('Additive migrations preserve old visitors and leave the new metric start unknown',()=>{
  const db=new DatabaseSync(':memory:');schema(db,0,2);
  try{
    execute(db,registrationStatements('existing','old',new Date('2026-11-12T03:00:00Z')));
    schema(db,2);
    assert.deepEqual({...db.prepare('SELECT total,article_views,views_started_at FROM visitor_state').get()!},{total:1,article_views:0,views_started_at:null});
    execute(db,articleViewStatements('new','article','new',new Date('2026-11-13T03:00:00Z')));
    assert.equal(db.prepare('SELECT total FROM visitor_state').get()!.total,1);
    assert.equal(db.prepare('SELECT ordinal FROM visitor_keys').get()!.ordinal,1);
    assert.deepEqual(JSON.parse(String(db.prepare('SELECT recent_views_json FROM visitor_state').get()!.recent_views_json)),[{date:'2026-11-13',articleViews:1,endArticleViews:1}]);
  }finally{db.close();}
});
test('Duplicate effects and network retries reuse an event; another article and restored documents create new events',async()=>{
  const first=articleViewAttempt('a',()=> 'one',undefined);
  assert.equal(articleViewAttempt('a',()=> 'unused',first),first);
  assert.equal(articleViewAttempt('b',()=> 'two',first).eventId,'two');
  assert.equal(articleViewAttempt('a',()=> 'three',first,true).eventId,'three');
  const originalFetch=globalThis.fetch,events:string[]=[];
  Object.defineProperty(globalThis,'document',{configurable:true,value:{querySelector:()=>({content:'https://counter.test'})}});
  globalThis.fetch=async(_url,init)=>{
    events.push(JSON.parse(String(init?.body)).eventId);
    if(events.length===1)throw new Error('Lost network response');
    return Response.json({status:'recorded',articleViews:1,articleId:'a',postViews:1});
  };
  try{
    leaveArticleView();const a=trackArticleView('a'),b=trackArticleView('a');assert.equal(a,b);await a;
    assert.equal(events.length,2);assert.equal(events[0],events[1]);
    await trackArticleView('a');assert.equal(events.length,2);
    await trackArticleView('a',true);assert.notEqual(events[2],events[1]);
    leaveArticleView();await trackArticleView('a');assert.notEqual(events[3],events[2]);
  }finally{Reflect.deleteProperty(globalThis,'document');globalThis.fetch=originalFetch;leaveArticleView();}
});
