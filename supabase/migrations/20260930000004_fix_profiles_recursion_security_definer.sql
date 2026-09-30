-- ============================================================================
-- Migration: Fix infinite recursion on profiles RLS with SECURITY DEFINER function
-- Date: 2026-09-30
-- Fix: Error 42P17 (infinite recursion detected in policy for relation "profiles")
-- ============================================================================

-- 1. Create a SECURITY DEFINER helper function that bypasses RLS safely
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND is_admin = true
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Grant execution to authenticated users
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO anon;

-- 2. FIX PROFILES POLICIES (Remove any recursive subqueries on profiles)
DROP POLICY IF EXISTS "Admins have full access on profiles" ON public.profiles;
DROP POLICY IF EXISTS "Profiles are readable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users and admins can update profile" ON public.profiles;

CREATE POLICY "Profiles are readable by everyone"
    ON public.profiles FOR SELECT
    USING (true);

CREATE POLICY "Users can insert own profile"
    ON public.profiles FOR INSERT
    WITH CHECK (auth.uid() = id);

CREATE POLICY "Users and admins can update profile"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id OR public.is_admin());

-- 3. RE-APPLY ALL ADMIN POLICIES USING THE CLEAN is_admin() FUNCTION

-- DAILY CHALLENGES
DROP POLICY IF EXISTS "Admins have full access on daily_challenges" ON public.daily_challenges;
DROP POLICY IF EXISTS "Admins can manage daily challenges" ON public.daily_challenges;
CREATE POLICY "Admins have full access on daily_challenges"
    ON public.daily_challenges FOR ALL TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- MYSTERY BOXES
DROP POLICY IF EXISTS "Admins have full access on mystery_boxes" ON public.mystery_boxes;
DROP POLICY IF EXISTS "Admins can manage mystery boxes" ON public.mystery_boxes;
CREATE POLICY "Admins have full access on mystery_boxes"
    ON public.mystery_boxes FOR ALL TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- FEED POSTS
DROP POLICY IF EXISTS "Admins have full access on feed_posts" ON public.feed_posts;
DROP POLICY IF EXISTS "Admins can delete any post" ON public.feed_posts;
CREATE POLICY "Admins have full access on feed_posts"
    ON public.feed_posts FOR ALL TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- POST COMMENTS
DROP POLICY IF EXISTS "Admins have full access on post_comments" ON public.post_comments;
CREATE POLICY "Admins have full access on post_comments"
    ON public.post_comments FOR ALL TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- SQUADS
DROP POLICY IF EXISTS "Admins have full access on squads" ON public.squads;
CREATE POLICY "Admins have full access on squads"
    ON public.squads FOR ALL TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- SQUAD MEMBERS
DROP POLICY IF EXISTS "Admins have full access on squad_members" ON public.squad_members;
CREATE POLICY "Admins have full access on squad_members"
    ON public.squad_members FOR ALL TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- BOX ESTIMATES
DROP POLICY IF EXISTS "Admins have full access on box_estimates" ON public.box_estimates;
CREATE POLICY "Admins have full access on box_estimates"
    ON public.box_estimates FOR ALL TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- NOTIFICATIONS
DROP POLICY IF EXISTS "Admins have full access on notifications" ON public.notifications;
CREATE POLICY "Admins have full access on notifications"
    ON public.notifications FOR ALL TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());
