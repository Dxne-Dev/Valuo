-- ============================================================================
-- VALUO DATABASE SCHEMA & MIGRATION SCRIPT
-- Version: 1.0.0
-- Platform: Supabase (PostgreSQL 15+)
-- ============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Ensure permissions for Supabase roles (anon, authenticated, service_role)
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON ROUTINES TO anon, authenticated, service_role;

-- ============================================================================
-- 1. PROFILES (Extends Supabase auth.users)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    city TEXT DEFAULT 'France',
    bio TEXT DEFAULT '',
    avatar_url TEXT DEFAULT 'https://images.pexels.com/photos/14842170/pexels-photo-14842170.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=300&w=300',
    cover_url TEXT DEFAULT 'https://images.pexels.com/photos/8099796/pexels-photo-8099796.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=900&w=1400',
    member_since TEXT DEFAULT to_char(now(), 'TMMonth YYYY'),
    is_admin BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index on name for search/mentions
CREATE INDEX IF NOT EXISTS idx_profiles_name ON public.profiles(name);

-- ============================================================================
-- 2. DAILY CHALLENGES (Thèmes du jour pour le feed photo)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.daily_challenges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    theme TEXT NOT NULL,
    brief TEXT NOT NULL,
    date DATE NOT NULL UNIQUE DEFAULT CURRENT_DATE,
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_daily_challenges_date ON public.daily_challenges(date);

-- ============================================================================
-- 3. FEED POSTS (Publications photos du défi quotidien)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.feed_posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    challenge_id UUID REFERENCES public.daily_challenges(id) ON DELETE SET NULL,
    photo_url TEXT NOT NULL,
    caption TEXT DEFAULT '',
    city TEXT DEFAULT '',
    is_pinned BOOLEAN NOT NULL DEFAULT false,
    is_official BOOLEAN NOT NULL DEFAULT false,
    likes_count INTEGER NOT NULL DEFAULT 0,
    comments_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_feed_posts_user_id ON public.feed_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_feed_posts_created_at ON public.feed_posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feed_posts_pinned ON public.feed_posts(is_pinned);

-- ============================================================================
-- 4. POST LIKES & COMMENTS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.post_likes (
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    post_id UUID REFERENCES public.feed_posts(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, post_id)
);

CREATE TABLE IF NOT EXISTS public.post_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES public.feed_posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    text TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_post_comments_post_id ON public.post_comments(post_id);

-- ============================================================================
-- 5. FRIENDSHIPS (Réseau social & filtres du feed)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.friendships (
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    friend_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, friend_id),
    CONSTRAINT different_users CHECK (user_id != friend_id)
);

CREATE INDEX IF NOT EXISTS idx_friendships_user_id ON public.friendships(user_id);
CREATE INDEX IF NOT EXISTS idx_friendships_friend_id ON public.friendships(friend_id);

-- ============================================================================
-- 6. SQUADS / ESCOUADES (Groupes de 3-4 joueurs pour la Mystery Box)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.squads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    code VARCHAR(16) UNIQUE NOT NULL,
    week_number INTEGER NOT NULL DEFAULT 38,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'archived')),
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_squads_code ON public.squads(code);

-- ============================================================================
-- 7. SQUAD MEMBERS (Membres & PNJ de l'escouade)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.squad_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    squad_id UUID NOT NULL REFERENCES public.squads(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    npc_name TEXT,
    npc_avatar TEXT,
    is_npc BOOLEAN NOT NULL DEFAULT false,
    points INTEGER NOT NULL DEFAULT 0,
    rank_change INTEGER NOT NULL DEFAULT 0,
    current_estimate NUMERIC(10, 2),
    joined_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_squad_members_squad_id ON public.squad_members(squad_id);
CREATE INDEX IF NOT EXISTS idx_squad_members_user_id ON public.squad_members(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_squad_members_unique_user ON public.squad_members(squad_id, user_id) WHERE user_id IS NOT NULL;

-- ============================================================================
-- 8. MYSTERY BOXES (Objets mystères quotidiens & Juste Prix)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.mystery_boxes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    day_number INTEGER NOT NULL CHECK (day_number BETWEEN 1 AND 6),
    item_name TEXT NOT NULL,
    description TEXT NOT NULL,
    photo_url TEXT NOT NULL,
    real_price NUMERIC(10, 2) NOT NULL,
    history_details TEXT DEFAULT '',
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mystery_boxes_date ON public.mystery_boxes(date);

-- ============================================================================
-- 9. BOX ESTIMATES (Estimations soumises par les joueurs & calcul de points)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.box_estimates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mystery_box_id UUID NOT NULL REFERENCES public.mystery_boxes(id) ON DELETE CASCADE,
    squad_id UUID NOT NULL REFERENCES public.squads(id) ON DELETE CASCADE,
    squad_member_id UUID NOT NULL REFERENCES public.squad_members(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    estimated_price NUMERIC(10, 2) NOT NULL,
    points_earned INTEGER NOT NULL DEFAULT 0,
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (mystery_box_id, squad_member_id)
);

CREATE INDEX IF NOT EXISTS idx_box_estimates_box ON public.box_estimates(mystery_box_id);
CREATE INDEX IF NOT EXISTS idx_box_estimates_squad ON public.box_estimates(squad_id);

-- ============================================================================
-- 10. NOTIFICATIONS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('challenge', 'friend', 'like', 'comment', 'mystery')),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    target_tab TEXT NOT NULL DEFAULT 'feed' CHECK (target_tab IN ('feed', 'game', 'group', 'profile', 'notifications')),
    target_post_id UUID REFERENCES public.feed_posts(id) ON DELETE SET NULL,
    actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    read BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id, read);

