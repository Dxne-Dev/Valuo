-- ============================================================================
-- Migration: mystery_items table + Realtime publication
-- Date: 2026-09-30
-- ============================================================================

-- 1. mystery_items: table simple admin-géré pour l'objet du jour dans le feed
CREATE TABLE IF NOT EXISTS public.mystery_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    image TEXT NOT NULL,
    brief TEXT NOT NULL DEFAULT '',
    hint TEXT NOT NULL DEFAULT '',
    real_price NUMERIC(10, 2) NOT NULL DEFAULT 0,
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.mystery_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Mystery items readable by everyone" ON public.mystery_items;
CREATE POLICY "Mystery items readable by everyone"
    ON public.mystery_items FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can manage mystery items" ON public.mystery_items;
CREATE POLICY "Admins can manage mystery items"
    ON public.mystery_items FOR ALL
    TO authenticated
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

DROP TRIGGER IF EXISTS update_mystery_items_modtime ON public.mystery_items;
CREATE TRIGGER update_mystery_items_modtime
    BEFORE UPDATE ON public.mystery_items
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 2. Realtime publications
ALTER PUBLICATION supabase_realtime ADD TABLE public.daily_challenges;
ALTER PUBLICATION supabase_realtime ADD TABLE public.feed_posts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.mystery_items;

-- 3. Ajouter 'remaining' sur daily_challenges si absent
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
