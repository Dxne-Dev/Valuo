-- ============================================================================
-- VALUO MIGRATION: MYSTERY BOXES SCHEDULING (08H00-20H00), REVEAL & POINTS
-- File: supabase/migrations/20261001000002_mystery_boxes_scheduling_and_points.sql
-- Date: 2026-10-01
-- Scope: 08h00 - 20h00 lifecycle, multi-box scheduling (Days 1-6), 
--        auto-reveal & squad points calculation
-- ============================================================================

-- 1. Add scheduling and timestamp columns to mystery_boxes
ALTER TABLE public.mystery_boxes 
  ADD COLUMN IF NOT EXISTS starts_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS ends_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active' 
    CHECK (status IN ('draft', 'scheduled', 'active', 'revealed', 'completed', 'archived'));

-- 2. Populate starts_at and ends_at for existing rows (08h00 -> 20h00)
UPDATE public.mystery_boxes
SET 
  starts_at = COALESCE(starts_at, (date + time '08:00:00')::timestamptz, now()),
  ends_at = COALESCE(ends_at, (date + time '20:00:00')::timestamptz, now() + interval '12 hours'),
  status = COALESCE(status, CASE WHEN active = true THEN 'active' ELSE 'revealed' END)
WHERE ends_at IS NULL;

-- 3. Index for fast lookup of active & scheduled mystery boxes
CREATE INDEX IF NOT EXISTS idx_mystery_boxes_timeline 
  ON public.mystery_boxes (status, starts_at, ends_at, day_number);

-- 4. Points Calculation Function for Mystery Box
CREATE OR REPLACE FUNCTION public.calculate_mystery_box_points(p_box_id UUID)
RETURNS VOID AS $$
DECLARE
    v_real_price NUMERIC(10, 2);
    v_rec RECORD;
    v_diff NUMERIC(10, 2);
    v_pts INTEGER;
BEGIN
    SELECT real_price INTO v_real_price
    FROM public.mystery_boxes
    WHERE id = p_box_id;

    IF v_real_price IS NULL THEN
        RETURN;
    END IF;

    -- Calculate points for each estimate
    FOR v_rec IN 
        SELECT id, squad_id, squad_member_id, user_id, estimated_price
        FROM public.box_estimates
        WHERE mystery_box_id = p_box_id
    LOOP
        v_diff := ABS(v_rec.estimated_price - v_real_price);

        -- Formula: Proximity points
        IF v_diff = 0 THEN
            v_pts := 1000; -- Perfect match bonus!
        ELSIF v_diff <= (v_real_price * 0.05) THEN
            v_pts := 500;  -- Within 5%
        ELSIF v_diff <= (v_real_price * 0.15) THEN
            v_pts := 250;  -- Within 15%
        ELSIF v_diff <= (v_real_price * 0.30) THEN
            v_pts := 100;  -- Within 30%
        ELSE
            v_pts := 50;   -- Participation
        END IF;

        -- Update estimate points
        UPDATE public.box_estimates
        SET points_earned = v_pts
        WHERE id = v_rec.id;

        -- Sync with squad member points
        IF v_rec.squad_member_id IS NOT NULL THEN
            UPDATE public.squad_members
            SET points = points + v_pts
            WHERE id = v_rec.squad_member_id;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.calculate_mystery_box_points(UUID) TO authenticated, anon;
