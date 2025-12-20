-- 1. Normalize invalid roles first (Fixes the "violated by some row" error)
-- Converts 'participant', 'host', or any garbage data to 'user'
UPDATE public.profiles
SET role = 'user'
WHERE role NOT IN ('admin', 'interpreter', 'user');

-- 2. Handle NULLs if any
UPDATE public.profiles
SET role = 'user'
WHERE role IS NULL;

-- 3. Now apply the new rules safe and sound
ALTER TABLE public.profiles 
DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_role_check 
CHECK (role IN ('admin', 'user', 'interpreter'));

-- 4. Update trigger logic for future safety
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id, 
    new.email, 
    new.raw_user_meta_data->>'full_name', 
    case 
      when (new.raw_user_meta_data->>'role') = 'admin' then 'admin'
      when (new.raw_user_meta_data->>'role') = 'interpreter' then 'interpreter'
      else 'user'
    end
  );
  return new;
end;
$$ language plpgsql security definer;
