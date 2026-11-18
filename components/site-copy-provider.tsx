'use client';
import {createContext,useContext} from 'react';
import {defaultCopy,type SiteCopy} from '@/lib/site-copy';
import {defaultSettings,type SiteSettings} from '@/lib/site-settings';
import type {Locale} from '@/lib/i18n';
const CopyContext = createContext<SiteCopy>(defaultCopy);
const SettingsContext=createContext<SiteSettings>(defaultSettings);
const LocaleContext=createContext<Locale>('zh');
export function SiteCopyProvider({copy,settings=defaultSettings,locale='zh',children}:{copy:SiteCopy;settings?:SiteSettings;locale?:Locale;children:React.ReactNode}) {
  return <LocaleContext.Provider value={locale}><SettingsContext.Provider value={settings}><CopyContext.Provider value={copy}>{children}</CopyContext.Provider></SettingsContext.Provider></LocaleContext.Provider>;
}
export function useSiteCopy() { return useContext(CopyContext); }
export function useSiteSettings(){return useContext(SettingsContext);}
export function useLocale(){return useContext(LocaleContext);}