-- ============================================================================
-- 11. DATABASE FUNCTIONS & TRIGGERS
-- ============================================================================

-- Function: Auto-create Profile on Auth Signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, name, avatar_url, city, is_admin)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1), 'Chasseur VALUO'),
        COALESCE(NEW.raw_user_meta_data->>'avatar_url', 'https://images.pexels.com/photos/14842170/pexels-photo-14842170.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=300&w=300'),
        COALESCE(NEW.raw_user_meta_data->>'city', 'Bordeaux'),
        COALESCE((NEW.raw_user_meta_data->>'is_admin')::boolean, (NEW.email = 'metierpro158@gmail.com'), false)
    )
    ON CONFLICT (id) DO UPDATE SET
        is_admin = COALESCE(EXCLUDED.is_admin, profiles.is_admin);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: On Auth User Created
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function: Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_profiles_modtime ON public.profiles;
CREATE TRIGGER update_profiles_modtime
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS update_squads_modtime ON public.squads;
CREATE TRIGGER update_squads_modtime
    BEFORE UPDATE ON public.squads
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Function: Sync Likes Count
CREATE OR REPLACE FUNCTION public.sync_post_likes()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        UPDATE public.feed_posts
        SET likes_count = likes_count + 1
        WHERE id = NEW.post_id;
    ELSIF (TG_OP = 'DELETE') THEN
        UPDATE public.feed_posts
        SET likes_count = GREATEST(0, likes_count - 1)
        WHERE id = OLD.post_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_sync_post_likes ON public.post_likes;
CREATE TRIGGER trigger_sync_post_likes
    AFTER INSERT OR DELETE ON public.post_likes
    FOR EACH ROW EXECUTE FUNCTION public.sync_post_likes();

-- Function: Sync Comments Count
CREATE OR REPLACE FUNCTION public.sync_post_comments()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        UPDATE public.feed_posts
        SET comments_count = comments_count + 1
        WHERE id = NEW.post_id;
    ELSIF (TG_OP = 'DELETE') THEN
        UPDATE public.feed_posts
        SET comments_count = GREATEST(0, comments_count - 1)
        WHERE id = OLD.post_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_sync_post_comments ON public.post_comments;
CREATE TRIGGER trigger_sync_post_comments
    AFTER INSERT OR DELETE ON public.post_comments
    FOR EACH ROW EXECUTE FUNCTION public.sync_post_comments();

-- ============================================================================
-- 12. ROW LEVEL SECURITY (RLS) POLICIES
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

-- Profiles
DROP POLICY IF EXISTS "Profiles are readable by everyone" ON public.profiles;
CREATE POLICY "Profiles are readable by everyone" ON public.profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Daily Challenges
DROP POLICY IF EXISTS "Daily challenges are readable by everyone" ON public.daily_challenges;
CREATE POLICY "Daily challenges are readable by everyone" ON public.daily_challenges FOR SELECT USING (true);

-- Feed Posts
DROP POLICY IF EXISTS "Feed posts are readable by everyone" ON public.feed_posts;
CREATE POLICY "Feed posts are readable by everyone" ON public.feed_posts FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated users can create feed posts" ON public.feed_posts;
CREATE POLICY "Authenticated users can create feed posts" ON public.feed_posts FOR INSERT WITH CHECK (auth.uid() = user_id OR is_official = true);

DROP POLICY IF EXISTS "Users can update own posts" ON public.feed_posts;
CREATE POLICY "Users can update own posts" ON public.feed_posts FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own posts" ON public.feed_posts;
CREATE POLICY "Users can delete own posts" ON public.feed_posts FOR DELETE USING (auth.uid() = user_id);

-- Post Likes
DROP POLICY IF EXISTS "Post likes readable by all" ON public.post_likes;
CREATE POLICY "Post likes readable by all" ON public.post_likes FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can insert own like" ON public.post_likes;
CREATE POLICY "Users can insert own like" ON public.post_likes FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own like" ON public.post_likes;
CREATE POLICY "Users can delete own like" ON public.post_likes FOR DELETE USING (auth.uid() = user_id);

-- Post Comments
DROP POLICY IF EXISTS "Post comments readable by all" ON public.post_comments;
CREATE POLICY "Post comments readable by all" ON public.post_comments FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can post comments" ON public.post_comments;
CREATE POLICY "Users can post comments" ON public.post_comments FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own comments" ON public.post_comments;
CREATE POLICY "Users can delete own comments" ON public.post_comments FOR DELETE USING (auth.uid() = user_id);

