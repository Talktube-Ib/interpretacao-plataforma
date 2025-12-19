-- 1. Profiles Table (UserData)
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade not null primary key,
  email text,
  full_name text,
  avatar_url text,
  role text default 'user' check (role in ('admin', 'user')),
  active boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Meetings Table
create table if not exists public.meetings (
  id uuid default gen_random_uuid() primary key,
  host_id uuid references public.profiles(id) not null,
  title text not null,
  description text,
  status text default 'scheduled' check (status in ('scheduled', 'active', 'ended')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Security (RLS) - Enable for all
alter table public.profiles enable row level security;
alter table public.meetings enable row level security;

-- Policies for Profiles
create policy "Public profiles are viewable by everyone." on public.profiles for select using (true);
create policy "Users can insert their own profile." on public.profiles for insert with check (auth.uid() = id);
create policy "Users can update own profile." on public.profiles for update using (auth.uid() = id);

-- Policies for Meetings
create policy "Meetings are viewable by everyone." on public.meetings for select using (true);
create policy "Hosts can create meetings." on public.meetings for insert with check (auth.uid() = host_id);
create policy "Hosts can update their meetings." on public.meetings for update using (auth.uid() = host_id);

-- Auto-create Profile on Sign Up
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name', 'user');
  return new;
end;
$$ language plpgsql security definer;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Admin Override Policies (Optional but good)
create policy "Admins can update any profile" on public.profiles for update using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);
