-- 1. Remover a restrição antiga que bloqueia papéis diferentes de 'admin' e 'user'
ALTER TABLE public.profiles 
DROP CONSTRAINT IF EXISTS profiles_role_check;

-- 2. Normalizar dados existentes (opcional, mas recomendado)
UPDATE public.profiles
SET role = 'user'
WHERE role NOT IN ('admin', 'interpreter', 'user');

-- 3. Aplicar a nova regra que permite 'admin', 'user' e 'interpreter'
ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_role_check 
CHECK (role IN ('admin', 'user', 'interpreter'));

-- 4. Corrigir a função do gatilho para lidar com os novos papéis e evitar o padrão 'participant' inválido
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
      ELSE 'user' -- Padrão seguro que respeita a constraint
    END
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
