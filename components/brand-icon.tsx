'use client';
import {useState} from 'react';
import {sitePath} from '@/lib/static-path';
import {useSiteSettings} from './site-copy-provider';

export function BrandMonogram({ large = false, alt = '' }: { large?: boolean; alt?: string }) {
  const settings=useSiteSettings();
  const source=sitePath(settings.assets[large?'about':'sidebar']);
  const [failedSource,setFailedSource]=useState('');
  return (
    <div className={`profile-monogram${large ? ' large' : ''}`}>
      {source && source!==failedSource ? <img src={source} alt={alt} width={60} height={60} decoding="async" onError={()=>setFailedSource(source)}/> : (
        <svg viewBox="4 2 54 54" width="60" height="60" focusable="false" role={alt?'img':undefined} aria-label={alt||undefined} aria-hidden={alt?undefined:true}>
          <path fill="currentColor" fillRule="evenodd" d="M26.7 8.25 37.9 6v38.7c0 2.2.7 2.9 3.2 3.1v2.3h-11v-4c-2.2 3-5.7 4.55-9.8 4.55-8.2 0-13.85-6.5-13.85-15.2 0-9.4 6.2-15.55 14.4-15.55 3.7 0 6.7 1.05 9.2 3.1v-9.75c0-2.4-.65-3.05-3.35-3.1zm3.35 19.25c-1.75-2.65-4.2-4-7.25-4-5.2 0-8.05 4.75-8.05 12.05 0 6.8 2.75 11.2 7.8 11.2 3 0 5.3-1.45 7.5-4.25z"/>
          <circle cx="47.2" cy="46.3" r="4.3" fill="var(--brand-accent, #fc6c85)"/>
        </svg>
      )}
    </div>
  );
}
