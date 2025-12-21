# Implementation Plan: Pre-Commit Quality Hooks

**Branch**: `008-pre-commit-hooks` | **Date**: 2025-12-21 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/008-pre-commit-hooks/spec.md`

## Summary

Implement comprehensive git hooks for code quality enforcement: pre-commit hooks for type checking, linting, formatting, and commit message validation; pre-push hooks for running unit/integration tests with test quality auditing. Uses Husky for hook management with lint-staged for efficient staged-file-only validation.

## Technical Context

**Language/Version**: TypeScript 5.7, Node.js 20+, Bash (for hook scripts)
**Primary Dependencies**: Husky (hook management), lint-staged (staged file operations), commitlint (commit message validation)
**Storage**: N/A (hooks are stateless)
**Testing**: Vitest (unit), Vitest integration config (integration), Playwright (e2e - CI only)
**Target Platform**: Local development environment (macOS, Linux)
**Project Type**: Web application (Next.js)
**Performance Goals**: Pre-commit < 30 seconds, Pre-push < 5 minutes (per SC-003, SC-004)
**Constraints**: Must work with existing .githooks pattern, zero manual setup after npm install
**Scale/Scope**: Single developer workflow, ~27 existing test files

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Documentation-First | ✅ PASS | Spec complete with 5 user stories, 17 FRs, 10 SCs |
| II. Test-First (TDD) | ✅ PASS | Tests will be written for hook scripts and commit-msg parser |
| III. Modularity | ✅ PASS | Separate hooks (pre-commit, commit-msg, pre-push), modular validation scripts |
| IV. Simplicity (YAGNI) | ✅ PASS | Using established tools (Husky, lint-staged) vs custom implementation |
| V. Observability | ✅ PASS | Clear error messages with actionable output (FR-005) |
| VI. Atomic Commits | ✅ PASS | This feature enforces commit discipline via commit-msg hook |

**Gate Result**: ✅ PASS - No violations requiring justification

## Project Structure

### Documentation (this feature)

```text
specs/008-pre-commit-hooks/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output (minimal - no APIs)
└── tasks.md             # Phase 2 output (/speckit.tasks command)
```

### Source Code (repository root)

```text
.githooks/
├── pre-commit           # NEW: Type check, lint, format staged files
├── commit-msg           # NEW: Validate commit message format
└── pre-push             # EXISTING + MODIFY: Add test audit, run unit/integration tests

scripts/
├── hooks/
│   ├── test-audit.ts    # NEW: Analyze tests for meaningful assertions
│   └── commit-msg-validator.ts  # NEW: Validate against .claude/rules.md
└── install-hooks.sh     # NEW: npm postinstall hook setup

.husky/                  # NEW: Husky configuration (if using Husky)
├── pre-commit
├── commit-msg
└── pre-push

.lintstagedrc.json       # NEW: lint-staged configuration
commitlint.config.js     # NEW: commitlint configuration (or custom validator)
```

**Structure Decision**: Extend existing `.githooks/` pattern. Add helper scripts under `scripts/hooks/` for complex validation logic (test audit, commit message parsing). Hook scripts remain bash for portability, calling TypeScript scripts via tsx for complex logic.

## Complexity Tracking

> No violations requiring justification. Using established npm ecosystem tools (Husky, lint-staged, commitlint) rather than custom implementations.

