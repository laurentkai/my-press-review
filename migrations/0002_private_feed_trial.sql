-- Shared private trial workspace. Separate from future per-user OAuth data.
CREATE TABLE trial_sources (
  id TEXT PRIMARY KEY NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 1 CHECK(enabled IN (0, 1)),
  status TEXT NOT NULL DEFAULT 'pending',
  last_attempt_at INTEGER,
  last_success_at INTEGER,
  next_fetch_at INTEGER NOT NULL DEFAULT 0,
  lease_until INTEGER NOT NULL DEFAULT 0,
  lease_owner TEXT,
  etag TEXT,
  last_modified TEXT,
  last_item_count INTEGER NOT NULL DEFAULT 0
);
INSERT INTO trial_sources(id, enabled, status) VALUES
 ('7sur7',1,'pending'), ('dh',1,'pending'), ('lalibre',1,'pending'),
 ('lesoir',0,'blocked_403'), ('figaro',1,'pending'), ('lejsl',1,'pending'),
 ('investing',1,'pending'), ('zonebourse',0,'blocked_403'), ('gouvernement',1,'pending');

CREATE TABLE trial_articles (
  id TEXT PRIMARY KEY NOT NULL,
  source_id TEXT NOT NULL REFERENCES trial_sources(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  title TEXT NOT NULL,
  excerpt TEXT NOT NULL,
  published_at TEXT,
  collected_at TEXT NOT NULL,
  UNIQUE(source_id, url)
);
CREATE INDEX trial_articles_source_date ON trial_articles(source_id, collected_at DESC);

CREATE TABLE trial_sessions (
  token_hash TEXT PRIMARY KEY NOT NULL,
  access_key_hash TEXT NOT NULL,
  expires_at INTEGER NOT NULL
);
CREATE INDEX trial_sessions_expiration ON trial_sessions(expires_at);
CREATE TABLE trial_login_limits (
  bucket TEXT PRIMARY KEY NOT NULL,
  attempts INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);
