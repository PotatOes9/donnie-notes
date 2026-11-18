"use client";
import {SiteLink} from '@/components/site-link';
import {localizedHref,localePath} from '@/lib/i18n';
import {LanguageSwitcher} from './language-switcher';
import {useEffect,useState} from 'react';
import {useSiteCopy,useSiteSettings,useLocale} from './site-copy-provider';
import {usePathname} from 'next/navigation';
import {Archive,ArrowUpRight,BookOpen,Moon,Sun,UserRound,Search} from 'lucide-react';
import {flag,initialTheme,text} from '@/lib/site-settings';
import {useSiteSearch} from './site-search-context';
import {useJournalNavigation} from './journal-context';
import {SlidingControl} from './sliding-control';
export function Nav({canManage=false,writingUrl}:{canManage?:boolean;writingUrl?:string}){
  const copy=useSiteCopy(),site=useSiteSettings(),locale=useLocale(),nativePath=localePath(usePathname()).pathname;
  const path=useJournalNavigation()?.pathname??nativePath;
  const {openSearch}=useSiteSearch();
  const [dark,setDark]=useState(initialTheme(site)==='dark');
  const themeChoice=text(site,'theme.default'),allowToggle=flag(site,'show.themeToggle');
  useEffect(()=>{
    let mode=initialTheme(site);
    try{
      const saved=localStorage.getItem('donnie-theme');
      if(allowToggle&&(saved==='dark'||saved==='light'))mode=saved;
      else if(themeChoice==='跟随系统')mode=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';
    }catch{}
    setDark(mode==='dark');document.documentElement.dataset.theme=mode;
  },[themeChoice,allowToggle]);
  function toggle(){const next=!dark;setDark(next);document.documentElement.dataset.theme=next?'dark':'light';try{localStorage.setItem('donnie-theme',next?'dark':'light');}catch{}}
  const links=[{url:text(site,'link.navHome'),label:copy['nav.home'],active:'/'},...(flag(site,'show.navArchive')?[{url:text(site,'link.navArchive'),label:copy['nav.archive'],active:'/archive'}]:[]),...(flag(site,'show.navAbout')?[{url:text(site,'link.navAbout'),label:copy['nav.about'],active:'/about'}]:[])];
  const readTarget=text(site,'link.navRead');
  const buttonTarget=canManage?(writingUrl||'/settings'):path==='/'&&readTarget==='/#articles'?'#articles':readTarget;
  const opensNotion=canManage&&buttonTarget.startsWith('https://www.notion.so/');
  return <nav className="main-nav" aria-label={copy['a11y.nav']}><SlidingControl activeKey={path} className="nav-links">{links.map(({url,label,active})=><SiteLink key={active} href={localizedHref(url,locale)} data-selection-active={isActive(path,active)} className={isActive(path,active)?'active':''} aria-current={isActive(path,active)?'page':undefined}>{label}</SiteLink>)}</SlidingControl><div className="nav-tools">{flag(site,'show.search')&&<button type="button" className="icon-button global-search-trigger" onClick={openSearch} aria-label={copy['a11y.search']} aria-haspopup="dialog" aria-keyshortcuts="Control+k Meta+k"><Search size={20}/></button>}<LanguageSwitcher/>{allowToggle&&<button className="icon-button theme-toggle" onClick={toggle} aria-pressed={dark} aria-label={dark?copy['a11y.light']:copy['a11y.dark']}>{dark?<Sun key="sun" size={19}/>:<Moon key="moon" size={19}/>}</button>}{flag(site,'show.navButton')&&<SiteLink className="write-link" href={localizedHref(buttonTarget,locale)} target={opensNotion?'_blank':undefined} rel={opensNotion?'noopener noreferrer':undefined}><span className="nav-action-label">{copy[canManage?'nav.write':'nav.read']}</span> <ArrowUpRight size={15}/></SiteLink>}</div></nav>;
}

function isActive(path:string,active:string){return path===active||(active==='/'&&path.startsWith('/post/'));}
export function MobileNav(){
  const copy=useSiteCopy(),site=useSiteSettings(),locale=useLocale(),nativePath=localePath(usePathname()).pathname;
  const path=useJournalNavigation()?.pathname??nativePath;
  const {openSearch,isOpen}=useSiteSearch();
  const links=[{url:text(site,'link.navHome'),label:copy['nav.home'],active:'/',Icon:BookOpen},...(flag(site,'show.navArchive')?[{url:text(site,'link.navArchive'),label:copy['nav.archive'],active:'/archive',Icon:Archive}]:[]),...(flag(site,'show.navAbout')?[{url:text(site,'link.navAbout'),label:copy['nav.about'],active:'/about',Icon:UserRound}]:[])];
  return <SlidingControl as="nav" activeKey={isOpen?'search':path} className="mobile-nav glass-surface" aria-label={copy['a11y.nav']}>{links.map(({url,label,active,Icon})=><SiteLink key={active} href={localizedHref(url,locale)} data-selection-active={!isOpen&&isActive(path,active)} className={isActive(path,active)?'active':''} aria-current={isActive(path,active)?'page':undefined}><Icon aria-hidden="true"/><span>{label}</span></SiteLink>)}{flag(site,'show.search')&&<button type="button" className="mobile-search-trigger" data-selection-active={isOpen} aria-expanded={isOpen} onClick={openSearch} aria-label={copy['a11y.search']} aria-haspopup="dialog"><Search aria-hidden="true"/><span>{copy['search.open']}</span></button>}</SlidingControl>;
}
