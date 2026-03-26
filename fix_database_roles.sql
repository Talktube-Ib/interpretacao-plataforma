-- 1. Garantir que a coluna 'username' exista na tabela profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS "username" TEXT UNIQUE;

-- 2. Remover a restrição antiga que bloqueia papéis diferentes de 'admin' e 'user'
ALTER TABLE public.profiles 
DROP CONSTRAINT IF EXISTS profiles_role_check;

-- 3. Aplicar a nova regra que permite 'admin', 'user' e 'interpreter'
ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_role_check 
CHECK (role IN ('admin', 'user', 'interpreter'));

-- 4. Corrigir a função do gatilho principal (handle_new_user)
-- Esta função é chamada quando um usuário é criado no Auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    new.id, 
    new.email, 
    new.raw_user_meta_data->>'full_name', 
    CASE 
      WHEN (new.raw_user_meta_data->>'role') = 'admin' THEN 'admin'
      WHEN (new.raw_user_meta_data->>'role') = 'interpreter' THEN 'interpreter'
      ELSE 'user' -- Padrão seguro
    END
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Corrigir a função de geração de username para evitar erros
CREATE OR REPLACE FUNCTION generate_unique_username(email_prefix TEXT) 
RETURNS TEXT AS $$
DECLARE
    new_username TEXT;
    counter INTEGER := 0;
BEGIN
    new_username := lower(email_prefix);
    new_username := regexp_replace(new_username, '[^a-z0-9]', '-', 'g');
    
    WHILE EXISTS (SELECT 1 FROM public.profiles WHERE username = new_username) LOOP
        counter := counter + 1;
        new_username := lower(email_prefix) || counter;
    END LOOP;
    
    RETURN new_username;
END;
$$ LANGUAGE plpgsql;

-- 6. Garantir que o gatilho de username esteja configurado corretamente
CREATE OR REPLACE FUNCTION handle_new_user_username() 
RETURNS TRIGGER AS $$
BEGIN
    -- Só tenta preencher se a coluna existir e estiver nula
    IF NEW.username IS NULL THEN
        NEW.username := generate_unique_username(split_part(NEW.email, '@', 1));
    END IF;
    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    -- Fallback silencioso para não quebrar a criação do usuário
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 7. Recriar o gatilho de username se necessário
DROP TRIGGER IF EXISTS on_auth_user_created_username ON public.profiles;
CREATE TRIGGER on_auth_user_created_username
    BEFORE INSERT OR UPDATE OF email ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION handle_new_user_username();
