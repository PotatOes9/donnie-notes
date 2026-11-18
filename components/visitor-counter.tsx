import {statsFetch} from '@/lib/static-path';
'use client';
import {createContext,useCallback,useContext,useEffect,useState} from 'react';
import {Eye,Info} from 'lucide-react';
import {useLocale,useSiteCopy,useSiteSettings} from './site-copy-provider';
import {browserVisitorId} from '@/lib/visitor-browser';
import {leaveArticleView,trackArticleView} from '@/lib/article-view-browser';
import {leaveHomeView,trackHomeView} from '@/lib/home-view-browser';
import {flag} from '@/lib/site-settings';
import {formatCopy} from '@/lib/site-copy';
import {useJournalNavigation} from './journal-context';
import type {VisitorResult} from '@/lib/visitor-counter';
let pendingVisit:Promise<VisitorResult>|undefined;
async function loadVisit(canManage:boolean):Promise<VisitorResult>{
  if(canManage){const result=await statsFetch('/api/visitors',{cache:'no-store',credentials:'same-origin'});if(!result.ok)throw new Error('Counter unavailable');return result.json();}
  if(navigator.webdriver)return {status:'excluded'};
  if(!pendingVisit){pendingVisit=(async()=>{
    const visitorId=await browserVisitorId();if(!visitorId)return {status:'storage-blocked'} as VisitorResult;
    const result=await statsFetch('/api/visitors',{method:'POST',credentials:'same-origin',cache:'no-store',headers:{'Content-Type':'application/json'},body:JSON.stringify({visitorId})});
    if(!result.ok)throw new Error('Counter unavailable');return result.json() as Promise<VisitorResult>;
  })().catch(error=>{pendingVisit=undefined;throw error;});}
  return pendingVisit;
}
const VisitorContext=createContext<{result:VisitorResult|null;canManage:boolean;articleId?:string;refreshTotal:()=>Promise<void>}>({result:null,canManage:false,refreshTotal:async()=>{}});

// Registration remains active on article, archive and about pages even though
// its visual summary now lives only in the homepage sidebar.
export function VisitorTrackingProvider({canManage,enabled,articleViewsEnabled,homeViewsEnabled,homePage=false,articleId,children}:{canManage:boolean;enabled:boolean;articleViewsEnabled:boolean;homeViewsEnabled:boolean;homePage?:boolean;articleId?:string;children:React.ReactNode}){
  const journal=useJournalNavigation();homePage=journal?journal.view==='home':homePage;
  const [result,setResult]=useState<VisitorResult|null>(null);
  const acceptResult=useCallback((next:VisitorResult)=>setResult(previous=>{
    const value={...previous,...next};
    for(const key of ['total','articleViews','homeViews'] as const){
      const before=previous?.[key],after=next[key];
      if(typeof before==='number'&&typeof after==='number')value[key]=Math.max(before,after);
    }
    if(next.articleId&&next.articleId===previous?.articleId&&typeof next.postViews==='number'&&typeof previous.postViews==='number')value.postViews=Math.max(next.postViews,previous.postViews);
    return value;
  }),[]);
  const refreshTotal=useCallback(async()=>{
    if(!(enabled||articleViewsEnabled||homeViewsEnabled)||(navigator.webdriver&&!canManage))return;
    try{
      const response=await statsFetch('/api/visitors',{cache:'no-store',credentials:'same-origin'});
      if(!response.ok)return;
      const summary:VisitorResult=await response.json();
      if(typeof summary.total!=='number'||!Number.isSafeInteger(summary.total)||summary.total<0)return;
      acceptResult(summary);
    }catch{}
  },[enabled,articleViewsEnabled,homeViewsEnabled,canManage,acceptResult]);
  useEffect(()=>{
    if(!enabled)return;
    let active=true;
    const load=()=>{void loadVisit(canManage).then(value=>{if(active)acceptResult(value);},()=>{if(active)setResult(previous=>({...previous,status:'unavailable'}));});};
    if(document.visibilityState==='visible')load();else document.addEventListener('visibilitychange',load,{once:true});
    return()=>{active=false;document.removeEventListener('visibilitychange',load);};
  },[canManage,enabled,acceptResult]);
  useEffect(()=>{
    if(!articleId){leaveArticleView();return;}
    if(!articleViewsEnabled||(navigator.webdriver&&!canManage))return;
    let active=true;
    const load=(force=false)=>{
      const request=canManage?statsFetch('/api/article-views?articleId='+encodeURIComponent(articleId),{cache:'no-store',credentials:'same-origin'}).then(async response=>{if(!response.ok)throw new Error('Article summary unavailable');return response.json() as Promise<VisitorResult>;}):trackArticleView(articleId,force);
      void request.then(value=>{if(active)acceptResult(value);},()=>{});
    };
    const visible=()=>{if(document.visibilityState==='visible')load();};
    const restored=(event:PageTransitionEvent)=>{if(event.persisted&&document.visibilityState==='visible')load(true);};
    if(document.visibilityState==='visible')load();else document.addEventListener('visibilitychange',visible,{once:true});
    window.addEventListener('pageshow',restored);
    return()=>{active=false;document.removeEventListener('visibilitychange',visible);window.removeEventListener('pageshow',restored);};
  },[articleId,articleViewsEnabled,canManage,acceptResult]);
  useEffect(()=>{
    if(!homePage){leaveHomeView();return;}
    if(!homeViewsEnabled||(navigator.webdriver&&!canManage))return;
    let active=true;
    const load=(force=false)=>{
      const request=canManage?statsFetch('/api/home-views',{cache:'no-store',credentials:'same-origin'}).then(async response=>{if(!response.ok)throw new Error('Homepage summary unavailable');return response.json() as Promise<VisitorResult>;}):trackHomeView(window.location.pathname,force);
      void request.then(value=>{if(active)acceptResult(value);},()=>{});
    };
    const visible=()=>{if(document.visibilityState==='visible')load();};
    const restored=(event:PageTransitionEvent)=>{if(event.persisted&&document.visibilityState==='visible')load(true);};
    if(document.visibilityState==='visible')load();else document.addEventListener('visibilitychange',visible,{once:true});
    window.addEventListener('pageshow',restored);
    return()=>{active=false;document.removeEventListener('visibilitychange',visible);window.removeEventListener('pageshow',restored);};
  },[homePage,homeViewsEnabled,canManage,acceptResult]);
  return <VisitorContext.Provider value={{result,canManage,articleId,refreshTotal}}>{children}</VisitorContext.Provider>;
}

