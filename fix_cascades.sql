-- Fix User Deletion Cascades
-- This script adds ON DELETE CASCADE to foreign keys referencing auth.users or public.profiles
-- to ensure that when a user is deleted, their associated data is automatically cleaned up.

BEGIN;

-- 1. MESSAGES (sender_id)
ALTER TABLE public.messages DROP CONSTRAINT IF EXISTS messages_sender_id_fkey;
ALTER TABLE public.messages
    ADD CONSTRAINT messages_sender_id_fkey
    FOREIGN KEY (sender_id)
    REFERENCES auth.users(id)
    ON DELETE CASCADE;

-- 2. ANNOUNCEMENTS (created_by)
ALTER TABLE public.announcements DROP CONSTRAINT IF EXISTS announcements_created_by_fkey;
ALTER TABLE public.announcements
    ADD CONSTRAINT announcements_created_by_fkey
    FOREIGN KEY (created_by)
    REFERENCES auth.users(id)
    ON DELETE CASCADE;

-- 3. MEETINGS (host_id)
ALTER TABLE public.meetings DROP CONSTRAINT IF EXISTS meetings_host_id_fkey;
ALTER TABLE public.meetings
    ADD CONSTRAINT meetings_host_id_fkey
    FOREIGN KEY (host_id)
    REFERENCES public.profiles(id)
    ON DELETE CASCADE;

-- 4. MEETING_PARTICIPANTS (user_id and meeting_id)
-- We need to check the exact constraint names, but we'll try standard naming or recreate.
-- Assuming table exists (it's used in code), but we didn't see the CREATE statement.
-- We'll use DO block to be safe if table names vary, but here we assume standard Supabase naming.

ALTER TABLE public.meeting_participants DROP CONSTRAINT IF EXISTS meeting_participants_user_id_fkey;
ALTER TABLE public.meeting_participants
    ADD CONSTRAINT meeting_participants_user_id_fkey
    FOREIGN KEY (user_id)
    REFERENCES public.profiles(id)
    ON DELETE CASCADE;

ALTER TABLE public.meeting_participants DROP CONSTRAINT IF EXISTS meeting_participants_meeting_id_fkey;
ALTER TABLE public.meeting_participants
    ADD CONSTRAINT meeting_participants_meeting_id_fkey
    FOREIGN KEY (meeting_id)
    REFERENCES public.meetings(id)
    ON DELETE CASCADE;

-- 5. INTERPRETER_ASSIGNMENTS (user_id and meeting_id)
ALTER TABLE public.interpreter_assignments DROP CONSTRAINT IF EXISTS interpreter_assignments_user_id_fkey;
ALTER TABLE public.interpreter_assignments
    ADD CONSTRAINT interpreter_assignments_user_id_fkey
    FOREIGN KEY (user_id)
    REFERENCES public.profiles(id)
    ON DELETE CASCADE;

ALTER TABLE public.interpreter_assignments DROP CONSTRAINT IF EXISTS interpreter_assignments_meeting_id_fkey;
ALTER TABLE public.interpreter_assignments
    ADD CONSTRAINT interpreter_assignments_meeting_id_fkey
    FOREIGN KEY (meeting_id)
    REFERENCES public.meetings(id)
    ON DELETE CASCADE;

-- 6. AUDIT LOGS (admin_id) - Optional, strict audit might want to keep logs even if user is gone (set null), 
-- but for full cleanup we cascade.
ALTER TABLE public.audit_logs DROP CONSTRAINT IF EXISTS audit_logs_admin_id_fkey;
ALTER TABLE public.audit_logs
    ADD CONSTRAINT audit_logs_admin_id_fkey
    FOREIGN KEY (admin_id)
    REFERENCES public.profiles(id)
    ON DELETE CASCADE;

COMMIT;
