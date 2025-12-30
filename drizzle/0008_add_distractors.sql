-- Create distractors table for multiple-choice flashcard distractors (017-multi-choice-distractors)
-- Each flashcard can have up to 3 distractors (position 0, 1, 2)

CREATE TABLE IF NOT EXISTS "distractors" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"flashcard_id" uuid NOT NULL,
	"content" varchar(1000) NOT NULL,
	"position" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "distractors_position_check" CHECK ("position" >= 0 AND "position" <= 2)
);
--> statement-breakpoint

-- Add foreign key constraint with cascade delete
ALTER TABLE "distractors" ADD CONSTRAINT "distractors_flashcard_id_flashcards_id_fk" FOREIGN KEY ("flashcard_id") REFERENCES "flashcards"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint

-- Create unique index to ensure one distractor per position per flashcard
CREATE UNIQUE INDEX IF NOT EXISTS "distractors_flashcard_position_idx" ON "distractors" ("flashcard_id","position");--> statement-breakpoint

-- Create index for efficient flashcard lookup
CREATE INDEX IF NOT EXISTS "distractors_flashcard_id_idx" ON "distractors" ("flashcard_id");
