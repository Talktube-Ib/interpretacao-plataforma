-- Clean up existing users with NULL status
UPDATE public.profiles
SET status = 'active'
WHERE status IS NULL;

-- Ensure default is set for future
ALTER TABLE public.profiles 
ALTER COLUMN status SET DEFAULT 'active';
