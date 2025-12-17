# Implementation Plan: Claude API Integration with User API Keys

**Branch**: `004-claude-api` | **Date**: 2025-12-17 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/004-claude-api/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Enable users to bring their own Claude API keys for AI-powered chat and flashcard generation, with secure storage and graceful fallback to Ollama. Users enter their API key through a dedicated settings page, keys are encrypted at rest using PostgreSQL pgcrypto, and each message displays which AI provider generated it. When API keys fail, users receive clear error messages and can choose to fix their key or fall back to Ollama.

## Technical Context

**Language/Version**: TypeScript 5.7 (strict mode), Next.js 16.0.10 App Router
**Primary Dependencies**:
- Next.js 16.0.10 (React 19.2.3)
- NextAuth.js 5.0.0-beta.30 (JWT sessions)
- Drizzle ORM 0.45.1 (PostgreSQL)
- @anthropic-ai/sdk 0.71.2 (already installed, currently unused)
- Zod 4.2.0 (validation)
- bcryptjs 3.0.3 (password hashing)

**Storage**: PostgreSQL on Supabase with pgvector (0.2.1) for vector embeddings (768 dimensions)
**Testing**: Vitest 4.0.15 (unit/integration), Playwright 1.57.0 (E2E), @testing-library/react 16.3.1
**Target Platform**: Web application (Node.js 18+, browser client)
**Project Type**: Web (Next.js App Router with /app directory, API routes at /app/api)
**Performance Goals**: API key validation <3s (per SC-004), chat streaming enabled
**Constraints**: Server-side only API key storage (no client exposure per FR-012), encryption at rest required (FR-002)
**Scale/Scope**: 5 user stories (2 P1, 2 P2, 1 P3), 15 functional requirements, dedicated /settings route

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

✅ **Documentation-First Development** (Principle I)
- Feature spec complete at `specs/004-claude-api/spec.md`
- 5 user stories with Given/When/Then acceptance criteria
- 15 functional requirements (FR-001 through FR-015)
- 7 measurable success criteria
- Clarifications completed via /speckit.clarify (5 questions answered)

✅ **Test-First Development** (Principle II)
- Tasks will include test creation before implementation
- Contract tests required for new API endpoints (/api/settings/api-key)
- Component tests for Settings page UI
- Integration tests for Claude API client with user keys
- E2E tests for complete user flows (enter key → use in chat)

✅ **Modularity & Composability** (Principle III)
- User stories are independently testable and deliverable
- P1 stories (Enter API Key + Use Claude API) can be tested in isolation
- Settings page is self-contained component at /app/(protected)/settings
- API key encryption handled in dedicated service layer
- Provider routing logic isolated in lib/claude client

✅ **Simplicity (YAGNI)** (Principle IV)
- No complexity violations identified
- Leveraging existing patterns: NextAuth sessions, Drizzle ORM, API routes
- Reusing existing UI components (forms, buttons from auth pages)
- No new architectural patterns required
- Database encryption uses built-in PostgreSQL pgcrypto (no external service)

✅ **Observability & Debugging** (Principle V)
- Structured logging for API key operations (create, update, delete, validation)
- Error messages with actionable context (FR-010: "Authentication failed", "Quota exceeded")
- Provider tracking in message metadata (FR-014)
- Text-based API contracts (OpenAPI/JSON schema)

✅ **Atomic Commits & Version Control Discipline** (Principle VI)
- Implementation will follow .claude/rules.md commit guidelines
- One logical change per commit
- Imperative mood commit messages under 100 characters
- Co-Authored-By tags for AI collaboration
- No AI attribution in commit subjects

**Status**: ✅ ALL GATES PASSED - Proceed to Phase 0 research

---

## Phase 2 Constitution Re-Check

*Re-evaluated after completing Phase 1 design artifacts*

