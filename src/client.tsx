import {hydrateRoot} from 'react-dom/client';
import {App} from './app';
import type {Snapshot} from './types';
import '../styles/fonts.css';
import '../styles/apple-design.css';
import '../styles/discovery.css';
import '../styles/archive.css';
import '../styles/motion.css';
import '../styles/performance.css';
import './settings.css';
const el=document.getElementById('donnie-data');
if(!el)throw new Error('Missing public page snapshot');
const initial=JSON.parse(el.textContent||'') as {snapshot:Snapshot;path:string};
async function hydrate(){
  const post=initial.snapshot.article?(await import('../components/post')).Post:undefined;
  hydrateRoot(document.getElementById('root')!,<App {...initial} post={post}/>);
}
void hydrate();
