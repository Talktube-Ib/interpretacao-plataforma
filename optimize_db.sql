-- Optimization for Performance and Stability
-- 1. Ensure indexes for frequently queried columns in middleware and signaling
CREATE INDEX IF NOT EXISTS idx_profiles_id_status ON public.profiles(id, status);
CREATE INDEX IF NOT EXISTS idx_meetings_id_status ON public.meetings(id, status);
CREATE INDEX IF NOT EXISTS idx_room_events_meeting_id ON public.room_events(meeting_id);
CREATE INDEX IF NOT EXISTS idx_interpreter_assignments_meeting_id ON public.interpreter_assignments(meeting_id);

-- 2. Add a 'last_seen_at' to profiles to track user activity (helps debugging "falls")
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now());

-- 3. Increase resilience of triggers
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    new.id, 
    new.email, 
    new.raw_user_meta_data->>'full_name', 
    CASE 
      WHEN new.email = 'admin@talktube.com.br' THEN 'admin'
      ELSE coalesce(new.raw_user_meta_data->>'role', 'user')
    END
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
