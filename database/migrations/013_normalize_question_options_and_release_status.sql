-- ============================================================================
-- Migration 013: Normalize Question Bank Options and Release Results Status
-- ============================================================================

-- 1. Add results_released_at column to assessments if not exists
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'assessments' AND column_name = 'results_released_at'
    ) THEN
        ALTER TABLE assessments ADD COLUMN results_released_at TIMESTAMPTZ DEFAULT NULL;
    END IF;
END $$;

-- 2. Safely repair existing assessment_questions rows where options is an array of strings or missing id/text
UPDATE assessment_questions
SET 
  options = (
    SELECT jsonb_agg(
      jsonb_build_object(
        'id', chr(97 + (idx - 1)::int),
        'text', CASE 
                  WHEN jsonb_typeof(elem) = 'object' THEN COALESCE(elem->>'text', elem->>'value', elem::text)
                  ELSE elem #>> '{}'
                END
      )
    )
    FROM jsonb_array_elements(options) WITH ORDINALITY arr(elem, idx)
  ),
  correct_answer = CASE
    WHEN correct_answer IS NOT NULL AND jsonb_typeof(correct_answer) = 'string' THEN
      to_jsonb(LOWER(correct_answer #>> '{}'))
    ELSE correct_answer
  END,
  updated_at = NOW()
WHERE jsonb_typeof(options) = 'array'
  AND EXISTS (
    SELECT 1 FROM jsonb_array_elements(options) elem
    WHERE elem->>'id' IS NULL OR elem->>'text' IS NULL OR jsonb_typeof(elem) != 'object'
  );

-- 3. Also normalize any uppercase correct_answer for single_choice questions
UPDATE assessment_questions
SET
  correct_answer = to_jsonb(LOWER(correct_answer #>> '{}')),
  updated_at = NOW()
WHERE question_type IN ('single_choice', 'true_false')
  AND correct_answer IS NOT NULL
  AND jsonb_typeof(correct_answer) = 'string'
  AND (correct_answer #>> '{}') != LOWER(correct_answer #>> '{}');
