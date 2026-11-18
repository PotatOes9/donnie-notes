import {sitePath,stripBase} from '@/lib/static-path';
'use client';
import {SiteLink} from '@/components/site-link';

import {useCallback,useEffect,useMemo,useRef,useState} from 'react';
import {ArrowUpRight,FileText,LoaderCircle,Search,X} from 'lucide-react';
import {localizedHref} from '@/lib/i18n';
import {matchingArticles} from '@/lib/article-discovery';
import type {Feed} from '@/lib/blog-server';
import {formatCopy} from '@/lib/site-copy';
import {useLocale,useSiteCopy,useSiteSettings} from './site-copy-provider';
import {flag} from '@/lib/site-settings';
import {SiteImage} from './site-assets';

import {SearchContext} from './site-search-context';

function SearchThumbnail({src}:{src:string|null}){
  const root=useRef<HTMLSpanElement>(null),[visible,setVisible]=useState(false);
  useEffect(()=>{
    if(!src)return;
    const element=root.current;if(!element)return;
    if(typeof IntersectionObserver==='undefined'){setVisible(true);return;}
    const observer=new IntersectionObserver(entries=>{
      if(entries.some(entry=>entry.isIntersecting)){setVisible(true);observer.disconnect();}
    },{root:element.closest('.site-search-results'),rootMargin:'100px 0px'});
    observer.observe(element);return()=>observer.disconnect();
  },[src]);
  return <span ref={root} className="site-search-thumb" aria-hidden="true">{src&&visible?<SiteImage src={src} alt="" width={64} height={64} decoding="async"/>:<FileText size={23}/>}</span>;
}

export function SiteSearchProvider({children}:{children:React.ReactNode}){
  const copy=useSiteCopy(),site=useSiteSettings(),locale=useLocale();
  const [open,setOpen]=useState(false),[query,setQuery]=useState(''),[feed,setFeed]=useState<Feed|null>(null),[loading,setLoading]=useState(false);
  const dialog=useRef<HTMLDialogElement>(null),input=useRef<HTMLInputElement>(null),returnFocus=useRef<HTMLElement|null>(null);
  const enabled=flag(site,'show.search');
  const syncFeed=useCallback((next:Feed)=>setFeed(previous=>next.mode==='error'&&previous?.articles.length?previous:next),[]);
  const openSearch=useCallback(()=>{if(!enabled)return;returnFocus.current=document.activeElement as HTMLElement;setQuery('');setOpen(true);},[enabled]);
  useEffect(()=>{
    if(!enabled)return;
    const shortcut=(event:KeyboardEvent)=>{if((event.metaKey||event.ctrlKey)&&event.key.toLowerCase()==='k'){event.preventDefault();openSearch();}};
    window.addEventListener('keydown',shortcut);
    return()=>window.removeEventListener('keydown',shortcut);
  },[enabled,openSearch]);
  useEffect(()=>{
    if(!open)return;
    const element=dialog.current;if(!element)return;
    const overflow=document.body.style.overflow;
    document.documentElement.dataset.searchOpen='true';
    document.body.style.overflow='hidden';element.showModal();input.current?.focus({preventScroll:true});
    return()=>{element.close();delete document.documentElement.dataset.searchOpen;document.body.style.overflow=overflow;if(returnFocus.current?.isConnected)returnFocus.current.focus({preventScroll:true});};
  },[open]);
  useEffect(()=>{
    if(!open||feed!==null)return;
    const controller=new AbortController();setLoading(true);
    (async()=>{
      try{
        const response=await fetch(sitePath('/data/feed.json'),{signal:controller.signal,cache:'no-store'});
        const next:Feed=await response.json();
        if(!response.ok||next.mode==='error'||!Array.isArray(next.articles))throw new Error('Article search unavailable');
        setFeed(next);
      }catch{if(!controller.signal.aborted)setFeed({articles:[],mode:'error'});}
      finally{if(!controller.signal.aborted)setLoading(false);}
    })();
    return()=>controller.abort();
  },[open,feed]);
  const results=useMemo(()=>matchingArticles(feed?.articles||[],query),[feed,query]);
  const pending=loading||(open&&feed===null);
  const contextValue=useMemo(()=>({openSearch,syncFeed,isOpen:open}),[openSearch,syncFeed,open]);
  function moveResult(event:React.KeyboardEvent){
    if(event.key==='Escape'){event.preventDefault();setOpen(false);return;}
    if(event.key!=='ArrowDown'&&event.key!=='ArrowUp')return;
    const links=Array.from(dialog.current?.querySelectorAll<HTMLAnchorElement>('.site-search-result')||[]);
    if(!links.length)return;
    event.preventDefault();const index=links.indexOf(document.activeElement as HTMLAnchorElement);
    const next=event.key==='ArrowDown'?(index+1)%links.length:index<=0?links.length-1:index-1;
    links[next].focus();
  }
  return <SearchContext.Provider value={contextValue}>{children}{enabled&&<dialog ref={dialog} className="site-search" aria-labelledby="site-search-title" onCancel={event=>{event.preventDefault();setOpen(false);}} onClick={event=>{if(event.target===event.currentTarget)setOpen(false);}}>
    <div className="site-search-inner" onKeyDown={moveResult}>
      <h2 className="discovery-sr-only" id="site-search-title">{copy['a11y.search']}</h2>
      <div className="site-search-heading"><Search size={21} aria-hidden="true"/><input ref={input} type="search" value={query} onChange={event=>setQuery(event.target.value)} placeholder={copy['search.placeholder']} aria-label={copy['a11y.searchInput']} autoComplete="off"/><button type="button" className="icon-button" onClick={()=>setOpen(false)} aria-label={copy['a11y.closeSearch']}><X size={19}/></button></div>
      <div className="site-search-results" aria-busy={pending}>
        <p className="site-search-result-label" role="status" aria-live="polite">{pending?copy['search.loading']:feed?.mode==='error'?copy['search.unavailable']:formatCopy(copy['search.results'],{count:results.length})}</p>
        {pending?<div className="site-search-empty"><LoaderCircle className="search-spinner" size={25} aria-hidden="true"/></div>:feed?.mode==='error'?<div className="site-search-empty"><p>{copy['search.unavailable']}</p><button type="button" className="search-retry" onClick={()=>setFeed(null)}>{copy['search.retry']}</button></div>:results.length?results.map(article=><SiteLink key={article.id} className="site-search-result" href={localizedHref('/post/'+article.id,locale)} onClick={()=>setOpen(false)}>
          <SearchThumbnail src={article.cover}/>
          <span className="site-search-result-copy"><span>{[article.category,article.date.slice(0,10)].filter(Boolean).join(' · ')}</span><strong>{article.title}</strong></span><ArrowUpRight size={16} aria-hidden="true"/>
        </SiteLink>):<div className="site-search-empty"><h3>{copy['search.emptyTitle']}</h3><p>{copy['search.emptyText']}</p></div>}
      </div><p className="site-search-hint">{copy['search.keyboardHint']}</p>
    </div>
  </dialog>}</SearchContext.Provider>;
}
