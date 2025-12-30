# Tasks: Multi-Choice Study Mode with AI-Generated Distractors

**Branch**: `017-multi-choice-distractors` | **Date**: 2025-12-30 | **Plan**: [plan.md](./plan.md)

## Task Summary

| Phase                  | Tasks  | Parallel Sets | Complexity |
| ---------------------- | ------ | ------------- | ---------- |
| 1: Database Layer      | 5      | 1             | Low        |
| 2: Generation Layer    | 4      | 2             | Medium     |
| 3: Session Integration | 3      | 0             | Medium     |
| 4: UI Enhancement      | 4      | 2             | Medium     |
| 5: Rating Integration  | 2      | 1             | Low        |
| **Total**              | **18** | **6**         | -          |

## Legend

- `[P]` = Can run in parallel with adjacent `[P]` tasks
- `[US1]`, `[US2]`, `[US3]` = User Story reference
- File paths link to implementation details in design docs

---

## Phase 1: Database Layer

> **Blocking**: All subsequent phases depend on Phase 1 completion (T01-T04)
> **Migration Note**: Migrations auto-apply on production deploy via `npm start` (`drizzle-kit migrate && next start`)

- [x] **T01** [US1] Add Drizzle schema for `distractors` table in `lib/db/drizzle-schema.ts`
  - See: `data-model.md:New Entity: Distractor`
  - Columns: id (uuid), flashcardId (uuid FK), content (varchar 1000), position (int 0-2), createdAt
  - Constraints: UNIQUE(flashcard_id, position), CHECK(position >= 0 AND position < 3)
  - Index on flashcard_id for efficient joins

- [x] **T02** [US1] Generate migration SQL via `npx drizzle-kit generate`
  - Output: `drizzle/migrations/XXXX_add_distractors_table.sql`
  - Verify: CASCADE delete on flashcard FK

- [x] **T03** [US1] Test migration locally with `npm run db:migrate`
  - Verify table created with correct constraints
  - Verify FK cascade delete works

- [x] **T04** [US1] Create CRUD operations in `lib/db/operations/distractors.ts`
  - See: `quickstart.md:Section 2`
  - Functions: `getDistractorsForFlashcard(flashcardId)`, `createDistractors(flashcardId, contents[])`
  - Use drizzle-orm with type-safe queries

- [x] **T05** [P] [US1] Write unit tests for distractor CRUD operations
  - File: `tests/unit/distractor-crud.test.ts`
  - Test create, read operations
  - Test constraint violations (duplicate position, invalid position)

---

## Phase 2: Generation Layer

> **Dependency**: Phase 1 complete (T01-T04 must finish before T06)
> **Parallel**: T05 (CRUD tests) can run in parallel with T06 (generator enhancement)

- [x] **T06** [US2] Enhance `lib/ai/distractor-generator.ts` to include persistence
  - See: `contracts/distractor-api.md:Distractor Generator Service`
  - Add `generateAndPersistDistractors(flashcardId, question, answer)` function
  - Call `createDistractors()` after successful generation
  - Return `DistractorResult` with success/error and generation time
  - Handle short answers (FR-012): For answers ≤10 chars, use context-aware prompt
    - Example: "Yes" → generate "Yes, because X" style distractors
    - Example: "42" → generate nearby plausible numbers

- [x] **T07** [P] [US2] Write unit tests for distractor generation and validation
  - File: `tests/unit/lib/ai/distractor-generator.test.ts`
  - See: `data-model.md:Validation Rules`
  - Test: exactly 3 distractors, non-empty, no match with correct answer, no duplicates
  - Test: short answer handling (answers ≤10 chars produce valid distractors)
  - Test: numeric answers produce plausible numeric distractors
  - Mock Claude API responses
  - ✅ 41 tests passing

- [x] **T08** [US2] Integrate distractor generation into `lib/claude/flashcard-generator.ts`
  - See: `research.md:Distractor Generation Trigger Points`
  - Call `generateAndPersistDistractors()` after flashcard creation
  - Handle generation failures gracefully (log warning, continue without distractors)

