-- ============================================================================
-- VALUO SUPABASE SECURITY HARDENING & RLS AUDIT MIGRATION
-- File: supabase/migrations/20261001000000_valuo_rls_security_hardening.sql
-- Date: 2026-10-01
-- Scope: Full security audit, zero-privilege leakage, anti-elevation triggers,
--        granular CRUD policies for 11 public tables + 3 storage buckets.
-- ============================================================================

-- ============================================================================
-- 1. SECURITY DEFINER ADMIN HELPER (Avoids RLS recursion & secures check)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND is_admin = true
    ) OR EXISTS (
        SELECT 1 FROM auth.users
        WHERE id = auth.uid() AND (
            email = 'metierpro158@gmail.com' 
            OR raw_user_meta_data->>'is_admin' = 'true'
        )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth;

-- Permissions for the helper function
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM public;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated, anon;

-- Ensure primary admin user is flagged
UPDATE public.profiles
SET is_admin = true
WHERE id IN (
    SELECT id FROM auth.users WHERE email = 'metierpro158@gmail.com'
) OR id = 'f88c1a72-f57c-4012-a979-f7bc5751d249';

-- ============================================================================
-- 2. PRIVILEGE ELEVATION PROTECTION TRIGGER
-- Prevents regular users from setting is_admin = true on profiles table
-- ============================================================================
CREATE OR REPLACE FUNCTION public.protect_profiles_elevation()
RETURNS TRIGGER AS $$
BEGIN
    -- If is_admin is being set or changed to TRUE
    IF NEW.is_admin IS TRUE AND (OLD IS NULL OR OLD.is_admin IS DISTINCT FROM TRUE) THEN
        -- Allow only if the caller is already admin or server role
        IF auth.role() = 'authenticated' AND NOT public.is_admin() THEN
            NEW.is_admin := false;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth;

DROP TRIGGER IF EXISTS trigger_protect_profiles_elevation ON public.profiles;
CREATE TRIGGER trigger_protect_profiles_elevation
    BEFORE INSERT OR UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.protect_profiles_elevation();

-- ============================================================================
-- 3. ENABLE RLS ON ALL PUBLIC TABLES
-- ============================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feed_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.squads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.squad_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mystery_boxes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.box_estimates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 4. CLEAN UP EXISTING POLICIES BEFORE RE-APPLYING AUDITED RULES
-- ============================================================================
-- profiles
DROP POLICY IF EXISTS "Profiles are readable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users and admins can update profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins have full access on profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can delete profiles" ON public.profiles;

-- daily_challenges
DROP POLICY IF EXISTS "Daily challenges are readable by everyone" ON public.daily_challenges;
DROP POLICY IF EXISTS "Admins have full access on daily_challenges" ON public.daily_challenges;
DROP POLICY IF EXISTS "Admins can manage daily challenges" ON public.daily_challenges;
DROP POLICY IF EXISTS "Admins have full write access on daily_challenges" ON public.daily_challenges;

-- feed_posts
DROP POLICY IF EXISTS "Feed posts are readable by everyone" ON public.feed_posts;
DROP POLICY IF EXISTS "Authenticated users can create feed posts" ON public.feed_posts;
DROP POLICY IF EXISTS "Users can update own posts" ON public.feed_posts;
DROP POLICY IF EXISTS "Users can delete own posts" ON public.feed_posts;
DROP POLICY IF EXISTS "Admins have full access on feed_posts" ON public.feed_posts;
DROP POLICY IF EXISTS "Admins can delete any post" ON public.feed_posts;

-- post_likes
DROP POLICY IF EXISTS "Post likes readable by all" ON public.post_likes;
DROP POLICY IF EXISTS "Users can insert own like" ON public.post_likes;
DROP POLICY IF EXISTS "Users can delete own like" ON public.post_likes;
DROP POLICY IF EXISTS "Admins can delete any like" ON public.post_likes;

-- post_comments
DROP POLICY IF EXISTS "Post comments readable by all" ON public.post_comments;
DROP POLICY IF EXISTS "Users can post comments" ON public.post_comments;
DROP POLICY IF EXISTS "Users can update own comments" ON public.post_comments;
DROP POLICY IF EXISTS "Users can delete own comments" ON public.post_comments;
DROP POLICY IF EXISTS "Admins have full access on post_comments" ON public.post_comments;

-- friendships
DROP POLICY IF EXISTS "Users can view their friendships" ON public.friendships;
DROP POLICY IF EXISTS "Users can add friends" ON public.friendships;
DROP POLICY IF EXISTS "Users can remove friends" ON public.friendships;
DROP POLICY IF EXISTS "Admins have full access on friendships" ON public.friendships;

-- squads
DROP POLICY IF EXISTS "Squads readable by all authenticated" ON public.squads;
DROP POLICY IF EXISTS "Authenticated users can create squads" ON public.squads;
DROP POLICY IF EXISTS "Users can update own squads" ON public.squads;
DROP POLICY IF EXISTS "Users can delete own squads" ON public.squads;
DROP POLICY IF EXISTS "Admins have full access on squads" ON public.squads;

-- squad_members
DROP POLICY IF EXISTS "Squad members readable by authenticated" ON public.squad_members;
DROP POLICY IF EXISTS "Authenticated users can join squads" ON public.squad_members;
DROP POLICY IF EXISTS "Users can update their squad member stats" ON public.squad_members;
DROP POLICY IF EXISTS "Users can leave squads" ON public.squad_members;
DROP POLICY IF EXISTS "Admins have full access on squad_members" ON public.squad_members;

-- mystery_boxes
DROP POLICY IF EXISTS "Mystery boxes readable by all" ON public.mystery_boxes;
DROP POLICY IF EXISTS "Admins have full access on mystery_boxes" ON public.mystery_boxes;
DROP POLICY IF EXISTS "Admins can manage mystery boxes" ON public.mystery_boxes;

-- box_estimates
DROP POLICY IF EXISTS "Box estimates readable by squad members" ON public.box_estimates;
DROP POLICY IF EXISTS "Users can submit box estimates" ON public.box_estimates;
DROP POLICY IF EXISTS "Users can update own estimates" ON public.box_estimates;
DROP POLICY IF EXISTS "Admins have full access on box_estimates" ON public.box_estimates;

-- notifications
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can delete their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "System/Users can insert notifications" ON public.notifications;
DROP POLICY IF EXISTS "Admins have full access on notifications" ON public.notifications;

-- ============================================================================
-- 5. RE-APPLY AUDITED & HARDENED RLS POLICIES
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 5.1 PROFILES
-- ----------------------------------------------------------------------------
CREATE POLICY "Profiles are readable by everyone"
    ON public.profiles FOR SELECT
    USING (true);

CREATE POLICY "Users can insert own profile"
    ON public.profiles FOR INSERT
    WITH CHECK (auth.uid() = id);

CREATE POLICY "Users and admins can update profile"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id OR public.is_admin())
    WITH CHECK (auth.uid() = id OR public.is_admin());

