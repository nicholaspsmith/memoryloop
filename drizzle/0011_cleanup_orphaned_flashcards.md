# Migration 0011: Cleanup Orphaned Flashcards

## Overview

This migration handles the cleanup of orphaned flashcards and establishes proper foreign key constraints between flashcards and skill nodes.

## Problem Statement

1. The `flashcards.skill_node_id` column had NO database FK constraint - only a Drizzle relation existed
2. [count varies by database] orphaned flashcards exist with `skill_node_id = NULL` (from old message-based generation)
3. When goals/skill trees/nodes are deleted, flashcards are NOT cascaded

## Changes

### Data Cleanup

- **Deletes flashcards with invalid skill_node_id** (dangling references to deleted skill nodes)
- **Deletes all orphaned flashcards** (skill_node_id IS NULL)

### Schema Changes

- **Makes skill_node_id NOT NULL** - all flashcards must belong to a skill node
- **Adds FK constraint** with CASCADE delete: `flashcards.skill_node_id → skill_nodes.id`
- **Adds index** on skill_node_id for query performance

## Impact

### Before Migration

```sql
-- Total flashcards: 9,504
-- Orphaned (skill_node_id IS NULL): [count varies by database] (89.7%)
-- Valid (linked to skill nodes): 977 (10.3%)
```

### After Migration

```sql
-- Total flashcards: ~977
-- All flashcards linked to skill nodes: 977 (100%)
-- Orphaned flashcards: 0
```

### Breaking Changes

- **[count varies by database] flashcards will be permanently deleted**
- All deleted flashcards are from the old message-based generation system
- This is a one-way migration - deleted data cannot be recovered

## Pre-Migration Checklist

- [ ] Backup production database
- [ ] Verify application no longer creates flashcards with NULL skill_node_id
- [ ] Review the list of flashcards to be deleted
- [ ] Test on staging environment first
- [ ] Notify users about potential data loss (if applicable)

## Running the Migration

### Option 1: Standard Migration (Recommended)

```bash
npm run db:migrate
```

### Option 2: Manual Execution (for testing)

```bash
psql $DATABASE_URL -f drizzle/0011_cleanup_orphaned_flashcards.sql
```

## Verification After Migration

```sql
-- Verify no orphaned flashcards remain
SELECT COUNT(*) FROM flashcards WHERE skill_node_id IS NULL;
-- Expected: 0

-- Verify FK constraint exists
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'flashcards'::regclass
  AND conname = 'flashcards_skill_node_id_fkey';
-- Expected: 1 row with CASCADE delete

-- Verify index exists
SELECT indexname
FROM pg_indexes
WHERE tablename = 'flashcards'
  AND indexname = 'flashcards_skill_node_id_idx';
-- Expected: 1 row

-- Verify all flashcards have valid skill_node_id
SELECT COUNT(*) as invalid_refs
FROM flashcards f
WHERE NOT EXISTS (
  SELECT 1 FROM skill_nodes sn WHERE sn.id = f.skill_node_id
);
-- Expected: 0

-- Check remaining flashcard count
SELECT COUNT(*) as total_flashcards FROM flashcards;
-- Expected: ~977
```

## Testing Cascade Delete

```sql
-- Create test data
INSERT INTO learning_goals (id, user_id, title)
VALUES ('test-goal-id', 'some-user-id', 'Test Goal');

INSERT INTO skill_trees (id, goal_id)
VALUES ('test-tree-id', 'test-goal-id');

INSERT INTO skill_nodes (id, tree_id, title, depth, path)
VALUES ('test-node-id', 'test-tree-id', 'Test Node', 1, '1');

INSERT INTO flashcards (user_id, question, answer, fsrs_state, skill_node_id)
VALUES ('some-user-id', 'Test?', 'Answer', '{}', 'test-node-id');

-- Verify flashcard exists
SELECT COUNT(*) FROM flashcards WHERE skill_node_id = 'test-node-id';
-- Expected: 1

-- Delete the skill node (should cascade to flashcard)
DELETE FROM skill_nodes WHERE id = 'test-node-id';

-- Verify flashcard was deleted via CASCADE
SELECT COUNT(*) FROM flashcards WHERE skill_node_id = 'test-node-id';
-- Expected: 0

-- Cleanup test data
DELETE FROM skill_trees WHERE id = 'test-tree-id';
DELETE FROM learning_goals WHERE id = 'test-goal-id';
```

## Rollback

**WARNING**: This migration is NOT reversible. Deleted flashcard data cannot be recovered.

If you need to rollback the schema changes (but not the data):

```sql
-- Remove FK constraint
ALTER TABLE flashcards
  DROP CONSTRAINT IF EXISTS flashcards_skill_node_id_fkey;

-- Remove NOT NULL constraint
ALTER TABLE flashcards
  ALTER COLUMN skill_node_id DROP NOT NULL;

-- Remove index
DROP INDEX IF EXISTS flashcards_skill_node_id_idx;
```

## Related Files

- Migration SQL: `/Users/nick/Code/memoryloop/drizzle/0011_cleanup_orphaned_flashcards.sql`
- Schema: `/Users/nick/Code/memoryloop/lib/db/drizzle-schema.ts`
- Drizzle config: `/Users/nick/Code/memoryloop/drizzle.config.ts`

## Support

If issues occur:

1. Check migration logs for NOTICE messages showing counts
2. Verify migration status: `SELECT * FROM __drizzle_migrations;`
3. Check constraint: `\d flashcards` in psql to see table structure
4. Do NOT attempt manual rollback without database backup