- [x] **T09** [P] [US2] Write integration tests for flashcard creation with distractors
  - File: `tests/integration/flashcard-creation.test.ts`
  - Test: flashcard created → distractors generated and persisted
  - Test: flashcard created when generation fails → flashcard saved, no distractors
  - ✅ 9 tests covering creation, technical content, short answers, concurrent creation, and cleanup

---

## Phase 3: Session Integration

> **Dependency**: Phase 2 complete (T06, T08 must finish)
> **Sequential**: T10 → T11 → T12 (each builds on previous)

- [x] **T10** [US1] Modify `app/api/study/session/route.ts` to load distractors
  - See: `contracts/distractor-api.md:Sequence Diagrams`
  - Added `getDistractorsForFlashcard()` call to load from DB first
  - Return distractors array with each StudyCard

- [x] **T11** [US3] Add progressive generation logic for cards without distractors
  - See: `data-model.md:Distractor Loading Flow`
  - When MC mode and card has no distractors: generate + persist using `generateAndPersistDistractors()`
  - Falls back to flashcard mode if generation fails

- [x] **T12** [US1] [US3] Write integration tests for session loading
  - File: `tests/integration/study-session.test.ts`
  - Test: session loads cards with pre-existing distractors
  - Test: progressive generation for cards without distractors
  - Test: fallback when generation fails during session
  - ✅ 28 tests passing (13 new tests added for distractor loading scenarios)

---

## Phase 4: UI Enhancement

> **Dependency**: Phase 3 complete (T10-T11 must finish)
> **Parallel**: T15 + T16 can run together after T13-T14

- [x] **T13** [US1] [US3] Add loading state and verify shuffle in `components/study/MultipleChoiceMode.tsx`
  - See: FR-010, FR-015 in spec.md
  - Show loading indicator when `distractorsLoading` is true
  - Display MC question only after distractors are ready
  - Verify: existing `shuffleArray` is applied to [answer, ...distractors] before display
  - Verify: positions vary on each render (not deterministic)
  - ✅ Added `distractorsLoading` prop and loading UI with spinner

- [x] **T14** [US1] Update `components/study/StudySessionProvider.tsx` for distractor state
  - See: `contracts/distractor-api.md:Study Session Provider`
  - Add `currentDistractors`, `distractorsLoading`, `distractorsFailed` to context
  - Pass distractors to MultipleChoiceMode component
  - ✅ Added distractor state derivation from current card

- [x] **T15** [P] [US3] Implement fallback routing in `components/study/MixedMode.tsx`
  - See: `research.md:Fallback Strategy`
  - When `distractorsFailed` is true: render FlashcardMode instead of MultipleChoiceMode
  - Show toast notification: "Showing as flashcard (distractors unavailable)"
  - ✅ MixedMode has fallback logic, study page has toast notification UI

- [x] **T16** [P] [US1] Write E2E tests for full MC study flow
  - File: `tests/e2e/multiple-choice-study.spec.ts`
  - Test: start MC session → answer questions → verify FSRS updates
  - Test: fallback to flip-reveal when distractors unavailable
  - Test: loading indicator during progressive generation
  - ✅ 10 comprehensive E2E tests covering MC flow, fallbacks, loading states, and mixed mode

---

## Phase 5: Rating Integration

> **Dependency**: Phase 3 complete (T10-T11)
> **Parallel**: Phase 5 can run in parallel with Phase 4

- [x] **T17** [P] [US1] Verify time-based rating in `app/api/study/rate/route.ts`
  - See: `contracts/distractor-api.md:Time-Based Rating Logic`
  - When `studyMode === 'multiple_choice'`:
    - Correct + ≤10s → rating 3 (Good)
    - Correct + >10s → rating 2 (Hard)
    - Incorrect → rating 1 (Again)

- [x] **T18** [P] [US1] Write integration tests for rating calculations
  - File: `tests/integration/study/multi-choice-rating.test.ts`
  - Test: correct fast → Good (rating 3)
  - Test: correct slow → Hard (rating 2)
  - Test: incorrect → Again (rating 1)
  - ✅ Comprehensive tests with boundary cases (5s, 10s, 15s, 30s) and mode isolation

