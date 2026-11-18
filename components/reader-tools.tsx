'use client';
import {useEffect,useRef,useState} from 'react';
import {useSiteCopy,useSiteSettings} from './site-copy-provider';
import {flag} from '@/lib/site-settings';
import {formatCopy} from '@/lib/site-copy';
import {openHeadingAncestors} from '@/lib/notion-format';
import {Check,Link2,X,ZoomIn} from 'lucide-react';
export function ArticleAnchors(){
  useEffect(()=>{
    let frame:number|undefined;
    function reveal(hash:string){
      let target:HTMLElement|null;try{target=document.getElementById(decodeURIComponent(hash.slice(1)));}catch{return;}
      if(!target?.closest('.article-body'))return;
      openHeadingAncestors(target);
      if(frame!==undefined)cancelAnimationFrame(frame);
      frame=requestAnimationFrame(()=>target?.scrollIntoView({block:'start'}));
    }
    const changed=()=>reveal(window.location.hash);
    const click=(event:MouseEvent)=>{const link=event.target instanceof Element?event.target.closest<HTMLAnchorElement>('.article-body a[href^="#"]'):null;if(link&&!event.defaultPrevented)reveal(link.hash);};
    changed();window.addEventListener('hashchange',changed);document.addEventListener('click',click);
    return()=>{if(frame!==undefined)cancelAnimationFrame(frame);window.removeEventListener('hashchange',changed);document.removeEventListener('click',click);};
  },[]);
  return null;
}
export function ReadingTools(){
  const copy=useSiteCopy(),site=useSiteSettings(),progress=useRef<HTMLDivElement>(null),timer=useRef<ReturnType<typeof setTimeout>|undefined>(undefined);
  const [copied,setCopied]=useState(false),[error,setError]=useState(''),enabled=flag(site,'show.readingProgress');
  useEffect(()=>{
    if(!enabled)return;
    let frame:number|undefined,max=0;
    const draw=()=>{frame=undefined;const value=max>0?Math.max(0,Math.min(1,window.scrollY/max)):1;if(progress.current)progress.current.style.transform='scaleX('+value+')';};
    const schedule=()=>{if(frame===undefined)frame=requestAnimationFrame(draw);};
    const measure=()=>{max=document.documentElement.scrollHeight-window.innerHeight;schedule();};
    measure();window.addEventListener('scroll',schedule,{passive:true});window.addEventListener('resize',measure,{passive:true});document.addEventListener('load',measure,true);
    const observer=typeof ResizeObserver==='undefined'?undefined:new ResizeObserver(measure);const article=document.querySelector('.article-layout');if(article)observer?.observe(article);
    return()=>{if(frame!==undefined)cancelAnimationFrame(frame);observer?.disconnect();window.removeEventListener('scroll',schedule);window.removeEventListener('resize',measure);document.removeEventListener('load',measure,true);};
  },[enabled]);
  useEffect(()=>()=>{if(timer.current)clearTimeout(timer.current);},[]);
  async function copyLink(){try{await navigator.clipboard.writeText(window.location.href);setCopied(true);setError('');if(timer.current)clearTimeout(timer.current);timer.current=setTimeout(()=>setCopied(false),2200);}catch{setError(copy['post.copyFailed']);}}
  return <>{enabled&&<div className="reading-progress" ref={progress} aria-hidden="true"/>}{flag(site,'show.share')&&<div className="share-tools"><button onClick={copyLink}>{copied?<Check size={16}/>:<Link2 size={16}/>} {copied?copy['post.copied']:copy['post.copy']}</button>{error&&<span role="status">{error}</span>}</div>}</>;
}
export function ArticleImage({src,alt,caption,captionContent}:{src:string;alt:string;caption:string;captionContent?:React.ReactNode}){const copy=useSiteCopy();const dialog=useRef<HTMLDialogElement>(null);const[failed,setFailed]=useState(false),[activeSrc,setActiveSrc]=useState(src);const [expanded,setExpanded]=useState(false);const retried=useRef(false);function retry(){if(!retried.current&&src.startsWith('/api/media/')){retried.current=true;setActiveSrc(src+'?refresh='+Date.now());}else setFailed(true);}return <figure className="article-figure">{failed?<div className="image-failed"><p>{copy['post.imageFailed']}</p><button onClick={()=>{retried.current=false;setFailed(false);setActiveSrc(src+(src.includes('?')?'&':'?')+'refresh='+Date.now());}}>{copy['post.reloadImage']}</button></div>:<button className="image-open" onClick={()=>{setExpanded(true);dialog.current?.showModal();}} aria-label={formatCopy(copy['a11y.zoom'],{alt})}><img src={activeSrc} alt={alt} loading="lazy" decoding="async" onError={retry}/><span><ZoomIn size={17}/></span></button>}{caption&&<figcaption>{captionContent??caption}</figcaption>}<dialog className="image-dialog" ref={dialog} onClick={event=>{if(event.target===dialog.current)dialog.current?.close();}}><button className="dialog-close" onClick={()=>dialog.current?.close()} aria-label={copy['a11y.closeImage']}><X size={22}/></button>{expanded&&<img src={activeSrc} alt={alt} decoding="async"/>}{caption&&<p>{captionContent??caption}</p>}</dialog></figure>;}
