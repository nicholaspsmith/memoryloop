# Data Model: Multi-Choice Study Mode with AI-Generated Distractors

**Feature**: 017-multi-choice-distractors
**Date**: 2025-12-29
**Updated**: 2025-12-29 (reflects spec clarifications for DB persistence)

## Overview

This feature adds a dedicated `distractors` table to persist AI-generated distractors for flashcards. Distractors are generated at flashcard creation time (or progressively for existing cards) and stored in PostgreSQL for efficient retrieval during study sessions.

## Entities

### New Entity: Distractor

```typescript
// lib/db/drizzle-schema.ts - distractors table (NEW)
{
  id: uuid,
  flashcardId: uuid,     // FK to flashcards.id, ON DELETE CASCADE
  content: varchar(1000), // The distractor text
  position: integer,      // 0, 1, or 2 (3 distractors per card)
  createdAt: timestamp
}

// Constraints:
// - UNIQUE(flashcard_id, position) - ensures exactly 3 distractors per card
// - CHECK(position >= 0 AND position < 3)
// - INDEX on flashcard_id for efficient joins
```

**SQL Migration**:

```sql
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

### Existing Entities (No Changes)

#### Flashcard

```typescript
// lib/db/drizzle-schema.ts - flashcards table
{
  id: uuid,
  userId: uuid,
  skillNodeId: uuid,
  question: text,
  answer: text,
  cardType: 'flashcard' | 'multiple_choice' | 'scenario',
  cardMetadata: jsonb,  // Legacy; distractors now in separate table
  fsrsState: jsonb,     // FSRS algorithm state
  createdAt: timestamp,
  updatedAt: timestamp
}
```

**Note**: `cardMetadata.distractors` may exist from legacy card creation. New implementation reads from `distractors` table.

#### ReviewLog

```typescript
// lib/db/drizzle-schema.ts - review_logs table
{
  id: uuid,
  flashcardId: uuid,
  userId: uuid,
  rating: integer,      // 1-4 (Again, Hard, Good, Easy)
  reviewedAt: timestamp,
  scheduledDays: decimal,
  elapsedDays: decimal,
  state: integer        // FSRS state (0=New, 1=Learning, 2=Review, 3=Relearning)
}
```

### Runtime Entities

#### Distractor Generation Result

```typescript
// lib/ai/distractor-generator.ts
interface DistractorGenerationResult {
  success: boolean
  distractors?: string[] // Exactly 3 plausible incorrect options
  error?: string
  generationTimeMs?: number
}
```

#### Study Card (Extended)

```typescript
// components/study/StudySessionProvider.tsx
interface StudyCard {
  id: string
  question: string
  answer: string
  cardType: 'flashcard' | 'multiple_choice'
  nodeId: string
  nodeTitle: string
  fsrsState: FSRSState

  // Loaded from distractors table (or generated progressively)
  distractors?: string[] // 3 distractors if available
  distractorsFailed?: boolean // Indicates fallback to flip-reveal needed
}
```

#### Multiple Choice Answer

```typescript
// components/study/MultipleChoiceMode.tsx
interface MultipleChoiceAnswer {
  selectedOption: string
  isCorrect: boolean
  responseTimeMs: number // Time from question display to selection
  rating: 1 | 2 | 3 // Again=1, Hard=2, Good=3
}
```

## State Transitions

### Card Rating Flow

```
Question Displayed
       │
       ▼ (timer starts)
   User Selects Option
       │
       ├─── Incorrect ──────────────────────► Rating = 1 (Again)
       │
       └─── Correct ─┬── responseTime ≤ 10s ─► Rating = 3 (Good)
                     │
                     └── responseTime > 10s ─► Rating = 2 (Hard)
```

### Distractor Loading Flow (Study Session)

```
Study Session Starts (MC Mode)
       │
       ▼
   Load Due Flashcards with JOIN distractors
       │
       ▼
   For each card without distractors:
       │
       ├─── Generate + Persist (API call)
       │        │
       │        ├─── Success ──────► Add to response
       │        │
       │        └─── Failure ──────► Mark for fallback
       │
       ▼
   Return StudyCard[] (distractors pre-loaded from DB)
       │
       ▼
   Display MC Question (500ms target, no API call)
```

### Distractor Creation Flow (Flashcard Creation)

```
Flashcard Created
       │
       ▼
   Generate Distractors (API call)
       │
       ├─── Success ──────► Insert into distractors table
       │
       └─── Failure ──────► Log warning, card saved without distractors
                           (progressive generation on first MC study)
```

## Validation Rules

### Distractor Quality (FR-003, FR-004)

1. Must return exactly 3 distractors
2. Each distractor must be non-empty string
3. No distractor should match correct answer (case-insensitive)
4. No duplicate distractors

```typescript
function validateDistractors(distractors: string[], correctAnswer: string): boolean {
  if (distractors.length !== 3) return false
  if (distractors.some((d) => !d.trim())) return false

  const normalizedAnswer = correctAnswer.toLowerCase().trim()
  const normalizedDistractors = distractors.map((d) => d.toLowerCase().trim())

  if (normalizedDistractors.includes(normalizedAnswer)) return false
  if (new Set(normalizedDistractors).size !== 3) return false

  return true
}
```

### Rating Validation (FR-007, FR-008)

```typescript
function calculateRating(isCorrect: boolean, responseTimeMs: number): 1 | 2 | 3 {
  if (!isCorrect) return 1 // Again

  const FAST_THRESHOLD_MS = 10_000 // 10 seconds
  return responseTimeMs <= FAST_THRESHOLD_MS ? 3 : 2 // Good or Hard
}
```

## Data Volume Assumptions

- **Cards per session**: 10-30 typical
- **Distractor generation**: 1-2 seconds per card (one-time at creation or first MC study)
- **Storage growth**: 3 distractor rows per flashcard (~3KB per flashcard)
- **API calls**: 1 per flashcard (at creation or progressive generation), not repeated

## Backward Compatibility

- Existing `cardMetadata.distractors` in database can be migrated to new table if desired (optional)
- Legacy cards get distractors generated progressively on first MC study
- No batch migration required - progressive approach handles existing cards
