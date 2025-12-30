# API Contract: Distractor Generation

**Feature**: 017-multi-choice-distractors
**Date**: 2025-12-29
**Updated**: 2025-12-29 (reflects spec clarifications for DB persistence)

## Overview

Distractors are **persisted in the database** and loaded with flashcards during study sessions. Generation happens at flashcard creation time or progressively on first MC study. No separate on-demand API endpoint is needed for study sessions.

## Internal Functions

### Distractor Generation (Internal Function - No HTTP Endpoint)

> **Note**: This is NOT exposed as an HTTP endpoint. Generation is triggered internally by:
>
> - `lib/claude/flashcard-generator.ts` at card creation (T08)
> - `app/api/study/session/route.ts` for progressive generation (T11)

Generate and persist 3 distractors for a flashcard.

#### Function Signature

```typescript
// lib/ai/distractor-generator.ts
async function generateAndPersistDistractors(
  flashcardId: string,
  question: string,
  answer: string
): Promise<DistractorResult>
```

#### Input Parameters

| Parameter   | Type   | Description                          |
| ----------- | ------ | ------------------------------------ |
| flashcardId | string | UUID of the flashcard                |
| question    | string | The flashcard question (for context) |
| answer      | string | The correct answer                   |

**Example call**:

```typescript
const result = await generateAndPersistDistractors(
  '550e8400-e29b-41d4-a716-446655440000',
  'What is the capital of France?',
  'Paris'
)
```

#### Return Value

```typescript
interface DistractorResult {
  success: boolean
  distractors?: [string, string, string] // Exactly 3 distractors
  error?: string
  generationTimeMs: number
}
```

**Success example**:

```typescript
{
  success: true,
  distractors: ["London", "Berlin", "Madrid"],
  generationTimeMs: 1243
}
```

**Error example**:

```typescript
{
  success: false,
  error: "Claude API timeout",
  generationTimeMs: 5000
}
```

#### Error Handling

| Condition          | Result                           | Caller Action            |
| ------------------ | -------------------------------- | ------------------------ |
| Success            | `success: true` with distractors | Use distractors          |
| Generation failed  | `success: false` with error      | Use flip-reveal fallback |
| Claude API timeout | `success: false` with error      | Use flip-reveal fallback |

#### Configuration

- Timeout: 5 seconds (fail fast for fallback)
- Max tokens: 256
- Temperature: 0.9 (for variety)

---

## Endpoints

### POST /api/study/rate (Modified)

Rate a flashcard with time-based scoring for multiple choice mode.

#### Request (Extended)

```typescript
interface RateCardRequest {
  flashcardId: string
  rating: 1 | 2 | 3 | 4 // FSRS rating
  responseTimeMs?: number // Required for MC mode
  studyMode?: 'flashcard' | 'multiple_choice'
}
```

**Multiple Choice Example**:

```json
{
  "flashcardId": "550e8400-e29b-41d4-a716-446655440000",
  "rating": 3,
  "responseTimeMs": 4500,
  "studyMode": "multiple_choice"
}
```

#### Response

Unchanged from existing implementation:

```typescript
interface RateCardResponse {
  success: boolean
  nextDue: string // ISO 8601 date
  newState: 'new' | 'learning' | 'review' | 'relearning'
  intervalDays: number
}
```

#### Time-Based Rating Logic (Server-Side)

When `studyMode === 'multiple_choice'`:

- Ignore client-provided `rating` for correct answers
- Calculate rating based on `responseTimeMs`:
  - ≤ 10,000ms → rating = 3 (Good)
  - > 10,000ms → rating = 2 (Hard)
- Incorrect answers always → rating = 1 (Again)

---

## Component Contracts

### MultipleChoiceMode Props

```typescript
interface MultipleChoiceModeProps {
  question: string
  answer: string
  distractors: string[] // Exactly 3 items
  cardNumber: number
  totalCards: number
  onRate: (rating: 1 | 2 | 3, responseTimeMs: number) => void
  onFallback?: () => void // Called if distractors invalid
}
```

### Distractor Generator Service

```typescript
// lib/ai/distractor-generator.ts

export interface DistractorGeneratorOptions {
  maxTokens?: number // Default: 256
  temperature?: number // Default: 0.9
  timeoutMs?: number // Default: 5000
}

export interface DistractorResult {
  success: boolean
  distractors?: [string, string, string]
  error?: string
  generationTimeMs: number
}

export async function generateDistractors(
  question: string,
  answer: string,
  options?: DistractorGeneratorOptions
): Promise<DistractorResult>
```

### Study Session Provider (Extended)

```typescript
interface StudySessionContextValue {
  // Existing
  cards: StudyCard[]
  currentCardIndex: number
  sessionId: string | null
  isLoading: boolean

  // New for MC mode
  currentDistractors: string[] | null
  distractorsLoading: boolean
  distractorsFailed: boolean

  // Actions
  startSession: (goalId: string, mode: StudyMode) => Promise<void>
  rateCard: (rating: number, responseTimeMs?: number) => Promise<void>
  nextCard: () => void
  completeSession: () => Promise<SessionSummary>
}
```

## Sequence Diagrams

### Happy Path: Multiple Choice Study (Distractors Pre-loaded)

```
User              UI                Provider           API              DB
  │                │                    │                │                │
  │──Start MC──────►                    │                │                │
  │                │──startSession()────►                │                │
  │                │                    │──POST /session─►                │
  │                │                    │                │──SELECT cards──►
  │                │                    │                │  LEFT JOIN     │
  │                │                    │                │  distractors   │
  │                │                    │◄───cards[]─────│◄──with distrs──│
  │                │                    │  (pre-loaded)  │                │
  │                │◄──card + distrs────│                │                │
  │                │◄──show MC Q────────│ (500ms target) │                │
  │                │                    │                │                │
  │──select opt────►                    │                │                │
  │                │──rateCard(3,4500)──►                │                │
  │                │                    │──POST /rate────►                │
  │                │                    │◄──success──────│                │
  │                │◄──next card────────│                │                │
```

### Progressive Generation: Existing Card Without Distractors

```
User              UI                Provider           API         DB     Claude
  │                │                    │                │           │        │
  │──Start MC──────►                    │                │           │        │
  │                │──startSession()────►                │           │        │
  │                │                    │──POST /session─►           │        │
  │                │                    │                │──SELECT───►        │
  │                │                    │                │◄──no distrs        │
  │                │                    │                │──generate────────► │
  │                │                    │                │◄──distractors[]────│
  │                │                    │                │──INSERT───►        │
  │                │                    │◄───cards[]─────│◄──OK──────│        │
  │                │◄──loading indicator│                │           │        │
  │                │◄──card + distrs────│                │           │        │
  │                │◄──show MC Q────────│                │           │        │
```

### Fallback Path: No Distractors Available

```
User              UI                Provider           API              DB
  │                │                    │                │                │
  │                │◄──card (no distrs)─│ (generation    │                │
  │                │                    │  failed earlier│                │
  │                │                    │  or timeout)   │                │
  │                │◄──show Flashcard───│ (fallback)     │                │
  │                │   mode + toast     │                │                │
  │                │                    │                │                │
  │──flip & rate───►                    │                │                │
  │                │──rateCard(3)───────► (standard flow)│                │
```
