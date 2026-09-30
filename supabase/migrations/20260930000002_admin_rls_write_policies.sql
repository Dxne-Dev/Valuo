-- ============================================================================
-- Migration: RLS write policies for admin on daily_challenges and mystery_boxes
-- Date: 2026-09-30
-- Fix: Admin writes were silently rejected due to missing INSERT/UPDATE policies
-- ============================================================================

-- daily_challenges: allow admin to create and update challenges
DROP POLICY IF EXISTS "Admins can manage daily challenges" ON public.daily_challenges;
CREATE POLICY "Admins can manage daily challenges"
    ON public.daily_challenges FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.is_admin = true
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.is_admin = true
        )
    );

-- mystery_boxes: allow admin to create and update mystery items
DROP POLICY IF EXISTS "Admins can manage mystery boxes" ON public.mystery_boxes;
CREATE POLICY "Admins can manage mystery boxes"
    ON public.mystery_boxes FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.is_admin = true
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.is_admin = true
        )
    );

-- feed_posts: allow admin to delete any post (moderation)
DROP POLICY IF EXISTS "Admins can delete any post" ON public.feed_posts;
CREATE POLICY "Admins can delete any post"
    ON public.feed_posts FOR DELETE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.is_admin = true
        )
    );