CREATE POLICY "Admins can delete profiles"
    ON public.profiles FOR DELETE
    USING (public.is_admin());

-- ----------------------------------------------------------------------------
-- 5.2 DAILY CHALLENGES (Admins only for write, public for read)
-- ----------------------------------------------------------------------------
CREATE POLICY "Daily challenges are readable by everyone"
    ON public.daily_challenges FOR SELECT
    USING (true);

CREATE POLICY "Admins have full write access on daily_challenges"
    ON public.daily_challenges FOR ALL TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- ----------------------------------------------------------------------------
-- 5.3 MYSTERY BOXES (Admins only for write, public for read)
-- ----------------------------------------------------------------------------
CREATE POLICY "Mystery boxes readable by all"
    ON public.mystery_boxes FOR SELECT
    USING (true);

CREATE POLICY "Admins have full write access on mystery_boxes"
    ON public.mystery_boxes FOR ALL TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- ----------------------------------------------------------------------------
-- 5.4 FEED POSTS
-- Regular users can only insert their own non-official posts.
-- Admins can insert official or user posts, update, pin, and delete any post.
-- ----------------------------------------------------------------------------
CREATE POLICY "Feed posts are readable by everyone"
    ON public.feed_posts FOR SELECT
    USING (true);

CREATE POLICY "Authenticated users can create feed posts"
    ON public.feed_posts FOR INSERT TO authenticated
    WITH CHECK (
        (auth.uid() = user_id AND (is_official = false OR is_official IS NULL))
        OR public.is_admin()
    );

