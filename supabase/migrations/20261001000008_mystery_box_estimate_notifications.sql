-- ============================================================================
-- VALUO: NOTIFICATIONS AUTOMATIQUES LORS DES ESTIMATIONS DE MYSTERY BOX
-- Migration: 20261001000008_mystery_box_estimate_notifications.sql
-- Date: 2026-10-01
-- Description:
-- Déclenche une notification en temps réel pour tous les coéquipiers d'une
-- escouade dès qu'un membre soumet ou met à jour son estimation secrète :
-- "X a déjà soumis son estimation secrète pour la Mystery Box du jour ! À ton tour."
-- Et si toute l'escouade a estimé : notification collective de confirmation.
-- ============================================================================

-- 1. FONCTION TRIGGER : NOTIFICATIONS D'ESTIMATION D'ESCOUADE
CREATE OR REPLACE FUNCTION public.handle_box_estimate_notification()
RETURNS TRIGGER AS $$
DECLARE
    v_estimator_name TEXT;
    v_squad_name TEXT;
    v_total_squad_members INT;
    v_estimated_count INT;
    r RECORD;
BEGIN
    SELECT name INTO v_estimator_name FROM public.profiles WHERE id = NEW.user_id;
    SELECT name INTO v_squad_name FROM public.squads WHERE id = NEW.squad_id;

    -- 1. Notifier tous les autres membres réels de l'escouade
    FOR r IN 
        SELECT user_id 
        FROM public.squad_members 
        WHERE squad_id = NEW.squad_id 
          AND user_id != NEW.user_id 
          AND user_id IS NOT NULL 
    LOOP
        INSERT INTO public.notifications (user_id, type, title, message, target_tab, actor_id)
        VALUES (
            r.user_id,
            'mystery',
            '🎯 Estimation soumise',
            COALESCE(v_estimator_name, 'Un membre') || ' a déjà soumis son estimation pour la Mystery Box du jour ! À votre tour d''estimer.',
            'game',
            NEW.user_id
        );
    END LOOP;

    -- 2. Vérifier si toute l'escouade a soumis son estimation
    SELECT COUNT(*) INTO v_total_squad_members 
    FROM public.squad_members 
    WHERE squad_id = NEW.squad_id AND (user_id IS NOT NULL OR is_npc = true);

    SELECT COUNT(DISTINCT squad_member_id) INTO v_estimated_count 
    FROM public.box_estimates 
    WHERE squad_id = NEW.squad_id AND mystery_box_id = NEW.mystery_box_id;

    IF v_total_squad_members > 0 AND v_estimated_count >= v_total_squad_members THEN
        FOR r IN 
            SELECT user_id 
            FROM public.squad_members 
            WHERE squad_id = NEW.squad_id AND user_id IS NOT NULL 
        LOOP
            INSERT INTO public.notifications (user_id, type, title, message, target_tab)
            VALUES (
                r.user_id,
                'mystery',
                '🔥 Toute l''escouade a estimé !',
                'Tous les membres de votre escouade ont validé leur estimation. Rendez-vous à 20h00 pour la révélation du juste prix !',
                'game'
            );
        END LOOP;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. ATTACHEMENT DU TRIGGER SUR box_estimates
DROP TRIGGER IF EXISTS trigger_box_estimate_notification ON public.box_estimates;
CREATE TRIGGER trigger_box_estimate_notification
    AFTER INSERT OR UPDATE ON public.box_estimates
    FOR EACH ROW EXECUTE FUNCTION public.handle_box_estimate_notification();

-- 3. REPLICATION IDENTITY & REALTIME PUBLICATION
ALTER TABLE public.box_estimates REPLICA IDENTITY FULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'box_estimates'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.box_estimates;
    END IF;
END $$;
