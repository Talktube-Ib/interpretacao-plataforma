-- Fix the handle_new_user function to use a valid default role
-- 'participant' is not allowed by the check constraint (only 'admin' or 'user')

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id, 
    new.email, 
    new.raw_user_meta_data->>'full_name', 
    -- Change default from 'participant' to 'user' to satisfy ensure check(role in ('admin', 'user'))
    case 
      when (new.raw_user_meta_data->>'role') = 'admin' then 'admin'
      else 'user' -- Default fallback for everything else (participant, interpreter, null)
    end
  );
  return new;
end;
$$ language plpgsql security definer;
