-- database/migrations/015_add_problem_serial_number.sql
-- ─────────────────────────────────────────────────────────────────────────────
-- Add permanent, stable, unique serial_number to problems table.
-- Numbers are sequence-backed and never change with filters, pagination, or sorting.
-- ─────────────────────────────────────────────────────────────────────────────

BEGIN;

-- 1. Create the sequence if not already present
CREATE SEQUENCE IF NOT EXISTS problems_serial_number_seq;

-- 2. Add column serial_number if it does not exist
ALTER TABLE problems ADD COLUMN IF NOT EXISTS serial_number INTEGER;

-- 3. Populate existing rows deterministically
-- Published problems are assigned 1..N based on created_at ASC, id ASC.
-- Non-published problems are assigned (N+1)..M.
WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (
    ORDER BY (CASE WHEN status = 'Published' THEN 0 ELSE 1 END), created_at ASC, id ASC
  ) as seq_num
  FROM problems
)
UPDATE problems p
SET serial_number = r.seq_num
FROM ranked r
WHERE p.id = r.id AND (p.serial_number IS NULL OR p.serial_number = 0);

-- 4. Set DEFAULT, NOT NULL, and sequence ownership
ALTER TABLE problems ALTER COLUMN serial_number SET DEFAULT nextval('problems_serial_number_seq');
ALTER TABLE problems ALTER COLUMN serial_number SET NOT NULL;
ALTER SEQUENCE problems_serial_number_seq OWNED BY problems.serial_number;

-- 5. Add unique constraint (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'problems_serial_number_unique'
  ) THEN
    ALTER TABLE problems ADD CONSTRAINT problems_serial_number_unique UNIQUE (serial_number);
  END IF;
END $$;

-- 6. Synchronize sequence with current maximum
SELECT setval(
  'problems_serial_number_seq',
  COALESCE((SELECT MAX(serial_number) FROM problems), 0)
);

COMMIT;