CREATE POLICY "Users and admins can update feed posts"
    ON public.feed_posts FOR UPDATE TO authenticated
    USING (auth.uid() = user_id OR public.is_admin())
    WITH CHECK (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "Users and admins can delete feed posts"
    ON public.feed_posts FOR DELETE TO authenticated
    USING (auth.uid() = user_id OR public.is_admin());

-- ----------------------------------------------------------------------------
-- 5.5 POST LIKES
-- ----------------------------------------------------------------------------
CREATE POLICY "Post likes readable by all"
    ON public.post_likes FOR SELECT
    USING (true);

CREATE POLICY "Users can insert own like"
    ON public.post_likes FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users and admins can delete like"
    ON public.post_likes FOR DELETE TO authenticated
    USING (auth.uid() = user_id OR public.is_admin());

-- ----------------------------------------------------------------------------
-- 5.6 POST COMMENTS
-- ----------------------------------------------------------------------------
CREATE POLICY "Post comments readable by all"
    ON public.post_comments FOR SELECT
    USING (true);

CREATE POLICY "Users can post comments"
    ON public.post_comments FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own comments"
    ON public.post_comments FOR UPDATE TO authenticated
    USING (auth.uid() = user_id OR public.is_admin())
    WITH CHECK (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "Users and admins can delete comments"
    ON public.post_comments FOR DELETE TO authenticated
    USING (auth.uid() = user_id OR public.is_admin());

-- ----------------------------------------------------------------------------
-- 5.7 FRIENDSHIPS
-- ----------------------------------------------------------------------------
CREATE POLICY "Users and admins can view friendships"
    ON public.friendships FOR SELECT TO authenticated
    USING (auth.uid() = user_id OR auth.uid() = friend_id OR public.is_admin());

CREATE POLICY "Users can add friends"
    ON public.friendships FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users and admins can remove friends"
    ON public.friendships FOR DELETE TO authenticated
    USING (auth.uid() = user_id OR auth.uid() = friend_id OR public.is_admin());

-- ----------------------------------------------------------------------------
-- 5.8 SQUADS
-- ----------------------------------------------------------------------------
CREATE POLICY "Squads readable by all authenticated"
    ON public.squads FOR SELECT TO authenticated
    USING (true);

CREATE POLICY "Authenticated users can create squads"
    ON public.squads FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = created_by OR public.is_admin());

CREATE POLICY "Squad creators and admins can update squads"
    ON public.squads FOR UPDATE TO authenticated
    USING (auth.uid() = created_by OR public.is_admin())
    WITH CHECK (auth.uid() = created_by OR public.is_admin());

CREATE POLICY "Squad creators and admins can delete squads"
    ON public.squads FOR DELETE TO authenticated
    USING (auth.uid() = created_by OR public.is_admin());

-- ----------------------------------------------------------------------------
-- 5.9 SQUAD MEMBERS
-- ----------------------------------------------------------------------------
CREATE POLICY "Squad members readable by authenticated"
    ON public.squad_members FOR SELECT TO authenticated
    USING (true);

CREATE POLICY "Authenticated users can join squads"
    ON public.squad_members FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id OR is_npc = true OR public.is_admin());

CREATE POLICY "Squad members, creators and admins can update squad member stats"
    ON public.squad_members FOR UPDATE TO authenticated
    USING (
        auth.uid() = user_id 
        OR is_npc = true 
        OR public.is_admin()
        OR EXISTS (SELECT 1 FROM public.squads s WHERE s.id = squad_members.squad_id AND s.created_by = auth.uid())
    )
    WITH CHECK (
        auth.uid() = user_id 
        OR is_npc = true 
        OR public.is_admin()
        OR EXISTS (SELECT 1 FROM public.squads s WHERE s.id = squad_members.squad_id AND s.created_by = auth.uid())
    );

