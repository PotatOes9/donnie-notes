-- Apply to a new blog-only D1 database. Do not import blog_connection or event rows.
CREATE TABLE IF NOT EXISTS visitor_state (
 id INTEGER PRIMARY KEY CHECK(id=1), total INTEGER NOT NULL, started_at TEXT NOT NULL, updated_at TEXT NOT NULL,
 recent_days_json TEXT NOT NULL DEFAULT '[]',
 home_views INTEGER NOT NULL DEFAULT 0, home_views_started_at TEXT, recent_home_views_json TEXT NOT NULL DEFAULT '[]',
 article_views INTEGER NOT NULL DEFAULT 0, views_started_at TEXT, recent_views_json TEXT NOT NULL DEFAULT '[]'
);
CREATE TABLE IF NOT EXISTS visitor_daily (
 date TEXT PRIMARY KEY NOT NULL, new_visitors INTEGER NOT NULL DEFAULT 0, end_total INTEGER NOT NULL DEFAULT 0,
 home_views INTEGER NOT NULL DEFAULT 0, end_home_views INTEGER NOT NULL DEFAULT 0,
 article_views INTEGER NOT NULL DEFAULT 0, end_article_views INTEGER NOT NULL DEFAULT 0, updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS visitor_keys (
 browser_hash TEXT PRIMARY KEY, ordinal INTEGER UNIQUE NOT NULL, first_seen_at TEXT NOT NULL, registration_id TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS article_view_totals (
 article_id TEXT PRIMARY KEY NOT NULL, total INTEGER NOT NULL, updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS article_view_events (
 event_id TEXT PRIMARY KEY NOT NULL, article_id TEXT NOT NULL, viewed_at TEXT NOT NULL, request_id TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS home_view_events (
 event_id TEXT PRIMARY KEY NOT NULL, viewed_at TEXT NOT NULL, request_id TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS article_view_expiry ON article_view_events(viewed_at);
CREATE INDEX IF NOT EXISTS home_view_expiry ON home_view_events(viewed_at);
CREATE TABLE IF NOT EXISTS counter_health(hour TEXT PRIMARY KEY NOT NULL);
