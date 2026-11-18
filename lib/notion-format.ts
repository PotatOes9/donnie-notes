import {notionId,safeLink,textOf,type NotionObject} from './notion-core.ts';
import {localizedHref,type Locale} from './i18n.ts';

export type PublishedPageLink={id:string;title:string;url:string};
export type RichContext={pageId?:string;linkedPages?:PublishedPageLink[];disableLinks?:boolean;locale?:Locale};
export function publishedPageLink(id:unknown,pages:PublishedPageLink[]=[]) {
  try{const normalized=notionId(String(id));return pages.find(page=>notionId(page.id)===normalized);}catch{return undefined;}
}
export function articleHref(input:unknown,context:RichContext={}):string|undefined {
  if(typeof input!=='string')return undefined;
  if(input.startsWith('#')){try{return '#'+notionId(decodeURIComponent(input.slice(1)));}catch{return undefined;}}
  const link=safeLink(input);if(!link)return undefined;
  try{const url=new URL(link);if(!['notion.so','notion.com','notion.site'].some(host=>url.hostname===host||url.hostname.endsWith('.'+host)))return link;
    const id=notionId(url.href),current=context.pageId?notionId(context.pageId):undefined;
    let fragment='';if(url.hash){try{fragment='#'+notionId(decodeURIComponent(url.hash.slice(1)));}catch{}}
    if(id===current)return fragment||(context.locale?localizedHref('/post/'+id,context.locale):'/post/'+id);
    const page=publishedPageLink(id,context.linkedPages);return page?(context.locale?localizedHref(page.url,context.locale):page.url)+fragment:link;
  }catch{return link;}
}
export function columnRatio(value:unknown):number{return typeof value==='number'&&Number.isFinite(value)&&value>0&&value<=1?value:1;}
export function isOriginalSyncedBlock(block:NotionObject):boolean{return block.type==='synced_block'&&block.synced_block?.synced_from===null;}

const colors=new Set(['gray','brown','orange','yellow','green','blue','purple','pink','red']);
export function notionColorClass(color:unknown):string {
  if(typeof color!=='string')return '';
  if(colors.has(color))return 'notion-fg-'+color;
  if(color.endsWith('_background')&&colors.has(color.slice(0,-11)))return 'notion-bg-'+color.slice(0,-11);
  return '';
}
export function notionBlockClass(color:unknown):string|undefined {
  const value=notionColorClass(color);
  return value?'notion-block-color '+value:undefined;
}

export type ArticleHeading={id:string;text:string;level:number};
export type TocItem=ArticleHeading&{children:TocItem[]};
const visibleContainers=new Set(['paragraph','quote','callout','toggle','to_do','bulleted_list_item','numbered_list_item','column_list','column','tab','template']);
export function articleHeadings(blocks:NotionObject[]):ArticleHeading[] {
  const headings:ArticleHeading[]=[],seen=new Set<string>();
  function visit(items:NotionObject[]) {
    for(const block of items){
      if(block.archived||block.in_trash||block.is_archived)continue;
      const match=/^heading_([1-4])$/.exec(block.type||'');
      if(match){
        const text=textOf(block[block.type]?.rich_text).trim();
        if(text&&typeof block.id==='string'&&block.id&&!seen.has(block.id)){
          seen.add(block.id);headings.push({id:block.id,text,level:Number(match[1])});
        }
      }
      if((match||visibleContainers.has(block.type)||isOriginalSyncedBlock(block))&&Array.isArray(block.children))visit(block.children);
    }
  }
  visit(blocks);return headings;
}
export function tocTree(headings:ArticleHeading[]):TocItem[] {
  const roots:TocItem[]=[],stack:TocItem[]=[];
  for(const heading of headings){
    while(stack.length&&stack[stack.length-1].level>=heading.level)stack.pop();
    const item={...heading,children:[]} as TocItem;
    (stack.length?stack[stack.length-1].children:roots).push(item);stack.push(item);
  }
  return roots;
}
export function openHeadingAncestors(heading:HTMLElement|null) {
  for(let parent=heading?.parentElement;parent;parent=parent.parentElement){
    if(parent.tagName==='DETAILS')(parent as HTMLDetailsElement).open=true;
  }
  heading?.dispatchEvent?.(new Event('notion-reveal',{bubbles:true}));
}
