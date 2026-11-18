import {test} from 'node:test';
import assert from 'node:assert/strict';
import {journalTarget} from './journal-navigation.ts';
const current='https://blog.example/zh';
test('Loaded screens and anchors keep their language and exact URL',()=>{
 assert.deepEqual(journalTarget('/zh/archive',current,'zh'),{view:'archive',url:'/zh/archive',hash:''});
 assert.deepEqual(journalTarget('/zh/about#content-license',current,'zh'),{view:'about',url:'/zh/about#content-license',hash:'#content-license'});
 assert.equal(journalTarget('/ja/archive','https://blog.example/ja/about','ja')?.view,'archive');
 assert.equal(journalTarget('/en','https://blog.example/en/about','en')?.view,'home');
});
test('Articles, APIs, management, other languages and external links stay native',()=>{
 for(const href of ['/zh/post/abc','/settings','/api/posts','/zh/archive?preview=1','/ja/about','https://other.example/zh/about','mailto:a@example.com','javascript:alert(1)'])assert.equal(journalTarget(href,current,'zh'),null,href);
});
