import {statsFetch} from './static-path.ts';
import type {VisitorResult} from './visitor-counter.ts';

export type ArticleViewAttempt={articleId:string;eventId:string;pending?:Promise<VisitorResult>};
let activeView:ArticleViewAttempt|undefined;
export function articleViewAttempt(articleId:string,createId:()=>string,previous:ArticleViewAttempt|undefined,force=false):ArticleViewAttempt{
  return !force&&previous?.articleId===articleId?previous:{articleId,eventId:createId()};
}
export function leaveArticleView(){activeView=undefined;}
export function trackArticleView(articleId:string,force=false):Promise<VisitorResult>{
  const view=activeView=articleViewAttempt(articleId,()=>crypto.randomUUID(),activeView,force);
  if(!view.pending)view.pending=(async()=>{
    for(let attempt=0;attempt<3;attempt++){
      let response:Response|undefined;
      try{
        response=await statsFetch('/api/article-views',{method:'POST',credentials:'same-origin',cache:'no-store',headers:{'Content-Type':'application/json'},body:JSON.stringify({articleId:view.articleId,eventId:view.eventId})});
        if(response.ok)return await response.json() as VisitorResult;
      }catch(error){if(attempt===2)throw error;}
      if(response&&response.status<500&&response.status!==429)throw new Error('Article view rejected');
      if(attempt<2)await new Promise(resolve=>setTimeout(resolve,attempt===0?800:2000));
    }
    throw new Error('Article view unavailable');
  })().catch(error=>{view.pending=undefined;throw error;});
  return view.pending;
}
