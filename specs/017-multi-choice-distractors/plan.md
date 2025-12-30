# Implementation Plan: Multi-Choice Study Mode with AI-Generated Distractors

**Branch**: `017-multi-choice-distractors` | **Date**: 2025-12-29 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/017-multi-choice-distractors/spec.md`

## Summary

Implement persistent distractor storage for flashcards, enabling multiple choice study mode with AI-generated plausible-but-incorrect answer options. Distractors are generated at flashcard creation time (or progressively for existing cards on first MC study) and stored in a dedicated database table. FSRS ratings are determined by answer correctness and response time (≤10s = Good, >10s = Hard, incorrect = Again).

## Technical Context

**Language/Version**: TypeScript 5.7.0 (strict mode)
**Primary Dependencies**: Next.js 16.0.10, React 19.2.3, @anthropic-ai/sdk 0.71.2 (Claude API), ts-fsrs 5.2.3, drizzle-orm 0.45.1
**Storage**: PostgreSQL via postgres 3.4.7 + drizzle-orm (distractors persisted to new table)
**Testing**: Vitest 4.0.15 (unit/integration), Playwright 1.57.0 (E2E)
**Target Platform**: Web application (Next.js App Router)
**Project Type**: Web application (monorepo with frontend + API routes)
**Performance Goals**: MC question display within 500ms (distractors pre-loaded from DB)
**Constraints**: 10-second response time threshold for FSRS rating, distractor generation timeout 10s
**Scale/Scope**: User-specific flashcards, 3 distractors per card, progressive generation for existing cards

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principle              | Status   | Evidence                                                                               |
| ---------------------- | -------- | -------------------------------------------------------------------------------------- |
| I. Documentation-First | ✅ PASS  | Spec complete with user stories, acceptance criteria, FRs, and clarifications          |
| II. Test-First (TDD)   | ✅ READY | Tests will be written before implementation per task ordering                          |
| III. Modularity        | ✅ PASS  | Clear separation: distractor-generator service, DB operations, UI component            |
| IV. Simplicity (YAGNI) | ✅ PASS  | Single distractor table, no over-engineering; uses existing FSRS/Claude infrastructure |
| V. Observability       | ✅ PASS  | Existing logging patterns will be extended for distractor generation                   |
| VI. Atomic Commits     | ✅ READY | Implementation will follow .claude/rules.md commit discipline                          |

## Project Structure

### Documentation (this feature)

```text
specs/017-multi-choice-distractors/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
└── tasks.md             # Phase 2 output (/speckit.tasks command)
```

### Source Code (repository root)

```text
# Next.js App Router structure
app/
├── api/
│   ├── study/
│   │   ├── session/route.ts    # Load cards with distractors (see contracts/distractor-api.md:Sequence Diagrams)
│   │   └── rate/route.ts       # Time-based rating (see contracts/distractor-api.md:POST /api/study/rate)
│   └── flashcards/
│       └── distractors/route.ts # Internal distractor generation (see contracts/distractor-api.md:POST /api/study/distractors)

components/
├── study/
│   ├── MultipleChoiceMode.tsx  # MC UI with timer (see contracts/distractor-api.md:MultipleChoiceMode Props)
│   ├── StudySessionProvider.tsx # Distractor state management (see contracts/distractor-api.md:Study Session Provider)
│   └── MixedMode.tsx           # Fallback routing (see research.md:Fallback Strategy)

lib/
├── ai/
│   └── distractor-generator.ts # Generation + persistence (see contracts/distractor-api.md:Distractor Generator Service)
├── claude/
│   └── flashcard-generator.ts  # Integrate distractor gen at card creation (see research.md:Generation Trigger Points)
├── db/
│   ├── drizzle-schema.ts       # Add distractors table (see data-model.md:New Entity: Distractor)
│   └── operations/
│       ├── flashcards.ts       # Enhance for distractors JOIN
│       └── distractors.ts      # CRUD operations (see quickstart.md:Section 2)
└── fsrs/
    └── scheduler.ts            # Existing - no changes needed

drizzle/
└── migrations/                 # Migration SQL (see data-model.md:SQL Migration)

tests/
├── unit/
│   └── distractor-generator.test.ts  # US2: Distractor quality validation
├── integration/
│   ├── study-session.test.ts         # US1: MC study flow, US3: Fallback
│   └── flashcard-creation.test.ts    # FR-009: Generation at creation
└── e2e/
    └── multiple-choice-study.spec.ts # US1: Full MC session with FSRS
