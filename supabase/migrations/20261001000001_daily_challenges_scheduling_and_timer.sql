-- ============================================================================
-- VALUO MIGRATION: DAILY CHALLENGES SCHEDULING & DYNAMIC TIMERS
-- File: supabase/migrations/20261001000001_daily_challenges_scheduling_and_timer.sql
-- Date: 2026-10-01
-- Scope: Multi-challenge scheduling, dynamic start/end timestamps, queue management
-- ============================================================================

-- 1. Add scheduling and timestamp columns to daily_challenges
ALTER TABLE public.daily_challenges 
  ADD COLUMN IF NOT EXISTS starts_at TIMESTAMPTZ DEFAULT now(),
  ADD COLUMN IF NOT EXISTS ends_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active' 
    CHECK (status IN ('draft', 'scheduled', 'active', 'completed', 'archived'));

-- 2. Drop the restrictive UNIQUE(date) constraint to allow scheduling multiple challenges
ALTER TABLE public.daily_challenges 
  DROP CONSTRAINT IF EXISTS daily_challenges_date_key;

-- 3. Populate starts_at and ends_at for existing rows
UPDATE public.daily_challenges
SET 
  starts_at = COALESCE(starts_at, created_at, now()),
  ends_at = COALESCE(ends_at, (date + interval '23 hours 59 minutes 59 seconds')::timestamptz, now() + interval '24 hours'),
  status = COALESCE(status, CASE WHEN active = true THEN 'active' ELSE 'completed' END)
WHERE ends_at IS NULL;

-- 4. Index for fast lookup of active & scheduled challenges
CREATE INDEX IF NOT EXISTS idx_daily_challenges_timeline 
  ON public.daily_challenges (status, starts_at, ends_at);

-- 5. Helper Function: Get or activate current active daily challenge
CREATE OR REPLACE FUNCTION public.get_current_active_challenge()
RETURNS SETOF public.daily_challenges AS $$
DECLARE
    curr_rec public.daily_challenges%ROWTYPE;
BEGIN
    -- 1. Check if there is already an active challenge whose end time hasn't passed
    SELECT * INTO curr_rec
    FROM public.daily_challenges
    WHERE status = 'active'
      AND (ends_at IS NULL OR ends_at > now())
      AND starts_at <= now()
    ORDER BY starts_at DESC
    LIMIT 1;

    -- 2. If an active challenge was found, return it
    IF curr_rec.id IS NOT NULL THEN
        RETURN NEXT curr_rec;
        RETURN;
    END IF;

    -- 3. If no active challenge (or it expired), mark expired active challenges as completed
    UPDATE public.daily_challenges
    SET status = 'completed', active = false
    WHERE status = 'active' AND ends_at <= now();

    -- 4. Check if there is a scheduled challenge ready to start
    SELECT * INTO curr_rec
    FROM public.daily_challenges
    WHERE (status = 'scheduled' OR status = 'active')
      AND starts_at <= now()
      AND (ends_at IS NULL OR ends_at > now())
    ORDER BY starts_at ASC
    LIMIT 1;

    -- 5. If found, activate it automatically
    IF curr_rec.id IS NOT NULL THEN
        UPDATE public.daily_challenges
        SET status = 'active', active = true
        WHERE id = curr_rec.id;

        curr_rec.status := 'active';
        curr_rec.active := true;
        RETURN NEXT curr_rec;
        RETURN;
    END IF;

    -- 6. Fallback to latest challenge if none active
    SELECT * INTO curr_rec
    FROM public.daily_challenges
    ORDER BY created_at DESC
    LIMIT 1;

    IF curr_rec.id IS NOT NULL THEN
        RETURN NEXT curr_rec;
    END IF;

    RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Grant execution rights
GRANT EXECUTE ON FUNCTION public.get_current_active_challenge() TO authenticated, anon;
