// Bounded, short-lived server memory only. Never cache identities or rendered pages.
type Entry<T> = {value:T;expires:number;bytes:number};
export class ReadCache {
  private values=new Map<string,Entry<unknown>>();
  private pending=new Map<string,Promise<unknown>>();
  private bytes=0;
  private generation=0;
  private maxEntries:number;
  private maxBytes:number;
  private now:()=>number;
  constructor(maxEntries=48,maxBytes=12*1024*1024,now=Date.now){this.maxEntries=maxEntries;this.maxBytes=maxBytes;this.now=now;}
  async get<T>(key:string,maxAge:number,read:()=>Promise<T>):Promise<T>{
    const entry=this.values.get(key);
    if(entry&&entry.expires>this.now()){
      this.values.delete(key);this.values.set(key,entry);return entry.value as T;
    }
    if(entry)this.remove(key);
    const inflight=this.pending.get(key);if(inflight)return inflight as Promise<T>;
    const generation=this.generation;
    const request=Promise.resolve().then(read).then(value=>{
      if(generation!==this.generation)return value;
      const bytes=new TextEncoder().encode(JSON.stringify(value)??'').byteLength;
      if(bytes<=this.maxBytes){
        this.remove(key);
        this.values.set(key,{value,expires:this.now()+maxAge,bytes});this.bytes+=bytes;
        while(this.values.size>this.maxEntries||this.bytes>this.maxBytes)this.remove(this.values.keys().next().value!);
      }
      return value;
    }).finally(()=>{if(this.pending.get(key)===request)this.pending.delete(key);});
    this.pending.set(key,request);return request;
  }
  clear(){this.generation++;this.values.clear();this.pending.clear();this.bytes=0;}
  private remove(key:string){const entry=this.values.get(key);if(entry){this.bytes-=entry.bytes;this.values.delete(key);}}
}

// Read keys include the credential and complete query, so connections cannot mix.
// Values expire after at most one minute; failures are never retained as content.
export const notionReads=/* @__PURE__ */new ReadCache();
