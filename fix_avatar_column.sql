-- Adiciona a coluna avatar_url se ela não existir
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS avatar_url text;

-- Recarrega o cache do esquema do Supabase (para reconhecer a nova coluna)
NOTIFY pgrst, 'reload schema';
