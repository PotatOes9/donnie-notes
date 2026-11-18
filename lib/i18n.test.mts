import {test} from 'node:test';
import assert from 'node:assert/strict';
import {localePath,localizedHref,normalizeLocale,preferredLocale,shouldShowTranslationNotice,translationNoticeKey} from './i18n.ts';
import {copyFields,defaultCopy,formatCopy,visitorCopy} from './site-copy.ts';
import {localeDefaults,mergeTranslations,translationPairs} from './site-translations.ts';
import {NotionClient,normalizeArticle} from './notion-core.ts';
import {readSiteCopy} from './site-copy-reader.ts';
import {articleHref} from './notion-format.ts';

test('Browser language negotiation respects order, quality, unsupported languages and disabled preferences',()=>{
  assert.equal(preferredLocale('fr-FR, ja-JP;q=0.9,en;q=0.8'),'ja');
  assert.equal(preferredLocale('ja;q=0,en-US;q=0.7,zh-CN;q=0.9'),'zh');
  assert.equal(preferredLocale('en;q=0.4,ja;q=0.8'),'ja');
  assert.equal(preferredLocale('fr,de;q=0.9'),'zh');
  assert.equal(preferredLocale(null),'zh');
  assert.equal(normalizeLocale('ZH-Hant'),'zh');
  assert.equal(normalizeLocale('日本語'),'ja');
  assert.equal(normalizeLocale('javascript:alert(1)'),undefined);
});

test('Switching language retains the article, query and anchor while protecting files and external URLs',()=>{
  assert.deepEqual(localePath('/ja/post/example'),{locale:'ja',pathname:'/post/example'});
  assert.equal(localizedHref('/ja/post/example?q=one#heading','en'),'/en/post/example?q=one#heading');
  assert.equal(localizedHref('/#articles','ja'),'/ja#articles');
  assert.equal(localizedHref('/en','zh'),'/zh');
  for(const href of ['https://www.notion.so/example','//external.test/path','/api/media/page/block','/images/image.svg','#heading','mailto:hi@example.com'])assert.equal(localizedHref(href,'ja'),href);
});

test('Every interface field has Japanese and English defaults with every variable preserved',()=>{
  for(const [key] of copyFields){
    assert.ok(translationPairs[key][0].trim(),key+' Japanese');
    assert.ok(translationPairs[key][1].trim(),key+' English');
    for(const token of defaultCopy[key].match(/\{\w+\}/g)||[]){assert.ok(translationPairs[key][0].includes(token),key);assert.ok(translationPairs[key][1].includes(token),key);}
  }
  assert.equal(formatCopy(localeDefaults('ja')['translation.title'],{language:'中国語'}),'本文は中国語です');
});

test('Notion translations override fallback text without changing Chinese or exposing owner-only copy',()=>{
  const rows=[{key:'about.title',value:'我的介绍',ja:'自分で書いた紹介',en:'My introduction'},{key:'footer.tagline',value:'',ja:'Do not unhide'},{key:'post.minutes',value:'约 {minutes} 分钟',en:'Lost variable'},{key:'settings.intro',value:'private owner note',ja:'private translated owner note'}];
  assert.equal(mergeTranslations(rows,'zh')['about.title'],'我的介绍');
  assert.equal(mergeTranslations(rows,'ja')['about.title'],'自分で書いた紹介');
  assert.equal(mergeTranslations(rows,'en')['about.title'],'My introduction');
  assert.equal(mergeTranslations(rows,'ja')['footer.tagline'],'');
  assert.equal(mergeTranslations(rows,'en')['post.minutes'],localeDefaults('en')['post.minutes']);
  assert.equal(JSON.stringify(visitorCopy(mergeTranslations(rows,'ja'),localeDefaults('ja'))).includes('private translated'),false);
});

test('Live Notion reading carries both translation columns while excluding private unrelated records',async()=>{
  const source='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  const field=(value:string)=>({type:'rich_text',rich_text:[{plain_text:value}]});
  const row={parent:{type:'data_source_id',data_source_id:source},properties:{'识别码':field('about.intro'),'显示文字':field('原文'),'日文':field('日本語の紹介'),'英文':field('English introduction')}};
  const result=await readSiteCopy(new NotionClient('private-token',(async()=>Response.json({results:[row],has_more:false})) as typeof fetch),source);
  assert.equal(result.copy['about.intro'],'原文');
  assert.equal(result.localeCopies.ja['about.intro'],'日本語の紹介');
  assert.equal(result.localeCopies.en['about.intro'],'English introduction');
  assert.equal(JSON.stringify(result).includes('private-token'),false);
});

test('Article source language determines the notice and dismissals are scoped to one article and language',()=>{
  assert.equal(normalizeArticle({id:'a',properties:{}}).language,'zh');
  assert.equal(normalizeArticle({id:'a',properties:{Language:{select:{name:'日本語'}}}}).language,'日本語');
  assert.equal(shouldShowTranslationNotice('zh','zh'),false);
  assert.equal(shouldShowTranslationNotice('ja','zh'),true);
  assert.equal(shouldShowTranslationNotice('ja','ja'),false);
  assert.notEqual(translationNoticeKey('a','ja'),translationNoticeKey('a','en'));
  assert.notEqual(translationNoticeKey('a','ja'),translationNoticeKey('b','ja'));
});

test('Published article references preserve locale while same-page anchors and private links retain access rules',()=>{
  const a='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',b='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
  const context={pageId:a,locale:'ja' as const,linkedPages:[{id:b,title:'Original Chinese title',url:'/post/'+b}]};
  assert.equal(articleHref('https://www.notion.so/'+b,context),'/ja/post/'+b);
  assert.equal(articleHref('https://www.notion.so/'+a,context),'/ja/post/'+a);
  assert.equal(articleHref('https://www.notion.so/cccccccc-cccc-4ccc-8ccc-cccccccccccc',context),'https://www.notion.so/cccccccc-cccc-4ccc-8ccc-cccccccccccc');
});