export function VisitorCounter(){
  const copy=useSiteCopy(),locale=useLocale(),site=useSiteSettings();
  const {result,canManage,refreshTotal}=useContext(VisitorContext);
  useEffect(()=>{
    const refresh=()=>{if(document.visibilityState==='visible')void refreshTotal();};
    refresh();
    const interval=setInterval(refresh,60000);
    document.addEventListener('visibilitychange',refresh);
    window.addEventListener('focus',refresh);
    return()=>{clearInterval(interval);document.removeEventListener('visibilitychange',refresh);window.removeEventListener('focus',refresh);};
  },[refreshTotal]);
  if(result?.status==='excluded')return null;
  const owner=canManage||result?.status==='owner';
  const metric=(caption:string,pattern:string,value:number|undefined,loading:string,unavailable:string)=>{
    const valid=typeof value==='number'&&Number.isSafeInteger(value)&&value>=0;
    const number=valid?new Intl.NumberFormat(locale==='zh'?'zh-CN':locale==='ja'?'ja-JP':'en-US').format(value):'—';
    const description=valid?formatCopy(pattern,{number}):!result?loading:unavailable;
    return <div className="visitor-metric" aria-label={description} title={description}><span className="visitor-metric-label" aria-hidden="true">{caption}</span><strong className={'visitor-metric-number'+(number.length>7?' long':'')} aria-hidden="true">{number}</strong></div>;
  };
  const both=flag(site,'show.visitorCounter')&&flag(site,'show.homeViews');
  return <div className="visitor-counter" role="group" aria-label={copy['visitor.title']}><div className="visitor-counter-head"><span>{copy['visitor.title']}</span><details className="visitor-counter-info"><summary aria-label={copy['visitor.info']}><Info size={14}/></summary><p>{owner&&<><b>{copy['visitor.ownerNote']}</b><br/></>}{copy['visitor.help']}</p></details></div><div className={'visitor-counter-values'+(!both?' single':'')} aria-live="polite" aria-atomic="true">{flag(site,'show.visitorCounter')&&metric(copy['visitor.caption'],copy[owner?'visitor.owner':'visitor.greeting'],result?.total,copy['visitor.loading'],copy['visitor.unavailable'])}{flag(site,'show.homeViews')&&metric(copy['homeViews.caption'],copy['homeViews.greeting'],result?.homeViews,copy['homeViews.loading'],copy['homeViews.unavailable'])}</div></div>;
}

export function ArticleReadCount(){
  const copy=useSiteCopy(),locale=useLocale(),site=useSiteSettings(),{articleId,result}=useContext(VisitorContext);
  if(!articleId||!flag(site,'show.articleViews'))return null;
  const value=result?.articleId===articleId?result.postViews:undefined;
  const number=typeof value==='number'&&Number.isSafeInteger(value)&&value>=0?new Intl.NumberFormat(locale==='zh'?'zh-CN':locale==='ja'?'ja-JP':'en-US').format(value):'—';
  return <span className="article-read-count" title={formatCopy(copy['views.postLabel'],{number})} aria-label={formatCopy(copy['views.postLabel'],{number})} aria-live="polite"><Eye size={14} aria-hidden="true"/>{formatCopy(copy['views.post'],{number})}</span>;
}
