-- SANITIZAÇÃO DE BANCO DE DATOS - REMOÇÃO DE PERSONAL_MEETING_ID
-- Este script corrige erros 500 causados por referências a colunas inexistentes.

-- 1. Remover a coluna se ela ainda existir (para garantir estado limpo)
ALTER TABLE public.profiles DROP COLUMN IF EXISTS personal_meeting_id;

-- 2. Atualizar a função de Trigger para não usar a coluna removida
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    -- Criar apenas o perfil básico na tabela public.profiles
    -- A lógica de sala pessoal agora é baseada puramente no ID do usuário no código
    INSERT INTO public.profiles (id, email, full_name, role)
    VALUES (
        NEW.id, 
        NEW.email, 
        NEW.raw_user_meta_data->>'full_name', 
        COALESCE(NEW.raw_user_meta_data->>'role', 'participant')
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Garantir que o trigger esteja associado corretamente (caso tenha sido removido)
-- DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
-- CREATE TRIGGER on_auth_user_created
--   AFTER INSERT ON auth.users
--   FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4. Limpeza de reuniões que podem estar órfãs ou marcadas incorretamente
-- (Opcional, mas recomendado para manter integridade)
-- UPDATE public.meetings SET settings = settings || '{"is_personal": true}'::jsonb 
-- WHERE title = 'Sala Pessoal';
