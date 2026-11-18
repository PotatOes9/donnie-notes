// Portable counting rules; no dependency on Sites or Notion authentication.
export const visitorStorageKey = 'donnie-visitor-v1';
export const visitorTimezone = 'Asia/Tokyo';
export const visitorCookieAge = 60 * 60 * 24 * 730;
export const visitorIdPattern = /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
export type CounterStatement = {sql:string;values:(string|number)[]};
export type VisitorResult = {status:'registered'|'recorded'|'summary'|'owner'|'excluded'|'disabled'|'unavailable'|'storage-blocked';number?:number;total?:number;articleViews?:number;articleViewsStartedAt?:string;articleId?:string;postViews?:number;homeViews?:number;homeViewsStartedAt?:string};
export function validVisitorId(value:unknown):value is string {
  return typeof value==='string' && visitorIdPattern.test(value);
}
export function visitorDay(date:Date):string {
  return new Date(date.getTime()+9*60*60*1000).toISOString().slice(0,10);
}
export async function visitorHash(value:string):Promise<string> {
  const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value.toLowerCase()));
  return Array.from(new Uint8Array(bytes),byte=>byte.toString(16).padStart(2,'0')).join('');
}
export function visitorCookie(headers:Headers):string|undefined {
  const value=(headers.get('cookie')||'').split(';').map(part=>part.trim()).find(part=>part.startsWith(visitorStorageKey+'='))?.slice(visitorStorageKey.length+1);
  return validVisitorId(value)?value.toLowerCase():undefined;
}
export function excludedVisitorAgent(agent:string|null):boolean {
  return !agent || /bot\b|spider|crawler|headless|slurp|bingpreview|facebookexternalhit|curl\/|wget\/|python-requests|lighthouse|pagespeed/i.test(agent);
}
export function initialVisitorState(iso:string):CounterStatement {
  return {sql:'INSERT INTO visitor_state (id,total,started_at,updated_at,recent_days_json) VALUES (1,0,?,?,\'[]\') ON CONFLICT(id) DO NOTHING',values:[iso,iso]};
}
export function registrationStatements(browserHash:string,requestId:string,now:Date):CounterStatement[] {
  const iso=now.toISOString(),day=visitorDay(now);
  // Execute as one D1 batch transaction. Only the request that inserts a new
  // browser may advance the sequence. Retries and returning browsers retain it.
  return [
    initialVisitorState(iso),
    {sql:'INSERT INTO visitor_keys (browser_hash,ordinal,first_seen_at,registration_id) SELECT ?,total+1,?,? FROM visitor_state WHERE id=1 ON CONFLICT(browser_hash) DO NOTHING',values:[browserHash,iso,requestId]},
    {sql:'UPDATE visitor_state SET total=total+1,updated_at=? WHERE id=1 AND EXISTS (SELECT 1 FROM visitor_keys WHERE browser_hash=? AND registration_id=?)',values:[iso,browserHash,requestId]},
    {sql:'INSERT INTO visitor_daily (date,new_visitors,end_total,updated_at) SELECT ?,1,total,? FROM visitor_state WHERE id=1 AND EXISTS (SELECT 1 FROM visitor_keys WHERE browser_hash=? AND registration_id=?) ON CONFLICT(date) DO UPDATE SET new_visitors=visitor_daily.new_visitors+1,end_total=excluded.end_total,updated_at=excluded.updated_at',values:[day,iso,browserHash,requestId]},
    {sql:"UPDATE visitor_state SET recent_days_json=(SELECT json_group_array(json_object('date',date,'newVisitors',new_visitors,'endTotal',end_total)) FROM (SELECT date,new_visitors,end_total FROM visitor_daily ORDER BY date DESC LIMIT 14)) WHERE id=1 AND EXISTS (SELECT 1 FROM visitor_keys WHERE browser_hash=? AND registration_id=?)",values:[browserHash,requestId]},
    {sql:'SELECT visitor_keys.ordinal AS number,visitor_state.total AS total FROM visitor_keys CROSS JOIN visitor_state WHERE visitor_keys.browser_hash=? AND visitor_state.id=1',values:[browserHash]},
  ];
}
