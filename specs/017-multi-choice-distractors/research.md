# Research: Multi-Choice Study Mode with AI-Generated Distractors

**Feature**: 017-multi-choice-distractors
**Date**: 2025-12-29
**Updated**: 2025-12-29 (reflects spec clarifications for DB persistence)

## Research Topics

### 1. Distractor Storage Architecture

**Decision**: Create a dedicated `distractors` table and persist distractors at flashcard creation time

**Rationale**:

- Spec clarification: "Generating distractors is expensive" → persist to avoid repeated generation
- Enables efficient queries (find cards without distractors for progressive generation)
- Supports future features (regenerate distractors, track generation metadata)
- Cleaner data model with proper foreign key relationships
- Better database normalization

**Alternatives Considered**:
| Alternative | Why Rejected |
|-------------|--------------|
| On-demand generation each session | Spec clarification explicitly chose persistence due to expense |
| JSONB in cardMetadata | No efficient way to query cards missing distractors; no separate lifecycle |
| Embed distractors as array column | Inflexible schema, harder to add generation metadata |

**Database Schema**:

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

### 2. Distractor Generation Trigger Points

**Decision**: Generate distractors at two points:

1. **Flashcard creation** - Immediately after flashcard is created
2. **Progressive generation** - On first MC study for existing cards without distractors

**Rationale**:

- Creation-time generation ensures distractors are ready when user studies
- Progressive generation handles existing flashcards without requiring migration
- Avoids expensive batch processing during deployment
- Spreads API load over time

**Alternatives Considered**:
| Alternative | Why Rejected |
|-------------|--------------|
| Batch migration | Expensive, slow, blocks deployment; API rate limits could cause failures |
| On-demand only | Spec clarification explicitly chose persistence due to expense |

### 3. Response Time Thresholds for FSRS Rating

**Decision**: Use 10-second threshold to distinguish "fast" vs "slow" correct answers

**Rationale**:

- Average reading + decision time for multiple choice is 5-8 seconds
- 10 seconds provides buffer for complex questions
- Aligns with common quiz application standards
- Simple single threshold avoids over-engineering

**Rating Mapping**:
| Response | Time | FSRS Rating |
|----------|------|-------------|
| Incorrect | Any | 1 (Again) |
| Correct | ≤ 10s | 3 (Good) |
| Correct | > 10s | 2 (Hard) |

**Alternatives Considered**:
| Alternative | Why Rejected |
|-------------|--------------|
| Per-question adaptive threshold | Over-engineering; no data to calibrate |
| Three-tier (Easy/Good/Hard) | User doesn't select Easy in MC mode |
| No time-based rating | Violates FR-007 clarification |

**Implementation Location**:

- Timer starts in `MultipleChoiceMode.tsx` on question display
- Timer stops on answer selection
- Rating logic in `app/api/study/rate/route.ts` or component

### 5. Study Session Flow Changes

**Decision**: Load distractors from DB at session start; progressive generation during session if missing

**Rationale**:

- Pre-loading from DB enables 500ms target (no API call during question display)
- Progressive generation handles legacy cards seamlessly
- Loading indicator only shown for first-time generation

**Flow**:

```
Session Start → Load due flashcards
             → JOIN distractors table
             → For cards without distractors:
                 → If MC mode: generate + persist + return
                 → If flashcard mode: skip distractors
             → Return StudyCard[] with distractors
```

**Alternatives Considered**:
| Alternative | Why Rejected |
|-------------|--------------|
| Generate fresh each session | Spec clarification: expensive, must persist |
| Batch all at session start | High latency for existing cards needing generation |

### 4. Fallback Strategy

**Decision**: Fall back to flip-reveal mode with visual indication

**Rationale**:

- User should never be blocked from studying
- Flip-reveal mode already exists (`FlashcardMode.tsx`)
- Clear indication prevents confusion
- Silent fallback maintains session flow

**Fallback Triggers**:

1. Claude API error (timeout, rate limit, service unavailable)
2. Invalid response format (malformed JSON, wrong distractor count)
3. Distractors too similar to correct answer (optional quality check)

**User Experience**:

- Show toast: "Showing as flashcard (distractors unavailable)"
- Render `FlashcardMode` instead of `MultipleChoiceMode`
- Continue with standard 1-4 rating buttons

**Implementation Location**:

- Try/catch in `distractor-generator.ts`
- Fallback routing in `StudySessionProvider.tsx` or `MixedMode.tsx`

### 5. Claude API Configuration

**Decision**: Use existing Claude client with adjusted parameters

**Current Configuration** (`lib/claude/client.ts`):

- Model: `claude-3-5-sonnet-20241022`
- Max tokens: 4096 (excessive for 3 distractors)

**Recommended for Distractor Generation**:

- Model: Same (quality important for plausibility)
- Max tokens: 256 (sufficient for JSON response)
- Temperature: 0.8-1.0 (variety in responses)
- Timeout: 5 seconds (fail fast for fallback)

### 7. Existing Code Integration Points

**Key Files to Modify**:

| File                                      | Change                                                |
| ----------------------------------------- | ----------------------------------------------------- |
| `lib/db/drizzle-schema.ts`                | Add `distractors` table definition                    |
| `lib/db/operations/flashcards.ts`         | Add distractor CRUD operations                        |
| `lib/ai/distractor-generator.ts`          | Add persistence after generation                      |
| `lib/claude/flashcard-generator.ts`       | Integrate distractor generation at flashcard creation |
| `app/api/study/session/route.ts`          | Load distractors from DB, progressive generation      |
| `components/study/MultipleChoiceMode.tsx` | Already supports distractors (minor enhancements)     |

**Key Files to Create**:

| File                                                | Purpose                             |
| --------------------------------------------------- | ----------------------------------- |
| `lib/db/operations/distractors.ts`                  | Distractor-specific CRUD operations |
| `drizzle/migrations/XXXX_add_distractors_table.sql` | Database migration                  |

**Key Functions to Reuse**:

- `getChatCompletion()` from `lib/claude/client.ts`
- `shuffleArray()` from `MultipleChoiceMode.tsx`
- `scheduleCard()` from `lib/fsrs/scheduler.ts`
- `generateDistractors()` from `lib/ai/distractor-generator.ts` (enhance to persist)

## Summary

All spec clarifications have been incorporated into research:

- **Storage**: Dedicated `distractors` table with FK to flashcards
- **Generation triggers**: At flashcard creation + progressive for existing cards
- **Time threshold**: 10 seconds for fast/slow distinction (confirmed)
- **Fallback**: Flip-reveal mode with toast notification
- **Session flow**: Pre-load from DB, progressive generation with loading indicator

Ready to proceed to Phase 1: Design & Contracts.
