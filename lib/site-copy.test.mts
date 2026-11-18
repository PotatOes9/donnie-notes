import {test} from 'node:test';
import assert from 'node:assert/strict';
import {copyFields,defaultCopy,mergeCopy,formatCopy,visitorCopy} from './site-copy.ts';
import {readSiteCopy} from './site-copy-reader.ts';
import {NotionClient} from './notion-core.ts';
const source='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const row=(key:string,value:string,extra={})=>({parent:{type:'data_source_id',data_source_id:source},properties:{'識別碼':{type:'rich_text',rich_text:[{plain_text:key}]},'顯示文字':{type:'rich_text',rich_text:[{plain_text:value}]}},...extra});
test('Visitor responses exclude customized management text without changing the owner copy',()=>{
  const copy=mergeCopy([{key:'about.intro',value:'Public introduction'},{key:'settings.intro',value:'Owner-only management note'},{key:'form.tokenHint',value:'Owner-only connection instructions'}]);
  const visible=visitorCopy(copy);
  assert.equal(visible['about.intro'],'Public introduction');
  for (const [key,section] of copyFields) if(section===8) assert.equal(visible[key],defaultCopy[key]);
  assert.equal(JSON.stringify(visible).includes('Owner-only'),false);
  assert.equal(copy['settings.intro'],'Owner-only management note');
  assert.equal(copy['form.tokenHint'],'Owner-only connection instructions');
});
test('Catalog has unique keys and preserves existing text when a row is absent or a control is blank',()=>{
  assert.equal(new Set(copyFields.map(x=>x[0])).size,copyFields.length);
  const copy=mergeCopy([{key:'about.intro',value:'自己寫的介紹\n第二行。'},{key:'nav.home',value:''},{key:'not-a-website-field',value:'ignored'},{key:'footer.tagline',value:''}]);
  assert.equal(copy['about.intro'],'自己寫的介紹\n第二行。');
  assert.equal(copy['nav.home'],defaultCopy['nav.home']);
  assert.equal(copy['footer.tagline'],'');
  assert.equal(copy['site.title'],defaultCopy['site.title']);
  assert.equal(Object.hasOwn(copy,'not-a-website-field'),false);
});
test('Duplicate keys are rejected rather than unpredictably changing the site',()=>assert.throws(()=>mergeCopy([{key:'about.intro',value:'one'},{key:'about.intro',value:'two'}])));
test('Placeholders substitute computed values without evaluating user text',()=>{
  assert.equal(formatCopy('© {year} · {count} 篇',{year:2026,count:3}),'© 2026 · 3 篇');
  assert.equal(formatCopy('{unknown} <script>literal</script>',{}),'{unknown} <script>literal</script>');
});
test('Reads all text pages and ignores archived, unrelated and non-text rows',async()=>{
  const calls:any[]=[];
  const transport=(async(url:any,opts:any)=>{
    calls.push({url,body:JSON.parse(opts.body)});
    return Response.json(calls.length===1?{results:[row('home.titleFirst','我的首頁'),row('nav.home','無效',{archived:true}),row('site.title','別的來源',{parent:{type:'data_source_id',data_source_id:'other'}})],has_more:true,next_cursor:'page2'}:{results:[row('about.intro','完整讀到第二頁\n保留換行'),row('not-a-key','private notes')],has_more:false});
  }) as typeof fetch;
  const result=await readSiteCopy(new NotionClient('secret-token',transport),source);
  assert.equal(calls.length,2);assert.equal(calls[1].body.start_cursor,'page2');
  assert.equal(result.count,2);assert.equal(result.copy['home.titleFirst'],'我的首頁');
  assert.equal(result.copy['about.intro'],'完整讀到第二頁\n保留換行');
  assert.equal(result.copy['nav.home'],defaultCopy['nav.home']);
  assert.equal(JSON.stringify(result).includes('private notes'),false);
  assert.equal(JSON.stringify(result).includes('secret-token'),false);
});
test('Empty or truncated sources report failure instead of claiming live content',async()=>{
  for(const data of [{results:[],has_more:false},{results:[],has_more:true},{results:[row('unknown','value')],has_more:false}]){
    await assert.rejects(()=>readSiteCopy(new NotionClient('token',(async()=>Response.json(data)) as typeof fetch),source));
  }
});
test('Simplified column names read the same records without changing publication or field keys',async()=>{
  const original=row('about.intro','简体字段，正常同步。');
  const simplified={...original,properties:{'识别码':original.properties['識別碼'],'显示文字':original.properties['顯示文字']}};
  const client=new NotionClient('token',(async()=>Response.json({results:[simplified],has_more:false})) as typeof fetch);
  const result=await readSiteCopy(client,source);
  assert.equal(result.count,1);
  assert.equal(result.copy['about.intro'],'简体字段，正常同步。');
});
test('Text reading has no write endpoints and propagates inaccessible sources',async()=>{
  const transport=(async(url:any,opts:any)=>{assert.ok(String(url).endsWith('/query'));assert.equal(opts.method,'POST');return Response.json({}, {status:403});}) as typeof fetch;
  await assert.rejects(()=>readSiteCopy(new NotionClient('token',transport),source));
});
