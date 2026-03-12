-- Add short_description column to packs table
-- Short tagline for storefront display (3-4 words, max 80 chars)
ALTER TABLE packs ADD COLUMN short_description TEXT;
