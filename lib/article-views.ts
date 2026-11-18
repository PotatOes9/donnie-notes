import {initialVisitorState,visitorDay,type CounterStatement} from './visitor-counter.ts';

export function articleViewStatements(eventId:string,articleId:string,requestId:string,now:Date):CounterStatement[]{
  const iso=now.toISOString(),day=visitorDay(now);
  // One atomic transaction counts a genuine new event exactly once. Reopening
  // the same article uses a fresh event; retrying a request keeps its old event.
  return [
    initialVisitorState(iso),
    {sql:'UPDATE visitor_state SET views_started_at=? WHERE id=1 AND views_started_at IS NULL',values:[iso]},
    {sql:'INSERT INTO article_view_events (event_id,article_id,viewed_at,request_id) VALUES (?,?,?,?) ON CONFLICT(event_id) DO NOTHING',values:[eventId,articleId,iso,requestId]},
    {sql:'UPDATE visitor_state SET article_views=article_views+1,updated_at=? WHERE id=1 AND EXISTS (SELECT 1 FROM article_view_events WHERE event_id=? AND request_id=?)',values:[iso,eventId,requestId]},
    {sql:'INSERT INTO article_view_totals (article_id,total,updated_at) SELECT ?,1,? WHERE EXISTS (SELECT 1 FROM article_view_events WHERE event_id=? AND request_id=?) ON CONFLICT(article_id) DO UPDATE SET total=article_view_totals.total+1,updated_at=excluded.updated_at',values:[articleId,iso,eventId,requestId]},
    {sql:'INSERT INTO visitor_daily (date,new_visitors,end_total,article_views,end_article_views,updated_at) SELECT ?,0,total,1,article_views,? FROM visitor_state WHERE id=1 AND EXISTS (SELECT 1 FROM article_view_events WHERE event_id=? AND request_id=?) ON CONFLICT(date) DO UPDATE SET article_views=visitor_daily.article_views+1,end_article_views=excluded.end_article_views,end_total=excluded.end_total,updated_at=excluded.updated_at',values:[day,iso,eventId,requestId]},
    {sql:"UPDATE visitor_state SET recent_views_json=(SELECT json_group_array(json_object('date',date,'articleViews',article_views,'endArticleViews',end_article_views)) FROM (SELECT date,article_views,end_article_views FROM visitor_daily WHERE date>=date(visitor_state.views_started_at,'+9 hours') ORDER BY date DESC LIMIT 14)) WHERE id=1 AND EXISTS (SELECT 1 FROM article_view_events WHERE event_id=? AND request_id=?)",values:[eventId,requestId]},
    {sql:'SELECT visitor_state.total,article_views AS articleViews,views_started_at AS articleViewsStartedAt,article_id AS articleId,article_view_totals.total AS postViews FROM visitor_state CROSS JOIN article_view_totals WHERE visitor_state.id=1 AND article_id=?',values:[articleId]},
  ];
}
