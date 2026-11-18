'use client';
import {pageHref} from '@/lib/static-path';
import type {AnchorHTMLAttributes} from 'react';
import {useJournalNavigation} from './journal-context';
// Real anchors work before hydration. Article, admin, auth and language links
// keep native document navigation; no separate RSC navigation request is needed.
export function SiteLink({href,onClick,...props}:AnchorHTMLAttributes<HTMLAnchorElement>&{href:string}){
 const journal=useJournalNavigation();
 return <a {...props} href={pageHref(href)} onClick={event=>{onClick?.(event);
  if(event.defaultPrevented||event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey||props.download!==undefined||props.target&&props.target!=='_self')return;
  try{if(journal?.navigate(href))event.preventDefault();}catch{/* Native navigation remains the fallback. */}
 }}/>;
}
