-- ============================================================================
-- VALUO: SQUAD CREATION RLS POLICIES & RPC
-- Migration: 20261001000006_squad_creation_rls_and_rpc.sql
-- Date: 2026-10-01
-- Description:
-- 1. Fixes RLS policies on squad_members so squad creators can insert & manage
--    invited squad members.
-- 2. Provides create_squad_with_members RPC function for atomic, security-definer
--    squad creation with invited friends and notification triggering.
-- ============================================================================

-- 1. UPDATE squad_members RLS POLICIES
DROP POLICY IF EXISTS "Authenticated users can join squads" ON public.squad_members;
DROP POLICY IF EXISTS "Authenticated users can join or invite to squads" ON public.squad_members;

CREATE POLICY "Authenticated users can join or invite to squads"
    ON public.squad_members FOR INSERT TO authenticated
    WITH CHECK (
        auth.uid() = user_id 
        OR is_npc = true 
        OR public.is_admin()
        OR EXISTS (
            SELECT 1 FROM public.squads s 
            WHERE s.id = squad_members.squad_id 
            AND s.created_by = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Squad members, creators and admins can remove squad members" ON public.squad_members;
DROP POLICY IF EXISTS "Users can leave squads" ON public.squad_members;

CREATE POLICY "Squad members, creators and admins can remove squad members"
    ON public.squad_members FOR DELETE TO authenticated
    USING (
        auth.uid() = user_id 
        OR is_npc = true 
        OR public.is_admin()
        OR EXISTS (
            SELECT 1 FROM public.squads s 
            WHERE s.id = squad_members.squad_id 
            AND s.created_by = auth.uid()
        )
    );

-- 2. RPC: CREATE SQUAD WITH MEMBERS ATOMICALLY
CREATE OR REPLACE FUNCTION public.create_squad_with_members(
    p_name TEXT,
    p_code TEXT,
    p_invited_user_ids UUID[] DEFAULT '{}',
    p_fill_with_npc BOOLEAN DEFAULT false
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_squad_id UUID;
    v_squad RECORD;
    v_creator_name TEXT;
    v_friend_id UUID;
    v_member_count INT := 1;
    v_npc_names TEXT[] := ARRAY['Alexandre', 'Camille', 'Thomas', 'Léa', 'Maxime'];
    v_npc_avatars TEXT[] := ARRAY[
        'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
        'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
        'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150',
        'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150'
    ];
    v_npc_idx INT := 1;
BEGIN
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Non authentifié');
    END IF;

    SELECT name INTO v_creator_name FROM public.profiles WHERE id = v_user_id;

    -- Clean up prior squad memberships for creator
    DELETE FROM public.squad_members WHERE user_id = v_user_id;

    -- Create squad
    INSERT INTO public.squads (name, code, created_by, week_number, status)
    VALUES (p_name, p_code, v_user_id, 38, 'active')
    RETURNING * INTO v_squad;

    v_squad_id := v_squad.id;

    -- Insert creator as member
    INSERT INTO public.squad_members (squad_id, user_id, points, rank_change, is_npc)
    VALUES (v_squad_id, v_user_id, 0, 0, false);

    -- Clean up and insert invited friends
    IF p_invited_user_ids IS NOT NULL AND array_length(p_invited_user_ids, 1) > 0 THEN
        FOREACH v_friend_id IN ARRAY p_invited_user_ids LOOP
            IF v_friend_id IS NOT NULL AND v_friend_id != v_user_id THEN
                -- Remove from previous squad if any
                DELETE FROM public.squad_members WHERE user_id = v_friend_id;
                
                -- Insert into new squad
                INSERT INTO public.squad_members (squad_id, user_id, points, rank_change, is_npc)
                VALUES (v_squad_id, v_friend_id, 0, 0, false);

                v_member_count := v_member_count + 1;

                -- Direct notification to invited friend
                INSERT INTO public.notifications (user_id, type, title, message, target_tab, actor_id)
                VALUES (
                    v_friend_id,
                    'squad',
                    'Invitation en escouade',
                    COALESCE(v_creator_name, 'Un ami') || ' vous a ajouté à son escouade « ' || p_name || ' » !',
                    'group',
                    v_user_id
                );
            END IF;
        END LOOP;
    END IF;

    -- Fill with NPCs if requested and member count < 4
    IF p_fill_with_npc THEN
        WHILE v_member_count < 4 LOOP
            INSERT INTO public.squad_members (squad_id, user_id, npc_name, npc_avatar, points, rank_change, is_npc)
            VALUES (
                v_squad_id,
                NULL,
                v_npc_names[((v_npc_idx - 1) % array_length(v_npc_names, 1)) + 1],
                v_npc_avatars[((v_npc_idx - 1) % array_length(v_npc_avatars, 1)) + 1],
                0,
                0,
                true
            );
            v_member_count := v_member_count + 1;
            v_npc_idx := v_npc_idx + 1;
        END LOOP;
    END IF;

    RETURN jsonb_build_object('success', true, 'squad_id', v_squad_id, 'code', p_code);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.create_squad_with_members FROM public;
GRANT EXECUTE ON FUNCTION public.create_squad_with_members TO authenticated;