-- Friendships
DROP POLICY IF EXISTS "Users can view their friendships" ON public.friendships;
CREATE POLICY "Users can view their friendships" ON public.friendships FOR SELECT USING (auth.uid() = user_id OR auth.uid() = friend_id);

DROP POLICY IF EXISTS "Users can add friends" ON public.friendships;
CREATE POLICY "Users can add friends" ON public.friendships FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can remove friends" ON public.friendships;
CREATE POLICY "Users can remove friends" ON public.friendships FOR DELETE USING (auth.uid() = user_id);

-- Squads & Members
DROP POLICY IF EXISTS "Squads readable by all authenticated" ON public.squads;
CREATE POLICY "Squads readable by all authenticated" ON public.squads FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated users can create squads" ON public.squads;
CREATE POLICY "Authenticated users can create squads" ON public.squads FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Users can delete own squads" ON public.squads;
CREATE POLICY "Users can delete own squads" ON public.squads FOR DELETE TO authenticated USING (auth.uid() = created_by);

DROP POLICY IF EXISTS "Squad members readable by authenticated" ON public.squad_members;
CREATE POLICY "Squad members readable by authenticated" ON public.squad_members FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated users can join squads" ON public.squad_members;
CREATE POLICY "Authenticated users can join squads" ON public.squad_members FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id OR is_npc = true);

DROP POLICY IF EXISTS "Users can update their squad member stats" ON public.squad_members;
CREATE POLICY "Users can update their squad member stats" ON public.squad_members FOR UPDATE TO authenticated USING (auth.uid() = user_id OR is_npc = true);

DROP POLICY IF EXISTS "Users can leave squads" ON public.squad_members;
CREATE POLICY "Users can leave squads" ON public.squad_members FOR DELETE TO authenticated USING (auth.uid() = user_id OR is_npc = true);

-- Mystery Boxes & Estimates
DROP POLICY IF EXISTS "Mystery boxes readable by all" ON public.mystery_boxes;
CREATE POLICY "Mystery boxes readable by all" ON public.mystery_boxes FOR SELECT USING (true);

DROP POLICY IF EXISTS "Box estimates readable by squad members" ON public.box_estimates;
CREATE POLICY "Box estimates readable by squad members" ON public.box_estimates FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Users can submit box estimates" ON public.box_estimates;
CREATE POLICY "Users can submit box estimates" ON public.box_estimates FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- Notifications
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
CREATE POLICY "Users can view their own notifications" ON public.notifications FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;
CREATE POLICY "Users can update their own notifications" ON public.notifications FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own notifications" ON public.notifications;
CREATE POLICY "Users can delete their own notifications" ON public.notifications FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "System/Users can insert notifications" ON public.notifications;
CREATE POLICY "System/Users can insert notifications" ON public.notifications FOR INSERT WITH CHECK (true);

-- Storage Policies
DROP POLICY IF EXISTS "Public storage read for posts" ON storage.objects;
DROP POLICY IF EXISTS "Public storage read for avatars" ON storage.objects;
DROP POLICY IF EXISTS "Public storage read for mystery-boxes" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload posts" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload avatars" ON storage.objects;

-- ============================================================================
-- 13. STORAGE BUCKETS SETUP & POLICIES
-- ============================================================================
INSERT INTO storage.buckets (id, name, public)
VALUES 
    ('posts', 'posts', true),
    ('avatars', 'avatars', true),
    ('mystery-boxes', 'mystery-boxes', true)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS
CREATE POLICY "Public storage read for posts" ON storage.objects FOR SELECT USING (bucket_id = 'posts');
CREATE POLICY "Public storage read for avatars" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
CREATE POLICY "Public storage read for mystery-boxes" ON storage.objects FOR SELECT USING (bucket_id = 'mystery-boxes');

CREATE POLICY "Authenticated users can upload posts" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'posts');
CREATE POLICY "Authenticated users can upload avatars" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'avatars');

-- ============================================================================
-- 14. INITIAL SEED DATA
-- ============================================================================

-- Daily Challenge
INSERT INTO public.daily_challenges (theme, brief, date, active)
VALUES (
    'Une touche de rouge',
    'Photographie un objet rouge qui a déjà vécu. Un détail, une texture, une histoire — avant minuit.',
    CURRENT_DATE,
    true
)
ON CONFLICT (date) DO UPDATE SET theme = EXCLUDED.theme, brief = EXCLUDED.brief;

-- Mystery Box of the Day
INSERT INTO public.mystery_boxes (date, day_number, item_name, description, photo_url, real_price, history_details, active)
VALUES (
    CURRENT_DATE,
    4,
    'Lampe champignon design (1974)',
    'Édition vintage originale en verre d''Opaline soufflé et métal chromé poli. Parfait état de conservation.',
    'https://images.pexels.com/photos/11430230/pexels-photo-11430230.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=1400&w=1000',
    68.00,
    'Dénichée lors d''une succession à Saint-Ouen, attribuée à l''école scandinave des 70s.',
    true
)
ON CONFLICT DO NOTHING;
