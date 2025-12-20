-- Create a table for public profiles (synced from auth.users via triggers usually, but simplistic here)
create table public.profiles (
  id uuid references auth.users on delete cascade not null primary key,
  email text,
  full_name text,
  avatar_url text,
  role text default 'user' check (role in ('admin', 'user')),
  status text not null default 'active' check (status in ('active', 'suspended', 'banned')),
  limits jsonb default '{"max_meetings": 1, "max_participants": 5, "can_record": false}'::jsonb,
  job_title text,
  company text,
  bio text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.profiles enable row level security;
create policy "Public profiles are viewable by everyone." on public.profiles for select using (true);
create policy "Users can insert their own profile." on public.profiles for insert with check (auth.uid() = id);
create policy "Users can update own profile." on public.profiles for update using (auth.uid() = id);

-- Function to handle new user signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name', coalesce(new.raw_user_meta_data->>'role', 'participant'));
  return new;
end;
$$ language plpgsql security definer;

-- Trigger to call the function
create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Meetings table
create table public.meetings (
  id uuid default gen_random_uuid() primary key,
  host_id uuid references public.profiles(id) not null,
  title text not null,
  description text,
  start_time timestamp with time zone,
  end_time timestamp with time zone, -- Track when meeting actually ended
  status text default 'scheduled' check (status in ('scheduled', 'active', 'ended')),
  max_participants int default 50, -- Soft limit for logic
  allowed_languages text[] default '{en,pt}', -- Languages supported in this meeting
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.meetings enable row level security;
create policy "Meetings are viewable by everyone." on public.meetings for select using (true);
create policy "Hosts can create meetings." on public.meetings for insert with check (auth.uid() = host_id);
create policy "Hosts can update their meetings." on public.meetings for update using (auth.uid() = host_id);

-- Interpreter Assignments (Who is interpreting what language)
create table public.interpreter_assignments (
  id uuid default gen_random_uuid() primary key,
  meeting_id uuid references public.meetings(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  language_code text not null, -- 'pt-BR', 'en-US', etc.
  unique(meeting_id, user_id)
);

alter table public.interpreter_assignments enable row level security;

-- Add active status
alter table public.profiles add column if not exists active boolean default true;
alter table public.profiles add column if not exists languages text[] default '{}';

-- Update RLS for profiles
drop policy if exists "Public profiles are viewable by everyone." on public.profiles;
create policy "Public profiles are viewable by everyone." on public.profiles for select using (true);

-- Admin can update any profile
create policy "Admins can update any profile." on public.profiles for update using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);

-- Admin can users
create policy "Admins can delete users." on public.profiles for delete using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);

-- Hosts can update their meetings (existing)
-- Admins can update any meeting
create policy "Admins can update any meeting." on public.meetings for update using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);

-- Interpreter Assignments (Who is interpreting what language)
-- (Existing table definition preserved, just ensuring RLS covers admins if needed later, 
-- but currently 'Hosts can manage assignments' logic might need Admin override too)
create policy "Admins can manage assignments." on public.interpreter_assignments for all using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);


-- Enterprise Governance Tables
create table public.audit_logs (
  id uuid default gen_random_uuid() primary key,
  admin_id uuid references public.profiles(id) not null,
  action text not null, -- e.g., 'USER_BAN', 'MEETING_KILL', 'SETTINGS_UPDATE'
  target_resource text not null, -- e.g., 'user', 'meeting', 'system'
  target_id text, -- ID of the affected user/meeting
  details jsonb, -- Metadata (reason, previous values)
  ip_address text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table public.platform_settings (
  id int primary key default 1,
  maintenance_mode boolean default false,
  registration_open boolean default true,
  max_concurrent_meetings int default 10,
  allowed_languages text[] default array['pt', 'en', 'es', 'fr'],
  constraint singleton_settings check (id = 1)
);

-- Insert default settings
insert into public.platform_settings (id) values (1) on conflict do nothing;

-- RLS: Audit Logs (Admins only)
alter table public.audit_logs enable row level security;
create policy "Admins can view audit logs" on public.audit_logs for select using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);
create policy "Admins can insert audit logs" on public.audit_logs for insert with check (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);

-- RLS: Platform Settings (Public Read, Admin Write)
alter table public.platform_settings enable row level security;
create policy "Everyone can view settings" on public.platform_settings for select using (true);
create policy "Admins can update settings" on public.platform_settings for update using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);
