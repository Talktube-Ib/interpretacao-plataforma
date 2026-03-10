-- Function to generate a unique username slug
CREATE OR REPLACE FUNCTION generate_unique_username(email_prefix TEXT) RETURNS TEXT AS $$
DECLARE
    new_username TEXT;
    counter INTEGER := 0;
BEGIN
    new_username := lower(email_prefix);
    -- Ensure it's alphanumeric/hyphen only
    new_username := regexp_replace(new_username, '[^a-z0-9]', '-', 'g');
    
    WHILE EXISTS (SELECT 1 FROM public.profiles WHERE username = new_username) LOOP
        counter := counter + 1;
        new_username := lower(email_prefix) || counter;
    END LOOP;
    
    RETURN new_username;
END;
$$ LANGUAGE plpgsql;

-- Trigger function to handle new users
CREATE OR REPLACE FUNCTION handle_new_user_username() RETURNS TRIGGER AS $$
BEGIN
    IF NEW.username IS NULL THEN
        NEW.username := generate_unique_username(split_part(NEW.email, '@', 1));
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger
DROP TRIGGER IF EXISTS on_auth_user_created_username ON public.profiles;
CREATE TRIGGER on_auth_user_created_username
    BEFORE INSERT OR UPDATE OF email ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION handle_new_user_username();

-- Backfill existing users
UPDATE public.profiles 
SET username = generate_unique_username(split_part(email, '@', 1))
WHERE username IS NULL;
