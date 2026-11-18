import type {Article} from './notion-core.ts';

export function matchingArticles(articles:Article[],query:string) {
  const normalize=(value:string)=>value.normalize('NFKC').toLocaleLowerCase();
  const words=normalize(query).trim().split(/\s+/).filter(Boolean);
  return articles.filter(article=>{
    const searchable=normalize([article.title,article.summary,article.category,...article.tags].join(' '));
    return words.every(word=>searchable.includes(word));
  });
}

export function groupedArchive(articles:Article[],category:string|null=null) {
  const selected=articles.filter(article=>category===null||article.category===category);
  const groups=new Map<string,Article[]>();
  for(const article of selected){
    const year=/^\d{4}-\d{2}-\d{2}/.test(article.date)?article.date.slice(0,4):'undated';
    groups.set(year,[...(groups.get(year)||[]),article]);
  }
  return [...groups].sort(([a],[b])=>a==='undated'?1:b==='undated'?-1:b.localeCompare(a))
    .map(([year,entries])=>({year,articles:[...entries].sort((a,b)=>b.date.localeCompare(a.date))}));
}