✅ **Documentation-First Development** (Principle I)
- Complete design artifacts created: research.md, data-model.md, contracts/api-key.yaml, quickstart.md
- No NEEDS CLARIFICATION markers remaining in plan
- All technical decisions documented with rationale

✅ **Test-First Development** (Principle II)
- Quickstart.md outlines TDD workflow (write failing tests → implement → verify)
- Contract tests specified for API endpoints
- Component tests specified for UI components
- Integration tests specified for Claude client
- E2E tests specified for complete user flows

✅ **Modularity & Composability** (Principle III)
- Clean separation: encryption service, database operations, API routes, UI components
- Provider abstraction enables independent testing of Claude vs Ollama
- Settings page self-contained, no coupling to chat/quiz features
- User stories remain independently deliverable

✅ **Simplicity (YAGNI)** (Principle IV)
- No new complexity introduced in design phase
- Leveraging existing patterns throughout
- Database-level encryption chosen over external services
- API Routes maintain consistency with existing codebase

✅ **Observability & Debugging** (Principle V)
- Provider tracking in messages table enables audit trail
- Logging specified for encryption operations, API calls, validation
- Error messages designed for actionability
- OpenAPI contract provides clear API documentation

✅ **Atomic Commits & Version Control Discipline** (Principle VI)
- Quickstart.md demonstrates atomic commit examples
- Each feature component commits separately
- Follows .claude/rules.md guidelines

**Final Status**: ✅ ALL GATES PASSED - Ready for implementation (/speckit.tasks)

## Project Structure

### Documentation (this feature)

```text
specs/[###-feature]/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
app/
├── (auth)/                    # Public authentication routes
│   ├── login/
│   └── signup/
├── (protected)/              # Authenticated routes
│   ├── chat/                # Existing chat interface
│   ├── quiz/                # Existing quiz interface
│   └── settings/            # NEW - Settings page with API key management
│       └── page.tsx
└── api/                     # API routes
    ├── auth/
    ├── chat/
    ├── flashcards/
    ├── quiz/
    └── settings/            # NEW - API key CRUD endpoints
        └── api-key/
            └── route.ts

components/
├── auth/                    # Existing auth components
├── chat/                    # Existing chat components
├── quiz/                    # Existing quiz components
└── settings/                # NEW - Settings UI components
    ├── ApiKeyForm.tsx      # Form for entering/updating API key
    ├── ApiKeyDisplay.tsx   # Masked display of saved key
    └── ProviderBadge.tsx   # Badge showing Claude API vs Ollama

lib/
├── auth/                    # Existing NextAuth helpers
├── claude/                  # AI integration layer
│   ├── client.ts           # MODIFY - Add Anthropic client with user keys
│   ├── flashcard-generator.ts # MODIFY - Support user API keys
│   └── prompts.ts          # Existing prompts
├── db/
│   ├── drizzle-schema.ts   # MODIFY - Add api_keys table
│   └── operations/
│       └── api-keys.ts     # NEW - CRUD for encrypted API keys
├── encryption/              # NEW - pgcrypto wrapper
│   └── api-key.ts
└── types/
    └── api-key.ts          # NEW - API key types

tests/
├── contract/               # API contract tests
│   └── settings/
│       └── api-key.test.ts # NEW
├── integration/
│   └── claude/
│       └── user-keys.test.ts # NEW
├── component/
│   └── settings/
│       ├── ApiKeyForm.test.tsx # NEW
│       └── ProviderBadge.test.tsx # NEW
└── e2e/
    └── settings/
        └── api-key-flow.spec.ts # NEW
```

**Structure Decision**: Next.js App Router with TypeScript. Protected routes use route groups `(protected)` with middleware authentication. API routes follow RESTful conventions. Database operations centralized in `/lib/db/operations/`. UI components organized by feature domain. Testing mirrors source structure with separation by test type (contract/integration/component/e2e).

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

No complexity violations identified. This feature follows existing patterns and requires no new architectural complexity.
