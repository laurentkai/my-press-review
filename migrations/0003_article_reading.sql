ALTER TABLE trial_articles ADD COLUMN body_text TEXT NOT NULL DEFAULT '';
ALTER TABLE trial_articles ADD COLUMN image_url TEXT;
ALTER TABLE trial_articles ADD COLUMN image_credit TEXT NOT NULL DEFAULT '';
ALTER TABLE trial_articles ADD COLUMN access_level TEXT NOT NULL DEFAULT 'unknown' CHECK(access_level IN ('free','restricted','unknown'));
ALTER TABLE trial_articles ADD COLUMN publisher_categories TEXT NOT NULL DEFAULT '[]';
ALTER TABLE trial_articles ADD COLUMN theme TEXT;
ALTER TABLE trial_articles ADD COLUMN subtheme TEXT;
ALTER TABLE trial_sources ADD COLUMN reading_metadata_version INTEGER NOT NULL DEFAULT 0;
-- Fetch metadata once even if an editor would otherwise return 304. Respect
-- next_fetch_at and any active lease: no burst or schedule override.
UPDATE trial_sources SET etag=NULL,last_modified=NULL;
