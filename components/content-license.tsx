import {SiteLink} from '@/components/site-link';
import {ArrowUpRight,Link2} from 'lucide-react';
import {localizedHref,type Locale} from '@/lib/i18n';
import type {SiteCopy} from '@/lib/site-copy';
import {text,type SiteSettings} from '@/lib/site-settings';

export function LicenseBadge({copy,href,external=false}:{copy:SiteCopy;href:string;external?:boolean}){
  return <SiteLink className="license-badge" href={href} rel={external?'license noopener noreferrer':'license'} target={external?'_blank':undefined}>{copy['footer.licenseName']}<ArrowUpRight size={13} aria-hidden="true"/></SiteLink>;
}

export function ArticleLicense({copy,locale}:{copy:SiteCopy;locale:Locale}){
  return <div className="article-license"><LicenseBadge copy={copy} href={localizedHref('/about#content-license',locale)}/><p className="copy-lines">{copy['post.licenseNote']}</p></div>;
}

export function AboutLicense({copy,site}:{copy:SiteCopy;site:SiteSettings}){
  return <section className="about-license" id="content-license" aria-labelledby="content-license-title"><div className="about-license-heading"><Link2 size={21} aria-hidden="true"/><h2 id="content-license-title" className="copy-lines">{copy['about.licenseTitle']}</h2></div><div className="about-license-copy"><LicenseBadge copy={copy} href={text(site,'link.contentLicense')} external/><p className="copy-lines">{copy['footer.licenseNotice']}</p></div></section>;
}
