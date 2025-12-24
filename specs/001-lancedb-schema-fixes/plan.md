# Implementation Plan: LanceDB Schema Initialization Fixes

**Branch**: `001-lancedb-schema-fixes` | **Date**: 2025-12-23 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-lancedb-schema-fixes/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

This feature addresses critical code quality and reliability issues identified in Issue 188's code review of PR #186. The primary goal is to eliminate 56 lines of duplicated schema initialization code, implement proper error handling (fail-fast instead of silent failures), add atomic rollback for partial failures, and fix misleading test documentation. The technical approach involves using dynamic imports to reuse the existing `initializeSchema()` function from `lib/db/schema.ts` in `lib/db/client.ts`, implementing rollback logic for partial table creation failures, and adding timeout handling.

## Technical Context

**Language/Version**: TypeScript 5.7 (strict mode)
**Primary Dependencies**: @lancedb/lancedb 0.22, Node.js 20+, Vitest (testing framework)
**Storage**: LanceDB (file-based vector database for embeddings only)
**Testing**: Vitest with unit and integration test suites
**Target Platform**: Next.js 16.0.10 server environment (Node.js runtime)
**Project Type**: Web application (Next.js full-stack)
**Performance Goals**: Schema initialization must complete within 30 seconds
**Constraints**:

- Must maintain backward compatibility with existing deployments
- Must use dynamic imports to avoid circular dependencies
- Must preserve existing `connectionPromise` pattern for concurrency safety
  **Scale/Scope**:
- Affects 2 core modules: lib/db/client.ts, lib/db/schema.ts
- Impacts 1 test file: tests/unit/lib/db/client-auto-init.test.ts
- Removes 56 lines of duplicated code
- Addresses 6 issues (4 critical, 2 medium priority)

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

### Pre-Design Check (Before Phase 0)

✅ **I. Documentation-First Development**

- Specification complete with user stories, acceptance criteria, and success criteria
- All requirements testable and clearly defined
- No NEEDS CLARIFICATION markers remaining (resolved during /speckit.clarify)

✅ **II. Test-First Development (TDD)**

- Existing tests will be updated to validate new behavior
- New tests required for rollback logic and timeout handling
- Tests will be written before implementation changes

✅ **III. Modularity & Composability**

- Solution reuses existing `schema.ts` module (single source of truth)
- Dynamic import pattern maintains module independence
- Each user story is independently testable

✅ **IV. Simplicity (YAGNI)**

- Solution eliminates unnecessary code duplication (removes 56 lines)
- Uses dynamic imports instead of creating new abstraction layers
- No speculative features - addresses only Issue 188 findings

✅ **V. Observability & Debugging**

- Structured logging with `[LanceDB]` prefix for all operations
- Clear error messages with actionable context
- Rollback operations are logged for debugging

✅ **VI. Atomic Commits & Version Control Discipline**

- Changes will be committed following .claude/rules.md
- Each functional requirement will have its own atomic commit
- Commit messages will be imperative, under 100 characters

**Gate Status**: ✅ PASS - Proceed to Phase 0

### Post-Design Check (After Phase 1)

✅ **I. Documentation-First Development**

- All design artifacts complete: research.md, data-model.md, quickstart.md
- No ambiguities remaining in technical approach
- All decisions documented with rationale

✅ **II. Test-First Development (TDD)**

- Testing patterns identified in research.md
- Test scenarios defined in quickstart.md
- Vitest mocking strategy documented

✅ **III. Modularity & Composability**

- data-model.md confirms no new abstractions
- Dynamic import maintains module independence
- Existing patterns (connectionPromise) preserved

✅ **IV. Simplicity (YAGNI)**

- No over-engineering: reuses existing LanceDB API
- No unnecessary abstractions: standard Promise.race() for timeout
- Direct rollback logic: simple array tracking

✅ **V. Observability & Debugging**

- Structured logging patterns defined in research.md
- Error context documented in data-model.md
- Rollback operations include logging

✅ **VI. Atomic Commits & Version Control Discipline**

- Implementation will follow atomic commit strategy per FR
- Each fix (duplication, error handling, rollback, timeout, logging, tests) will be separate commit

**Gate Status**: ✅ PASS - Proceed to Phase 2 (Task Breakdown)

## Project Structure

### Documentation (this feature)

