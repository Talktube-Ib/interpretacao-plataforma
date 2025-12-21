
-- Create audit_logs table if it doesn't exist
create table if not exists public.audit_logs (
  id uuid default gen_random_uuid() primary key,
  admin_id uuid references auth.users(id),
  action text not null,
  target_resource text not null,
  details jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.audit_logs enable row level security;

-- Create policy for reading logs (Admins only)
create policy "Admins can view audit logs"
  on public.audit_logs
  for select
  using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
      and profiles.role = 'admin'
    )
  );

-- Create policy for inserting logs (Admins only)
create policy "Admins can insert audit logs"
  on public.audit_logs
  for insert
  with check (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
      and profiles.role = 'admin'
    )
  );

-- Function to easily create a log
create or replace function public.log_admin_action(
  p_action text,
  p_target_resource text,
  p_details jsonb
)
returns void
language plpgsql
security definer
as $$
begin
  insert into public.audit_logs (admin_id, action, target_resource, details)
  values (auth.uid(), p_action, p_target_resource, p_details);
end;
$$;
