-- ============================================================
-- 003_oauth_user_init.sql
-- Auto-initialise a free subscription row for every new user
-- (including OAuth sign-ups where no explicit signup step runs).
-- ============================================================

-- Function: called by the trigger below on every new auth.users row
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.subscriptions (user_id, plan, status)
  VALUES (NEW.id, 'free', 'active')
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: fires after each INSERT into auth.users
-- (covers both email/password sign-up AND OAuth providers)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Add a unique constraint on user_id in subscriptions if not already present
-- (ON CONFLICT above requires a unique index)
ALTER TABLE public.subscriptions
  DROP CONSTRAINT IF EXISTS subscriptions_user_id_key;

ALTER TABLE public.subscriptions
  ADD CONSTRAINT subscriptions_user_id_key UNIQUE (user_id);
