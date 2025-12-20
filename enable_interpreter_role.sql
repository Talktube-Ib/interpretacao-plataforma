-- Allow 'interpreter' as a valid role in public.profiles table
-- This aligns with the UI dropdown options

ALTER TABLE public.profiles 
DROP CONSTRAINT profiles_role_check;

ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_role_check 
CHECK (role IN ('admin', 'user', 'interpreter'));

-- Also update the trigger to allow 'interpreter' to pass through
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id, 
    new.email, 
    new.raw_user_meta_data->>'full_name', 
    -- Allow admin/interpreter/user, default to user
    case 
      when (new.raw_user_meta_data->>'role') = 'admin' then 'admin'
      when (new.raw_user_meta_data->>'role') = 'interpreter' then 'interpreter'
      else 'user'
    end
  );
  return new;
end;
$$ language plpgsql security definer;
