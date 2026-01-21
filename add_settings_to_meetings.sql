-- Add settings column to meetings table if it doesn't exist
-- This column is used to store unstructured meeting configuration like 'minutes_active', 'interpreters', etc.
ALTER TABLE public.meetings ADD COLUMN IF NOT EXISTS settings jsonb DEFAULT '{}'::jsonb;

-- Notify PostgREST to reload the schema cache
NOTIFY pgrst, 'reload schema';
