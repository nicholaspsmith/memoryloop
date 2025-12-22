# Tasks: Pre-Commit Quality Hooks

**Input**: Design documents from `/specs/008-pre-commit-hooks/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md

**Tests**: TDD approach per constitution - tests written before implementation for TypeScript scripts.

**Organization**: Tasks grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1-US5)
- Include exact file paths in descriptions

## Path Conventions

- Hook scripts: `.githooks/`
- Helper scripts: `scripts/hooks/`
- Tests: `tests/unit/scripts/hooks/`, `tests/integration/`
- Config files: repository root

---

## Phase 1: Setup

**Purpose**: Install dependencies and configure auto-setup

- [ ] T001 Install lint-staged as dev dependency in package.json
- [ ] T002 Install eslint-plugin-vitest as dev dependency in package.json
- [ ] T003 Add prepare script to package.json: `"prepare": "[ -d '.git' ] && git config core.hooksPath .githooks"`
- [ ] T004 Create scripts/hooks/ directory for TypeScript helper scripts

**Checkpoint**: Dependencies installed, hooks will auto-configure on npm install

---

## Phase 2: User Story 1 - Pre-Commit Code Quality Validation (Priority: P1) 🎯 MVP

**Goal**: Block commits with type errors, lint errors, or formatting issues

**Independent Test**: Attempt commit with type error → blocked with message; clean code → succeeds

**Maps to**: FR-001, FR-002, FR-003, FR-005, FR-009, FR-010, FR-011

### Implementation for User Story 1

- [ ] T005 [P] [US1] Create .lintstagedrc.js with function syntax for tsc (see research.md §2)
- [ ] T006 [P] [US1] Add eslint-plugin-vitest rules to eslint.config.mjs (see research.md §4)
- [ ] T007 [US1] Create .githooks/pre-commit hook script calling `npx lint-staged`
- [ ] T008 [US1] Make .githooks/pre-commit executable (chmod +x)
- [ ] T009 [US1] Test pre-commit: verify type error blocks commit with clear message
- [ ] T010 [US1] Test pre-commit: verify lint error blocks commit with fix suggestions
- [ ] T011 [US1] Test pre-commit: verify format issue blocks commit
- [ ] T012 [US1] Test pre-commit: verify clean code passes without intervention

**Checkpoint**: Pre-commit hook blocks bad code, allows good code. US1 complete.

---

## Phase 3: User Story 4 - Commit Message Validation (Priority: P2)

**Goal**: Validate commit messages against .claude/rules.md standards

**Independent Test**: Commit with >72 char subject → blocked; proper format → proceeds

**Maps to**: FR-013, FR-014, FR-015, FR-016, FR-017, FR-005, FR-011

### Tests for User Story 4

- [ ] T013 [P] [US4] Write unit tests for commit-msg-validator.ts in tests/unit/scripts/hooks/commit-msg-validator.test.ts
- [ ] T014 [P] [US4] Test case: subject line >72 chars returns error
- [ ] T015 [P] [US4] Test case: past tense prefix ("Added", "Fixed") returns error
- [ ] T016 [P] [US4] Test case: body with extra content (not just Co-Authored-By) returns error
- [ ] T017 [P] [US4] Test case: forbidden AI attribution text returns error
- [ ] T018 [P] [US4] Test case: multiple responsibilities returns warning
- [ ] T019 [P] [US4] Test case: valid commit message passes

### Implementation for User Story 4

- [ ] T020 [US4] Create scripts/hooks/commit-msg-validator.ts with validation logic (see data-model.md §2)
- [ ] T021 [US4] Implement subject length validation (max 72 chars)
- [ ] T022 [US4] Implement imperative mood check (pattern match past tense prefixes)
- [ ] T023 [US4] Implement body format validation (only Co-Authored-By allowed)
- [ ] T024 [US4] Implement AI attribution check (forbidden patterns)
- [ ] T025 [US4] Implement multiple responsibilities warning
- [ ] T026 [US4] Add reference to .claude/rules.md in error messages (FR-017)
- [ ] T027 [US4] Create .githooks/commit-msg hook script calling tsx validator
- [ ] T028 [US4] Make .githooks/commit-msg executable (chmod +x)
- [ ] T029 [US4] Run unit tests - verify all pass

**Checkpoint**: Commit message validation enforces project standards. US4 complete.

---

## Phase 4: User Story 2 - Pre-Push Test Validation (Priority: P2)

**Goal**: Run unit and integration tests before push, block on failure with retry

**Independent Test**: Push with failing test → blocked after retry; all passing → succeeds

**Maps to**: FR-004, FR-004a, FR-005, FR-006, FR-011

### Implementation for User Story 2

- [ ] T030 [US2] Backup existing .githooks/pre-push content
- [ ] T031 [US2] Modify .githooks/pre-push to run unit tests (npm test -- --run)
- [ ] T032 [US2] Add integration test execution (npm run test:integration)
- [ ] T033 [US2] Implement retry logic: on failure, retry once before blocking (FR-004a)
- [ ] T034 [US2] Add flaky test warning: if retry passes, warn about potential flakiness
- [ ] T035 [US2] Preserve existing main branch protection logic
- [ ] T036 [US2] Test pre-push: verify failing test blocks with clear message
- [ ] T037 [US2] Test pre-push: verify retry behavior on transient failure
- [ ] T038 [US2] Test pre-push: verify all passing allows push
- [ ] T039 [US2] Test bypass: verify --no-verify works for emergencies (FR-006)

**Checkpoint**: Pre-push hook runs tests with retry, blocks on persistent failure. US2 complete.

---

## Phase 5: User Story 3 - Test Quality Audit (Priority: P3)

**Goal**: Audit tests for meaningful assertions, block new tests without assertions

**Independent Test**: Run audit on test with no assertions → flagged; well-written test → passes

**Maps to**: FR-007, FR-007a, FR-007b, FR-005, FR-012

### Tests for User Story 3

- [ ] T040 [P] [US3] Write unit tests for test-audit.ts in tests/unit/scripts/hooks/test-audit.test.ts
- [ ] T041 [P] [US3] Test case: test with no assertions flagged as no-assertions
- [ ] T042 [P] [US3] Test case: test with only toBeTruthy flagged as weak-assertion
- [ ] T043 [P] [US3] Test case: test with only toBeDefined flagged as weak-assertion
- [ ] T044 [P] [US3] Test case: test with meaningful assertions passes
- [ ] T045 [P] [US3] Test case: new test without assertions returns error (blocks)
- [ ] T046 [P] [US3] Test case: existing test without assertions returns warning (allows)

### Implementation for User Story 3

- [ ] T047 [US3] Create scripts/hooks/test-audit.ts skeleton with TypeScript types (see data-model.md §3)
- [ ] T048 [US3] Implement test file discovery (glob tests/**/*.test.ts)
- [ ] T049 [US3] Implement AST parsing to detect expect() calls
- [ ] T050 [US3] Implement no-assertions detection
- [ ] T051 [US3] Implement weak-assertion detection (toBeTruthy, toBeDefined, etc.)
- [ ] T052 [US3] Implement new vs existing test detection using git diff
- [ ] T053 [US3] Implement error grouping by root cause (FR-012)
- [ ] T054 [US3] Add suggestion output for improving flagged tests
- [ ] T055 [US3] Integrate test-audit.ts into .githooks/pre-push (run before tests)
- [ ] T056 [US3] Run unit tests - verify all pass

**Checkpoint**: Test audit identifies weak tests, blocks new ones, warns on existing. US3 complete.

---

## Phase 6: User Story 5 - Fix Suggestions (Priority: P4)

**Goal**: Provide actionable fix suggestions when tests fail

**Independent Test**: Introduce bug causing test failure → output includes fix suggestion

**Maps to**: FR-008, FR-012

### Implementation for User Story 5

- [ ] T057 [US5] Design common error-to-suggestion patterns in scripts/hooks/
- [ ] T058 [US5] Implement type error suggestion: point to file and line needing correction
- [ ] T059 [US5] Implement test failure suggestion: point to likely implementation issue
- [ ] T060 [US5] Implement error grouping by root cause in pre-push output
- [ ] T061 [US5] Integrate suggestions into pre-push hook output formatting
- [ ] T062 [US5] Test: verify type error shows file/line suggestion
- [ ] T063 [US5] Test: verify related failures are grouped

**Checkpoint**: Fix suggestions help developers quickly resolve issues. US5 complete.

---

## Phase 7: Polish & Verification

**Purpose**: Final validation and documentation

- [ ] T064 [P] Verify fresh clone → npm install → hooks auto-configured (SC-007)
- [ ] T065 [P] Verify pre-commit completes in under 30 seconds (SC-003)
- [ ] T066 [P] Verify commit-msg validation completes in under 1 second (SC-010)
- [ ] T067 [P] Verify pre-push completes in under 5 minutes (SC-004)
- [ ] T068 Update quickstart.md with final hook behavior verification steps
- [ ] T069 Run full manual test: commit with errors → push with failing tests → verify blocked

**Final Checkpoint**: All hooks working, performance targets met, documentation updated.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies - start immediately
- **Phase 2 (US1 Pre-Commit)**: Depends on Phase 1
- **Phase 3 (US4 Commit-Msg)**: Depends on Phase 1; can run parallel with US1
- **Phase 4 (US2 Pre-Push)**: Depends on Phase 1
- **Phase 5 (US3 Test Audit)**: Depends on Phase 1; integrates into pre-push
- **Phase 6 (US5 Fix Suggestions)**: Depends on US2, US3 (enhances their output)
- **Phase 7 (Polish)**: Depends on all user stories complete

### User Story Dependencies

- **US1 (P1)**: Independent - MVP, can complete standalone
- **US4 (P2)**: Independent - works with pre-commit but separate hook
- **US2 (P2)**: Independent - modifies existing pre-push
- **US3 (P3)**: Depends on US2 (integrates into pre-push hook)
- **US5 (P4)**: Depends on US2, US3 (enhances their output)

### Parallel Opportunities

**Within Phase 1:**
- T001, T002 can install dependencies in parallel

**Within US1 (Phase 2):**
- T005, T006 create different config files in parallel

**Within US4 (Phase 3):**
- T013-T019 all test cases can be written in parallel

**Within US3 (Phase 5):**
- T040-T046 all test cases can be written in parallel

**Across Phases:**
- After Setup, US1 and US4 can proceed in parallel (different hooks)
- After Setup, US2 can proceed in parallel with US1/US4

---

## Parallel Example: User Story 4 Tests

```bash
# Launch all unit test cases for commit-msg-validator in parallel:
Task: "Test case: subject line >72 chars returns error"
Task: "Test case: past tense prefix returns error"
Task: "Test case: body with extra content returns error"
Task: "Test case: forbidden AI attribution returns error"
Task: "Test case: multiple responsibilities returns warning"
Task: "Test case: valid commit message passes"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001-T004)
2. Complete Phase 2: User Story 1 (T005-T012)
3. **STOP and VALIDATE**: Test pre-commit blocks bad code
4. Feature is usable at this point

