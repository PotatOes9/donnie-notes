import {SnapshotContext} from './snapshot-context';
import {localePath} from '../lib/i18n';
import {stripBase} from '../lib/static-path';
import {SiteCopyProvider} from '../components/site-copy-provider';
import {JournalPage} from '../components/journal-page';
import type {Post as ArticleRenderer} from '../components/post';
import {Shell} from '../components/shell';
import {SettingsPanel} from './settings';
import {RouterPath} from './router';
import type {Snapshot} from './types';
export function App({snapshot,path,post:Post}:{snapshot:Snapshot;path:string;post?:typeof ArticleRenderer}){
 const logical=stripBase(path),{locale='zh',pathname}=localePath(logical),copy=snapshot.copies[locale],site=snapshot.settings;
 const view=pathname.replace(/\/$/,'')||'/',feed={articles:snapshot.articles,mode:snapshot.demo?'demo' as const:'live' as const};
 return <SnapshotContext.Provider value={snapshot}><RouterPath.Provider value={logical}><SiteCopyProvider copy={copy} settings={site} locale={locale}>{
 view==='/settings'?<Shell><SettingsPanel/></Shell>:
 view.startsWith('/post/')&&snapshot.article&&Post?<Post article={snapshot.article} copy={copy} site={site} locale={locale}/>:
 ['/', '/archive','/about'].includes(view)?<JournalPage initialView={view==='/archive'?'archive':view==='/about'?'about':'home'} feed={feed} copy={copy} site={site} locale={locale}/>:
 <Shell><div className="container empty-state"><h1>404</h1><p>{copy['error.postTitle']}</p></div></Shell>
 }</SiteCopyProvider></RouterPath.Provider></SnapshotContext.Provider>;
}
