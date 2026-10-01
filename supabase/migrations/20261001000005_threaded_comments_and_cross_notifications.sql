-- ============================================================================
-- Migration: 20261001000005_threaded_comments_and_cross_notifications.sql
-- Description:
--   1. Adds parent_id to post_comments for threaded comment replies.
--   2. Expands notifications types ('reply', 'squad', 'admin', 'system') & target_tab.
--   3. Automated database triggers for cross-notifications (like, comment, reply, friend, squad).
--   4. Realtime publication setup for notifications and post_comments.
-- ============================================================================

-- 1. ADD parent_id TO post_comments
ALTER TABLE public.post_comments 
ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES public.post_comments(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_post_comments_parent_id ON public.post_comments(parent_id);

-- 2. EXPAND NOTIFICATIONS CONSTRAINTS
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_target_tab_check;

ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check 
CHECK (type IN ('challenge', 'friend', 'like', 'comment', 'reply', 'mystery', 'squad', 'admin', 'system'));

ALTER TABLE public.notifications ADD CONSTRAINT notifications_target_tab_check 
CHECK (target_tab IN ('feed', 'game', 'group', 'profile', 'notifications', 'admin'));

-- 3. RLS ON NOTIFICATIONS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own notifications" ON public.notifications;
CREATE POLICY "Users can read own notifications"
    ON public.notifications FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
CREATE POLICY "Users can update own notifications"
    ON public.notifications FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Authenticated can insert notifications" ON public.notifications;
CREATE POLICY "Authenticated can insert notifications"
    ON public.notifications FOR INSERT
    TO authenticated
    WITH CHECK (true);

DROP POLICY IF EXISTS "Admins have full access on notifications" ON public.notifications;
CREATE POLICY "Admins have full access on notifications"
    ON public.notifications FOR ALL
    TO authenticated
    USING (public.is_admin());

-- 4. TRIGGER: POST LIKE NOTIFICATIONS
CREATE OR REPLACE FUNCTION public.handle_post_like_notification()
RETURNS TRIGGER AS $$
DECLARE
    v_post_author UUID;
    v_liker_name TEXT;
BEGIN
    SELECT user_id INTO v_post_author FROM public.feed_posts WHERE id = NEW.post_id;
    IF v_post_author IS NOT NULL AND v_post_author != NEW.user_id THEN
        SELECT name INTO v_liker_name FROM public.profiles WHERE id = NEW.user_id;
        INSERT INTO public.notifications (user_id, type, title, message, target_tab, target_post_id, actor_id)
        VALUES (
            v_post_author,
            'like',
            'Nouveau J''aime',
            COALESCE(v_liker_name, 'Un joueur') || ' a aimé votre publication.',
            'feed',
            NEW.post_id,
            NEW.user_id
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_post_like_notification ON public.post_likes;
CREATE TRIGGER trigger_post_like_notification
    AFTER INSERT ON public.post_likes
    FOR EACH ROW EXECUTE FUNCTION public.handle_post_like_notification();

-- 5. TRIGGER: POST COMMENT & THREADED REPLY NOTIFICATIONS
CREATE OR REPLACE FUNCTION public.handle_post_comment_notification()
RETURNS TRIGGER AS $$
DECLARE
    v_post_author UUID;
    v_parent_author UUID;
    v_commenter_name TEXT;
    v_snippet TEXT;
BEGIN
    SELECT name INTO v_commenter_name FROM public.profiles WHERE id = NEW.user_id;
    SELECT user_id INTO v_post_author FROM public.feed_posts WHERE id = NEW.post_id;
    
    v_snippet := LEFT(NEW.text, 60) || (CASE WHEN LENGTH(NEW.text) > 60 THEN '…' ELSE '' END);

    IF NEW.parent_id IS NOT NULL THEN
        SELECT user_id INTO v_parent_author FROM public.post_comments WHERE id = NEW.parent_id;
        
        -- 1. Notify author of parent comment
        IF v_parent_author IS NOT NULL AND v_parent_author != NEW.user_id THEN
            INSERT INTO public.notifications (user_id, type, title, message, target_tab, target_post_id, actor_id)
            VALUES (
                v_parent_author,
                'reply',
                'Réponse à votre commentaire',
                COALESCE(v_commenter_name, 'Un joueur') || ' a répondu : « ' || v_snippet || ' »',
                'feed',
                NEW.post_id,
                NEW.user_id
            );
        END IF;

        -- 2. Notify post author (if different from commenter and parent author)
        IF v_post_author IS NOT NULL AND v_post_author != NEW.user_id AND v_post_author != v_parent_author THEN
            INSERT INTO public.notifications (user_id, type, title, message, target_tab, target_post_id, actor_id)
            VALUES (
                v_post_author,
                'comment',
                'Nouveau commentaire',
                COALESCE(v_commenter_name, 'Un joueur') || ' a commenté votre publication : « ' || v_snippet || ' »',
                'feed',
                NEW.post_id,
                NEW.user_id
            );
        END IF;
    ELSE
        -- Top-level comment -> notify post author
        IF v_post_author IS NOT NULL AND v_post_author != NEW.user_id THEN
            INSERT INTO public.notifications (user_id, type, title, message, target_tab, target_post_id, actor_id)
            VALUES (
                v_post_author,
                'comment',
                'Nouveau commentaire',
                COALESCE(v_commenter_name, 'Un joueur') || ' a commenté votre publication : « ' || v_snippet || ' »',
                'feed',
                NEW.post_id,
                NEW.user_id
            );
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_post_comment_notification ON public.post_comments;
CREATE TRIGGER trigger_post_comment_notification
    AFTER INSERT ON public.post_comments
    FOR EACH ROW EXECUTE FUNCTION public.handle_post_comment_notification();

-- 6. TRIGGER: FRIENDSHIP NOTIFICATIONS
CREATE OR REPLACE FUNCTION public.handle_friendship_notification()
RETURNS TRIGGER AS $$
DECLARE
    v_actor_name TEXT;
BEGIN
    SELECT name INTO v_actor_name FROM public.profiles WHERE id = NEW.user_id;
    INSERT INTO public.notifications (user_id, type, title, message, target_tab, actor_id)
    VALUES (
        NEW.friend_id,
        'friend',
        'Nouveau coéquipier',
        COALESCE(v_actor_name, 'Un joueur') || ' vous a ajouté en ami.',
        'profile',
        NEW.user_id
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_friendship_notification ON public.friendships;
CREATE TRIGGER trigger_friendship_notification
    AFTER INSERT ON public.friendships
    FOR EACH ROW EXECUTE FUNCTION public.handle_friendship_notification();

-- 7. TRIGGER: SQUAD JOIN & COMPLETION NOTIFICATIONS
CREATE OR REPLACE FUNCTION public.handle_squad_member_notification()
RETURNS TRIGGER AS $$
DECLARE
    v_new_member_name TEXT;
    v_squad_name TEXT;
    v_member_count INT;
    r RECORD;
BEGIN
    IF NEW.is_npc THEN
        RETURN NEW;
    END IF;

    SELECT name INTO v_new_member_name FROM public.profiles WHERE id = NEW.user_id;
    SELECT name INTO v_squad_name FROM public.squads WHERE id = NEW.squad_id;
    SELECT COUNT(*) INTO v_member_count FROM public.squad_members WHERE squad_id = NEW.squad_id;

    -- Notify existing squad members
    FOR r IN SELECT user_id FROM public.squad_members WHERE squad_id = NEW.squad_id AND user_id != NEW.user_id AND user_id IS NOT NULL LOOP
        INSERT INTO public.notifications (user_id, type, title, message, target_tab, actor_id)
        VALUES (
            r.user_id,
            'squad',
            'Nouveau membre d''escouade',
            COALESCE(v_new_member_name, 'Un joueur') || ' a rejoint votre escouade « ' || COALESCE(v_squad_name, '') || ' » (' || v_member_count || '/4 joueurs).',
            'group',
            NEW.user_id
        );
    END LOOP;

    -- If squad reached 4 members, notify all 4 members
    IF v_member_count >= 4 THEN
        FOR r IN SELECT user_id FROM public.squad_members WHERE squad_id = NEW.squad_id AND user_id IS NOT NULL LOOP
            INSERT INTO public.notifications (user_id, type, title, message, target_tab)
            VALUES (
                r.user_id,
                'squad',
                '🔥 Escouade au complet !',
                'Votre escouade « ' || COALESCE(v_squad_name, '') || ' » compte désormais 4 membres. Préparez-vous pour les défis !',
                'group'
            );
        END LOOP;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_squad_member_notification ON public.squad_members;
CREATE TRIGGER trigger_squad_member_notification
    AFTER INSERT ON public.squad_members
    FOR EACH ROW EXECUTE FUNCTION public.handle_squad_member_notification();

-- 8. REALTIME REPLICATION FOR NOTIFICATIONS & TABLES
ALTER TABLE public.notifications REPLICA IDENTITY FULL;
ALTER TABLE public.post_comments REPLICA IDENTITY FULL;
ALTER TABLE public.post_likes REPLICA IDENTITY FULL;
ALTER TABLE public.feed_posts REPLICA IDENTITY FULL;
ALTER TABLE public.squad_members REPLICA IDENTITY FULL;
ALTER TABLE public.squads REPLICA IDENTITY FULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'notifications'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'post_comments'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.post_comments;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'post_likes'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.post_likes;
    END IF;
END $$;
