-- ============================================================================
-- VALUO: SQUAD JOINING RPC, EMAIL EXISTENCE CHECK & RLS POLICIES
-- File: supabase/migrations/20261001000003_squad_joining_rpc_and_email_check.sql
-- Date: 2026-10-01
-- ============================================================================

-- 1. Function: check_email_exists
-- Securely checks if an email is already registered in auth.users or profiles
CREATE OR REPLACE FUNCTION public.check_email_exists(p_email TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_clean_email TEXT := LOWER(TRIM(p_email));
BEGIN
    IF EXISTS (SELECT 1 FROM auth.users WHERE LOWER(email) = v_clean_email) THEN
        RETURN true;
    END IF;

    IF EXISTS (SELECT 1 FROM public.profiles WHERE LOWER(email) = v_clean_email) THEN
        RETURN true;
    END IF;

    RETURN false;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.check_email_exists(TEXT) FROM public;
GRANT EXECUTE ON FUNCTION public.check_email_exists(TEXT) TO anon, authenticated;

-- 2. Function: join_squad_by_code
-- Securely joins an existing squad by its code without RLS permission hurdles
CREATE OR REPLACE FUNCTION public.join_squad_by_code(p_code TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_squad_id UUID;
    v_squad_name TEXT;
    v_member_count INTEGER;
BEGIN
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Utilisateur non authentifié');
    END IF;

    -- Find squad
    SELECT id, name INTO v_squad_id, v_squad_name
    FROM public.squads
    WHERE UPPER(TRIM(code)) = UPPER(TRIM(p_code));

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Code d''escouade introuvable');
    END IF;

    -- Check if user is already a member
    IF EXISTS (SELECT 1 FROM public.squad_members WHERE squad_id = v_squad_id AND user_id = v_user_id) THEN
        RETURN jsonb_build_object('success', true, 'squad_id', v_squad_id, 'message', 'Déjà membre de cette escouade');
    END IF;

    -- Check member count (max 4)
    SELECT COUNT(*) INTO v_member_count
    FROM public.squad_members
    WHERE squad_id = v_squad_id;

    IF v_member_count >= 4 THEN
        RETURN jsonb_build_object('success', false, 'message', 'Cette escouade est déjà complète (4/4)');
    END IF;

    -- Remove user from any existing squad
    DELETE FROM public.squad_members WHERE user_id = v_user_id;

    -- Insert user into new squad
    INSERT INTO public.squad_members (
        squad_id,
        user_id,
        points,
        rank_change,
        is_npc
    ) VALUES (
        v_squad_id,
        v_user_id,
        0,
        0,
        false
    );

    RETURN jsonb_build_object(
        'success', true,
        'squad_id', v_squad_id,
        'squad_name', v_squad_name,
        'message', 'Escouade rejointe avec succès'
    );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.join_squad_by_code(TEXT) FROM public;
GRANT EXECUTE ON FUNCTION public.join_squad_by_code(TEXT) TO authenticated;

-- 3. Ensure RLS policies allow reading squads and squad members
ALTER TABLE public.squads ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Squads readable by all authenticated" ON public.squads;
CREATE POLICY "Squads readable by all authenticated"
    ON public.squads FOR SELECT TO authenticated USING (true);

ALTER TABLE public.squad_members ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Squad members readable by all authenticated" ON public.squad_members;
CREATE POLICY "Squad members readable by all authenticated"
    ON public.squad_members FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated users can join squads" ON public.squad_members;
CREATE POLICY "Authenticated users can join squads"
    ON public.squad_members FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id OR is_npc = true);

DROP POLICY IF EXISTS "Users can leave squads" ON public.squad_members;
CREATE POLICY "Users can leave squads"
    ON public.squad_members FOR DELETE TO authenticated
    USING (auth.uid() = user_id OR is_npc = true);

DROP POLICY IF EXISTS "Users can update own squad member entry" ON public.squad_members;
CREATE POLICY "Users can update own squad member entry"
    ON public.squad_members FOR UPDATE TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
