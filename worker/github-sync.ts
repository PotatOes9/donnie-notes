// Optional external clock. It dispatches one workflow with an installation token
// limited to the blog repository's Actions permission. No persistence or keepalive commits.
export interface SyncEnv{
 SYNC_ACTIVE?:string;
 GITHUB_APP_ID?:string;
 GITHUB_INSTALLATION_ID?:string;
 GITHUB_APP_KEY?:string;
 GITHUB_REPOSITORY?:string;
}
const enc=new TextEncoder(),hexID=/^\d{1,20}$/;
function join(...parts:Uint8Array[]){
 const data=new Uint8Array(parts.reduce((n,p)=>n+p.length,0));let offset=0;
 for(const p of parts){data.set(p,offset);offset+=p.length;}return data;
}
function der(tag:number,data:Uint8Array){
 const n=data.length,header=n<128?[tag,n]:n<256?[tag,0x81,n]:[tag,0x82,n>>8,n&255];
 return join(Uint8Array.from(header),data);
}
function signingKey(pem:string){
 const m=/^-----BEGIN (RSA PRIVATE KEY|PRIVATE KEY)-----\s*([A-Za-z0-9+/=\s]+)-----END \1-----\s*$/.exec(pem.trim());
 if(!m||m[2].length>10000)throw Error('Invalid GitHub App signing key');
 const raw=Uint8Array.from(atob(m[2].replace(/\s/g,'')),c=>c.charCodeAt(0));
 if(m[1]==='PRIVATE KEY')return raw;
 const header=Uint8Array.from([0x02,0x01,0x00,0x30,0x0d,0x06,0x09,0x2a,0x86,0x48,0x86,0xf7,0x0d,0x01,0x01,0x01,0x05,0x00]);
 return der(0x30,join(header,der(0x04,raw)));
}
const b64url=(value:Uint8Array)=>btoa(String.fromCharCode(...value)).replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_');
export async function dispatchNotionSync(env:SyncEnv,now=new Date()){
 if(env.SYNC_ACTIVE!=='true')return;
 const repo=/^([A-Za-z0-9-]+)\/([A-Za-z0-9_.-]+)$/.exec(env.GITHUB_REPOSITORY||'');
 const app=env.GITHUB_APP_ID||'',installation=env.GITHUB_INSTALLATION_ID||'';
 if(!repo||!hexID.test(app)||!hexID.test(installation)||!env.GITHUB_APP_KEY)throw Error('External sync has no GitHub App configuration');
 const key=await crypto.subtle.importKey('pkcs8',signingKey(env.GITHUB_APP_KEY),{name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'},false,['sign']);
 const t=Math.floor(now.getTime()/1000);
 const body=b64url(enc.encode('{"alg":"RS256","typ":"JWT"}'))+'.'+b64url(enc.encode(JSON.stringify({iat:t-30,exp:t+300,iss:app})));
 const sig=new Uint8Array(await crypto.subtle.sign('RSASSA-PKCS1-v1_5',key,enc.encode(body))),jwt=body+'.'+b64url(sig);
 const endpoint='https://api.github.com',headers={'Accept':'application/vnd.github+json','Content-Type':'application/json','User-Agent':'donnie-notion-sync'};
 const response=await fetch(endpoint+'/app/installations/'+installation+'/access_tokens',{method:'POST',headers:{...headers,Authorization:'Bearer '+jwt},redirect:'error',body:JSON.stringify({repositories:[repo[2]],permissions:{actions:'write'}}),signal:AbortSignal.timeout(7500)});
 if(!response.ok)throw Error('GitHub App token request failed: '+response.status);
 const access=await response.json() as {token?:string};
 if(!access.token||access.token.length>3000)throw Error('GitHub did not provide an installation token');
 const run=await fetch(endpoint+'/repos/'+repo[1]+'/'+repo[2]+'/actions/workflows/publish.yml/dispatches',{method:'POST',headers:{...headers,Authorization:'Bearer '+access.token},redirect:'error',body:JSON.stringify({ref:'main',inputs:{publish:true}}),signal:AbortSignal.timeout(7500)});
 if(!run.ok)throw Error('GitHub workflow dispatch failed: '+run.status);
 console.log('Notion sync dispatched');
}
