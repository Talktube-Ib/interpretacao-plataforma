-- Glossary Terms for Smart HUD feature
create table public.glossary_terms (
  id uuid default gen_random_uuid() primary key,
  meeting_id uuid references public.meetings(id) on delete cascade not null,
  term text not null,
  definition text,
  language text default 'pt-BR',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS for Glossary
alter table public.glossary_terms enable row level security;

-- Visible to everyone in the meeting (or just interpreters?)
-- Let's say authenticated users for now to keep it simple, or filter by meeting access
create policy "Glossary terms are viewable by authenticated users."
  on public.glossary_terms for select
  using (auth.role() = 'authenticated');

-- Admins and Hosts can manage terms
create policy "Hosts and Admins can manage glossary terms."
  on public.glossary_terms for all
  using (
    exists (
      select 1 from public.meetings
      where id = meeting_id
      and (host_id = auth.uid() or exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'))
    )
  );
