-- Garante TODAS as colunas do perfil, inclusive 'limits'
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS job_title text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS company text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bio text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS languages text[] DEFAULT '{}';

-- A coluna que faltou agora: limits (JSONB)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS limits jsonb DEFAULT '{"max_meetings": 1, "max_participants": 5, "can_record": false}'::jsonb;

-- Garante que status existe e tem valor padrão
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS status text DEFAULT 'active';

-- Recarregar cache do schema
NOTIFY pgrst, 'reload schema';
