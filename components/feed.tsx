'use client';
import {SiteLink} from '@/components/site-link';
import {localizedHref} from '@/lib/i18n';
import {useMemo,useState} from 'react';
import {ArrowRight,ArrowUpRight,FileText,Asterisk,NotebookPen} from 'lucide-react';
import {useSiteCopy,useSiteSettings,useLocale} from './site-copy-provider';
import {flag,num,orderedArticles,text} from '@/lib/site-settings';
import {defaultCopy,formatCopy} from '@/lib/site-copy';
import {BrandMonogram} from './brand-icon';
import {VisitorCounter} from './visitor-counter';
import type {Article} from '@/lib/notion-core';
import type {Feed} from '@/lib/blog-server';
import {useSearchFeed} from './site-search-context';
import {useJournalFeed} from './journal-context';
import {SlidingControl} from './sliding-control';
import {DeferredImage} from './deferred-image';
function dateLabel(date:string){if(!date)return '';return date.slice(0,10).replaceAll('-','.');}
export function Cover({article,className='',priority=false}:{article:Article;className?:string;priority?:boolean}){const site=useSiteSettings(),image=article.cover||site.assets.coverFallback;return <div className={'article-cover '+className}>{image?<DeferredImage priority={priority} src={image} alt={article.title} width={640} height={480} onError={event=>{event.currentTarget.style.display='none';}}/>:<div className="cover-fallback"><FileText size={25}/><span>{article.category}</span></div>}</div>;}
export function BlogFeed({initialFeed,canManage=false}:{initialFeed:Feed;canManage?:boolean}){
const copy=useSiteCopy(),site=useSiteSettings(),locale=useLocale();
const showCategories=flag(site,'show.categories');
const {feed,stale}=useJournalFeed(initialFeed);
const[category,setCategory]=useState<string|null>(null);
useSearchFeed(feed);
const categories=[null,...Array.from(new Set(feed.articles.map(x=>x.category)))];
const articles=useMemo(()=>{const selected=orderedArticles(feed.articles,site).filter(article=>(!showCategories||category===null||article.category===category));const limit=num(site,'feed.limit');return limit>0?selected.slice(0,limit):selected;},[feed.articles,category,site,showCategories]);const featured=flag(site,'show.featured')?articles[0]:null;const cards=featured?articles.slice(1):articles;const showSidebar=flag(site,'show.sidebar')&&(flag(site,'show.sidebarAbout')||flag(site,'show.sidebarQuote')||flag(site,'show.sidebarWriting')||(flag(site,'show.visitorCounter')||flag(site,'show.homeViews')));
return <div className="container feed-section" id="articles">
{feed.mode==='demo'&&<div className="demo-note"><span className="demo-dot"/><span>{copy['feed.demo']}</span>{canManage&&<SiteLink href={localizedHref('/settings',locale)}>{copy['feed.start']} <ArrowUpRight size={14}/></SiteLink>}</div>}
{feed.mode==='error'&&<div className="error-note" role="alert"><p>{locale!=='zh'||!feed.error||feed.error===defaultCopy['error.feed']?copy['error.feed']:feed.error}</p><button onClick={()=>window.location.reload()}>{copy['error.reload']}</button></div>}
<div className="section-heading"><div><span className="eyebrow">{copy['feed.eyebrow']}</span><h2>{copy['feed.title']}<span className="article-count">{feed.articles.length.toString().padStart(2,'0')}</span></h2></div></div>
<div className="filter-row">{showCategories&&<SlidingControl activeKey={category??'all'} className="category-tabs" role="group" aria-label={copy['a11y.category']}>{categories.map(value=><button key={value===null?'all':'category:'+value} onClick={()=>setCategory(value)} className={category===value?'active':''} data-selection-active={category===value} aria-pressed={category===value}>{value===null?copy['search.all']:value}</button>)}</SlidingControl>}</div>
{stale&&<p className="muted-note" role="status">{copy['feed.stale']}</p>}
{articles.length?<div className={'journal-grid'+(!showSidebar?' no-sidebar':'')}><div className="posts-column filter-content">{featured&&<SiteLink className="featured-card" href={localizedHref('/post/'+featured.id,locale)}><Cover article={featured} priority/><div className="featured-copy"><div className="article-meta">{flag(site,'show.articleCategory')&&<span className="category-label">{featured.category}</span>}{flag(site,'show.dates')&&<span>{dateLabel(featured.date)}</span>}{flag(site,'show.readingTime')&&featured.minutes&&<span>{formatCopy(copy['feed.minutes'],{minutes:featured.minutes})}</span>}</div><h3>{featured.title}</h3><p>{featured.summary||copy['feed.featureSummary']}</p><span className="read-link">{copy['feed.continue']} <ArrowUpRight size={19}/></span></div></SiteLink>}<div className={'post-grid'+(!featured?' no-featured':'')}>{cards.map(article=><SiteLink key={article.id} className="post-card" href={localizedHref('/post/'+article.id,locale)}><Cover article={article}/><div className="post-card-copy"><div className="article-meta">{flag(site,'show.articleCategory')&&<span className="category-label">{article.category}</span>}{flag(site,'show.dates')&&<span>{dateLabel(article.date)}</span>}</div><h3>{article.title}</h3><p>{article.summary||copy['feed.cardSummary']}</p><span className="read-link">{copy['feed.read']} <ArrowUpRight size={17}/></span></div></SiteLink>)}</div><SiteLink href={localizedHref(text(site,'link.feedArchive'),locale)} className="archive-link">{copy['feed.archive']} <ArrowRight size={17}/></SiteLink></div>{showSidebar&&<aside className="journal-sidebar">{flag(site,'show.sidebarAbout')&&<div className="about-card"><BrandMonogram alt={copy['brand.alt']}/><span className="eyebrow">{copy['sidebar.eyebrow']}</span><h3>{copy['sidebar.title']}</h3><p className="copy-lines">{copy['sidebar.intro']}</p><SiteLink href={localizedHref(text(site,'link.sidebarAbout'),locale)}>{copy['sidebar.about']} <ArrowUpRight size={16}/></SiteLink></div>}{(flag(site,'show.sidebarQuote')||(flag(site,'show.visitorCounter')||flag(site,'show.homeViews')))&&<div className="sidebar-note-group">{flag(site,'show.sidebarQuote')&&<div className="sidebar-quote"><Asterisk size={23}/><p className="copy-lines">{copy['sidebar.quote']}</p><span>{copy['sidebar.quoteNote']}</span></div>}{(flag(site,'show.visitorCounter')||flag(site,'show.homeViews'))&&<VisitorCounter/>}</div>}{flag(site,'show.sidebarWriting')&&<div className="writing-card"><NotebookPen size={21}/><h3>{copy['sidebar.writingTitle']}</h3><p className="copy-lines">{copy['sidebar.writingText']}</p></div>}</aside>}</div>
:feed.mode!=='error'&&<div className="empty-state"><NotebookPen size={32}/><h3>{feed.articles.length?copy['search.emptyTitle']:copy['feed.emptyTitle']}</h3><p>{feed.articles.length?copy['search.emptyText']:copy['feed.emptyText']}</p>{feed.articles.length?<button onClick={()=>{setCategory(null);}}>{copy['search.reset']}</button>:canManage?<SiteLink className="primary-button" href={localizedHref('/settings',locale)}>{copy['feed.openLibrary']} <ArrowUpRight size={16}/></SiteLink>:null}</div>}
</div>;}
