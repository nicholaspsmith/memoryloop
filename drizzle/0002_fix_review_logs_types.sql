-- Fix review_logs column types: integer -> real for FSRS decimal values
-- FSRS algorithm returns decimal values for stability, difficulty, and day counts

ALTER TABLE "review_logs" ALTER COLUMN "stability" TYPE real USING "stability"::real;
ALTER TABLE "review_logs" ALTER COLUMN "difficulty" TYPE real USING "difficulty"::real;
ALTER TABLE "review_logs" ALTER COLUMN "elapsed_days" TYPE real USING "elapsed_days"::real;
ALTER TABLE "review_logs" ALTER COLUMN "last_elapsed_days" TYPE real USING "last_elapsed_days"::real;
ALTER TABLE "review_logs" ALTER COLUMN "scheduled_days" TYPE real USING "scheduled_days"::real;
