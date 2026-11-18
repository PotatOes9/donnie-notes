import {Fragment,createElement,type ReactNode} from 'react';
import {articleHref,notionColorClass,type RichContext} from '../lib/notion-format.ts';
import {MathExpression} from './notion-math.ts';

export function Rich({value=[],context={}}:{value?:any[];context?:RichContext}) {
  return createElement('span',{className:'notion-rich-text'},...value.map((item,index)=>{
    const a=item.annotations||{},href=context.disableLinks?undefined:articleHref(item.href||item.text?.link?.url,context);
    let node:ReactNode=item.plain_text??item.text?.content??(item.type==='equation'?item.equation?.expression:'');
    if(item.type==='equation')node=createElement(MathExpression,{expression:item.equation?.expression||String(node)});
    if(item.type==='mention'&&item.mention?.type==='date')node=createElement('time',{dateTime:item.mention.date?.start},node);
    if(a.code)node=createElement('code',null,node);
    if(a.bold)node=createElement('strong',null,node);
    if(a.italic)node=createElement('em',null,node);
    if(a.strikethrough)node=createElement('s',null,node);
    if(a.underline)node=createElement('u',null,node);
    const color=notionColorClass(a.color);
    if(color)node=createElement('span',{className:'notion-rich-color '+color},node);
    if(href)node=createElement('a',{href,target:href.startsWith('#')||href.startsWith('/')?undefined:'_blank',rel:'noopener noreferrer'},node);
    return createElement(Fragment,{key:index},node);
  }));
}
