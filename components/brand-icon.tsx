'use client';
import {useState} from 'react';
import {sitePath} from '@/lib/static-path';
import {useSiteSettings} from './site-copy-provider';

export function BrandGlyph({ className = '', alt = '' }: { className?: string; alt?: string }) {
  return (
    <span className={`brand-glyph ${className}`.trim()} translate="no" role={alt?'img':undefined} aria-label={alt||undefined} aria-hidden={alt?undefined:true}>
      d<span>.</span>
    </span>
  );
}

export function BrandMonogram({ large = false, alt = '' }: { large?: boolean; alt?: string }) {
  const settings=useSiteSettings();
  const source=sitePath(settings.assets[large?'about':'sidebar']);
  const [failedSource,setFailedSource]=useState('');
  return (
    <div className={`profile-monogram${large ? ' large' : ''}`}>
      {source && source!==failedSource
        ? <img src={source} alt={alt} width={60} height={60} decoding="async" onError={()=>setFailedSource(source)}/>
        : <BrandGlyph alt={alt}/>}
    </div>
  );
}
