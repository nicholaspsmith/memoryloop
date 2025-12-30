-- Add status column to flashcards table (017-multi-choice-distractors)
-- Valid values: 'draft', 'active'
-- Default: 'active' (makes migration backwards compatible - existing cards get 'active' status)

ALTER TABLE "flashcards" ADD COLUMN "status" varchar(20) DEFAULT 'active' NOT NULL;--> statement-breakpoint

-- Add index on status column for efficient filtering queries
CREATE INDEX IF NOT EXISTS "idx_flashcards_status" ON "flashcards" ("status");
