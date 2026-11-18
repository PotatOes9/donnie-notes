'use client';
import {useEffect,useRef,useState} from 'react';
import {X} from 'lucide-react';
import {useLocale,useSiteCopy,useSiteSettings} from './site-copy-provider';
import {formatCopy} from '@/lib/site-copy';
import {flag} from '@/lib/site-settings';
import {shouldShowTranslationNotice,translationNoticeKey,type Locale} from '@/lib/i18n';

export function TranslationNotice({articleId,source='zh'}:{articleId:string;source?:Locale}){
  const copy=useSiteCopy(),locale=useLocale(),site=useSiteSettings(),key=translationNoticeKey(articleId,locale,source);
  const [dismissed,setDismissed]=useState(false),[closing,setClosing]=useState(false),timer=useRef<ReturnType<typeof setTimeout>|undefined>(undefined);
  useEffect(()=>{try{setDismissed(sessionStorage.getItem(key)==='dismissed');}catch{setDismissed(false);}},[key]);
  useEffect(()=>()=>{if(timer.current)clearTimeout(timer.current);},[]);
  if(!flag(site,'show.translationNotice')||!shouldShowTranslationNotice(locale,source)||dismissed)return null;
  function close(){if(closing)return;setClosing(true);try{sessionStorage.setItem(key,'dismissed');}catch{}timer.current=setTimeout(()=>setDismissed(true),window.matchMedia('(prefers-reduced-motion: reduce)').matches?0:180);}
  const language=copy[source==='zh'?'language.sourceZh':source==='ja'?'language.sourceJa':'language.sourceEn'];
  return <div className="translation-notice-slot" data-closing={closing?'true':'false'}><div className="translation-notice-clip"><aside className="translation-notice" role="note" aria-label={formatCopy(copy['translation.title'],{language})}>
    <span translate="no"><svg className="translation-symbol" viewBox="0 0 40 40" aria-hidden="true" focusable="false"><text x="0" y="26" fontSize="28" fontWeight="650">文</text><text className="translation-symbol-accent" x="18" y="38" fontSize="26" fontWeight="650">A</text></svg></span>
    <div className="translation-notice-copy"><p className="translation-notice-title">{formatCopy(copy['translation.title'],{language})}</p><p>{copy['translation.text']}</p></div>
    <button className="translation-notice-close" type="button" onClick={close} aria-label={copy['translation.close']}><X size={18}/></button>
  </aside></div></div>;
}
