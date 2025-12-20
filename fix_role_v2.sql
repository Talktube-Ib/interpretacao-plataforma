-- SEQUENCE CORRECTION: Drop rules FIRST, then fix data, then apply new rules.

-- 1. Remove the old restrictive lock immediately
ALTER TABLE public.profiles 
DROP CONSTRAINT IF EXISTS profiles_role_check;

-- 2. NOW we can safely clean up the data (convert everything to 'user')
UPDATE public.profiles
SET role = 'user'
WHERE role NOT IN ('admin', 'interpreter', 'user');

UPDATE public.profiles
SET role = 'user'
WHERE role IS NULL;

-- 3. Apply the new rule that allows user, admin, AND interpreter
ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_role_check 
CHECK (role IN ('admin', 'user', 'interpreter'));

-- 4. Update the trigger (just to be sure it's the latest version)
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
