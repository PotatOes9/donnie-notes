import {localePath,type Locale} from './i18n.ts';
export type JournalView='home'|'archive'|'about';
export const journalPaths:Record<JournalView,string>={home:'/',archive:'/archive',about:'/about'};
// Only these already-loaded public screens use local navigation.
export function journalTarget(href:string,currentUrl:string,locale:Locale){
 let current:URL,target:URL;try{current=new URL(currentUrl);target=new URL(href,current);}catch{return null;}
 if(target.origin!==current.origin||target.search)return null;
 const route=localePath(target.pathname.replace(/\/$/,'')||'/');
 if(route.locale&&route.locale!==locale)return null;
 const view=(Object.keys(journalPaths) as JournalView[]).find(key=>journalPaths[key]===route.pathname);
 return view?{view,url:target.pathname+target.hash,hash:target.hash}:null;
}
