-- Create MESSAGES table
create table if not exists public.messages (
  id uuid default gen_random_uuid() primary key,
  room_id text not null, -- Stores the Room ID (URL param)
  sender_id uuid references auth.users(id) not null, -- Links to Auth User
  sender_name text, -- Optional, or join with profiles
  content text not null,
  role text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.messages enable row level security;

-- Policies
-- 1. Everyone can read messages (for now, simplistic)
create policy "Everyone can read messages"
on public.messages for select
using (true);

-- 2. Authenticated users can insert messages
create policy "Users can insert messages"
on public.messages for insert
with check (auth.uid() = sender_id);

-- 3. realtime (Important!)
alter publication supabase_realtime add table public.messages;
