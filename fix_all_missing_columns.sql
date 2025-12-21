-- Garante que TODAS as colunas usadas no perfil existam
-- Se a coluna já existir, o comando é ignorado (IF NOT EXISTS)

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS job_title text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS company text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bio text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS languages text[];

-- Força atualização do cache do schema
NOTIFY pgrst, 'reload schema';
