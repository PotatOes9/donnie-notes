"use client";
import {useEffect,useRef,useState,type ImgHTMLAttributes} from 'react';
let observer:IntersectionObserver|undefined;
const ready=new WeakMap<Element,()=>void>();
// A tighter shared loading horizon than native lazy loading for large covers.
export function DeferredImage({src,priority=false,...props}:ImgHTMLAttributes<HTMLImageElement>&{src:string;priority?:boolean}){
 const image=useRef<HTMLImageElement>(null),[visible,setVisible]=useState(priority);
 useEffect(()=>{
  if(visible)return;const element=image.current;if(!element)return;
  if(typeof IntersectionObserver==='undefined'){setVisible(true);return;}
  observer??=new IntersectionObserver(entries=>{for(const entry of entries)if(entry.isIntersecting){ready.get(entry.target)?.();ready.delete(entry.target);observer?.unobserve(entry.target);}},{rootMargin:'350px 0px'});
  ready.set(element,()=>setVisible(true));observer.observe(element);
  return()=>{ready.delete(element);observer?.unobserve(element);};
 },[visible]);
 return <><img {...props} ref={image} alt={visible?props.alt:''} src={visible?src:undefined} loading={priority?'eager':undefined} decoding="async" fetchPriority={priority?'auto':'low'}/><noscript><img {...props} src={src} loading="lazy"/></noscript></>;
}
