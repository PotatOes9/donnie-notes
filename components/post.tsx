import {SiteLink} from './site-link';
import {TranslationNotice} from './translation-notice';
import {ArticleReadCount} from './visitor-counter';
import {localizedHref,htmlLanguages,normalizeLocale,type Locale} from '@/lib/i18n';
import {ArrowLeft,ArrowUpRight} from 'lucide-react';
import {Shell} from './shell';
import {ArticleLicense} from './content-license';
import {NotionContent} from './notion-content';
import {ArticleAnchors,ReadingTools} from './reader-tools';
import {flag,text,type SiteSettings} from '@/lib/site-settings';
import {formatCopy,type SiteCopy} from '@/lib/site-copy';
import type {Article} from '@/lib/notion-core';
export function Post({article,copy,site,locale}:{article:Article;copy:SiteCopy;site:SiteSettings;locale:Locale}){const demo=false,source=normalizeLocale(article.language)||'zh';return <Shell articleId={demo?undefined:article.id}><div className="container article-layout"><SiteLink href={localizedHref(text(site,'link.postBack'),locale)} className="back-link"><ArrowLeft size={16}/>{copy['post.back']}</SiteLink><header className="article-header"><div className="article-meta">{flag(site,'show.articleCategory')&&<span className="category-label">{article.category}</span>}{flag(site,'show.dates')&&<span>{article.date.slice(0,10)}</span>}{flag(site,'show.readingTime')&&<span>{formatCopy(copy['post.minutes'],{minutes:article.minutes||1})}</span>}<ArticleReadCount/></div><h1 lang={htmlLanguages[source]}>{article.title}</h1>{article.summary&&<p lang={htmlLanguages[source]}>{article.summary}</p>}{demo&&<div className="article-demo-label">{copy['post.demo']}</div>}</header><TranslationNotice articleId={article.id} source={source}/><div className="article-body" lang={htmlLanguages[source]}><ArticleAnchors/><NotionContent copy={copy} blocks={article.blocks||[]} pageId={article.id} demo={demo} linkedPages={article.linkedPages} title={article.title} locale={locale}/></div><div className="article-end"><span>{copy['post.thanks']}</span><ArticleLicense copy={copy} locale={locale}/>{flag(site,'show.tags')&&<div className="article-tags">{article.tags.map(tag=><span key={tag}>#{tag}</span>)}</div>}<ReadingTools/></div>{flag(site,'show.nextReading')&&<SiteLink className="next-reading" href={localizedHref(text(site,'link.postNext'),locale)}><span>{copy['post.nextNote']}</span><strong>{copy['post.next']} <ArrowUpRight size={20}/></strong></SiteLink>}</div></Shell>;}
