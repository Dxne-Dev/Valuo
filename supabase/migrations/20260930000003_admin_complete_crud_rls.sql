-- ============================================================================
-- Migration: Complete Admin CRUD RLS Policies for All Tables
-- Date: 2026-09-30
-- Grants full administrative CRUD access (SELECT, INSERT, UPDATE, DELETE)
-- to authenticated admin users on all application tables.
-- ============================================================================

-- 1. DAILY CHALLENGES
DROP POLICY IF EXISTS "Admins have full access on daily_challenges" ON public.daily_challenges;
CREATE POLICY "Admins have full access on daily_challenges"
    ON public.daily_challenges FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true))
    WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true));

-- 2. MYSTERY BOXES
DROP POLICY IF EXISTS "Admins have full access on mystery_boxes" ON public.mystery_boxes;
CREATE POLICY "Admins have full access on mystery_boxes"
    ON public.mystery_boxes FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true))
    WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true));

-- 3. FEED POSTS (Admin can create official posts, edit any post, pin/unpin, delete any post)
DROP POLICY IF EXISTS "Admins have full access on feed_posts" ON public.feed_posts;
CREATE POLICY "Admins have full access on feed_posts"
    ON public.feed_posts FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true))
    WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true));

-- 4. POST COMMENTS (Admin moderation)
DROP POLICY IF EXISTS "Admins have full access on post_comments" ON public.post_comments;
CREATE POLICY "Admins have full access on post_comments"
    ON public.post_comments FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true))
    WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true));

-- 5. SQUADS (Admin supervision & disbanding)
DROP POLICY IF EXISTS "Admins have full access on squads" ON public.squads;
CREATE POLICY "Admins have full access on squads"
    ON public.squads FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true))
    WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true));

-- 6. SQUAD MEMBERS (Admin supervision)
DROP POLICY IF EXISTS "Admins have full access on squad_members" ON public.squad_members;
CREATE POLICY "Admins have full access on squad_members"
    ON public.squad_members FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true))
    WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true));

-- 7. BOX ESTIMATES
DROP POLICY IF EXISTS "Admins have full access on box_estimates" ON public.box_estimates;
CREATE POLICY "Admins have full access on box_estimates"
    ON public.box_estimates FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true))
    WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true));

-- 8. NOTIFICATIONS (Broadcast / moderation)
DROP POLICY IF EXISTS "Admins have full access on notifications" ON public.notifications;
CREATE POLICY "Admins have full access on notifications"
    ON public.notifications FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true))
    WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true));

-- 9. PROFILES (Admin view & management)
DROP POLICY IF EXISTS "Admins have full access on profiles" ON public.profiles;
CREATE POLICY "Admins have full access on profiles"
    ON public.profiles FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true))
    WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true));
