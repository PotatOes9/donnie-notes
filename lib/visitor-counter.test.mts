import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync,mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {Worker} from 'node:worker_threads';
import {excludedVisitorAgent,initialVisitorState,registrationStatements,validVisitorId,visitorCookie,visitorDay,visitorHash,visitorStorageKey,type CounterStatement} from './visitor-counter.ts';
import {retainVisitorId} from './visitor-browser.ts';
const one='11111111-1111-4111-8111-111111111111',two='22222222-2222-4222-8222-222222222222';
function schema(db:DatabaseSync){const journal=JSON.parse(readFileSync(new URL('../drizzle/meta/_journal.json',import.meta.url),'utf8'));for(const entry of journal.entries)db.exec(readFileSync(new URL('../drizzle/'+entry.tag+'.sql',import.meta.url),'utf8'));}
function execute(db:DatabaseSync,statements:CounterStatement[]){db.exec('BEGIN IMMEDIATE');try{let last:any;for(const statement of statements)last=db.prepare(statement.sql).all(...statement.values);db.exec('COMMIT');return last[0];}catch(error){db.exec('ROLLBACK');throw error;}}
test('A new browser gets one consecutive number; returning, retries and a new day retain it',async()=>{
  const db=new DatabaseSync(':memory:');schema(db);try{
    const a=await visitorHash(one),b=await visitorHash(two),now=new Date('2026-11-12T12:00:00Z');
    assert.deepEqual({...execute(db,registrationStatements(a,'first',now))},{number:1,total:1});
    assert.deepEqual({...execute(db,registrationStatements(a,'retry',now))},{number:1,total:1});
    assert.deepEqual({...execute(db,registrationStatements(b,'second',now))},{number:2,total:2});
    assert.deepEqual({...execute(db,registrationStatements(a,'next-day',new Date('2026-11-13T12:00:00Z')))},{number:1,total:2});
    assert.deepEqual({...db.prepare('SELECT new_visitors,end_total FROM visitor_daily').get()!},{new_visitors:2,end_total:2});
    assert.equal(db.prepare('SELECT COUNT(*) AS n FROM visitor_daily').get()!.n,1);
    assert.deepEqual(JSON.parse(String(db.prepare('SELECT recent_days_json FROM visitor_state').get()!.recent_days_json)),[{date:'2026-11-12',newVisitors:2,endTotal:2}]);
  }finally{db.close();}
});
test('Initialization and an owner-style read never allocate a visitor number',()=>{
  const db=new DatabaseSync(':memory:');schema(db);try{const initial=initialVisitorState(new Date().toISOString());execute(db,[initial]);execute(db,[initial]);assert.equal(db.prepare('SELECT total FROM visitor_state').get()!.total,0);assert.equal(db.prepare('SELECT COUNT(*) AS n FROM visitor_keys').get()!.n,0);}finally{db.close();}
});
test('A failed transaction leaves no number, identity or partial daily count',async()=>{
  const db=new DatabaseSync(':memory:');schema(db);try{const statements=registrationStatements(await visitorHash(one),'failed',new Date());statements.splice(4,0,{sql:'INSERT INTO missing_table VALUES (1)',values:[]});assert.throws(()=>execute(db,statements));assert.equal(db.prepare('SELECT COUNT(*) AS n FROM visitor_keys').get()!.n,0);assert.equal(db.prepare('SELECT COUNT(*) AS n FROM visitor_daily').get()!.n,0);assert.equal(execute(db,registrationStatements(await visitorHash(two),'success',new Date())).number,1);}finally{db.close();}
});
test('Simultaneous independent connections issue no duplicate numbers or repeated browser counts',async()=>{
  const directory=mkdtempSync(join(tmpdir(),'donnie-visitors-')),path=join(directory,'counter.sqlite'),db=new DatabaseSync(path);schema(db);db.exec('PRAGMA journal_mode=WAL');
  try{
    const shared=await visitorHash(one),now=new Date('2026-11-12T12:00:00Z');
    const jobs=Array.from({length:4},(_,w)=>Array.from({length:12},(_,i)=>registrationStatements(i<6?shared:`browser-${w}-${i}`,`request-${w}-${i}`,now)));
    await Promise.all(jobs.map(statements=>new Promise<void>((resolve,reject)=>{
      const worker=new Worker(`const {parentPort,workerData}=require('node:worker_threads');const {DatabaseSync}=require('node:sqlite');const db=new DatabaseSync(workerData.path);db.exec('PRAGMA busy_timeout=15000');for(const statements of workerData.statements){db.exec('BEGIN IMMEDIATE');try{for(const s of statements)db.prepare(s.sql).all(...s.values);db.exec('COMMIT');}catch(e){db.exec('ROLLBACK');throw e;}}db.close();parentPort.postMessage('done');`,{eval:true,workerData:{path,statements}});
      worker.once('error',reject);worker.once('exit',code=>code===0?resolve():reject(new Error('Worker exit '+code)));
    })));
    assert.equal(db.prepare('SELECT total FROM visitor_state').get()!.total,25);
    assert.deepEqual({...db.prepare('SELECT COUNT(*) AS rows,COUNT(DISTINCT ordinal) AS numbers,MAX(ordinal) AS last FROM visitor_keys').get()!},{rows:25,numbers:25,last:25});
    assert.equal(db.prepare('SELECT new_visitors FROM visitor_daily').get()!.new_visitors,25);
  }finally{db.close();rmSync(directory,{recursive:true,force:true});}
});
test('Tokyo dates cross at 15:00 UTC',()=>{assert.equal(visitorDay(new Date('2026-11-12T14:59:59Z')),'2026-11-12');assert.equal(visitorDay(new Date('2026-11-12T15:00:00Z')),'2026-11-13');});
test('Cookies, hashes and filtering use no IP, name or account identity',async()=>{
  assert.ok(validVisitorId(one));assert.equal(validVisitorId('42'),false);assert.equal(validVisitorId(one+'; owner=true'),false);
  assert.equal(visitorCookie(new Headers({cookie:`theme=dark; ${visitorStorageKey}=${one}`})),one);
  assert.equal(visitorCookie(new Headers({cookie:`${visitorStorageKey}=42`})),undefined);
  assert.equal(await visitorHash(one),await visitorHash(one.toUpperCase()));assert.equal((await visitorHash(one)).length,64);
  for(const agent of [null,'Googlebot/2.1','HeadlessChrome/130','curl/8.0','bingpreview'])assert.ok(excludedVisitorAgent(agent));
  assert.equal(excludedVisitorAgent('Mozilla/5.0 Chrome/157.0 Safari/537.36'),false);
});
test('Cookies and local storage recover each other; blocking both yields no countable identity',()=>{
  const values=new Map<string,string>(),storage={getItem:(key:string)=>values.get(key)??null,setItem:(key:string,value:string)=>{values.set(key,value);}};
  let cookie:string|undefined;const read=()=>cookie,write=(id:string)=>{cookie=id;};
  assert.equal(retainVisitorId(storage,read,write,()=>one),one);assert.equal(retainVisitorId(storage,read,write,()=>two),one);
  values.clear();assert.equal(retainVisitorId(storage,read,write,()=>two),one);cookie=undefined;assert.equal(retainVisitorId(storage,read,write,()=>two),one);
  const blocked={getItem:()=>{throw new Error('Blocked');},setItem:()=>{throw new Error('Blocked');}};
  assert.equal(retainVisitorId(blocked,()=>undefined,()=>{},()=>one),null);assert.equal(retainVisitorId(undefined,read,write,()=>two),one);
});