```

**Structure Decision**: Next.js App Router with API routes. Distractors stored in dedicated PostgreSQL table linked to flashcards. Existing MultipleChoiceMode component enhanced rather than replaced.

## Complexity Tracking

> No complexity violations identified. Implementation uses existing patterns and infrastructure.

| Violation | Why Needed | Simpler Alternative Rejected Because |
| --------- | ---------- | ------------------------------------ |
| (none)    | -          | -                                    |

## Core Implementation Steps

### Phase 1: Database Layer

1. **Add Drizzle schema** definition in `lib/db/drizzle-schema.ts` (see `data-model.md:New Entity: Distractor`)
2. **Generate migration** using `npx drizzle-kit generate` - creates SQL file in `drizzle/` directory
3. **Test migration locally** with `npm run db:migrate`
4. **Create CRUD operations** in `lib/db/operations/distractors.ts` (see `quickstart.md:Section 2`)
5. **Write unit tests** for distractor CRUD operations

> **Deployment Note**: Migrations auto-apply on production deploy via `npm start` script (`drizzle-kit migrate && next start`). The new migration file in `drizzle/` will be applied automatically when the Docker container starts.

### Phase 2: Generation Layer

6. **Enhance distractor-generator.ts** to include persistence after generation (see `contracts/distractor-api.md:Distractor Generator Service`)
7. **Write unit tests** for generation logic and validation (see `data-model.md:Validation Rules`)
8. **Integrate into flashcard-generator.ts** to generate distractors at flashcard creation (see `research.md:Distractor Generation Trigger Points`)
9. **Write integration tests** for flashcard creation with distractors

### Phase 3: Session Integration

10. **Modify session/route.ts** to load distractors via LEFT JOIN (see `contracts/distractor-api.md:Sequence Diagrams`)
11. **Add progressive generation** logic for cards without distractors (see `data-model.md:Distractor Loading Flow`)
12. **Write integration tests** for session loading with/without distractors

### Phase 4: UI Enhancement

13. **Add loading state** to MultipleChoiceMode for progressive generation (FR-015)
14. **Update StudySessionProvider** for distractor state management (see `contracts/distractor-api.md:Study Session Provider`)
15. **Implement fallback routing** in MixedMode with toast notification (see `research.md:Fallback Strategy`)
16. **Write E2E tests** for full MC study flow

### Phase 5: Rating Integration

17. **Verify time-based rating** in rate/route.ts (see `contracts/distractor-api.md:Time-Based Rating Logic`)
18. **Write integration tests** for rating calculations (correct fast, correct slow, incorrect)

## Task Dependencies

```
Phase 1 (Database)          Phase 2 (Generation)           Phase 3 (Session)
┌─────────────────┐         ┌─────────────────┐           ┌─────────────────┐
│ 1. Schema       │────────►│ 6. Generator    │──────────►│ 10. Session Load│
│ 2. Generate Mig │         │    Enhancement  │           │ 11. Progressive │
│ 3. Test Migrate │         │ 8. Flashcard    │           │     Generation  │
│ 4. CRUD Ops     │────────►│    Integration  │           │ 12. Session     │
│ 5. CRUD Tests   │         │ 7,9. Tests      │           │     Tests       │
└─────────────────┘         └─────────────────┘           └─────────────────┘
                                                                   │
                                                                   ▼
Phase 5 (Rating)            Phase 4 (UI)                  Production Deploy
┌─────────────────┐         ┌─────────────────┐           ┌─────────────────┐
│ 17. Rating      │◄────────│ 13. Loading UI  │           │ Migration auto- │
│     Logic       │         │ 14. Provider    │           │ applies via     │
│ 18. Rating      │         │ 15. Fallback    │           │ npm start       │
│     Tests       │         │ 16. E2E Tests   │           └─────────────────┘
└─────────────────┘         └─────────────────┘
```

**Blocking Dependencies:**

- Steps 1-4 MUST complete before Step 6 (generator needs schema + CRUD ops)
- Step 6 MUST complete before Step 10 (session needs generator)
- Steps 10-11 MUST complete before Step 13 (UI needs session API)

**Parallel Opportunities:**

- Steps 1-2 (schema + migration) are sequential but fast
- Step 5 (CRUD tests) can run parallel with Step 6 (generator)
- Phase 5 (rating) can run parallel with Phase 4 (UI) after Phase 3

**Production Deployment:**

- Migration file (`drizzle/XXXX_add_distractors.sql`) is committed to repo
- On deploy, `npm start` runs `drizzle-kit migrate` before starting Next.js
- Migration applies automatically - no manual steps required

## Test Mapping (TDD Compliance)

| User Story              | Acceptance Scenarios | Test Files                                                                           |
| ----------------------- | -------------------- | ------------------------------------------------------------------------------------ |
| US1: MC Study Mode      | AS1-5                | `tests/e2e/multiple-choice-study.spec.ts`, `tests/integration/study-session.test.ts` |
| US2: Distractor Quality | AS1-3                | `tests/unit/distractor-generator.test.ts`                                            |
| US3: Fallback           | AS1-2                | `tests/integration/study-session.test.ts` (fallback scenarios)                       |

| Functional Requirement          | Test Coverage                                  |
| ------------------------------- | ---------------------------------------------- |
| FR-001 to FR-006 (MC Display)   | `tests/e2e/multiple-choice-study.spec.ts`      |
| FR-007, FR-008, FR-013 (Rating) | `tests/integration/study-session.test.ts`      |
| FR-009 (Create-time gen)        | `tests/integration/flashcard-creation.test.ts` |
| FR-014, FR-015 (Progressive)    | `tests/integration/study-session.test.ts`      |
| FR-011 (Fallback)               | `tests/integration/study-session.test.ts`      |

## Observability

**Logging Points:**

- `distractor-generator.ts`: Log generation start, success/failure, duration
- `session/route.ts`: Log progressive generation triggers, fallback decisions
- `rate/route.ts`: Log rating adjustments (fast→Good, slow→Hard, incorrect→Again)

**Metrics to Track:**

- Distractor generation success rate
- Average generation time
- Fallback frequency
- Response time distribution for rating thresholds
