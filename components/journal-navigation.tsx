'use client';
import {pageHref,sitePath,stripBase} from '@/lib/static-path';
import {useCallback,useEffect,useLayoutEffect,useMemo,useRef,useState} from 'react';
import type {Feed} from '@/lib/blog-server';
import {journalPaths,journalTarget,type JournalView} from '@/lib/journal-navigation';
import {num} from '@/lib/site-settings';
import {useLocale,useSiteCopy,useSiteSettings} from './site-copy-provider';
import {useSearchFeed} from './site-search-context';
import {JournalContext,useJournalNavigation,useJournalFeed} from './journal-context';
export function JournalNavigation({initialView,initialFeed,children}:{initialView:JournalView;initialFeed:Feed;children:React.ReactNode}){
 const locale=useLocale(),copy=useSiteCopy(),site=useSiteSettings();
 const [view,setView]=useState(initialView),[feed,setFeed]=useState(initialFeed),[stale,setStale]=useState(false),[historyStep,setHistoryStep]=useState(0);
 const pendingScroll=useRef<{hash?:string;y?:number}|null>(null),currentView=useRef(initialView);
 const navigate=useCallback((href:string)=>{
  const target=journalTarget(href,location.origin+stripBase(location.pathname)+location.search+location.hash,locale);if(!target||target.view===currentView.current)return false;
  history.replaceState({...history.state,donnieScrollY:scrollY},'',location.href);
  history.pushState({donnieJournal:true,donnieScrollY:0},'',pageHref(target.url));
  pendingScroll.current={hash:target.hash};currentView.current=target.view;setView(target.view);return true;
 },[locale]);
 useEffect(()=>{
  const previous=history.scrollRestoration;history.scrollRestoration='manual';
  const pop=()=>{const target=journalTarget(stripBase(location.pathname)+location.search+location.hash,location.origin+stripBase(location.pathname),locale);if(!target)return;
   pendingScroll.current={hash:target.hash,y:history.state?.donnieScrollY??0};currentView.current=target.view;setView(target.view);setHistoryStep(step=>step+1);
  };
  window.addEventListener('popstate',pop);return()=>{window.removeEventListener('popstate',pop);history.scrollRestoration=previous;};
 },[locale]);
 useLayoutEffect(()=>{
  const scroll=pendingScroll.current;if(!scroll)return;pendingScroll.current=null;
  if(scroll.hash){let id=scroll.hash.slice(1);try{id=decodeURIComponent(id);}catch{}const anchor=document.getElementById(id);if(anchor){anchor.scrollIntoView({behavior:'instant' as ScrollBehavior,block:'start'});return;}}
  window.scrollTo({top:scroll.y??0,behavior:'instant' as ScrollBehavior});document.getElementById('main')?.focus({preventScroll:true});
 },[view,historyStep]);
 useEffect(()=>{document.title=view==='home'?copy['site.title']:copy[view==='archive'?'archive.metaTitle':'about.metaTitle']+' · '+copy['site.suffix'];},[view,copy]);
 useEffect(()=>{
  if(initialFeed.mode!=='live')return;
  const controller=new AbortController();let busy=false,lastRead=Date.now();
  const refresh=async()=>{
   if(busy||document.visibilityState!=='visible'||Date.now()-lastRead<num(site,'feed.refreshSeconds')*1000)return;
   busy=true;lastRead=Date.now();
   try{const response=await fetch(sitePath('/data/feed.json'),{signal:controller.signal,cache:'no-store'}),next:Feed=await response.json();
    if(!response.ok||next.mode==='error'){setStale(true);return;}
    setFeed(previous=>JSON.stringify(previous)===JSON.stringify(next)?previous:next);setStale(false);
   }catch{if(!controller.signal.aborted)setStale(true);}finally{busy=false;}
  };
  const timer=setInterval(refresh,num(site,'feed.refreshSeconds')*1000);document.addEventListener('visibilitychange',refresh);
  return()=>{controller.abort();clearInterval(timer);document.removeEventListener('visibilitychange',refresh);};
 },[initialFeed.mode,site]);
 const value=useMemo(()=>({view,pathname:journalPaths[view],feed,stale,navigate}),[view,feed,stale,navigate]);
 return <JournalContext.Provider value={value}>{children}</JournalContext.Provider>;
}
export function JournalScreens({home,archive,about,initialFeed}:{home:React.ReactNode;archive:React.ReactNode;about:React.ReactNode;initialFeed:Feed}){
 const journal=useJournalNavigation(),{feed}=useJournalFeed(initialFeed);useSearchFeed(feed);const view=journal?.view??'home';
 return <div className="journal-screen" key={view} data-journal-view={view}>{view==='home'?home:view==='archive'?archive:about}</div>;
}
