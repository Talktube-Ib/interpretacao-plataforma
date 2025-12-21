-- Create Announcements Table
create table public.announcements (
    id uuid default gen_random_uuid() primary key,
    title text not null,
    content text not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    created_by uuid references auth.users(id)
);

-- Add read tracking to profiles
alter table public.profiles 
add column if not exists last_read_announcements_at timestamp with time zone default '2000-01-01'::timestamp with time zone;

-- Policy: Admin can create, Everyone can read
alter table public.announcements enable row level security;

create policy "Admins can insert announcements"
  on public.announcements for insert
  with check (
    auth.uid() in (select id from public.profiles where role = 'admin')
  );

create policy "Everyone can view announcements"
  on public.announcements for select
  using (true);

-- Allow admins to delete too
create policy "Admins can delete announcements"
  on public.announcements for delete
  using (
    auth.uid() in (select id from public.profiles where role = 'admin')
  );
