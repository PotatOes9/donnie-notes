import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {Rich} from '../components/notion-rich.ts';
import {articleHeadings,tocTree,notionColorClass,notionBlockClass,openHeadingAncestors} from './notion-format.ts';

const heading=(id:string,text:string,level=1,children:any[]=[])=>({id,type:'heading_'+level,['heading_'+level]:{rich_text:[{plain_text:text}]},children});

test('The directory keeps stable IDs and duplicate titles, including headings in columns and toggles',()=>{
  const blocks=[heading('one','相同标题'),{type:'column_list',children:[{type:'column',children:[heading('two','相同标题',2)]}]},{type:'toggle',children:[heading('three','折叠内标题',3)]},heading('four','另一个标题',1,[heading('five','下级标题',2)])];
  assert.deepEqual(articleHeadings(blocks),[
    {id:'one',text:'相同标题',level:1},{id:'two',text:'相同标题',level:2},{id:'three',text:'折叠内标题',level:3},{id:'four',text:'另一个标题',level:1},{id:'five',text:'下级标题',level:2},
  ]);
  assert.equal('id' in blocks[0]&&blocks[0].id,'one');
});

test('Directories never traverse private, deleted or unsupported content or invent empty headings',()=>{
  const blocks=[...['synced_block','child_page','child_database','unsupported'].map(type=>({type,children:[heading(type,'不应显示')]})),{...heading('deleted','删除的标题'),in_trash:true},heading('blank','  '),heading('visible','公开标题'),heading('visible','重复 ID')];
  assert.deepEqual(articleHeadings(blocks),[{id:'visible',text:'公开标题',level:1}]);
  assert.deepEqual(articleHeadings([]),[]);
});

test('Directory nesting follows heading levels without requiring every intermediate level',()=>{
  const tree=tocTree(articleHeadings([heading('a','一',1),heading('b','三',3),heading('c','二',2),heading('d','四',4),heading('e','下一节',1)]));
  assert.deepEqual(tree.map(x=>x.id),['a','e']);
  assert.deepEqual(tree[0].children.map(x=>x.id),['b','c']);
  assert.equal(tree[0].children[1].children[0].id,'d');
});

test('All Notion foreground and highlight names are whitelisted; arbitrary style strings are ignored',()=>{
  for(const color of ['gray','brown','orange','yellow','green','blue','purple','pink','red']){
    assert.equal(notionColorClass(color),'notion-fg-'+color);
    assert.equal(notionColorClass(color+'_background'),'notion-bg-'+color);
  }
  for(const color of ['default','pink_background;display:none','red extra-class','url(https://example.com)',undefined,null,{}])assert.equal(notionColorClass(color),'');
  assert.equal(notionBlockClass('pink_background'),'notion-block-color notion-bg-pink');
  assert.equal(notionBlockClass('default'),undefined);
});

test('Actual rich-text rendering preserves highlights, links and emphasis while escaping content',()=>{
  const html=renderToStaticMarkup(createElement(Rich,{value:[{plain_text:'重点 <script>',href:'https://example.com/reference',annotations:{bold:true,underline:true,code:true,color:'pink_background'}}]}));
  assert.match(html,/class="notion-rich-color notion-bg-pink"/);
  assert.ok(html.includes('<strong>')&&html.includes('<u>')&&html.includes('<code>'));
  assert.ok(html.includes('href="https://example.com/reference"'));
  assert.ok(html.includes('重点 &lt;script&gt;')&&!html.includes('<script>'));
});

test('Invalid color annotations and script links never become markup or styles',()=>{
  const html=renderToStaticMarkup(createElement(Rich,{value:[{plain_text:'安全文字',href:'javascript:alert(1)',annotations:{color:'pink_background" onclick="alert(1)'}}]}));
  assert.equal(html,'<span class="notion-rich-text">安全文字</span>');
});

test('Following a heading inside nested collapsed toggles opens all enclosing toggles',()=>{
  const unrelated={tagName:'DETAILS',open:false,parentElement:null};
  const outer={tagName:'DETAILS',open:false,parentElement:null};
  const middle={tagName:'DIV',parentElement:outer};
  const inner={tagName:'DETAILS',open:false,parentElement:middle};
  const target={parentElement:inner} as unknown as HTMLElement;
  openHeadingAncestors(target);
  assert.equal(inner.open,true);assert.equal(outer.open,true);assert.equal(unrelated.open,false);
  openHeadingAncestors(null);
});
