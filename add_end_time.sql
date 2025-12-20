-- Execute este comando no Editor SQL do seu Painel Supabase
ALTER TABLE public.meetings 
ADD COLUMN IF NOT EXISTS end_time timestamp with time zone;
