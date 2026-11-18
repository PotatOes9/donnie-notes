import test from 'node:test';
import assert from 'node:assert/strict';
import {generateKeyPairSync,verify} from 'node:crypto';
import {dispatchNotionSync} from '../worker/github-sync.ts';
test('External clock signs a GitHub App JWT and dispatches using a repository-only Actions token',async()=>{
 const {privateKey,publicKey}=generateKeyPairSync('rsa',{modulusLength:2048});
 const env={SYNC_ACTIVE:'true',GITHUB_APP_ID:'12345',GITHUB_INSTALLATION_ID:'8765',GITHUB_APP_KEY:privateKey.export({type:'pkcs1',format:'pem'}).toString(),GITHUB_REPOSITORY:'Sample/notes'};
 const old=globalThis.fetch,time=new Date('2026-11-18T02:23:00Z');
 const calls:string[]=[];
 globalThis.fetch=async(url,init)=>{
  calls.push(String(url));
  const info=JSON.parse(String(init?.body)),auth=new Headers(init?.headers).get('Authorization')||'';
  if(calls.length===1){
   assert.equal(String(url),'https://api.github.com/app/installations/8765/access_tokens');
   assert.deepEqual(info,{repositories:['notes'],permissions:{actions:'write'}});
   const [head,payload,sig]=auth.slice(7).split('.');
   assert.ok(verify('RSA-SHA256',Buffer.from(head+'.'+payload),publicKey,Buffer.from(sig,'base64url')));
   assert.equal(JSON.parse(Buffer.from(payload,'base64url').toString()).iss,'12345');
   return Response.json({token:'ephemeral-test'});
  }
  assert.equal(String(url),'https://api.github.com/repos/Sample/notes/actions/workflows/publish.yml/dispatches');
  assert.deepEqual(info,{ref:'main',inputs:{publish:true}});
  assert.equal(auth,'Bearer ephemeral-test');
  return new Response(null,{status:204});
 };
 try{await dispatchNotionSync({...env,SYNC_ACTIVE:'false'},time);assert.deepEqual(calls,[]);await dispatchNotionSync(env,time);assert.equal(calls.length,2);}
 finally{globalThis.fetch=old;}
});
