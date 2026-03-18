-- Add client_type classification to pack_installations
-- Classifies traffic source: human browser, AI coding agent, or bot/crawler
-- Data: raw user_agent strings already captured on every install since table creation

-- Create the enum
DO $$ BEGIN
  CREATE TYPE client_type AS ENUM ('human', 'agent', 'bot', 'unknown');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Add the column (nullable — backfill will populate existing rows)
ALTER TABLE pack_installations ADD COLUMN IF NOT EXISTS client_type client_type DEFAULT 'unknown';

-- Index for analytics queries (client_type + created_at for time-series breakdowns)
CREATE INDEX IF NOT EXISTS idx_pack_installations_client_type
  ON pack_installations (client_type, created_at);

-- Backfill existing rows based on user_agent patterns
-- AI coding agents
UPDATE pack_installations SET client_type = 'agent' WHERE client_type = 'unknown' AND (
  user_agent ILIKE '%claude%'
  OR user_agent ILIKE '%cursor%'
  OR user_agent ILIKE '%windsurf%'
  OR user_agent ILIKE '%cline%'
  OR user_agent ILIKE '%aider%'
  OR user_agent ILIKE '%continue%'
  OR user_agent ILIKE '%copilot%'
  OR user_agent ILIKE '%loa-cli%'
  OR user_agent ILIKE '%construct-cli%'
  OR user_agent ILIKE '%codex-cli%'
  OR user_agent ILIKE '%node-fetch%'
  OR user_agent ILIKE '%undici%'
  OR user_agent ILIKE '%axios%'
);

-- Known bots/crawlers
UPDATE pack_installations SET client_type = 'bot' WHERE client_type = 'unknown' AND (
  user_agent ILIKE '%googlebot%'
  OR user_agent ILIKE '%bingbot%'
  OR user_agent ILIKE '%facebookexternalhit%'
  OR user_agent ILIKE '%twitterbot%'
  OR user_agent ILIKE '%slackbot%'
  OR user_agent ILIKE '%discordbot%'
  OR user_agent ILIKE '%linkedinbot%'
  OR user_agent ILIKE '%crawl%'
  OR user_agent ILIKE '%spider%'
  OR user_agent ILIKE '%bot/%'
);

-- Everything with a recognizable browser UA is human
UPDATE pack_installations SET client_type = 'human' WHERE client_type = 'unknown' AND (
  user_agent ILIKE '%mozilla%'
  OR user_agent ILIKE '%chrome%'
  OR user_agent ILIKE '%safari%'
  OR user_agent ILIKE '%firefox%'
  OR user_agent ILIKE '%edge%'
  OR user_agent ILIKE '%opera%'
);

-- Remaining unknowns stay unknown — manual review can refine
