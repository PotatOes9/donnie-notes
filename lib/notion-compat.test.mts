import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {Rich} from '../components/notion-rich.ts';
import {MathExpression} from '../components/notion-math.ts';
import {articleHref,articleHeadings,columnRatio,publishedPageLink} from './notion-format.ts';
import {embedTarget,notionFileEmbed} from './notion-embeds.ts';
import {highlightedCode} from './notion-code.ts';
import {NotionClient} from './notion-core.ts';

const page='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',other='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',block='cccccccc-cccc-4ccc-8ccc-cccccccccccc',parent='dddddddd-dddd-4ddd-8ddd-dddddddddddd';
test('Notion links use local anchors and only published article destinations',()=>{
  const context={pageId:page,linkedPages:[{id:other,title:'已发布',url:'/post/'+other}]};
  assert.equal(articleHref('https://www.notion.so/'+page.replaceAll('-','')+'#'+block.replaceAll('-',''),context),'#'+block);
  assert.equal(articleHref('https://www.notion.so/'+other,context),'/post/'+other);
  assert.equal(articleHref('#'+block.replaceAll('-',''),context),'#'+block);
  assert.equal(publishedPageLink(block,context.linkedPages),undefined);
  assert.equal(articleHref('javascript:alert(1)',context),undefined);
  assert.equal(articleHref('https://www.notion.so.evil.example/'+other,context),'https://www.notion.so.evil.example/'+other);
});
test('Multiline rich text and dated mentions survive actual HTML rendering',()=>{
  const html=renderToStaticMarkup(createElement(Rich,{value:[{plain_text:'第一行\n第二行  保留空格'},{type:'mention',plain_text:'2026-10-29',mention:{type:'date',date:{start:'2026-10-29'}}}]}));
  assert.ok(html.includes('第一行\n第二行  保留空格'));
  assert.ok(html.includes('<time dateTime="2026-10-29">'));
});
test('Block and inline equations render real math; unsafe TeX cannot create executable links',()=>{
  const blockHtml=renderToStaticMarkup(createElement(MathExpression,{expression:'\\frac{a^2}{b}',display:true}));
  assert.ok(blockHtml.includes('class="katex"')&&blockHtml.includes('<math'));
  const inline=renderToStaticMarkup(createElement(Rich,{value:[{type:'equation',equation:{expression:'x^2'}}]}));
  assert.ok(inline.includes('notion-math-inline')&&inline.includes('katex'));
  const unsafe=renderToStaticMarkup(createElement(MathExpression,{expression:'\\href{javascript:alert(1)}{test}'}));
  assert.ok(!/<a\b[^>]*href="javascript:/i.test(unsafe));
});
test('Code highlighting preserves source safely, including unsupported languages',()=>{
  assert.ok(highlightedCode('const answer = 42','javascript').includes('hljs-keyword'));
  for(const language of ['html','plain text','unknown-language']){
    const html=highlightedCode('<script>alert(1)</script>',language);
    assert.ok(!html.includes('<script>')&&html.includes('&lt;'));
  }
});
test('Embeds accept known HTTPS providers without trusting arbitrary iframe URLs',()=>{
  assert.equal(embedTarget('https://youtu.be/abcdefghijk?t=1m2s')?.src,'https://www.youtube-nocookie.com/embed/abcdefghijk?start=62');
  assert.equal(embedTarget('https://player.vimeo.com/video/1234?h=abc123')?.src,'https://player.vimeo.com/video/1234?h=abc123');
  assert.equal(embedTarget('https://open.spotify.com/track/abc123')?.src,'https://open.spotify.com/embed/track/abc123');
  for(const value of ['javascript:alert(1)','https://example.com','https://www.youtube.com.evil.example/watch?v=abcdefghijk','https://user:pass@youtube.com/watch?v=abcdefghijk','https://www.notion.so/'+page])assert.equal(embedTarget(value),undefined);
  assert.equal(notionFileEmbed('https://prod-files-secure.s3.us-west-2.amazonaws.com/id/sample.html?signature=private'),'html');
  assert.equal(notionFileEmbed('https://example.com/sample.html'),undefined);
});
test('Only finite API column proportions are applied to the layout',()=>{
  assert.equal(columnRatio(.25),.25);
  for(const value of [0,-1,5,NaN,Infinity,'0.25',null])assert.equal(columnRatio(value),1);
});
test('Media types share ancestry checks and reject unrelated or duplicated private synced content',async()=>{
  for(const type of ['image','video','audio','pdf','file','embed','callout','paragraph']){
    for(const root of [page,other]){
      const client=new NotionClient('test-token',(async(url:any)=>Response.json(String(url).endsWith(block)?{id:block,type,parent:{type:'block_id',block_id:parent}}:{id:parent,type:'synced_block',synced_block:{synced_from:null},parent:{type:'page_id',page_id:root}})) as typeof fetch);
      if(root===page)assert.equal((await client.mediaInPage(page,block)).type,type);
      else await assert.rejects(()=>client.mediaInPage(page,block),{status:404});
    }
  }
  const client=new NotionClient('test-token',(async(url:any)=>Response.json(String(url).endsWith(block)?{id:block,type:'file',parent:{type:'block_id',block_id:parent}}:{id:parent,type:'synced_block',synced_block:{synced_from:{block_id:other}},parent:{type:'page_id',page_id:page}})) as typeof fetch);
  await assert.rejects(()=>client.mediaInPage(page,block),{status:404});
});
test('Only original synced blocks are read and included in the article outline',async()=>{
  const calls:string[]=[];
  const original={id:block,type:'synced_block',has_children:true,synced_block:{synced_from:null}},duplicate={id:other,type:'synced_block',has_children:true,synced_block:{synced_from:{block_id:parent}}};
  const heading={id:parent,type:'heading_1',heading_1:{rich_text:[{plain_text:'正文标题'}]}};
  const client=new NotionClient('test-token',(async(url:any)=>{calls.push(String(url));return Response.json({results:String(url).includes('/'+page+'/')?[original,duplicate]:[heading],has_more:false});}) as typeof fetch);
  const blocks=await client.blocks(page);
  assert.equal(calls.length,2);assert.ok(!calls.some(url=>url.includes('/'+other+'/')));
  assert.deepEqual(articleHeadings(blocks),[{id:parent,text:'正文标题',level:1}]);
});
