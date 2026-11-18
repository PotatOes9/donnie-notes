import {test} from 'node:test';
import assert from 'node:assert/strict';
import {matchingArticles,groupedArchive} from './article-discovery.ts';
import type {Article} from './notion-core.ts';

const articles:Article[]=[
  {id:'tokyo',title:'新年 in Tokyo',summary:'相机里的城市夜景',category:'摄影',tags:['日本','旅途'],date:'2024-01-05',cover:null},
  {id:'osaka',title:'万圣节 in Osaka',summary:'秋天的记录',category:'摄影',tags:['夜景'],date:'2023-10-31',cover:null},
  {id:'wifi',title:'5GHz 信道',summary:'各国信道规范',category:'技术笔记',tags:['Wi-Fi','工具'],date:'2023-07-11',cover:null},
  {id:'undated',title:'尚未确定日期',summary:'',category:'新分类',tags:[],date:'',cover:null},
];
test('Searches original titles, summaries, categories and tags with width/case normalization',()=>{
  for(const term of ['TOKYO','ｔｏｋｙｏ','相机','旅途','日本'])assert.deepEqual(matchingArticles(articles,term).map(x=>x.id),['tokyo']);
  assert.deepEqual(matchingArticles(articles,'技术笔记 工具').map(x=>x.id),['wifi']);
  assert.deepEqual(matchingArticles(articles,'摄影 夜景').map(x=>x.id),['tokyo','osaka']);
  assert.equal(matchingArticles(articles,'没有这样的关键词').length,0);
  assert.equal(matchingArticles(articles,'   ').length,4);
});
test('Archive keeps descending annual groups, discovers new categories and never mutates source order',()=>{
  const shuffled=[articles[2],articles[0],articles[3],articles[1]];
  assert.deepEqual(groupedArchive(shuffled).map(group=>[group.year,group.articles.map(x=>x.id)]),[['2024',['tokyo']],['2023',['osaka','wifi']],['undated',['undated']]]);
  assert.deepEqual(shuffled.map(x=>x.id),['wifi','tokyo','undated','osaka']);
  assert.deepEqual(groupedArchive(shuffled,'摄影').map(group=>group.articles.length),[1,1]);
  assert.deepEqual(groupedArchive(shuffled,'新分类').map(group=>group.year),['undated']);
  assert.deepEqual(groupedArchive(shuffled,'不存在'),[]);
});
