export const locales = ['zh','ja','en'] as const;
export type Locale = typeof locales[number];
export const htmlLanguages:Record<Locale,string> = {zh:'zh-CN',ja:'ja',en:'en'};
export const localeCookie = 'donnie-language';

export function normalizeLocale(input:unknown):Locale|undefined {
  if(typeof input!=='string')return;
  const language=input.trim().toLowerCase().replaceAll('_','-');
  if(language==='中文'||language==='简体中文'||language==='繁体中文'||language.startsWith('zh'))return 'zh';
  if(language==='日文'||language==='日语'||language==='日本語'||language==='ja'||language.startsWith('ja-'))return 'ja';
  if(language==='英文'||language==='英语'||language==='english'||language==='en'||language.startsWith('en-'))return 'en';
}

export function preferredLocale(acceptLanguage:string|null):Locale {
  const preferred=(acceptLanguage||'').split(',').map((part,index)=>{
    const [tag,...options]=part.trim().split(';');
    const q=options.find(x=>x.trim().startsWith('q='));
    return {locale:normalizeLocale(tag),weight:q?Number(q.trim().slice(2)):1,index};
  }).filter(x=>x.locale&&Number.isFinite(x.weight)&&x.weight>0&&x.weight<=1)
    .sort((a,b)=>b.weight-a.weight||a.index-b.index);
  return preferred[0]?.locale||'zh';
}

export function localePath(pathname:string):{locale?:Locale;pathname:string} {
  const match=/^\/(zh|ja|en)(?=\/|$)/.exec(pathname);
  return match?{locale:match[1] as Locale,pathname:pathname.slice(match[0].length)||'/'}:{pathname};
}

// Only website navigation is localized. Media, auth, external links and anchors stay intact.
export function localizedHref(href:string,locale:Locale):string {
  if(!href.startsWith('/')||href.startsWith('//')||href.includes('\\'))return href;
  const delimiter=href.search(/[?#]/),path=delimiter<0?href:href.slice(0,delimiter),suffix=delimiter<0?'':href.slice(delimiter);
  const base=localePath(path).pathname;
  if(/^\/(?:api|_next|_vinext|assets|images|auth|\.well-known)(?:\/|$)/.test(base)||/\.[^/]+$/.test(base))return href;
  return '/'+locale+(base==='/'?'':base)+suffix;
}

export function shouldShowTranslationNotice(selected:Locale,source:Locale='zh') {return selected!==source;}
export function translationNoticeKey(articleId:string,selected:Locale,source:Locale='zh') {
  return 'donnie-translation-notice:'+articleId+':'+selected+':'+source;
}
