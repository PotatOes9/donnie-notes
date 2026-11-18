'use client';
import {useSiteSettings} from './site-copy-provider';
import {SiteImage} from './site-assets';
export function BrandMonogram({ large = false, alt = '' }: { large?: boolean; alt?: string }) {
  const settings=useSiteSettings();
  const source=settings.assets[large?'about':'sidebar'];
  return (
    <div className={`profile-monogram${large ? ' large' : ''}`}>
      <SiteImage className="monogram-light" src={source} fallback="/brand-monogram-rose-v4.svg" alt={alt} width={64} height={64} />
      <SiteImage className="monogram-dark" src={`${source}#donnie-monogram-dark`} fallback="/brand-monogram-rose-v4.svg#donnie-monogram-dark" alt={alt} width={64} height={64} />
    </div>
  );
}
