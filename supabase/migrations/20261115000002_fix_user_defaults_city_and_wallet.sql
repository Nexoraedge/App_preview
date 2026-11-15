-- Fix new user defaults: remove hardcoded 'Delhi NCR' city and 2500.00 wallet_balance

ALTER TABLE public.users ALTER COLUMN city DROP DEFAULT;
ALTER TABLE public.users ALTER COLUMN city SET DEFAULT NULL;
ALTER TABLE public.users ALTER COLUMN wallet_balance SET DEFAULT 0.00;

-- Clean up any non-demo users that received the old schema defaults
UPDATE public.users
SET
  city = CASE WHEN city IN ('Delhi NCR', 'South Delhi NCR', 'Saket, South Delhi NCR') THEN NULL ELSE city END,
  wallet_balance = CASE WHEN wallet_balance = 2500.00 THEN 0.00 ELSE wallet_balance END
WHERE id <> '00000000-0000-0000-0000-000000000001';

-- Ensure auth.users signup trigger explicitly sets city = NULL and wallet_balance = 0.00
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (
    id, email, phone, full_name, avatar_url, city, wallet_balance, role, is_verified, created_at, updated_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    NEW.phone,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(COALESCE(NEW.email, 'User'), '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url',
    NULL,
    0.00,
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
