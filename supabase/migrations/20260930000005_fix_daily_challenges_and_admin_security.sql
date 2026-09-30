-- ============================================================================
-- Migration: Guarantee Admin Rights, Fix Daily Challenges RLS & Realtime
-- Date: 2026-09-30
-- ============================================================================

-- 1. Ensure the admin user profile is marked as is_admin = true
UPDATE public.profiles
SET is_admin = true
WHERE id IN (
    SELECT id FROM auth.users WHERE email = 'metierpro158@gmail.com'
) OR id = 'f88c1a72-f57c-4012-a979-f7bc5751d249';

-- 2. Create the bulletproof is_admin() SECURITY DEFINER function
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND is_admin = true
    ) OR EXISTS (
        SELECT 1 FROM auth.users
        WHERE id = auth.uid() AND (email = 'metierpro158@gmail.com' OR raw_user_meta_data->>'is_admin' = 'true')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth;

GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO anon;

-- 3. DAILY CHALLENGES RLS
ALTER TABLE public.daily_challenges ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Daily challenges are readable by everyone" ON public.daily_challenges;
DROP POLICY IF EXISTS "Admins have full access on daily_challenges" ON public.daily_challenges;
DROP POLICY IF EXISTS "Admins can manage daily challenges" ON public.daily_challenges;

-- Everyone (anonymous + authenticated users) can READ active challenges
CREATE POLICY "Daily challenges are readable by everyone"
    ON public.daily_challenges FOR SELECT
    USING (true);

-- Admins can INSERT, UPDATE, DELETE challenges
CREATE POLICY "Admins have full write access on daily_challenges"
    ON public.daily_challenges FOR ALL TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- 4. Ensure Realtime Publication includes daily_challenges and feed_posts
DO $$
BEGIN
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.daily_challenges;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;

    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.feed_posts;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;

    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.mystery_boxes;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
END $$;
