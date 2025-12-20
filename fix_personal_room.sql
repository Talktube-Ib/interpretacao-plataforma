-- 1. Create missing 'settings' column in meetings
ALTER TABLE public.meetings 
ADD COLUMN IF NOT EXISTS settings jsonb default '{}'::jsonb;

-- 2. Add column to profiles if not exists
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS personal_meeting_id uuid;

-- 3. Function to Handle New User creation (Updated)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    p_meeting_id uuid;
BEGIN
    -- Create the personal meeting first
    INSERT INTO public.meetings (host_id, title, status, settings)
    VALUES (NEW.id, 'Sala Pessoal', 'active', '{"is_personal": true}'::jsonb)
    RETURNING id INTO p_meeting_id;

    -- Create the profile with the meeting ID
    INSERT INTO public.profiles (id, email, full_name, role, personal_meeting_id)
    VALUES (
        NEW.id, 
        NEW.email, 
        NEW.raw_user_meta_data->>'full_name', 
        COALESCE(NEW.raw_user_meta_data->>'role', 'participant'),
        p_meeting_id
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. BACKFILL for Existing Users (Run once)
DO $$
DECLARE
    r RECORD;
    m_id uuid;
BEGIN
    FOR r IN SELECT * FROM public.profiles WHERE personal_meeting_id IS NULL LOOP
        -- Create meeting
        INSERT INTO public.meetings (host_id, title, status, settings)
        VALUES (r.id, 'Sala Pessoal de ' || COALESCE(r.full_name, r.email), 'active', '{"is_personal": true}'::jsonb)
        RETURNING id INTO m_id;

        -- Update profile
        UPDATE public.profiles SET personal_meeting_id = m_id WHERE id = r.id;
    END LOOP;
END $$;
