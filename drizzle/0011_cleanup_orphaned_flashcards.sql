-- Migration 0011: Cleanup orphaned flashcards and add skill_node_id FK constraint
-- This migration handles the transition to skill-node-based flashcard generation
-- See: Orphaned flashcard cleanup task

-- IMPORTANT: This migration will DELETE orphaned flashcards
-- 8,527 flashcards with skill_node_id = NULL will be removed
-- These are legacy flashcards from message-based generation

-- Step 1: Log count of flashcards to be deleted
DO $$
DECLARE
  orphaned_count integer;
  dangling_count integer;
  total_count integer;
BEGIN
  SELECT COUNT(*) INTO orphaned_count FROM flashcards WHERE skill_node_id IS NULL;
  SELECT COUNT(*) INTO dangling_count 
    FROM flashcards f 
    WHERE f.skill_node_id IS NOT NULL 
      AND NOT EXISTS (SELECT 1 FROM skill_nodes sn WHERE sn.id = f.skill_node_id);
  SELECT COUNT(*) INTO total_count FROM flashcards;
  
  RAISE NOTICE 'Migration 0011: Flashcard cleanup starting';
  RAISE NOTICE 'Total flashcards: %', total_count;
  RAISE NOTICE 'Orphaned flashcards (NULL skill_node_id): %', orphaned_count;
  RAISE NOTICE 'Dangling references (invalid skill_node_id): %', dangling_count;
  RAISE NOTICE 'Flashcards to be deleted: %', orphaned_count + dangling_count;
END $$;

-- Step 2: Delete flashcards with invalid skill_node_id (dangling references)
DELETE FROM flashcards f
WHERE f.skill_node_id IS NOT NULL 
  AND NOT EXISTS (
    SELECT 1 FROM skill_nodes sn WHERE sn.id = f.skill_node_id
  );

-- Step 3: Delete orphaned flashcards (NULL skill_node_id)
DELETE FROM flashcards WHERE skill_node_id IS NULL;

-- Step 4: Add NOT NULL constraint to skill_node_id
-- This ensures all future flashcards must be linked to a skill node
ALTER TABLE flashcards 
  ALTER COLUMN skill_node_id SET NOT NULL;

-- Step 5: Add foreign key constraint with CASCADE delete
-- When a skill node is deleted, all its flashcards are also deleted
ALTER TABLE flashcards 
  ADD CONSTRAINT flashcards_skill_node_id_fkey 
  FOREIGN KEY (skill_node_id) 
  REFERENCES skill_nodes(id) 
  ON DELETE CASCADE;

-- Step 6: Create index on skill_node_id for query performance
CREATE INDEX IF NOT EXISTS flashcards_skill_node_id_idx 
  ON flashcards(skill_node_id);

-- Step 7: Log completion
DO $$
DECLARE
  remaining_count integer;
BEGIN
  SELECT COUNT(*) INTO remaining_count FROM flashcards;
  RAISE NOTICE 'Migration 0011: Cleanup complete';
  RAISE NOTICE 'Remaining flashcards: %', remaining_count;
END $$;
