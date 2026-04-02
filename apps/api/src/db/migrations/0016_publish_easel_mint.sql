-- Make the-easel and the-mint constructs publicly visible
-- Both construct.yaml files already declare visibility: public
-- VIS-001 CASE logic prevents re-seed from promoting existing rows
UPDATE packs SET visibility = 'public' WHERE slug IN ('the-easel', 'the-mint') AND visibility = 'internal';
