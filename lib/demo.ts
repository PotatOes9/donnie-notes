import type { Article } from './notion-core';
const rich = (text: string) => [{ type: 'text', plain_text: text, text: { content: text } }];
const paragraph = (text: string) => ({ id: `sample-${text.slice(0,8)}`, type: 'paragraph', paragraph: { rich_text: rich(text) } });
const heading = (text: string) => ({ id: `sample-${text.slice(0,8)}`, type: 'heading_2', heading_2: { rich_text: rich(text) } });

export const demoArticles: Article[] = [
  { id: 'a-place-to-write', title: '给生活留一个，慢慢记录的地方。', summary: '一段文字，一张照片，一个值得记住的瞬间。让记录回到最简单的样子。', category: '日常记录', tags: ['记录', '开始'], date: '2026-10-14', cover: '/images/landscape.svg', minutes: 2, blocks: [
    paragraph('这是一篇用于预览排版的示例文章。连接你的 Notion 文章库后，网站会自动显示你自己的文字和图片。'),
    heading('不必等到特别的日子'), paragraph('生活里有很多很小的瞬间：读到一句喜欢的话，找到一种更顺手的方法，或者在回家的路上看见好看的天空。它们不一定值得发一条动态，却值得留下来。'),
    { id: 'sample-image', type: 'image', image: { type: 'external', external: { url: '/images/landscape.svg' }, caption: rich('示意配图 · 连接后，这里可以展示你上传到 Notion 的照片。') } },
    heading('让写作简单一点'), paragraph('打开 Notion，新建一篇文章。写标题，写正文，把照片拖进去。准备好了，再勾选“发布”。网页会负责把它们排成适合阅读的样子。'),
    { id: 'sample-quote', type: 'quote', quote: { rich_text: rich('把值得记住的，留在这里。') } },
    paragraph('你可以写长文章，也可以只留下一张照片和几句话。这是你的地方，节奏也由你决定。'),
  ] },
  { id: 'learning-in-small-steps', title: '把零散的笔记，连成自己的知识地图', summary: '从一个小问题开始，把理解、尝试和收获一点点写下来。', category: '学习笔记', tags: ['学习', '笔记'], date: '2026-10-13', cover: '/images/notebook.svg', minutes: 2, blocks: [
    paragraph('这是一篇示例文章，展示学习笔记的排版。你可以直接在 Notion 中使用标题、列表、引用和代码块。'), heading('先写一个具体的问题'), paragraph('不需要从完整的知识体系开始。今天解决了什么问题？为什么这个方法有效？下一次可以怎么用？把这些写清楚，就已经是一篇有用的笔记。'),
    { id: 'learning-list-one', type: 'bulleted_list_item', bulleted_list_item: { rich_text: rich('用自己的话，解释刚刚理解的概念。') } },
    { id: 'learning-list-two', type: 'bulleted_list_item', bulleted_list_item: { rich_text: rich('保留一个可以重复使用的小例子。') } },
    { id: 'learning-list-three', type: 'bulleted_list_item', bulleted_list_item: { rich_text: rich('给未来的自己，留下一句提醒。') } },
    heading('小步积累，也是一种进步'), paragraph('分类和标签让笔记重新被找到。真正有用的记录，是过一段时间再读时，仍然能帮到自己。'),
  ] },
  { id: 'on-the-road', title: '留一点时间，给路上的风景', summary: '目的地之外，还有值得停下来的一段路。', category: '路上见闻', tags: ['风景', '出发'], date: '2026-10-12', cover: '/images/road.svg', minutes: 1, blocks: [
    paragraph('这是一篇示例图文文章，展示照片与文字的组合方式。示例内容不代表真实的个人经历。'),
    { id: 'road-image', type: 'image', image: { type: 'external', external: { url: '/images/road.svg' }, caption: rich('示意配图 · 你的照片会在这里完整展示。') } },
    heading('记录属于自己的视角'), paragraph('你可以记录一次出行、一条喜欢的路线，或几张当时拍下的照片。为照片加上说明，让画面和文字一起留下当时的感觉。'),
  ] },
];
