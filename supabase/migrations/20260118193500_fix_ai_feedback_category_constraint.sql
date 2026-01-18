-- Fix category constraint to match app + edge function values

ALTER TABLE public.ai_feedback
  DROP CONSTRAINT IF EXISTS ai_feedback_category_check;

ALTER TABLE public.ai_feedback
  ADD CONSTRAINT ai_feedback_category_check
  CHECK (
    category IS NULL
    OR category IN (
      'performance',
      'focus',
      'engagement',
      'suggestion',
      'progress',
      'improvement',
      'achievement'
    )
  );
