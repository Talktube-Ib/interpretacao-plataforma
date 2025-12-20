-- Add the missing status column
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS status text DEFAULT 'active' 
CHECK (status IN ('active', 'suspended', 'banned'));

-- Apply the default to existing rows if they ended up NULL'd
UPDATE public.profiles 
SET status = 'active' 
WHERE status IS NULL;
