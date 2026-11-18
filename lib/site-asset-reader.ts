import type {NotionClient,NotionObject} from './notion-core.ts';
import {textOf} from './notion-core.ts';
import {isAssetName,mergeSettings,type SettingRow} from './site-settings.ts';

export function settingRow(row:NotionObject):SettingRow {
  const properties=row.properties||{},key=textOf((properties['识别码']??properties['識別碼'])?.rich_text);
  const field=properties['显示文字']??properties['顯示文字'];
  const file=(properties['图片']?.files||[]).find((x:any)=>/\.(png|jpe?g|webp|gif|avif|svg|ico)$/i.test(x.name||''));
  return {key,value:textOf(field?.rich_text),version:row.last_edited_time,number:properties['数值']?.number,checked:properties['开关']?.type==='checkbox'?properties['开关'].checkbox:undefined,file:file?{url:file.type==='file'?file.file?.url:file.external?.url,name:file.name}:undefined};
}

export async function readSiteAsset(client:NotionClient,sourceId:string,key:string){
  if(!isAssetName(key))throw new Error('Unknown site image');
  const data=await client.call(`data_sources/${sourceId}/query`,'POST',{page_size:2,filter:{property:'识别码',rich_text:{equals:'asset.'+key}}});
  const rows=(data.results||[]).filter((row:any)=>!row.archived&&!row.in_trash&&!row.is_archived&&row.parent?.type==='data_source_id'&&row.parent.data_source_id.replaceAll('-','')===sourceId.replaceAll('-','')&&settingRow(row).key==='asset.'+key);
  if(data.has_more||rows.length>1)throw new Error('Ambiguous site image');
  return mergeSettings(rows.map(settingRow)).sources[key];
}

// Refresh a signed upload before it expires, including browser redirect caching.
export function assetSourceExpired(source:string,now=Date.now()){
 let url:URL;try{url=new URL(source);}catch{return false;}
 const stamp=url.searchParams.get('X-Amz-Date'),seconds=Number(url.searchParams.get('X-Amz-Expires'));
 if(stamp&&/^\d{8}T\d{6}Z$/.test(stamp)&&Number.isFinite(seconds)){
  const start=Date.parse(stamp.slice(0,4)+'-'+stamp.slice(4,6)+'-'+stamp.slice(6,8)+'T'+stamp.slice(9,11)+':'+stamp.slice(11,13)+':'+stamp.slice(13,15)+'Z');
  return start+seconds*1000<=now+120_000;
 }
 const expires=Number(url.searchParams.get('Expires'));
 return url.searchParams.has('Signature')&&Number.isFinite(expires)&&expires*1000<=now+120_000;
}
