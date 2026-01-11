# Tasks: Landing Page

**Input**: Design documents from `/specs/029-landing-page/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: E2E tests included (Playwright) as they are essential for verifying routing and auth redirect behavior.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Next.js App Router**: `app/`, `components/` at repository root
- **Tests**: `tests/e2e/` for Playwright, `tests/unit/` for Vitest

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Create component directory structure

- [x] T001 Create landing components directory at `components/landing/`
- [x] T002 Create barrel export file at `components/landing/index.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: No foundational tasks required - landing page uses existing auth infrastructure

**⚠️ NOTE**: This feature has no blocking prerequisites. All user stories can proceed immediately after setup.

**Checkpoint**: Setup ready - user story implementation can begin

---

## Phase 3: User Story 1 - Discover Loopi Value Proposition (Priority: P1) 🎯 MVP

**Goal**: First-time visitors immediately understand what Loopi does and why it's valuable

**Independent Test**: Visit homepage as non-logged-in user, verify value proposition is visible and clear

### Tests for User Story 1

- [x] T003 [P] [US1] E2E test: unauthenticated user sees landing page at root URL in `tests/e2e/landing-page.spec.ts`

### Implementation for User Story 1

- [x] T004 [P] [US1] Create HeroSection component with headline, subheadline, and logo in `components/landing/HeroSection.tsx`
- [x] T005 [P] [US1] Create BenefitsSection component with 3 benefits grid in `components/landing/BenefitsSection.tsx`
- [x] T006 [US1] Update barrel export to include HeroSection and BenefitsSection in `components/landing/index.ts`
- [x] T007 [US1] Update root page to render landing for unauthenticated users in `app/page.tsx`

**Checkpoint**: User Story 1 complete - visitors see value proposition on landing page

---

## Phase 4: User Story 2 - Learn How Loopi Works (Priority: P2)

**Goal**: Visitors can view a tutorial explaining the learning process

**Independent Test**: Navigate to landing page and verify "How It Works" section explains the 3-step process

### Tests for User Story 2

- [x] T008 [P] [US2] E2E test: How It Works section visible with 3 steps in `tests/e2e/landing-page.spec.ts`

### Implementation for User Story 2

- [x] T009 [US2] Create HowItWorksSection component with 3 numbered steps in `components/landing/HowItWorksSection.tsx`
- [x] T010 [US2] Update barrel export to include HowItWorksSection in `components/landing/index.ts`
- [x] T011 [US2] Add HowItWorksSection to landing page in `app/page.tsx`

**Checkpoint**: User Story 2 complete - visitors can learn how Loopi works

---

## Phase 5: User Story 3 - Navigate to Authentication (Priority: P1)

**Goal**: Visitors can easily find and use signup and login links

**Independent Test**: Verify signup/login links are visible and navigate to correct pages

### Tests for User Story 3

- [x] T012 [P] [US3] E2E test: CTA buttons navigate to /signup and /login in `tests/e2e/landing-page.spec.ts`

### Implementation for User Story 3

- [x] T013 [US3] Create CTASection component with signup button in `components/landing/CTASection.tsx`
- [x] T014 [US3] Update barrel export to include CTASection in `components/landing/index.ts`
- [x] T015 [US3] Add CTASection to landing page in `app/page.tsx`
- [x] T016 [US3] Ensure HeroSection has both "Get Started" and "Sign In" links in `components/landing/HeroSection.tsx`

**Checkpoint**: User Story 3 complete - visitors can navigate to auth pages

---

## Phase 6: User Story 4 - Logged-in User Redirect (Priority: P2)

**Goal**: Logged-in users are redirected to dashboard instead of seeing landing page

**Independent Test**: Log in, visit root URL, verify redirect to /goals

### Tests for User Story 4

- [x] T017 [US4] E2E test: authenticated user redirected from / to /goals in `tests/e2e/landing-page.spec.ts`

### Implementation for User Story 4

- [x] T018 [US4] Verify auth check and redirect logic in `app/page.tsx` (should already be implemented from T007)

**Checkpoint**: User Story 4 complete - authenticated users bypass landing page

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [x] T019 [P] Verify dark mode styling works correctly across all sections
- [x] T020 [P] Verify responsive layout at mobile/tablet/desktop breakpoints
- [x] T021 [P] Add page metadata (title, description) for SEO in `app/page.tsx`
- [x] T022 Verify page load performance (<3 seconds per SC-001)
- [x] T023 Run full E2E test suite to ensure all tests pass

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: N/A - no foundational tasks needed
- **User Stories (Phase 3-6)**: Can proceed after Setup (Phase 1)
  - US1 and US3 are both P1 priority - implement US1 first (value prop before CTAs)
  - US2 and US4 are both P2 priority
- **Polish (Phase 7)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: No dependencies - creates initial landing page structure
- **User Story 3 (P1)**: Builds on US1 components (HeroSection already created)
- **User Story 2 (P2)**: Independent - adds new section
- **User Story 4 (P2)**: Verifies redirect logic (already implemented in US1)

### Within Each User Story

- Tests SHOULD be written and FAIL before implementation
- Components before page integration
- Barrel exports updated after component creation

### Parallel Opportunities

- T004 and T005 (HeroSection and BenefitsSection) can run in parallel
- All E2E tests can be written in parallel as separate test cases in the same file
- Polish tasks T019, T020, T021 can run in parallel

---

## Parallel Example: User Story 1

```bash
# Launch all parallelizable tasks for User Story 1 together:
Task: T003 "E2E test: unauthenticated user sees landing page" (writes test)
Task: T004 "Create HeroSection component" (new file)
Task: T005 "Create BenefitsSection component" (new file)

# Then sequentially:
Task: T006 "Update barrel export" (depends on T004, T005)
Task: T007 "Update root page" (depends on T006)
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 3: User Story 1 (value proposition)
3. **STOP and VALIDATE**: Test landing page renders for unauthenticated users
4. Deploy/demo if ready - visitors see what Loopi is about

### Incremental Delivery

1. Complete Setup → Structure ready
2. Add User Story 1 → Value proposition visible → MVP!
3. Add User Story 3 → Auth CTAs work → Users can sign up
4. Add User Story 2 → Tutorial visible → Users understand workflow
5. Add User Story 4 → Redirect works → Clean UX for logged-in users
6. Polish → Performance, SEO, responsive verified

### Recommended Order

Since US1 and US3 are both P1, and US3 depends on US1 components:

1. **US1 first** (creates page structure and main components)
2. **US3 second** (adds CTAs to existing components)
3. **US2** (adds independent section)
4. **US4** (verification only - logic implemented in US1)

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story is independently testable
- All components are server components (no 'use client' needed)
- Commit after each task adhering to .claude/rules.md
- Total: 23 tasks across 7 phases
