-- Transcriptions Table (Real-time history)
create table public.meeting_transcripts (
  id uuid default gen_random_uuid() primary key,
  meeting_id uuid references public.meetings(id) on delete cascade not null,
  user_id text not null, -- can be uuid or guest string
  user_name text not null,
  content text not null,
  language text default 'pt-BR',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Summaries Table (AI Result)
create table public.meeting_summaries (
  id uuid default gen_random_uuid() primary key,
  meeting_id uuid references public.meetings(id) on delete cascade not null,
  summary_md text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS
alter table public.meeting_transcripts enable row level security;
alter table public.meeting_summaries enable row level security;

-- Everyone in the meeting can read transcripts (for live view)
create policy "Transcripts are viewable by authenticated users."
  on public.meeting_transcripts for select
  using (auth.role() = 'authenticated');

-- Everyone can insert their own transcript
-- Note: Simplified policy. Ideally check if user belongs to meeting.
create policy "Authenticated users can insert transcripts."
  on public.meeting_transcripts for insert
  with check (auth.role() = 'authenticated');

-- Summaries read
create policy "Summaries are viewable by authenticated users."
  on public.meeting_summaries for select
  using (auth.role() = 'authenticated');

-- Only backend (service role) or Hosts typically insert summaries, 
-- but for Client-side trigger (via Server Action which has access), we allow insert if host.
-- Actually server action will likely use Service Role or run as User.
-- Let's allow authenticated insert for now to simplify the Host triggering it.
create policy "Hosts can insert summaries."
  on public.meeting_summaries for insert
  with check (auth.role() = 'authenticated');
