'use client';

import {useState} from 'react';
import {DeferredImage} from './deferred-image';

export function ArchiveCover({src}:{src:string|null}){
  const [failed,setFailed]=useState(false);
  if(!src||failed)return null;
  return <span className="archive-item-cover" aria-hidden="true"><DeferredImage src={src} alt="" width={640} height={320} onError={()=>setFailed(true)}/></span>;
}
