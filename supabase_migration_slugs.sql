-- Migration to add slug column to meetings table
ALTER TABLE public.meetings ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE;

-- Generate random slugs for existing meetings (optional but good for consistency)
UPDATE public.meetings SET slug = substring(md5(random()::text), 1, 8) WHERE slug IS NULL;

-- Make slug required for future inserts (if desired)
-- ALTER TABLE public.meetings ALTER COLUMN slug SET NOT NULL;
