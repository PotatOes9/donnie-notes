import {initialVisitorState,visitorDay,type CounterStatement} from './visitor-counter.ts';

// All three UI languages share the same homepage metric. Fragments and
// in-page interactions never create a new opening.
export function isHomePath(path:unknown):path is string {
  return typeof path==='string'&&/^\/(?:zh\/?|ja\/?|en\/?)?$/.test(path);
}
export function homeViewStatements(eventId:string,requestId:string,now:Date):CounterStatement[]{
  const iso=now.toISOString(),day=visitorDay(now);
  return [
    initialVisitorState(iso),
    {sql:'UPDATE visitor_state SET home_views_started_at=? WHERE id=1 AND home_views_started_at IS NULL',values:[iso]},
    {sql:'INSERT INTO home_view_events (event_id,viewed_at,request_id) VALUES (?,?,?) ON CONFLICT(event_id) DO NOTHING',values:[eventId,iso,requestId]},
    {sql:'UPDATE visitor_state SET home_views=home_views+1,updated_at=? WHERE id=1 AND EXISTS (SELECT 1 FROM home_view_events WHERE event_id=? AND request_id=?)',values:[iso,eventId,requestId]},
    {sql:'INSERT INTO visitor_daily (date,new_visitors,end_total,home_views,end_home_views,updated_at) SELECT ?,0,total,1,home_views,? FROM visitor_state WHERE id=1 AND EXISTS (SELECT 1 FROM home_view_events WHERE event_id=? AND request_id=?) ON CONFLICT(date) DO UPDATE SET home_views=visitor_daily.home_views+1,end_home_views=excluded.end_home_views,end_total=excluded.end_total,updated_at=excluded.updated_at',values:[day,iso,eventId,requestId]},
    {sql:"UPDATE visitor_state SET recent_home_views_json=(SELECT json_group_array(json_object('date',date,'homeViews',home_views,'endHomeViews',end_home_views)) FROM (SELECT date,home_views,end_home_views FROM visitor_daily WHERE date>=date(visitor_state.home_views_started_at,'+9 hours') ORDER BY date DESC LIMIT 14)) WHERE id=1 AND EXISTS (SELECT 1 FROM home_view_events WHERE event_id=? AND request_id=?)",values:[eventId,requestId]},
    {sql:'SELECT total,home_views AS homeViews,home_views_started_at AS homeViewsStartedAt FROM visitor_state WHERE id=1',values:[]},
  ];
}
