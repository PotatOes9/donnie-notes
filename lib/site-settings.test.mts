import {test} from 'node:test';
import {runInNewContext} from 'node:vm';
import assert from 'node:assert/strict';
import {NotionClient} from './notion-core.ts';
import {readSiteAsset,settingRow} from './site-asset-reader.ts';
import {readSiteCopy} from './site-copy-reader.ts';
import {defaultSettings,flag,mergeSettings,num,orderedArticles,safeSettingLink,settingFields,settingsCss,text,themeBootScript} from './site-settings.ts';

const source='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const row=(key:string,fileUrl='https://assets.example.com/image.svg?signature=fresh')=>({parent:{type:'data_source_id',data_source_id:source},last_edited_time:'2026-10-28T13:00:00Z',properties:{'识别码':{type:'rich_text',rich_text:[{plain_text:key}]},'显示文字':{type:'rich_text',rich_text:[]},'图片':{type:'files',files:[{name:'image.svg',type:'file',file:{url:fileUrl}}]}}});

test('Defaults preserve the existing colors, fonts and module visibility',()=>{
  assert.equal(new Set(settingFields.map(x=>x[0])).size,settingFields.length);
  assert.equal(text(defaultSettings,'color.accent'),'#FC6C85');
  assert.equal(text(defaultSettings,'color.lightText'),'#333333');
  assert.equal(text(defaultSettings,'color.darkText'),'#e6e6e6');
  assert.equal(num(defaultSettings,'font.headingWeight'),900);
  assert.equal(num(defaultSettings,'font.subheadingWeight'),800);
  assert.equal(flag(defaultSettings,'show.hero'),true);
  const css=settingsCss(defaultSettings);
  assert.ok(css.includes('-apple-system,BlinkMacSystemFont,"PingFang SC"'));
  assert.ok(css.includes('--heading-weight:900'));
});

test('Typed checkbox values support hiding a module and numbers preserve zero',()=>{
  const {settings}=mergeSettings([{key:'show.sidebar',value:'',checked:false},{key:'feed.limit',value:'',number:0},{key:'font.headingWeight',value:'',number:800}]);
  assert.equal(flag(settings,'show.sidebar'),false);
  assert.equal(num(settings,'feed.limit'),0);
  assert.equal(num(settings,'font.headingWeight'),800);
});

test('Invalid colors, options, and nonfinite numbers cannot inject styles or break layout',()=>{
  const {settings}=mergeSettings([{key:'color.accent',value:'#000000;} </style><script>alert(1)</script>'},{key:'font.family',value:'malicious-font'},{key:'layout.width',value:'',number:Infinity},{key:'font.articleSize',value:'',number:10000}]);
  assert.equal(text(settings,'color.accent'),'#FC6C85');
  assert.equal(text(settings,'font.family'),'系统优先');
  assert.equal(num(settings,'layout.width'),1180);
  assert.equal(num(settings,'font.articleSize'),24);
  assert.ok(!settingsCss(settings).includes('<script>'));
});

test('Editable public links reject scripts, protocol-relative targets and management routes',()=>{
  for(const value of ['javascript:alert(1)','data:text/html,test','//evil.example.com','/settings','/%73ettings','/api/settings','/signin-with-chatgpt','/\\evil.example.com','https://name:password@example.com','https://127.0.0.1/image','https://10.0.0.1/image','mailto:user@example.com\nBcc:other@example.com'])assert.equal(safeSettingLink(value),'',value);
  assert.equal(safeSettingLink('/#articles'),'/#articles');
  assert.equal(safeSettingLink('https://example.com/profile'),'https://example.com/profile');
  assert.equal(safeSettingLink('mailto:user@example.com'),'mailto:user@example.com');
});

test('Uploaded images take priority and expiring file URLs remain server-only',()=>{
  const data=settingRow(row('asset.hero'));
  data.value='https://example.com/old.png';
  const result=mergeSettings([data]);
  assert.ok(result.sources.hero.includes('signature=fresh'));
  assert.ok(result.settings.assets.hero.startsWith('/api/site-assets/hero?v='));
  assert.ok(!JSON.stringify(result.settings).includes('signature=fresh'));
  assert.ok(!JSON.stringify(result.settings).includes('assets.example.com'));
});

test('Image versions change for an edit but remain stable when only the signed query changes',()=>{
  const a=settingRow(row('asset.hero','https://assets.example.com/image.svg?signature=one'));
  const b=settingRow(row('asset.hero','https://assets.example.com/image.svg?signature=two'));
  assert.equal(mergeSettings([a]).settings.assets.hero,mergeSettings([b]).settings.assets.hero);
  b.version='2026-10-28T14:00:00Z';
  assert.notEqual(mergeSettings([a]).settings.assets.hero,mergeSettings([b]).settings.assets.hero);
});

