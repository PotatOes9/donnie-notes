export function cleanBase(value:string){return value==='/'?'':('/'+value).replace(/\/+/g,'/').replace(/\/$/,'');}
export function stripBase(path:string,base=cleanBase(import.meta.env?.BASE_URL||'')){
  return base&&(path===base||path.startsWith(base+'/'))?path.slice(base.length)||'/':path;
}
export function sitePath(path:string,base=cleanBase(import.meta.env?.BASE_URL||'')){
  if(!path.startsWith('/')||path.startsWith('//')||!base||path===base||path.startsWith(base+'/'))return path;
  return base+path;
}
export function pageHref(path:string){
 if(/^\/(?:zh|ja|en)(?:\/|$|[?#])/.test(path)){
  const p=path.search(/[?#]/),url=p===-1?path:path.slice(0,p),tail=p===-1?'':path.slice(p);
  return sitePath(url.endsWith('/')||/\.[^/]+$/.test(url)?url+tail:url+'/'+tail);
 }
 return sitePath(path);
}
export function statsFetch(path:string,init?:RequestInit){
  const configured=typeof document!=='undefined'?document.querySelector<HTMLMetaElement>('meta[name="donnie-analytics"]')?.content:'';
  if(!configured)return Promise.reject(new Error('Statistics connection is not configured'));
  const origin=new URL(configured);
  if(origin.protocol!=='https:'||origin.username||origin.password)throw new Error('Invalid statistics origin');
  return fetch(new URL(path,origin.origin).href,{...init,credentials:'omit',referrerPolicy:'no-referrer'});
}
