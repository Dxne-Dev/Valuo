-- ============================================================================
-- VALUO: SQUAD LEADERSHIP SUCCESSION & REALTIME TRANSFER
-- File: supabase/migrations/20261001000004_squad_leadership_succession.sql
-- Date: 2026-10-01
-- ============================================================================

-- 1. Add pending_leader_id to squads table
ALTER TABLE public.squads
ADD COLUMN IF NOT EXISTS pending_leader_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_squads_pending_leader ON public.squads(pending_leader_id);

-- 2. Function: leave_squad_with_succession
-- Removes a member; if creator leaves, assigns next member as pending_leader_id
CREATE OR REPLACE FUNCTION public.leave_squad_with_succession(
    p_user_id UUID,
    p_squad_id UUID DEFAULT NULL,
    p_squad_code TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_squad_id UUID := p_squad_id;
    v_squad_code TEXT := p_squad_code;
    v_created_by UUID;
    v_remaining_count INTEGER;
    v_next_member_id UUID;
    v_next_member_name TEXT;
BEGIN
    -- Resolve squad ID if not passed
    IF v_squad_id IS NULL THEN
        SELECT sm.squad_id, s.code, s.created_by
        INTO v_squad_id, v_squad_code, v_created_by
        FROM public.squad_members sm
        JOIN public.squads s ON s.id = sm.squad_id
        WHERE sm.user_id = p_user_id
        LIMIT 1;
    ELSE
        SELECT code, created_by INTO v_squad_code, v_created_by
        FROM public.squads
        WHERE id = v_squad_id;
    END IF;

    IF v_squad_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Escouade introuvable');
    END IF;

    -- 1. Remove user from squad_members
    DELETE FROM public.squad_members
    WHERE squad_id = v_squad_id AND user_id = p_user_id;

    -- 2. Count remaining real members
    SELECT COUNT(*) INTO v_remaining_count
    FROM public.squad_members
    WHERE squad_id = v_squad_id AND is_npc = false;

    IF v_remaining_count = 0 THEN
        -- Delete empty squad and clean feed posts
        DELETE FROM public.squads WHERE id = v_squad_id;
        IF v_squad_code IS NOT NULL THEN
            DELETE FROM public.feed_posts WHERE caption ILIKE '%' || v_squad_code || '%';
        END IF;

        RETURN jsonb_build_object(
            'success', true,
            'remaining_count', 0,
            'squad_deleted', true,
            'message', 'Escouade dissoute car aucun membre restant.'
        );
    END IF;

    -- 3. If the user who left was the squad creator/leader, assign leadership to next real member
    IF v_created_by = p_user_id OR v_created_by IS NULL THEN
        SELECT sm.user_id, p.name
        INTO v_next_member_id, v_next_member_name
        FROM public.squad_members sm
        LEFT JOIN public.profiles p ON p.id = sm.user_id
        WHERE sm.squad_id = v_squad_id AND sm.is_npc = false
        ORDER BY sm.joined_at ASC
        LIMIT 1;

        IF v_next_member_id IS NOT NULL THEN
            UPDATE public.squads
            SET pending_leader_id = v_next_member_id
            WHERE id = v_squad_id;
        END IF;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'remaining_count', v_remaining_count,
        'pending_leader_id', v_next_member_id,
        'next_leader_name', v_next_member_name,
        'squad_id', v_squad_id
    );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.leave_squad_with_succession(UUID, UUID, TEXT) FROM public;
GRANT EXECUTE ON FUNCTION public.leave_squad_with_succession(UUID, UUID, TEXT) TO authenticated;

-- 3. Function: accept_squad_leadership
CREATE OR REPLACE FUNCTION public.accept_squad_leadership(p_squad_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_user_id UUID := auth.uid();
BEGIN
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Non authentifié');
    END IF;

    UPDATE public.squads
    SET created_by = v_user_id,
        pending_leader_id = NULL
    WHERE id = p_squad_id AND pending_leader_id = v_user_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Proposition de leadership expirée ou invalide');
    END IF;

    RETURN jsonb_build_object('success', true, 'squad_id', p_squad_id, 'message', 'Tu es désormais le chef d''escouade !');
END;
$$;

REVOKE EXECUTE ON FUNCTION public.accept_squad_leadership(UUID) FROM public;
GRANT EXECUTE ON FUNCTION public.accept_squad_leadership(UUID) TO authenticated;

-- 4. Function: refuse_squad_leadership
CREATE OR REPLACE FUNCTION public.refuse_squad_leadership(p_squad_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_user_id UUID := auth.uid();
BEGIN
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Non authentifié');
    END IF;

    -- User leaves squad and succession algorithm picks the next member
    RETURN public.leave_squad_with_succession(v_user_id, p_squad_id);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.refuse_squad_leadership(UUID) FROM public;
GRANT EXECUTE ON FUNCTION public.refuse_squad_leadership(UUID) TO authenticated;

-- 5. Enable Realtime Publications for instant UI synchronization
DO $$
BEGIN
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.squads;
    EXCEPTION WHEN duplicate_object THEN
        NULL;
    END;

    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.squad_members;
    EXCEPTION WHEN duplicate_object THEN
        NULL;
    END;
END $$;
