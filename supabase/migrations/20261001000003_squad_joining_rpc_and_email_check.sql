-- ============================================================================
-- VALUO SQUAD JOINING RPC & EMAIL UNIQUENESS CHECK
-- File: supabase/migrations/20261001000003_squad_joining_rpc_and_email_check.sql
-- Date: 2026-10-01
-- ============================================================================

-- 1. Function to check if an email already exists in auth.users or public.profiles
CREATE OR REPLACE FUNCTION public.check_email_exists(p_email TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_clean_email TEXT := LOWER(TRIM(p_email));
    v_exists BOOLEAN := FALSE;
BEGIN
    -- Check public.profiles
    SELECT EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE LOWER(TRIM(email)) = v_clean_email
    ) INTO v_exists;

    IF v_exists THEN
        RETURN TRUE;
    END IF;

    -- Check auth.users
    SELECT EXISTS (
        SELECT 1 FROM auth.users 
        WHERE LOWER(TRIM(email)) = v_clean_email
    ) INTO v_exists;

    RETURN v_exists;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.check_email_exists(TEXT) FROM public;
GRANT EXECUTE ON FUNCTION public.check_email_exists(TEXT) TO anon, authenticated, service_role;


-- 2. Secure RPC to join a squad by code (handles leaving previous squad and capacity check)
CREATE OR REPLACE FUNCTION public.join_squad_by_code(p_code TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_squad RECORD;
    v_member_count INTEGER;
    v_clean_code TEXT := UPPER(TRIM(p_code));
BEGIN
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Non authentifié');
    END IF;

    -- 1. Find squad
    SELECT id, name, code, created_by, status INTO v_squad
    FROM public.squads
    WHERE UPPER(TRIM(code)) = v_clean_code
    LIMIT 1;

    IF v_squad.id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Code d''escouade introuvable');
    END IF;

    -- 2. Check current member count
    SELECT COUNT(*) INTO v_member_count
    FROM public.squad_members
    WHERE squad_id = v_squad.id;

    -- If user is already in this squad
    IF EXISTS (
        SELECT 1 FROM public.squad_members 
        WHERE squad_id = v_squad.id AND user_id = v_user_id
    ) THEN
        RETURN jsonb_build_object(
            'success', true, 
            'message', 'Déjà membre de cette escouade',
            'squad_id', v_squad.id,
            'squad_name', v_squad.name,
            'squad_code', v_squad.code
        );
    END IF;

    -- Check maximum 4 members capacity
    IF v_member_count >= 4 THEN
        RETURN jsonb_build_object('success', false, 'message', 'Cette escouade est déjà complète (4/4)');
    END IF;

    -- 3. Leave any previous squad
    DELETE FROM public.squad_members
    WHERE user_id = v_user_id;

    -- 4. Insert into target squad
    INSERT INTO public.squad_members (
        squad_id,
        user_id,
        points,
        rank_change,
        is_npc
    ) VALUES (
        v_squad.id,
        v_user_id,
        0,
        0,
        false
    );

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Escouade rejointe avec succès',
        'squad_id', v_squad.id,
        'squad_name', v_squad.name,
        'squad_code', v_squad.code
    );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.join_squad_by_code(TEXT) FROM public;
GRANT EXECUTE ON FUNCTION public.join_squad_by_code(TEXT) TO authenticated, service_role;


-- 3. Ensure RLS policies allow SELECT on squads by code for all authenticated users
DROP POLICY IF EXISTS "Squads readable by all authenticated" ON public.squads;
CREATE POLICY "Squads readable by all authenticated"
    ON public.squads FOR SELECT TO authenticated
    USING (true);

DROP POLICY IF EXISTS "Squad members readable by all authenticated" ON public.squad_members;
CREATE POLICY "Squad members readable by all authenticated"
    ON public.squad_members FOR SELECT TO authenticated
    USING (true);
