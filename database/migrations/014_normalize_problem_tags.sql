-- Migration 014: Normalize problem tags to canonical Title Case
UPDATE problems 
SET tags = (
  SELECT jsonb_agg(
    CASE 
      WHEN elem = 'backtracking' THEN 'Backtracking'
      WHEN elem = 'dfs' THEN 'Depth-first Search'
      WHEN elem = 'recursion' THEN 'Recursion'
      WHEN elem = 'matrix' THEN 'Matrix'
      WHEN elem = 'combinatorics' THEN 'Math'
      WHEN elem = 'linked-list' THEN 'Linked List'
      WHEN elem = 'pointers' THEN 'Two Pointers'
      WHEN elem = 'simulation' THEN 'Simulation'
      WHEN elem = 'Sort' THEN 'Sorting'
      ELSE elem
    END
  )
  FROM jsonb_array_elements_text(tags) elem
)
WHERE tags IS NOT NULL AND jsonb_array_length(tags) > 0;
