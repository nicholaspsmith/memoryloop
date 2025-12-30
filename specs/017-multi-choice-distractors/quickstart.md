# Quickstart: Multi-Choice Study Mode with AI-Generated Distractors

**Feature**: 017-multi-choice-distractors
**Date**: 2025-12-29
**Updated**: 2025-12-29 (reflects spec clarifications for DB persistence)

## Overview

This feature enhances multiple choice study mode with:

1. **Persistent distractor storage** - AI generates 3 plausible wrong answers, stored in database
2. **Time-based rating** - Fast correct (≤10s) = Good, slow correct (>10s) = Hard
3. **Progressive generation** - Existing cards get distractors on first MC study
4. **Graceful fallback** - Falls back to flip-reveal if generation fails

## Key Files

| File                                      | Purpose                                       |
| ----------------------------------------- | --------------------------------------------- |
| `lib/db/drizzle-schema.ts`                | Distractors table definition                  |
| `lib/db/operations/distractors.ts`        | Distractor CRUD operations (NEW)              |
| `lib/ai/distractor-generator.ts`          | Core distractor generation + persistence      |
| `lib/claude/flashcard-generator.ts`       | Flashcard creation with distractor generation |
| `app/api/study/session/route.ts`          | Session start with distractor loading         |
| `components/study/MultipleChoiceMode.tsx` | UI component with timer                       |

## Quick Implementation Guide

### 1. Add Distractors Table (Migration)

```sql
-- drizzle/migrations/XXXX_add_distractors_table.sql
CREATE TABLE distractors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flashcard_id UUID NOT NULL REFERENCES flashcards(id) ON DELETE CASCADE,
  content VARCHAR(1000) NOT NULL,
  position INTEGER NOT NULL CHECK (position >= 0 AND position < 3),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(flashcard_id, position)
);

CREATE INDEX idx_distractors_flashcard_id ON distractors(flashcard_id);
```

### 2. Create Distractor CRUD Operations

```typescript
// lib/db/operations/distractors.ts
import { db } from '@/lib/db'
import { distractors } from '@/lib/db/drizzle-schema'
import { eq } from 'drizzle-orm'

export async function getDistractorsForFlashcard(flashcardId: string) {
  return db.select().from(distractors).where(eq(distractors.flashcardId, flashcardId))
}

export async function createDistractors(flashcardId: string, contents: string[]) {
  const rows = contents.map((content, position) => ({
    flashcardId,
    content,
    position,
  }))
  return db.insert(distractors).values(rows)
}
```

### 3. Enhance Distractor Generator with Persistence

```typescript
// lib/ai/distractor-generator.ts
export async function generateAndPersistDistractors(
  flashcardId: string,
  question: string,
  answer: string
): Promise<DistractorGenerationResult> {
  const result = await generateDistractors(question, answer)

  if (result.success && result.distractors) {
    await createDistractors(flashcardId, result.distractors)
  }

  return result
}
```

### 4. Load Distractors in Study Session

```typescript
// app/api/study/session/route.ts
// In card loading logic:
const flashcardsWithDistractors = await db
  .select()
  .from(flashcards)
  .leftJoin(distractors, eq(flashcards.id, distractors.flashcardId))
  .where(/* due cards filter */)

// For cards without distractors in MC mode:
for (const card of cardsNeedingDistractors) {
  await generateAndPersistDistractors(card.id, card.question, card.answer)
}
```

## Testing Checklist

### Unit Tests

- [ ] `distractor-generator.test.ts` - Generation logic, validation, error handling
- [ ] Mock Claude API responses

### Integration Tests

- [ ] `multi-choice-rating.test.ts` - Time-based rating calculation
- [ ] Fallback to flip-reveal mode

### E2E Tests

- [ ] `multi-choice-session.spec.ts` - Full study session with MC mode
- [ ] Verify FSRS updates correctly

## Common Issues

### Distractors Not Appearing

1. Check Claude API key is set (`ANTHROPIC_API_KEY`)
2. Check network tab for `/api/study/distractors` response
3. Verify response has exactly 3 distractors

### Wrong Rating Applied

1. Verify timer starts on question display, not component mount
2. Check `responseTimeMs` is passed to `onRate`
3. Verify server-side rating calculation in `/api/study/rate`

### Fallback Not Triggering

1. Check error handling in `fetchDistractors`
2. Verify `distractorsFailed` state is set
3. Ensure `MixedMode` routes to `FlashcardMode` on failure

## Success Criteria Verification

| Criterion                  | How to Verify                                               |
| -------------------------- | ----------------------------------------------------------- |
| SC-001: < 500ms display    | Distractors pre-loaded from DB; measure render time         |
| SC-002: 90%+ quality       | Manual review of generated distractors                      |
| SC-003: < 10min/20 cards   | Time a complete session                                     |
| SC-004: Correct FSRS       | Check `review_logs` table ratings (1/2/3)                   |
| SC-005: Immediate fallback | Query distractors table; missing → fallback                 |
| SC-006: Position variety   | Shuffle at display time (same distractors, different order) |
