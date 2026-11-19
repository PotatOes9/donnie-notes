import type {Article} from './notion-core.ts';

type Kind='image'|'link'|'color'|'number'|'boolean'|'choice'|'text';
type Field=readonly [string,number,string,Kind,string|number|boolean,string,number?,number?,(readonly string[])?];
export const settingSections=['10 图片与标志','11 导航与链接','12 外观与排版','13 模块与功能'] as const;
export const settingFields=[
  ['asset.hero',10,'首页主视觉大图','image','/images/monochrome-study.svg','在“图片”栏上传新图即可替换；建议横图，重要主体放在中间。'],
  ['asset.logo',10,'顶部自定义 Logo','image','','可选。在“图片”栏上传；留空保留现在的 donnie. 文字标志。'],
  ['asset.footerLogo',10,'页脚自定义 Logo','image','','可选。上传后替换页脚文字标志；留空保留文字。'],
  ['asset.sidebar',10,'首页侧栏头像或标志','image','','填「默认 d.」使用随主题换色的标志；使用自定义图片时，清空“显示文字”并在“图片”栏上传。'],
  ['asset.about',10,'关于页头像或标志','image','/brand-monogram-rose-v4.svg','上传后只替换关于页的大图标；建议正方形。现有 d. 图标为透明底，随网站模式切换深灰字或浅灰字。'],
  ['asset.favicon',10,'浏览器标签页图标','image','/favicon-rose-dark-v3.svg','建议上传正方形 PNG 或 SVG；保存后刷新，图标网址会自动更新以避开旧缓存。'],
  ['asset.share',10,'分享链接预览图片','image','/images/monochrome-study.svg','建议横图；用于社交软件分享预览。平台可能保留自己的预览缓存。'],
  ['asset.coverFallback',10,'文章未设封面时的默认图','image','','可选。文章自己的封面优先；此处留空保留灰色默认封面。'],
  ['asset.topicOne',10,'关于页主题一自定义图标','image','','可选。上传后替换叶子图标；留空使用外观分类里选择的图标。'],
  ['asset.topicTwo',10,'关于页主题二自定义图标','image','','可选。上传后替换笔记图标。'],
  ['asset.topicThree',10,'关于页主题三自定义图标','image','','可选。上传后替换路线图标。'],
  ['link.brand',11,'点击网站标志后前往','link','/','修改“显示文字”。站内地址以 / 开头，外部地址使用完整 https:// 地址。'],
  ['link.navHome',11,'顶部文章入口地址','link','/','默认首页。'],
  ['link.navArchive',11,'顶部归档入口地址','link','/archive','默认文章归档。'],
  ['link.navAbout',11,'顶部关于入口地址','link','/about','默认关于页。'],
  ['link.navRead',11,'游客右上角按钮地址','link','/#articles','默认进入首页文章区；管理后台入口由网站保护。'],
  ['link.homeRead',11,'首页主视觉阅读按钮地址','link','/#articles','默认跳到首页文章区。'],
  ['link.sidebarAbout',11,'首页侧栏关于链接地址','link','/about','默认进入关于页。'],
  ['link.aboutRead',11,'关于页底部阅读按钮地址','link','/','默认回到首页。'],
  ['link.feedArchive',11,'文章列表底部链接地址','link','/archive','默认进入归档页。'],
  ['link.postBack',11,'文章页返回按钮地址','link','/#articles','默认回到首页文章列表。'],
  ['link.postNext',11,'文章页继续阅读地址','link','/archive','默认进入归档页。'],
  ['link.contentLicense',11,'内容许可：协议地址','link','https://creativecommons.org/licenses/by-nc/4.0/','全语言共用。默认打开 CC BY-NC 4.0 官方协议；与内容许可名称和三语授权声明一起核对。更改链接不能撤销已经授予的许可。'],
  ['social.oneLabel',11,'页脚链接一显示文字','text','','可选，例如 Instagram；同时填写下一项地址才会显示。'],
  ['social.oneUrl',11,'页脚链接一地址','link','','可选，填完整 https:// 地址或 mailto:邮箱地址。'],
  ['social.twoLabel',11,'页脚链接二显示文字','text','','可选，例如 邮箱。'],
  ['social.twoUrl',11,'页脚链接二地址','link','','可选，填完整 https:// 地址或 mailto:邮箱地址。'],
  ['social.threeLabel',11,'页脚链接三显示文字','text','','可选，例如 其他平台。'],
  ['social.threeUrl',11,'页脚链接三地址','link','','可选，填完整 https:// 地址。'],
  ['theme.default',12,'首次访问默认模式','choice','浅色','在“显示文字”填：浅色、深色、跟随系统。读者手动切换后的偏好会保留。',undefined,undefined,['浅色','深色','跟随系统']],
  ['color.accent',12,'标志句点强调色','color','#FC6C85','修改“显示文字”，填写 # 开头的六位颜色代码。上传的图片本身颜色不会被改写。'],
  ['color.lightBg',12,'白天：页面背景','color','#f5f5f5','当前为浅灰色。'],
  ['color.lightPaper',12,'白天：卡片底色','color','#f2f2f2','当前为浅灰色。'],
  ['color.lightText',12,'白天：主要文字和按钮','color','#333333','当前为深灰色。'],
  ['color.lightMuted',12,'白天：次要文字','color','#656565','介绍、日期等次要文字。'],
  ['color.lightSoft',12,'白天：柔和底色','color','#e9e9e9','提示、引用等浅色区域。'],
  ['color.lightLine',12,'白天：分隔线','color','#d9d9d9','细线和边框。'],
  ['color.darkBg',12,'黑夜：页面背景','color','#141414','当前为深灰色。'],
  ['color.darkPaper',12,'黑夜：卡片底色','color','#1c1c1c','当前为深灰色。'],
  ['color.darkText',12,'黑夜：主要文字和按钮','color','#e6e6e6','当前为浅灰色。'],
  ['color.darkMuted',12,'黑夜：次要文字','color','#a2a2a2','介绍、日期等次要文字。'],
  ['color.darkSoft',12,'黑夜：柔和底色','color','#252525','引用和提示底色。'],
  ['color.darkLine',12,'黑夜：分隔线','color','#383838','细线和边框。'],
  ['color.artBg',12,'首页图片框底色','color','#101010','首页大图下方说明条的底色。'],
  ['color.artText',12,'首页图片说明文字颜色','color','#bcbcbc','大图下方的英文说明。'],
  ['color.artLine',12,'首页图片框线颜色','color','#242424','图片外框和说明条边线。'],
  ['font.family',12,'正文与标题字体','choice','系统优先','填：系统优先 或 Noto Sans。系统优先沿用苹果苹方、Windows Noto Sans。',undefined,undefined,['系统优先','Noto Sans']],
  ['font.wordmark',12,'文字 Logo 字体','choice','Georgia','填：Georgia 或 跟随正文。',undefined,undefined,['Georgia','跟随正文']],
  ['font.bodyWeight',12,'正文粗细','number',400,'只改“数值”，范围 300–600；400 为正常。',300,600],
  ['font.headingWeight',12,'主标题与文章标题粗细','number',900,'只改“数值”，范围 500–900；当前 900 特粗。',500,900],
  ['font.subheadingWeight',12,'小标题粗细','number',800,'只改“数值”，范围 400–900。',400,900],
  ['font.bodySize',12,'网站正文字号','number',16,'只改“数值”，单位像素，范围 13–20。',13,20],
  ['font.articleSize',12,'文章正文字号','number',18,'桌面字号，单位像素，范围 14–24；手机会自动略微缩小。',14,24],
  ['font.heroSize',12,'首页大标题字号','number',72,'桌面字号，范围 44–86；其他屏幕会按比例适配。',44,86],
  ['layout.width',12,'网页内容最大宽度','number',1180,'单位像素，范围 980–1400；小屏幕自动适配。',980,1400],
  ['layout.articleWidth',12,'文章阅读区域宽度','number',800,'单位像素，范围 620–960。',620,960],
  ['layout.radius',12,'卡片与按钮圆角','number',20,'单位像素，范围 0–20；当前 20 使用柔和圆角。正文图片和内容区块在各自的圆角设置中调整。',0,20],
  ['image.radius',12,'文章图片圆角','number',18,'只改“数值”，单位像素，范围 0–40；0 为直角。用于正文图片与点击放大后的图片，推荐 16–20。',0,40],
  ['layout.contentRadius',12,'文章内容区块圆角','number',12,'只改“数值”，单位像素，范围 0–32。用于整段高亮、引用、提示、折叠、目录、代码和附件等区块；推荐 10–14。',0,32],
  ['image.fit',12,'首页图片缩放方式','choice','铺满','填：铺满 或 完整显示。铺满可能裁边，完整显示保留整张图。',undefined,undefined,['铺满','完整显示']],
  ['image.position',12,'首页图片主体位置','choice','居中','填：居中、顶部、底部、左侧、右侧。',undefined,undefined,['居中','顶部','底部','左侧','右侧']],
  ['image.filter',12,'首页图片颜色效果','choice','原色','填：原色 或 黑白。',undefined,undefined,['原色','黑白']],
  ['material.blur',12,'导航玻璃模糊程度','number',24,'只改“数值”，单位像素，范围 8–40。玻璃效果仅用于导航；可在“13 模块与功能”关闭。系统要求降低透明度时优先使用实色。',8,40],
  ['icon.topicOne',12,'关于页主题一默认图标','choice','相机','填：叶子、笔记、路线、相机、咖啡、音乐、书本、爱心、地球、星星、星芒。',undefined,undefined,['叶子','笔记','路线','相机','咖啡','音乐','书本','爱心','地球','星星','星芒']],
  ['icon.topicTwo',12,'关于页主题二默认图标','choice','书本','上传自定义主题图标后，图片会优先。',undefined,undefined,['叶子','笔记','路线','相机','咖啡','音乐','书本','爱心','地球','星星','星芒']],
  ['icon.topicThree',12,'关于页主题三默认图标','choice','星芒','上传自定义主题图标后，图片会优先。',undefined,undefined,['叶子','笔记','路线','相机','咖啡','音乐','书本','爱心','地球','星星','星芒']],
  ['seo.author',12,'作者名称','text','donnie','用于网页作者资料；页面中的自我介绍仍在原文字分类修改。'],
  ['seo.keywords',12,'网站关键词','text','','可选，使用逗号分隔；不能保证搜索引擎排名。'],
  ['seo.language',12,'网页语言标记','choice','zh-CN','填：zh-CN、zh-TW、ja、en。只改变语言标记，不会自动翻译文案。',undefined,undefined,['zh-CN','zh-TW','ja','en']],
  ['show.hero',13,'显示首页主视觉区域','boolean',true,'只改“开关”：勾选显示，取消勾选隐藏。'],
  ['show.heroImage',13,'显示首页大图','boolean',true,'隐藏后，主标题区域会自动铺开。'],
  ['show.heroCaption',13,'显示首页图片说明条','boolean',true,'图片下方的小字说明。'],
  ['show.heroFootnote',13,'显示首页底部装饰小字','boolean',true,'主标题区下方两行英文小字。'],
  ['show.navArchive',13,'显示顶部归档入口','boolean',true,'只影响导航显示，已发布的文章仍可访问。'],
  ['show.navAbout',13,'显示顶部关于入口','boolean',true,'只影响导航显示。'],
  ['show.navButton',13,'显示右上角暗色按钮','boolean',true,'游客为阅读按钮；站长登录后为直达 Notion 工作台的写作后台。右下角管理后台单独保留。'],
  ['show.themeToggle',13,'允许读者切换白天黑夜模式','boolean',true,'关闭后使用“首次访问默认模式”。'],
  ['show.glass',13,'启用导航玻璃效果','boolean',true,'勾选后顶部与手机底部导航使用柔和玻璃效果；取消勾选改用实色。正文与文章卡片保持实色。'],
  ['show.translationNotice',13,'显示文章翻译提示','boolean',true,'所选界面语言与文章原文语言不同时，显示可关闭的浏览器翻译提示；不会调用收费翻译服务。'],
  ['show.sidebar',13,'显示首页右侧侧栏','boolean',true,'关闭后文章列表使用全部宽度。'],
  ['show.sidebarAbout',13,'显示侧栏自我介绍','boolean',true,'侧栏头像、介绍和关于链接。'],
  ['show.sidebarQuote',13,'显示侧栏深色短句卡片','boolean',true,'侧栏大字短句区域。'],
  ['show.sidebarWriting',13,'显示侧栏记录提示卡片','boolean',true,'侧栏最下方的文字卡片。'],
  ['show.featured',13,'突出展示首页第一篇文章','boolean',true,'关闭后全部文章使用普通卡片。'],
  ['show.search',13,'显示文章搜索','boolean',true,'控制搜索按钮和搜索框。'],
  ['show.categories',13,'显示文章分类筛选','boolean',true,'实际分类名称仍在文章库修改。'],
  ['show.aboutAvatar',13,'显示关于页头像或标志','boolean',true,'关于页正文旁的图片。'],
  ['show.aboutTopics',13,'显示关于页主题卡片','boolean',true,'关于页底部的三项主题介绍。'],
  ['show.readingProgress',13,'显示文章阅读进度条','boolean',true,'文章页顶部的细进度条。'],
  ['show.share',13,'显示文章链接复制按钮','boolean',true,'文章末尾的复制分享工具。'],
  ['show.tags',13,'显示文章末尾标签','boolean',true,'实际标签名称仍在文章库修改。'],
  ['show.nextReading',13,'显示文章末尾继续阅读','boolean',true,'文章末尾通往其他记录的链接。'],
  ['show.footer',13,'显示页脚','boolean',true,'包含标志、版权、社交链接；后台仍可用 /settings 进入。'],
  ['show.visitorCounter',13,'启用并显示去重访客数','boolean',true,'同一浏览器首次来访登记一次。关闭后停止访客登记，历史数据保留；主页浏览与单篇阅读各用独立开关。'],
  ['show.articleViews',13,'启用并显示单篇阅读次数','boolean',true,'控制文章页右上角阅读次数。打开、重开或刷新文章都累计；关闭后停止本项统计，历史保留。首页的主页浏览量使用独立开关。'],
  ['show.homeViews',13,'启用并显示主页浏览量','boolean',true,'只统计主页被打开、重新打开或刷新；文章、归档与关于页不计入。关闭后停止主页统计并隐藏右栏，历史保留；单篇阅读不受影响。'],
  ['show.dates',13,'显示文章日期','boolean',true,'首页、归档和文章页的日期。'],
  ['show.articleCategory',13,'显示文章分类标签','boolean',true,'首页卡片、归档和文章页的分类标签。'],
  ['show.readingTime',13,'显示预计阅读时间','boolean',true,'首页首篇文章和文章页。'],
  ['seo.index',13,'允许搜索引擎收录','boolean',true,'取消勾选会添加 noindex 标记；实际收录由搜索引擎决定。'],
  ['feed.refreshSeconds',13,'文章列表自动检查间隔','number',60,'只改“数值”，单位秒，范围 30–3600；仅页面打开且可见时检查。',30,3600],
  ['feed.limit',13,'首页最多显示文章数','number',0,'0 表示全部；范围 0–100。归档页仍展示全部已发布文章。',0,100],
  ['feed.order',13,'首页文章排序','choice','新到旧','填：新到旧、旧到新、标题。',undefined,undefined,['新到旧','旧到新','标题']],
] as const satisfies readonly Field[];