test('Non-image uploads and duplicate known settings fail safely',()=>{
  const result=mergeSettings([{key:'asset.hero',value:'',file:{name:'private.txt',url:'https://example.com/private.txt'}}]);
  assert.equal(result.sources.hero,'/images/monochrome-study.svg');
  assert.throws(()=>mergeSettings([{key:'color.accent',value:'#123456'},{key:'color.accent',value:'#654321'}]));
});

test('Asset requests query only their named setting and refresh signed URLs on each request',async()=>{
  let calls=0;
  const client=new NotionClient('notion-secret',(async(url:any,init:any)=>{
    calls++;assert.equal(String(url),`https://api.notion.com/v1/data_sources/${source}/query`);
    assert.deepEqual(JSON.parse(init.body).filter,{property:'识别码',rich_text:{equals:'asset.hero'}});
    return Response.json({results:[row('asset.hero','https://assets.example.com/image.svg?signature='+calls)],has_more:false});
  }) as typeof fetch);
  assert.ok((await readSiteAsset(client,source,'hero')).endsWith('signature=1'));
  assert.ok((await readSiteAsset(client,source,'hero')).endsWith('signature=2'));
  await assert.rejects(()=>readSiteAsset(client,source,'settings'));
  assert.equal(calls,2);
});

test('Assets reject unrelated sources, archived rows and duplicate results',async()=>{
  for(const bad of [{...row('asset.hero'),parent:{type:'data_source_id',data_source_id:'other'}},{...row('asset.hero'),archived:true},row('asset.about')]){
    const client=new NotionClient('secret',(async()=>Response.json({results:[bad],has_more:false})) as typeof fetch);
    assert.equal(await readSiteAsset(client,source,'hero'),'/images/monochrome-study.svg');
  }
  const duplicate=new NotionClient('secret',(async()=>Response.json({results:[row('asset.hero'),row('asset.hero')],has_more:false})) as typeof fetch);
  await assert.rejects(()=>readSiteAsset(duplicate,source,'hero'));
});

test('Configured sorting does not mutate the original published article list',()=>{
  const articles=[{id:'b',title:'B',date:'2026-10-02'},{id:'a',title:'A',date:'2026-10-01'}].map(x=>({...x,summary:'',category:'',tags:[],cover:null}));
  const {settings}=mergeSettings([{key:'feed.order',value:'旧到新'}]);
  assert.deepEqual(orderedArticles(articles,settings).map(x=>x.id),['a','b']);
  assert.deepEqual(articles.map(x=>x.id),['b','a']);
});

test('Notion text, typed settings and uploaded images are all read across three query pages',async()=>{
  const withValue=(key:string,value:string,extra={})=>{const item=row(key);item.properties['显示文字'].rich_text=[{plain_text:value}] as never;Object.assign(item.properties,extra);return item;};
  const pages=[
    [withValue('about.intro','Public introduction'),withValue('color.accent','#123456')],
    [withValue('show.sidebar','',{'开关':{type:'checkbox',checkbox:false}}),withValue('font.articleSize','',{'数值':{type:'number',number:18}})],
    [row('asset.hero')],
  ];
  let calls=0;
  const client=new NotionClient('server-secret',(async(url:any,init:any)=>{
    assert.ok(String(url).endsWith(`/data_sources/${source}/query`));
    if(calls)assert.equal(JSON.parse(init.body).start_cursor,'page'+calls);
    const i=calls++;return Response.json({results:pages[i],has_more:i<2,next_cursor:i<2?'page'+(i+1):null});
  }) as typeof fetch);
  const result=await readSiteCopy(client,source);
  assert.equal(calls,3);assert.equal(result.count,1);assert.equal(result.settingsCount,4);
  assert.equal(result.copy['about.intro'],'Public introduction');
  assert.equal(text(result.settings,'color.accent'),'#123456');
  assert.equal(flag(result.settings,'show.sidebar'),false);
  assert.equal(num(result.settings,'font.articleSize'),18);
  assert.ok(result.assetSources.hero.includes('signature=fresh'));
});


test('The first-paint theme honors saved preferences, disabled toggles and blocked storage',()=>{
  const render=(settings:any,saved:string|null,systemDark:boolean,blocked=false)=>{
    const document={documentElement:{dataset:{theme:'light'}}};
    runInNewContext(themeBootScript(settings),{document,localStorage:{getItem(){if(blocked)throw new Error('Storage denied');return saved;}},matchMedia(){return{matches:systemDark};}});
    return document.documentElement.dataset.theme;
  };
  assert.equal(render(defaultSettings,'dark',false),'dark');
  const system=mergeSettings([{key:'theme.default',value:'跟随系统'}]).settings;
  assert.equal(render(system,null,true),'dark');
  assert.equal(render(system,null,true,true),'dark');
  const fixed=mergeSettings([{key:'show.themeToggle',value:'',checked:false}]).settings;
  assert.equal(render(fixed,'dark',true),'light');
});
