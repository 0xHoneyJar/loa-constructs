-- Add logo variant columns to packs table
-- logo_mark: SVG path data for mark-only (favicon, small icons, 16-48px)
-- logo_wordmark: Full SVG for horizontal lockup (mark + text, catalog rows)
-- logo_knockout: Full SVG for knockout variant (mark with text cutout, hero/detail)
ALTER TABLE packs ADD COLUMN IF NOT EXISTS logo_mark TEXT;
ALTER TABLE packs ADD COLUMN IF NOT EXISTS logo_wordmark TEXT;
ALTER TABLE packs ADD COLUMN IF NOT EXISTS logo_knockout TEXT;
