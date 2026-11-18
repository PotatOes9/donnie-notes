'use client';
import {SiteLink} from '@/components/site-link';

import {useMemo,useState} from 'react';
import {ArrowUpRight} from 'lucide-react';
import {localizedHref} from '@/lib/i18n';
import {groupedArchive} from '@/lib/article-discovery';
import {defaultCopy,formatCopy} from '@/lib/site-copy';
import {flag} from '@/lib/site-settings';
import type {Feed} from '@/lib/blog-server';
import {ArchiveCover} from './archive-cover';
import {useLocale,useSiteCopy,useSiteSettings} from './site-copy-provider';
import {useSearchFeed} from './site-search-context';
import {useJournalFeed} from './journal-context';
import {SlidingControl} from './sliding-control';

export function ArchiveBrowser({feed,canManage}:{feed:Feed;canManage:boolean}){
  const copy=useSiteCopy(),site=useSiteSettings(),locale=useLocale();
  feed=useJournalFeed(feed).feed;
  const [category,setCategory]=useState<string|null>(null);
  useSearchFeed(feed);
  const groups=useMemo(()=>groupedArchive(feed.articles,category),[feed.articles,category]);
  const categories=useMemo(()=>{
    const counts=new Map<string,number>();
    for(const article of feed.articles)counts.set(article.category,(counts.get(article.category)||0)+1);
    return [...counts].map(([name,count])=>({name,count}));
  },[feed.articles]);
  return <div className="container archive-page">
    <div className="archive-heading"><div className="page-heading"><span className="eyebrow">{copy['archive.eyebrow']}</span><h1 className="copy-lines">{copy['archive.title']}</h1><p className="copy-lines">{copy['archive.intro']}</p></div>{feed.mode!=='error'&&<div className="archive-total"><strong>{feed.articles.length}</strong><span>{copy['archive.totalLabel']}</span></div>}</div>
    {feed.mode==='demo'&&<div className="demo-note">{copy['archive.demo']}{canManage&&<SiteLink href={localizedHref('/settings',locale)}>{copy['archive.connect']} ↗</SiteLink>}</div>}
    {feed.mode==='error'&&<div className="error-note" role="alert">{locale!=='zh'||!feed.error||feed.error===defaultCopy['error.feed']?copy['error.feed']:feed.error}</div>}
    {!!feed.articles.length&&<div className="archive-controls">{flag(site,'show.categories')&&<SlidingControl activeKey={category??'all'} className="archive-categories" role="group" aria-label={copy['a11y.category']}><button onClick={()=>setCategory(null)} data-selection-active={category===null} aria-pressed={category===null} aria-label={copy['search.all']+' '+formatCopy(copy['archive.count'],{count:feed.articles.length})}><span>{copy['search.all']}</span><span className="archive-category-count" aria-hidden="true">{feed.articles.length.toLocaleString(locale)}</span></button>{categories.map(({name,count})=><button key={name} onClick={()=>setCategory(name)} data-selection-active={category===name} aria-pressed={category===name} aria-label={name+' '+formatCopy(copy['archive.count'],{count})}><span>{name}</span><span className="archive-category-count" aria-hidden="true">{count.toLocaleString(locale)}</span></button>)}</SlidingControl>}<nav className="archive-year-jumps" aria-label={copy['archive.yearNavigation']}>{groups.map(({year,articles})=><SiteLink key={year} href={'#year-'+year} aria-label={(year==='undated'?copy['archive.undated']:year)+' '+formatCopy(copy['archive.count'],{count:articles.length})}><span>{year==='undated'?copy['archive.undated']:year}</span><span className="archive-category-count" aria-hidden="true">{articles.length.toLocaleString(locale)}</span></SiteLink>)}</nav></div>}
    <div className="archive-groups filter-content">{groups.map(({year,articles})=><section className="archive-year" id={'year-'+year} key={year}><h2>{year==='undated'?copy['archive.undated']:year}<span>{formatCopy(copy['archive.count'],{count:articles.length})}</span></h2><div>{articles.map(article=><SiteLink className={'archive-item'+(!flag(site,'show.dates')?' no-date':'')} key={article.id} href={localizedHref('/post/'+article.id,locale)}><ArchiveCover src={article.cover}/><div className="archive-item-main">{flag(site,'show.dates')&&article.date&&<time dateTime={article.date}>{article.date.slice(5,10).replace('-',' / ')}</time>}<h3>{article.title}</h3></div>{flag(site,'show.articleCategory')&&<span className="category-label">{article.category}</span>}<ArrowUpRight className="archive-item-arrow" size={18} aria-hidden="true"/></SiteLink>)}</div></section>)}</div>
    {!feed.articles.length&&feed.mode!=='error'&&<div className="empty-state"><h2>{copy['archive.emptyTitle']}</h2><p>{copy['archive.emptyText']}</p></div>}
  </div>;
}