### Incremental Delivery

1. Setup → US1 (Pre-Commit) → Developers get immediate value
2. Add US4 (Commit-Msg) → Commit discipline enforced
3. Add US2 (Pre-Push) → Tests run before push
4. Add US3 (Test Audit) → Test quality enforced
5. Add US5 (Fix Suggestions) → Better developer experience
6. Each addition improves quality without breaking previous

---

## Task Summary

**Total Tasks**: 69

- **Phase 1 (Setup)**: 4 tasks
- **Phase 2 (US1 Pre-Commit)**: 8 tasks
- **Phase 3 (US4 Commit-Msg)**: 17 tasks (7 tests + 10 implementation)
- **Phase 4 (US2 Pre-Push)**: 10 tasks
- **Phase 5 (US3 Test Audit)**: 17 tasks (7 tests + 10 implementation)
- **Phase 6 (US5 Fix Suggestions)**: 7 tasks
- **Phase 7 (Polish)**: 6 tasks

**Parallel Opportunities**: 26 tasks marked [P]

---

## Notes

- [P] tasks = different files, no dependencies within phase
- [US#] label maps task to specific user story for traceability
- Constitution requires TDD - tests written first for TypeScript scripts
- Manual verification steps included for hook behavior
- Commit after each task or logical group following .claude/rules.md
- Stop at any checkpoint to validate story independently
