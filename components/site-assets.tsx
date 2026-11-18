import {sitePath} from '@/lib/static-path';
'use client';
import {SiteLink} from '@/components/site-link';
import {localizedHref} from '@/lib/i18n';
import {useEffect,useState} from 'react';
import {Leaf,NotebookPen,Route,Camera,Coffee,Music,BookOpen,Heart,Globe,Star,Sparkles} from 'lucide-react';
import {useSiteCopy,useSiteSettings,useLocale} from './site-copy-provider';
import {text,type SettingKey} from '@/lib/site-settings';

export function SiteImage({src,fallback='',...props}:React.ImgHTMLAttributes<HTMLImageElement>&{src:string;fallback?:string}){
  const [failed,setFailed]=useState(false);
  useEffect(()=>setFailed(false),[src]);
  const active=sitePath(failed?fallback:src);
  if(!active)return null;
  return <img {...props} decoding={props.decoding??'async'} src={active} onError={()=>setFailed(true)}/>;
}

export function BrandWordmark({small=false}:{small?:boolean}){
  const copy=useSiteCopy(),site=useSiteSettings(),locale=useLocale();
  const source=site.assets[small?'footerLogo':'logo'];
  const [failed,setFailed]=useState(false);
  useEffect(()=>setFailed(false),[source]);
  return <SiteLink href={localizedHref(text(site,'link.brand'),locale)} translate="no" className={'wordmark'+(small?' small':'')} aria-label={copy['a11y.home']}>{source&&!failed?<img className="wordmark-image" src={source} alt={copy['brand.alt']} onError={()=>setFailed(true)}/>:<>{copy['brand.name']}<span>.</span></>}</SiteLink>;
}

const icons={'叶子':Leaf,'笔记':NotebookPen,'路线':Route,'相机':Camera,'咖啡':Coffee,'音乐':Music,'书本':BookOpen,'爱心':Heart,'地球':Globe,'星星':Star,'星芒':Sparkles};
export function TopicIcon({slot}:{slot:'One'|'Two'|'Three'}){
  const site=useSiteSettings(),source=site.assets[('topic'+slot) as 'topicOne'|'topicTwo'|'topicThree'];
  const Icon=icons[text(site,('icon.topic'+slot) as SettingKey) as keyof typeof icons]||Leaf;
  return source?<SiteImage src={source} className="topic-custom-icon" alt=""/>:<Icon aria-hidden="true"/>;
}
