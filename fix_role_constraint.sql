-- Drop the restrictive constraint
alter table public.profiles drop constraint if exists profiles_role_check;

-- Add the new constraint including 'interpreter'
alter table public.profiles add constraint profiles_role_check 
check (role in ('admin', 'user', 'interpreter', 'participant'));

-- Verify and update any existing users if needed (optional, just safety)
comment on column public.profiles.role is 'Roles: admin, user, interpreter, participant';
