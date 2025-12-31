# Implementation Plan: Background Flashcard Generation

**Branch**: `018-background-flashcard-generation` | **Date**: 2025-12-30 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/018-background-flashcard-generation/spec.md`

## Summary

Convert LLM-dependent generation operations (flashcard, distractor, skill tree) from blocking synchronous calls to background jobs with database-persisted state. Users see loading placeholders during generation and receive automatic UI updates on completion. This addresses Issue #233 where slow LLM responses block user sessions.

## Technical Context

**Language/Version**: TypeScript 5.7.0 (strict mode)
**Primary Dependencies**: Next.js 16.0.10 (App Router), React 19.2.3, Anthropic SDK 0.71.2, drizzle-orm 0.45.1
**Storage**: PostgreSQL (via postgres 3.4.7) for jobs queue; LanceDB 0.22.3 for vector embeddings
**Testing**: Vitest 4.0.15 (unit/integration), Playwright 1.57.0 (E2E)
**Target Platform**: Vercel/Node.js serverless
**Project Type**: Web application (Next.js monorepo)
**Performance Goals**: < 2s response for job submission; 3s polling interval; < 5s UI update on completion
**Constraints**: 5-minute stale job timeout; 20 jobs/hour/user/type rate limit; 3 max retry attempts
**Scale/Scope**: Single-tenant with authenticated users; jobs processed inline (no dedicated worker)

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principle              | Status | Evidence                                                            |
| ---------------------- | ------ | ------------------------------------------------------------------- |
| I. Documentation-First | PASS   | Spec complete with 4 user stories, 12 FRs, 6 SCs, 4 clarifications  |
| II. Test-First (TDD)   | PASS   | Test tasks precede implementation in tasks.md                       |
| III. Modularity        | PASS   | User stories independently testable; job handlers separate from API |
| IV. Simplicity (YAGNI) | PASS   | Polling over WebSocket; inline processing over workers              |
| V. Observability       | PASS   | FR-009 requires error messages; console logging included            |
| VI. Atomic Commits     | PASS   | Will follow .claude/rules.md for commit discipline                  |

**Gate Status**: PASSED

## Project Structure

### Documentation (this feature)

```text
specs/018-background-flashcard-generation/
├── spec.md              # Feature specification (complete)
├── plan.md              # This file
├── quickstart.md        # Implementation reference with code examples
├── contracts/           # API schemas (job-api.yaml)
├── checklists/          # Feature checklists
└── tasks.md             # Task breakdown (complete)
```

### Source Code (repository root)

```text
# Next.js App Router structure
app/
├── api/
│   ├── jobs/                    # Background job API routes
│   │   ├── route.ts             # POST (create job), GET (list user jobs)
│   │   └── [jobId]/
│   │       └── route.ts         # GET (job status), POST (retry)
│   ├── flashcards/generate/     # MODIFY: Queue job instead of sync call
│   ├── study/distractors/       # MODIFY: Queue job for async generation
│   └── goals/[goalId]/
│       └── skill-tree/          # MODIFY: Queue job for tree generation
└── (app)/
    └── components/              # UI components using placeholders

lib/
├── db/
│   ├── drizzle-schema.ts        # backgroundJobs, jobRateLimits tables
│   └── operations/
│       └── background-jobs.ts   # Job CRUD + rate limiting operations
├── jobs/
│   ├── processor.ts             # Job executor with state machine
│   ├── types.ts                 # Job type definitions
│   └── handlers/
│       ├── flashcard-job.ts     # Flashcard generation handler
│       ├── distractor-job.ts    # Distractor generation handler
│       └── skill-tree-job.ts    # Skill tree generation handler
└── ai/
    └── (existing generators)    # Unchanged - called by job handlers

hooks/
└── useJobStatus.ts              # Job polling hook

components/
└── ui/
    └── GenerationPlaceholder.tsx  # Loading/error states

tests/
├── unit/jobs/                   # Processor, rate limit, stale detection tests
├── integration/jobs/            # Job API endpoint tests
└── e2e/
    ├── flashcard-generation.spec.ts   # Flashcard background flow
    ├── distractor-generation.spec.ts  # Distractor background flow
    └── skill-tree-generation.spec.ts  # Skill tree background flow
```

**Structure Decision**: Extending existing Next.js App Router structure. New `/lib/jobs/` module encapsulates job processing. Existing generators in `/lib/ai/` and `/lib/claude/` remain unchanged; job handlers wrap them.

## Key Decisions

- **Job Processing**: Inline with database state (no external workers needed for MVP)
- **Status Updates**: Polling at 3-second intervals (simpler than WebSocket/SSE)
- **Rate Limiting**: 20 jobs/hour/user/type using sliding window
- **Stale Detection**: 5-minute timeout resets stuck jobs to pending
- **Retry Strategy**: 3 attempts with exponential backoff (1s, 2s, 4s)

## Complexity Tracking

No constitution violations requiring justification. Design follows simplicity principle throughout.

## Implementation Reference

See [quickstart.md](./quickstart.md) for detailed code examples when implementing.

## Phase Outputs

- **Phase 0 (Research)**: Consolidated into Key Decisions above
- **Phase 1 (Design)**: contracts/job-api.yaml, quickstart.md
- **Phase 2 (Tasks)**: tasks.md (complete)