---

## Parallel Execution Opportunities

```
Phase 1:  T01 → T02 → T03 → T04 ─┬─ T05 (CRUD tests)
                                 │
Phase 2:                         └─► T06 ─┬─ T07 (unit tests)
                                          │
                                     T08 ─┴─ T09 (integration tests)
                                          │
Phase 3:                                  └─► T10 → T11 → T12
                                                           │
                                          ┌────────────────┴────────────────┐
                                          │                                 │
Phase 4:                                  └─► T13 → T14 ─┬─ T15 (fallback)  │
                                                         │                  │
                                                         └─ T16 (E2E)       │
                                                                            │
Phase 5:                                                 └─► T17 ─┬─ T18    │
                                                                  │         │
                                                    (parallel with Phase 4)─┘
```

**Maximum Parallelism Points:**

1. T05 + T06 (CRUD tests while building generator)
2. T07 + T09 (unit and integration tests for generation)
3. T15 + T16 (fallback UI + E2E tests)
4. T17 + T18 (rating verification + tests)
5. Phase 4 + Phase 5 (both depend only on Phase 3)

---

## Test Coverage Matrix

| Task | User Story | Test Type   | Test File                                      |
| ---- | ---------- | ----------- | ---------------------------------------------- |
| T05  | US1        | Unit        | `tests/unit/distractor-crud.test.ts`           |
| T07  | US2        | Unit        | `tests/unit/distractor-generator.test.ts`      |
| T09  | US2        | Integration | `tests/integration/flashcard-creation.test.ts` |
| T12  | US1, US3   | Integration | `tests/integration/study-session.test.ts`      |
| T16  | US1        | E2E         | `tests/e2e/multiple-choice-study.spec.ts`      |
| T18  | US1        | Integration | `tests/integration/study-session.test.ts`      |

---

## Dependencies Graph

```
Blocking Dependencies:
━━━━━━━━━━━━━━━━━━━━━
T01-T04 (Schema + CRUD) ──► T06 (Generator enhancement)
T06 (Generator) ──────────► T10 (Session loading)
T10-T11 (Session) ────────► T13 (UI loading state)

Parallel Opportunities:
━━━━━━━━━━━━━━━━━━━━━━
T05 ║ T06    (CRUD tests parallel with generator)
T07 ║ T09    (unit tests parallel with integration tests)
T15 ║ T16    (fallback parallel with E2E)
T17 ║ T18    (rating parallel with tests)
Phase 4 ║ Phase 5  (after Phase 3 complete)
```

---

## Completion Checklist

### Build & Lint

- [ ] Migration applies cleanly: `npm run db:migrate`
- [ ] TypeScript compiles: `npm run typecheck`
- [ ] Linting passes: `npm run lint`

### Tests

- [ ] Unit tests pass: `npm run test:unit`
- [ ] Integration tests pass: `npm run test:integration`
- [ ] E2E tests pass: `npx playwright test`

### Manual QA

- [ ] Create flashcard → verify distractors generated and persisted
- [ ] Start MC session → verify 4 options displayed (1 correct, 3 distractors)
- [ ] Answer correctly fast (≤10s) → verify "Good" rating in review_logs
- [ ] Answer correctly slow (>10s) → verify "Hard" rating in review_logs
- [ ] Answer incorrectly → verify "Again" rating in review_logs
- [ ] Simulate API failure → verify fallback to flip-reveal with toast
- [ ] Study existing card without distractors → verify progressive generation with loading indicator

### Success Criteria (from spec.md)

- [ ] SC-001: MC questions display within 500ms (distractors pre-loaded from DB)
- [ ] SC-002: 90%+ distractors are contextually relevant and plausible
- [ ] SC-003: 20-card MC session completes in under 10 minutes
- [ ] SC-004: FSRS ratings correctly reflect Again/Hard/Good based on correctness and time
- [ ] SC-005: Immediate fallback to flip-reveal when distractors unavailable
- [ ] SC-006: Distractor positions vary via random shuffling at presentation time
