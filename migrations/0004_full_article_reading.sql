ALTER TABLE trial_articles ADD COLUMN full_text TEXT NOT NULL DEFAULT '';
ALTER TABLE trial_articles ADD COLUMN full_status TEXT NOT NULL DEFAULT 'pending' CHECK(full_status IN ('pending','available','live','restricted','unavailable'));
ALTER TABLE trial_articles ADD COLUMN full_reason TEXT NOT NULL DEFAULT '';
ALTER TABLE trial_articles ADD COLUMN full_fetched_at INTEGER;
ALTER TABLE trial_articles ADD COLUMN full_next_fetch_at INTEGER NOT NULL DEFAULT 0;
ALTER TABLE trial_sources ADD COLUMN article_lease_until INTEGER NOT NULL DEFAULT 0;
ALTER TABLE trial_sources ADD COLUMN article_lease_owner TEXT;
ALTER TABLE trial_sources ADD COLUMN article_next_fetch_at INTEGER NOT NULL DEFAULT 0;
CREATE TABLE trial_article_robots (
  origin TEXT PRIMARY KEY,
  body TEXT NOT NULL,
  status TEXT NOT NULL,
  next_check_at INTEGER NOT NULL
);
CREATE INDEX trial_articles_full_due ON trial_articles(full_next_fetch_at, source_id);
