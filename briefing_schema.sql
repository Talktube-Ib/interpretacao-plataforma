-- Briefing Documents Table
create table public.briefing_documents (
  id uuid default gen_random_uuid() primary key,
  meeting_id uuid references public.meetings(id) on delete cascade not null,
  name text not null,
  url text not null,
  type text, -- mime type
  check (type in ('application/pdf', 'image/jpeg', 'image/png', 'image/webp')),
  created_by uuid references auth.users(id) default auth.uid(),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS for Briefing Documents
alter table public.briefing_documents enable row level security;

-- Visible to authenticated users (participants/interpreters)
create policy "Briefing documents are viewable by authenticated users."
  on public.briefing_documents for select
  using (auth.role() = 'authenticated');

-- Only Host or Admin can Insert/Delete
create policy "Hosts and Admins can manage briefing documents."
  on public.briefing_documents for all
  using (
    exists (
      select 1 from public.meetings
      where id = meeting_id
      and (host_id = auth.uid() or exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'))
    )
  );

-- Storage Bucket Setup for Briefing Materials
insert into storage.buckets (id, name, public)
values ('briefing-materials', 'briefing-materials', true)
on conflict (id) do nothing;

-- RLS for Briefing Storage
-- Allow public read access (simplifies viewer) or authenticated
create policy "Briefing materials are publicly accessible."
  on storage.objects for select
  using ( bucket_id = 'briefing-materials' );

-- Allow authenticated users to upload (Should be restricted to hosts conceptually, but storage RLS is often simpler)
-- Let's restrict to authenticated for now.
create policy "Authenticated users can upload briefing materials."
  on storage.objects for insert
  with check ( bucket_id = 'briefing-materials' and auth.role() = 'authenticated' );