```text
specs/001-lancedb-schema-fixes/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
# Web application structure (Next.js)
app/                     # Next.js 16 app directory (not modified by this feature)
├── (protected)/
└── api/

lib/                     # Core library modules (PRIMARY FOCUS)
├── db/
│   ├── client.ts        # MODIFIED: Remove duplicated schema init, use dynamic import
│   ├── schema.ts        # POSSIBLY MODIFIED: Add rollback/timeout logic
│   └── operations/
│       └── messages-lancedb.ts  # REFERENCE: Logging format pattern

tests/                   # Test suites
├── unit/
│   └── lib/
│       └── db/
│           ├── client-auto-init.test.ts  # MODIFIED: Fix test descriptions, add rollback tests
│           └── schema-inspection.test.ts # POSSIBLY MODIFIED: Add timeout tests
└── integration/         # Integration tests for rollback scenarios

components/              # UI components (not modified by this feature)
types/                   # TypeScript types (not modified by this feature)
```

**Structure Decision**: This is a refactoring feature focused on the database initialization layer. Changes are isolated to:

1. `lib/db/client.ts` - Primary refactoring target (remove duplication, add dynamic import)
2. `lib/db/schema.ts` - Add rollback and timeout logic
3. `tests/unit/lib/db/client-auto-init.test.ts` - Fix misleading test descriptions, add new tests

No changes to app routes, components, or API endpoints. This is purely a backend reliability improvement.

## Complexity Tracking

**No violations requiring justification**

All changes align with constitutional principles:

- Eliminates complexity by removing code duplication
- Reuses existing modules instead of creating new abstractions
- Maintains existing patterns (connectionPromise for concurrency)
- No new dependencies or architectural changes

---

## Phase 0: Research & Technical Decisions

### Research Topics

1. **Dynamic Import Pattern for Circular Dependency Resolution**
   - **Question**: What is the correct pattern for using dynamic `import()` in TypeScript to call `initializeSchema()` from `client.ts` without creating circular dependency?
   - **Why needed**: FR-002 requires dynamic import; need to verify type safety and error handling patterns
   - **Success criteria**: Find a pattern that maintains TypeScript type safety and works in Next.js server environment

2. **LanceDB Transaction/Rollback Patterns**
   - **Question**: How do we implement atomic rollback for partial table creation in LanceDB (delete tables created during failed initialization)?
   - **Why needed**: FR-011 and FR-012 require rollback on partial failure
   - **Success criteria**: Identify LanceDB API methods for listing tables created during a session and deleting them atomically

3. **Timeout Implementation for Async Operations**
   - **Question**: What is the best pattern for implementing a 30-second timeout on the schema initialization promise?
   - **Why needed**: FR-012 requires 30-second timeout with clear error
   - **Success criteria**: Pattern that works with existing `connectionPromise` pattern and provides clear timeout errors

4. **Testing Async Rollback Logic**
   - **Question**: How to test rollback behavior in Vitest when schema initialization fails partway through?
   - **Why needed**: SC-009 requires verified atomic behavior
   - **Success criteria**: Identify mocking/stubbing patterns to simulate partial failures in LanceDB table creation

### Research Agents Dispatch

_Agents will be launched to investigate each topic and populate research.md_

---

## Phase 1: Design & Contracts

### Design Artifacts to Generate

1. **data-model.md**: Document the schema initialization state model
   - Schema Initialization State (tracks: initialized flag, tables created list, initialization start time)
   - No changes to actual LanceDB table schemas (messages, flashcards remain unchanged)

2. **contracts/**: No API contracts needed (internal refactoring only)
   - This feature does not modify public APIs or endpoints
   - Changes are isolated to internal database initialization logic

3. **quickstart.md**: Developer guide for testing and verifying the fixes
   - How to test rollback behavior locally
   - How to verify timeout handling
   - How to confirm error propagation

### Agent Context Update

After completing Phase 1 design, update agent context:

- Technology: No new technologies (existing: TypeScript 5.7, @lancedb/lancedb 0.22, Vitest)
- Patterns: Add "Dynamic imports for circular dependency resolution" and "Atomic rollback for partial failures"

---

## Phase 2: Task Breakdown

_This section is populated by the `/speckit.tasks` command (NOT by /speckit.plan)_

Task generation will create:

- Tasks organized by user story (P1 → P2 → P3 priority order)
- Each task references exact file paths
- Test tasks precede implementation tasks (TDD)
- Independent testability maintained per user story

---

## Post-Design Constitution Re-Check

_To be completed after Phase 1 artifacts are generated_

This section will verify:

- Data model maintains simplicity (no over-engineering)
- Contracts (if any) follow existing API patterns
- Complexity remains justified
- All design decisions documented in research.md
