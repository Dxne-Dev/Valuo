-- ============================================================================
-- Migration: drop mystery_items (doublon), activer Realtime sur mystery_boxes
-- Date: 2026-09-30
-- Architecture: mystery_boxes = source de vérité unique (feed + moteur de jeu)
-- ============================================================================

-- 1. Supprimer la table mystery_items créée par erreur (doublon de mystery_boxes)
DROP TABLE IF EXISTS public.mystery_items CASCADE;

-- 2. Activer Realtime sur les tables critiques
-- (idempotent : ne plante pas si déjà dans la publication)
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
        ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.post_comments;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.post_likes;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.squad_members;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
END $$;

-- 3. Ajouter 'remaining' sur daily_challenges si absente
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'daily_challenges'
        AND column_name = 'remaining'
    ) THEN
        ALTER TABLE public.daily_challenges ADD COLUMN remaining TEXT DEFAULT '6 h 24';
    END IF;
END $$;
