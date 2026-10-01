-- ============================================================================
-- VALUO: PURGE DES DONNÉES DE TEST & REMISE À ZÉRO (CLEAN RESET)
-- Migration: 20261001000007_clean_test_data_and_reset.sql
-- Date: 2026-10-01
-- Description:
-- Supprime toutes les données de test accumulées durant les phases d'essais
-- (publications, likes, commentaires, amitiés, escouades, estimations, notifs),
-- tout en préservant le compte administrateur officiel (metierpro158@gmail.com).
-- ============================================================================

-- 1. PURGE DES NOTIFICATIONS DE TEST
DELETE FROM public.notifications;

-- 2. PURGE DES ESTIMATIONS DE MYSTERY BOX DE TEST
DELETE FROM public.box_estimates;

-- 3. PURGE DES COMMENTAIRES & LIKES DE TEST
DELETE FROM public.post_comments;
DELETE FROM public.post_likes;

-- 4. PURGE DES PUBLICATIONS DU FLUX DE TEST
DELETE FROM public.feed_posts;

-- 5. PURGE DES MEMBRES D'ESCOUADES & ESCOUADES DE TEST
DELETE FROM public.squad_members;
DELETE FROM public.squads;

-- 6. PURGE DES RELATIONS D'AMITIÉ DE TEST
DELETE FROM public.friendships;

-- 7. PURGE DES DÉFIS & MYSTERY BOXES DE TEST INITIALES (Facultatif - permet à l'admin de créer du contenu réel et frais)
-- DELETE FROM public.daily_challenges;
-- DELETE FROM public.mystery_boxes;

-- 8. NETTOYAGE DES PROFILS DE TEST (CONSERVE UNIQUEMENT L'ADMINISTRATEUR OFFICIEL)
-- Les profils dont l'email n'est pas metierpro158@gmail.com peuvent être purgés si vous le souhaitez :
-- DELETE FROM public.profiles WHERE id NOT IN (
--     SELECT id FROM auth.users WHERE LOWER(email) = 'metierpro158@gmail.com'
-- );
