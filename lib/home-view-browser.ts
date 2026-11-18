import {stripBase} from './static-path.ts';
import {statsFetch} from './static-path.ts';
import {articleViewAttempt,type ArticleViewAttempt} from './article-view-browser.ts';
import {isHomePath} from './home-views.ts';
import type {VisitorResult} from './visitor-counter.ts';

let activeHome:ArticleViewAttempt|undefined;
export function leaveHomeView(){activeHome=undefined;}
export function trackHomeView(path:string,force=false):Promise<VisitorResult>{
  path=stripBase(path);
  if(!isHomePath(path))return Promise.resolve({status:'excluded'});
  const view=activeHome=articleViewAttempt('homepage',()=>crypto.randomUUID(),activeHome,force);
  if(!view.pending)view.pending=(async()=>{
    for(let attempt=0;attempt<3;attempt++){
      let response:Response|undefined;
      try{
        response=await statsFetch('/api/home-views',{method:'POST',credentials:'same-origin',cache:'no-store',headers:{'Content-Type':'application/json'},body:JSON.stringify({eventId:view.eventId,openedAt:view.openedAt,pagePath:path})});
        if(response.ok)return await response.json() as VisitorResult;
      }catch(error){if(attempt===2)throw error;}
      if(response&&response.status<500&&response.status!==429)throw new Error('Homepage view rejected');
      if(attempt<2)await new Promise(resolve=>setTimeout(resolve,attempt===0?800:2000));
    }
    throw new Error('Homepage view unavailable');
  })().catch(error=>{view.pending=undefined;throw error;});
  return view.pending;
}
