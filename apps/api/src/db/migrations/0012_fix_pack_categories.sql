-- Fix pack categories: backfill from known construct→category mapping
-- The 0011 backfill from search_use_cases[1] produced all NULLs because
-- search_use_cases was empty for most packs.

UPDATE packs SET category = 'design' WHERE slug IN ('artisan', 'the-easel', 'webreel');
UPDATE packs SET category = 'marketing' WHERE slug IN ('gtm-collective', 'growthpages', 'social-oracle');
UPDATE packs SET category = 'security' WHERE slug IN ('crucible', 'dynamic-auth', 'hardening');
UPDATE packs SET category = 'analytics' WHERE slug IN ('k-hole', 'observer');
UPDATE packs SET category = 'operations' WHERE slug IN ('beacon', 'herald');
UPDATE packs SET category = 'design' WHERE slug = 'the-arcade';
UPDATE packs SET category = 'analytics' WHERE slug = 'gecko';
UPDATE packs SET category = 'development' WHERE slug = 'protocol';
UPDATE packs SET category = 'design' WHERE slug = 'webgl-particles';
UPDATE packs SET category = 'documentation' WHERE slug = 'mibera-codex';

-- Catch-all: any remaining NULLs default to development
UPDATE packs SET category = 'development' WHERE category IS NULL;
