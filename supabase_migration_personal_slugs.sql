-- Migration to add Diamond Slugs to Personal Rooms
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS "username" TEXT UNIQUE;

-- Populate username with a default based on full_name or email if it doesn't exist
UPDATE public.profiles 
SET "username" = lower(split_part(email, '@', 1))
WHERE "username" IS NULL;
