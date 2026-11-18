import {validVisitorId,visitorCookieAge,visitorStorageKey} from './visitor-counter.ts';
export interface VisitorStorage {getItem(key:string):string|null;setItem(key:string,value:string):void;}
export function retainVisitorId(storage:VisitorStorage|undefined,readCookie:()=>string|undefined,writeCookie:(value:string)=>void,createId:()=>string):string|null {
  let fromCookie:string|undefined;
  try {fromCookie=readCookie();} catch {}
  let fromStorage:string|null=null;
  try {fromStorage=storage?.getItem(visitorStorageKey)??null;} catch {}
  const candidate=validVisitorId(fromCookie)?fromCookie:validVisitorId(fromStorage)?fromStorage:createId();
  if(!validVisitorId(candidate))return null;
  const id=candidate.toLowerCase();let retained=false;
  try {storage?.setItem(visitorStorageKey,id);retained=storage?.getItem(visitorStorageKey)===id;} catch {}
  try {writeCookie(id);retained=readCookie()===id||retained;} catch {}
  return retained?id:null;
}
export function browserVisitorId():Promise<string|null> {
  const operation=()=>{
    let storage:Storage|undefined;try {storage=window.localStorage;} catch {}
    return retainVisitorId(storage,()=>document.cookie.split(';').map(x=>x.trim()).find(x=>x.startsWith(visitorStorageKey+'='))?.slice(visitorStorageKey.length+1),id=>{
      document.cookie=`${visitorStorageKey}=${id}; Path=/; Max-Age=${visitorCookieAge}; SameSite=Lax${location.protocol==='https:'?'; Secure':''}`;
    },()=>crypto.randomUUID());
  };
  return navigator.locks?navigator.locks.request(visitorStorageKey,operation):Promise.resolve(operation());
}
