'use client';
import {pageHref,stripBase} from '@/lib/static-path';
import {Check,Globe,ChevronDown} from 'lucide-react';
import {DropdownMenu} from 'radix-ui';
import {useLocale,useSiteCopy} from './site-copy-provider';
import {htmlLanguages,localeCookie,localizedHref,normalizeLocale,type Locale} from '@/lib/i18n';

export function LanguageSwitcher(){
  const copy=useSiteCopy(),locale=useLocale();
  const compact:Record<Locale,string>={zh:'中',ja:'JA',en:'EN'};
  function change(value:string){
    const next=normalizeLocale(value);if(!next||next===locale)return;
    document.cookie=localeCookie+'='+next+'; Path=/; Max-Age=31536000; SameSite=Lax'+(location.protocol==='https:'?'; Secure':'');
    const href=pageHref(localizedHref(stripBase(location.pathname),next))+location.search+location.hash;
    location.assign(href);
  }
  return <DropdownMenu.Root modal={false}>
    <DropdownMenu.Trigger asChild>
      <button type="button" className="language-switcher" title={copy['language.menu']} aria-label={`${copy['language.menu']} · ${copy[('language.'+locale) as 'language.zh']}`}>
        <Globe size={17} aria-hidden="true"/>
        <span className="language-name" aria-hidden="true">{copy[('language.'+locale) as 'language.zh']}</span>
        <span className="language-code" aria-hidden="true">{compact[locale]}</span>
        <ChevronDown className="language-chevron" size={13} aria-hidden="true"/>
      </button>
    </DropdownMenu.Trigger>
    <DropdownMenu.Portal>
      <DropdownMenu.Content className="language-menu glass-surface" align="end" sideOffset={10} collisionPadding={12} aria-label={copy['language.menu']}>
        <DropdownMenu.RadioGroup value={locale} onValueChange={change}>
          {(['zh','ja','en'] as const).map(code=><DropdownMenu.RadioItem key={code} value={code} className="language-option" lang={htmlLanguages[code]}>
            <span className="language-option-name">{copy[('language.'+code) as 'language.zh']}</span>
            <span className="language-check" aria-hidden="true"><DropdownMenu.ItemIndicator><Check size={16} strokeWidth={2}/></DropdownMenu.ItemIndicator></span>
          </DropdownMenu.RadioItem>)}
        </DropdownMenu.RadioGroup>
      </DropdownMenu.Content>
    </DropdownMenu.Portal>
  </DropdownMenu.Root>;
}