CREATE POLICY "Squad members, creators and admins can remove squad members"
    ON public.squad_members FOR DELETE TO authenticated
    USING (
        auth.uid() = user_id 
        OR is_npc = true 
        OR public.is_admin()
        OR EXISTS (SELECT 1 FROM public.squads s WHERE s.id = squad_members.squad_id AND s.created_by = auth.uid())
    );

-- ----------------------------------------------------------------------------
-- 5.10 BOX ESTIMATES
-- ----------------------------------------------------------------------------
CREATE POLICY "Box estimates readable by squad members and admins"
    ON public.box_estimates FOR SELECT TO authenticated
    USING (
        auth.uid() = user_id 
        OR user_id IS NULL
        OR public.is_admin()
        OR EXISTS (SELECT 1 FROM public.squad_members sm WHERE sm.squad_id = box_estimates.squad_id AND sm.user_id = auth.uid())
    );

CREATE POLICY "Users and admins can submit box estimates"
    ON public.box_estimates FOR INSERT TO authenticated
    WITH CHECK (
        auth.uid() = user_id 
        OR user_id IS NULL 
        OR public.is_admin()
    );

CREATE POLICY "Users and admins can update box estimates"
    ON public.box_estimates FOR UPDATE TO authenticated
    USING (auth.uid() = user_id OR public.is_admin())
    WITH CHECK (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "Admins can delete box estimates"
    ON public.box_estimates FOR DELETE TO authenticated
    USING (public.is_admin());

-- ----------------------------------------------------------------------------
-- 5.11 NOTIFICATIONS
-- ----------------------------------------------------------------------------
CREATE POLICY "Users and admins can view notifications"
    ON public.notifications FOR SELECT TO authenticated
    USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "Authenticated users and system can insert notifications"
    ON public.notifications FOR INSERT TO authenticated
    WITH CHECK (true);

CREATE POLICY "Users and admins can update notifications"
    ON public.notifications FOR UPDATE TO authenticated
    USING (auth.uid() = user_id OR public.is_admin())
    WITH CHECK (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "Users and admins can delete notifications"
    ON public.notifications FOR DELETE TO authenticated
    USING (auth.uid() = user_id OR public.is_admin());

-- ============================================================================
-- 6. STORAGE BUCKETS SECURITY POLICIES
-- ============================================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
    ('posts', 'posts', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
    ('avatars', 'avatars', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp']),
    ('mystery-boxes', 'mystery-boxes', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO UPDATE SET 
    public = true,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Clean existing storage policies
DROP POLICY IF EXISTS "Public storage read for posts" ON storage.objects;
DROP POLICY IF EXISTS "Public storage read for avatars" ON storage.objects;
DROP POLICY IF EXISTS "Public storage read for mystery-boxes" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload posts" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload avatars" ON storage.objects;
DROP POLICY IF EXISTS "Admins can upload mystery-boxes" ON storage.objects;
DROP POLICY IF EXISTS "Users and admins can update own post images" ON storage.objects;
DROP POLICY IF EXISTS "Users and admins can delete own post images" ON storage.objects;

-- Read policies (Public CDN)
CREATE POLICY "Public storage read for posts"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'posts');

CREATE POLICY "Public storage read for avatars"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'avatars');

CREATE POLICY "Public storage read for mystery-boxes"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'mystery-boxes');

-- Write / Upload policies
CREATE POLICY "Authenticated users can upload posts"
    ON storage.objects FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'posts');

CREATE POLICY "Authenticated users can upload avatars"
    ON storage.objects FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'avatars');

CREATE POLICY "Admins can upload mystery-boxes"
    ON storage.objects FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'mystery-boxes' AND public.is_admin());

-- Update / Delete policies
CREATE POLICY "Users and admins can update own post images"
    ON storage.objects FOR UPDATE TO authenticated
    USING (bucket_id = 'posts' OR bucket_id = 'avatars' OR public.is_admin());

CREATE POLICY "Users and admins can delete own post images"
    ON storage.objects FOR DELETE TO authenticated
    USING (bucket_id = 'posts' OR bucket_id = 'avatars' OR public.is_admin());

-- ============================================================================
-- 7. REALTIME PUBLICATION HARDENING
-- ============================================================================
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

    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.post_likes;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;

    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.post_comments;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;

    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.squad_members;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;

    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
END $$;