export type SettingKey=typeof settingFields[number][0];
export type AssetName=Extract<SettingKey,`asset.${string}`> extends `asset.${infer N}`?N:never;
export type SiteSettings={values:Record<SettingKey,string|number|boolean>;assets:Record<AssetName,string>;version:string};
export type SettingRow={key:string;value:string;number?:number|null;checked?:boolean;file?:{url:string;name:string};version?:string};
export const assetNames=settingFields.filter(x=>x[3]==='image').map(x=>x[0].slice(6) as AssetName);
const knownAssets=new Set<string>(assetNames);
export function isAssetName(value:string):value is AssetName{return knownAssets.has(value);}
function versionHash(value:string){let h=2166136261;for(const c of value){h=Math.imul(h^c.charCodeAt(0),16777619);}return (h>>>0).toString(36);}
function publicHttps(value:string){try{const u=new URL(value);if(u.protocol!=='https:'||u.username||u.password||u.hostname==='localhost'||u.hostname.endsWith('.localhost')||u.hostname.endsWith('.local')||u.hostname==='[::1]'||/^(127\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.)/.test(u.hostname))return '';return u.href;}catch{return '';}}
export function safeSettingLink(value:string):string {
  if(value.length>2048||/[\u0000-\u0020\\]/.test(value))return '';
  if(value.startsWith('/')&&!value.startsWith('//')){try{const u=new URL(value,'https://blog.invalid');if(u.origin!=='https://blog.invalid'||/^\/(settings|api|signin-with-chatgpt|signout-with-chatgpt|callback)(?:\/|$)/.test(decodeURIComponent(u.pathname)))return '';return u.pathname+u.search+u.hash;}catch{return '';}}
  if(/^mailto:[^\s<>@]+@[^\s<>@]+$/.test(value))return value;
  return publicHttps(value);
}
const localImages=new Set(settingFields.filter(x=>x[3]==='image').map(x=>String(x[4])).filter(Boolean));
// Existing settings can still point at a built-in version, even if a preview image is attached.
const sidebarMonogramPresets=new Set(['默认 d.','/brand-monogram-rose-v3.svg','/brand-monogram-rose-v4.svg']);
export function safeSettingImage(value:string){
  // Resolve saved references to the old bundled icon without retaining its painted background.
  if(value==='/brand-monogram-rose-v3.svg')return '/brand-monogram-rose-v4.svg';
  return localImages.has(value)?value:publicHttps(value);
}

