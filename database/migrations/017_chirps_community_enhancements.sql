-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 017: Chirps Community Enhancements
-- Adds threaded replies, parent-child hierarchy, optional problem association,
-- indexes, and upvote count synchronization trigger.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Add parent_id to chirps for threaded discussions
ALTER TABLE chirps 
  ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES chirps(id) ON DELETE CASCADE;

-- 2. Make problem_id nullable so community chirps can be general discussions or problem-specific
ALTER TABLE chirps 
  ALTER COLUMN problem_id DROP NOT NULL;

-- 3. Optimize indexes for feeds, problem lookups, parent threads, and upvotes
CREATE INDEX IF NOT EXISTS idx_chirps_parent ON chirps(parent_id);

CREATE INDEX IF NOT EXISTS idx_chirps_user ON chirps(user_id);
CREATE INDEX IF NOT EXISTS idx_chirps_created_at ON chirps(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chirps_tag ON chirps(approach_tag);
CREATE INDEX IF NOT EXISTS idx_chirp_upvotes_chirp ON chirp_upvotes(chirp_id);

-- 4. Trigger for automatic atomic upvote_count synchronization on chirps
CREATE OR REPLACE FUNCTION sync_chirp_upvote_count()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    UPDATE chirps SET upvote_count = upvote_count + 1 WHERE id = NEW.chirp_id;
    RETURN NEW;
  ELSIF (TG_OP = 'DELETE') THEN
    UPDATE chirps SET upvote_count = GREATEST(0, upvote_count - 1) WHERE id = OLD.chirp_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_chirp_upvote_count ON chirp_upvotes;
CREATE TRIGGER trg_sync_chirp_upvote_count
AFTER INSERT OR DELETE ON chirp_upvotes
FOR EACH ROW EXECUTE FUNCTION sync_chirp_upvote_count();
