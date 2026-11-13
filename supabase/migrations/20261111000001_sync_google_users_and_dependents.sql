-- ==============================================================================
-- Adityam Niramayaa - Sync Google OAuth Users & Dependents Phone Migration
-- 1. Allow nullable phone for OAuth users
-- 2. Add email, clinical summary fields to public.users
-- 3. Add phone to public.dependents
-- 4. Backfill existing auth.users into public.users
-- 5. Auto-sync trigger on auth.users -> public.users
-- ==============================================================================

-- 1. Make phone nullable in public.users to support social / Google OAuth logins & remove hardcoded city default
ALTER TABLE public.users ALTER COLUMN phone DROP NOT NULL;
ALTER TABLE public.users ALTER COLUMN city DROP DEFAULT;
ALTER TABLE public.users ALTER COLUMN city SET DEFAULT '';

-- 2. Add email and clinical summary columns to public.users if they don't exist
DO $$ BEGIN
    ALTER TABLE public.users ADD COLUMN IF NOT EXISTS email VARCHAR(255);
    ALTER TABLE public.users ADD COLUMN IF NOT EXISTS blood_group VARCHAR(20);
    ALTER TABLE public.users ADD COLUMN IF NOT EXISTS emergency_contact VARCHAR(30);
    ALTER TABLE public.users ADD COLUMN IF NOT EXISTS allergies VARCHAR(255);
    ALTER TABLE public.users ADD COLUMN IF NOT EXISTS primary_doctor VARCHAR(255);
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- 3. Create unique index on email
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON public.users (email) WHERE email IS NOT NULL;

-- 4. Add phone to public.dependents table for family member independent login
DO $$ BEGIN
    ALTER TABLE public.dependents ADD COLUMN IF NOT EXISTS phone VARCHAR(20);
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
CREATE INDEX IF NOT EXISTS idx_dependents_phone ON public.dependents (phone);

-- 5. Backfill existing auth.users (such as Hardik Jain) into public.users
INSERT INTO public.users (id, email, phone, full_name, avatar_url, role, is_verified, created_at, updated_at)
SELECT 
    au.id,
    au.email,
    au.phone,
    COALESCE(au.raw_user_meta_data->>'full_name', au.raw_user_meta_data->>'name', split_part(COALESCE(au.email, 'User'), '@', 1)),
    au.raw_user_meta_data->>'avatar_url',
    'patient',
    (au.phone IS NOT NULL),
    COALESCE(au.created_at, NOW()),
    NOW()
FROM auth.users au
WHERE NOT EXISTS (
    SELECT 1 FROM public.users pu WHERE pu.id = au.id
)
ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, public.users.full_name),
    avatar_url = COALESCE(EXCLUDED.avatar_url, public.users.avatar_url),
    updated_at = NOW();

-- 6. Trigger to automatically sync any future auth.users signups into public.users
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.users (id, email, phone, full_name, avatar_url, role, is_verified, created_at, updated_at)
    VALUES (
        NEW.id,
        NEW.email,
        NEW.phone,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(COALESCE(NEW.email, 'User'), '@', 1)),
        NEW.raw_user_meta_data->>'avatar_url',
        'patient',
        (NEW.phone IS NOT NULL),
        COALESCE(NEW.created_at, NOW()),
        NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
        email = COALESCE(EXCLUDED.email, public.users.email),
        full_name = COALESCE(EXCLUDED.full_name, public.users.full_name),
        avatar_url = COALESCE(EXCLUDED.avatar_url, public.users.avatar_url),
        updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT OR UPDATE ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();