export function mergeSettings(rows:SettingRow[]){
  const values={} as SiteSettings['values'],assets={} as SiteSettings['assets'],sources={} as Record<AssetName,string>;
  const map=new Map<string,SettingRow>();
  for(const row of rows){if(!settingFields.some(x=>x[0]===row.key))continue;if(map.has(row.key))throw new Error('Duplicate website setting');map.set(row.key,row);}
  const versions:string[]=[];
  for(const def of settingFields){
    const [key,,,kind,fallback]=def;const row=map.get(key);let v:string|number|boolean=fallback;
    if(row){
      const input=row.value.trim();
      if(kind==='boolean')v=typeof row.checked==='boolean'?row.checked:fallback;
      else if(kind==='number'){const n=row.number??(input?Number(input):NaN);const full=def as Field;if(Number.isFinite(n))v=Math.min(full[7]??n,Math.max(full[6]??n,n));}
      else if(kind==='color'){if(/^#[\da-f]{6}$/i.test(input))v=input.toLowerCase();}
      else if(kind==='choice'){if((def as Field)[8]?.includes(input))v=input;}
      else if(kind==='link')v=safeSettingLink(input)||fallback;
      else if(kind==='text')v=row.value.slice(0,500);
      versions.push(key+':'+(row.version??'')+':'+String(v));
    }
    if(kind==='image'){
      const name=key.slice(6) as AssetName;
      const file=row?.file;
      const uploaded=file&&/\.(png|jpe?g|webp|gif|avif|svg|ico)$/i.test(file.name)?safeSettingImage(file.url):'';
      const input=row?.value.trim()??'';
      const source=name==='sidebar'&&sidebarMonogramPresets.has(input)?'':uploaded||safeSettingImage(input)||String(fallback);
      sources[name]=source;
      const assetVersion=versionHash(key+':'+(row?.version??'')+':'+source.split('?')[0]);
      assets[name]=source?'/api/site-assets/'+name+'?v='+assetVersion:'';
      v=String(fallback); // Signed Notion file URLs are never serialized to readers.
    }
    values[key]=v;
  }
  return {settings:{values,assets,version:versionHash(versions.join('|'))},sources,count:map.size};
}
export const defaultSettings=mergeSettings([]).settings;
export function text(s:SiteSettings,key:SettingKey){return String(s.values[key]);}
export function num(s:SiteSettings,key:SettingKey){return Number(s.values[key]);}
export function flag(s:SiteSettings,key:SettingKey){return s.values[key]===true;}
export function dateLabel(date:string){return date?date.slice(0,10).replaceAll('-','.'):'';}
export function orderedArticles(articles:Article[],s:SiteSettings){const sorted=[...articles];const order=text(s,'feed.order');return sorted.sort((a,b)=>order==='标题'?a.title.localeCompare(b.title):order==='旧到新'?a.date.localeCompare(b.date):b.date.localeCompare(a.date));}
export function initialTheme(s:SiteSettings){return text(s,'theme.default')==='深色'?'dark':'light';}

// Apply the saved preference before the first paint, while retaining a safe SSR fallback.
export function themeBootScript(s:SiteSettings){
  const fallback=JSON.stringify(initialTheme(s)),toggle=flag(s,'show.themeToggle'),system=text(s,'theme.default')==='跟随系统';
  return `(()=>{let mode=${fallback},saved=null;if(${toggle}){try{saved=localStorage.getItem('donnie-theme')}catch{}}if(saved==='light'||saved==='dark')mode=saved;else if(${system}){try{mode=matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'}catch{}}document.documentElement.dataset.theme=mode})()`;
}

export function settingsCss(s:SiteSettings){
  const light=`--bg:${text(s,'color.lightBg')};--paper:${text(s,'color.lightPaper')};--text:${text(s,'color.lightText')};--muted:${text(s,'color.lightMuted')};--soft:${text(s,'color.lightSoft')};--line:${text(s,'color.lightLine')}`;
  const dark=`--bg:${text(s,'color.darkBg')};--paper:${text(s,'color.darkPaper')};--text:${text(s,'color.darkText')};--muted:${text(s,'color.darkMuted')};--soft:${text(s,'color.darkSoft')};--line:${text(s,'color.darkLine')}`;
  const family=text(s,'font.family')==='Noto Sans'?'"Noto Sans","Noto Sans SC",sans-serif':'-apple-system,BlinkMacSystemFont,"PingFang SC","PingFang TC","Noto Sans","Noto Sans SC","Microsoft YaHei",sans-serif';
  const position=({'居中':'center','顶部':'top','底部':'bottom','左侧':'left','右侧':'right'} as Record<string,string>)[text(s,'image.position')]||'center';
  return `:root[data-site-settings]{${light};--sans:${family};--brand-accent:${text(s,'color.accent')};--wordmark-font:${text(s,'font.wordmark')==='Georgia'?'Georgia,serif':'var(--sans)'};--body-size:${num(s,'font.bodySize')}px;--article-size:${num(s,'font.articleSize')}px;--body-weight:${num(s,'font.bodyWeight')};--heading-weight:${num(s,'font.headingWeight')};--subheading-weight:${num(s,'font.subheadingWeight')};--site-width:${num(s,'layout.width')}px;--article-width:${num(s,'layout.articleWidth')}px;--hero-title-size:${num(s,'font.heroSize')}px;--corner-radius:${num(s,'layout.radius')}px;--glass-blur:${num(s,'material.blur')}px;--image-radius:${num(s,'image.radius')}px;--content-radius:${num(s,'layout.contentRadius')}px;--hero-fit:${text(s,'image.fit')==='完整显示'?'contain':'cover'};--hero-position:${position};--hero-filter:${text(s,'image.filter')==='黑白'?'grayscale(1)':'none'};--art-bg:${text(s,'color.artBg')};--art-text:${text(s,'color.artText')};--art-line:${text(s,'color.artLine')}}:root[data-site-settings][data-theme=dark]{${dark}}`;
}
