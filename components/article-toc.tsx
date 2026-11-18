'use client';
import {openHeadingAncestors,tocTree,type ArticleHeading,type TocItem} from '@/lib/notion-format';

export function ArticleToc({headings,label,className=''}:{headings:ArticleHeading[];label:string;className?:string}) {
  if(!headings.length)return null;
  function entries(items:TocItem[]):React.ReactNode {
    return <ol>{items.map(item=><li key={item.id}><a href={'#'+encodeURIComponent(item.id)} onClick={()=>openHeadingAncestors(document.getElementById(item.id))}>{item.text}</a>{item.children.length>0&&entries(item.children)}</li>)}</ol>;
  }
  return <nav className={('article-toc '+className).trim()} aria-label={label}>{entries(tocTree(headings))}</nav>;
}
