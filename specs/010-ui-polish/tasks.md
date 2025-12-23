# Implementation Tasks: UI Polish & Enhanced Interactions

**Feature**: UI Polish & Enhanced Interactions
**Branch**: `010-ui-polish`
**Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

## Overview

This task list implements 7 user stories for UI polish and enhanced interactions, organized in priority order (P1 → P2 → P3 → P4). Each user story is independently testable and delivers incremental value.

**Total Stories**: 7 (organized in 8 phases)
**Approach**: Test-Driven Development (tests before implementation)
**Target**: TypeScript 5.7, Next.js 16.0.10 App Router, React 19.2.3, Tailwind CSS 4.0.0

---

## Phase 1: Setup & Dependencies

**Purpose**: Install dependencies and configure project for UI polish features

- [ ] T001 Install canvas-confetti library with npm install canvas-confetti
- [ ] T002 Install canvas-confetti types with npm install --save-dev @types/canvas-confetti
- [ ] T003 Verify existing Tailwind CSS 4.0 configuration supports animations

**Checkpoint**: Dependencies installed, ready for implementation

---

## Phase 2: User Story 1 - Loading States (P1)

**Goal**: Add loading spinners to all pages for better perceived performance

**Independent Test**: Navigate to each page and observe loading spinner appears before content loads

**Why First**: Foundation for polished UX - users immediately see improved responsiveness

### Tests (Write First - TDD)

- [ ] T004 [P] [US1] Create unit test for LoadingSpinner component in tests/unit/components/ui/LoadingSpinner.test.tsx
- [ ] T005 [P] [US1] Create integration test for chat page loading in tests/integration/loading-states.test.ts
- [ ] T006 [P] [US1] Create integration test for quiz page loading in tests/integration/loading-states.test.ts
- [ ] T007 [P] [US1] Create integration test for settings page loading in tests/integration/loading-states.test.ts

### Implementation

- [ ] T008 [US1] Create LoadingSpinner component in components/ui/LoadingSpinner.tsx with accessibility attributes
- [ ] T009 [US1] Add loading state to chat page in app/(protected)/chat/page.tsx with Suspense boundary
- [ ] T010 [US1] Add loading state to quiz page in app/(protected)/quiz/page.tsx with Suspense boundary
- [ ] T011 [US1] Add loading state to settings page in app/(protected)/settings/page.tsx with Suspense boundary

### Verification

- [ ] T012 [US1] Run unit tests for LoadingSpinner and verify all pass
- [ ] T013 [US1] Run integration tests for all page loading states and verify all pass
- [ ] T014 [US1] Manual test: Navigate to chat/quiz/settings and confirm 100ms loading feedback

**Checkpoint**: Loading spinners working on all 3 pages, tests passing

---

## Phase 3: User Story 2 - Dark Mode Contrast (P1)

**Goal**: Fix dark mode contrast issues for WCAG AA compliance

**Independent Test**: Switch to dark mode and verify all text meets 4.5:1 (normal) or 3:1 (large) contrast ratio

**Why Second**: Critical accessibility issue affecting all dark mode users

### Tests (Write First - TDD)

- [ ] T015 [P] [US2] Create contrast compliance test in tests/integration/dark-mode-contrast.test.ts for settings page
- [ ] T016 [P] [US2] Create contrast compliance test in tests/integration/dark-mode-contrast.test.ts for chat page
- [ ] T017 [P] [US2] Create contrast compliance test in tests/integration/dark-mode-contrast.test.ts for quiz page

### Implementation

- [ ] T018 [US2] Audit and fix settings page dark mode text contrast in app/(protected)/settings/page.tsx (4.5:1 minimum)
- [ ] T019 [US2] Audit and fix settings page UI component contrast in components/settings/ (3:1 minimum for buttons/borders)
- [ ] T020 [US2] Add dark mode contrast fixes to globals.css for text colors (gray-200 instead of gray-400)
- [ ] T021 [US2] Audit and fix chat page dark mode contrast in app/(protected)/chat/page.tsx
- [ ] T022 [US2] Audit and fix quiz page dark mode contrast in app/(protected)/quiz/page.tsx

### Verification

- [ ] T023 [US2] Run contrast compliance tests and verify all pass
- [ ] T024 [US2] Manual test: Toggle dark mode on all pages and verify visibility with browser DevTools contrast checker

**Checkpoint**: All pages pass WCAG AA contrast requirements in dark mode

---

## Phase 4: User Story 3 - Page Transitions (P2)

**Goal**: Add smooth 300ms fade transitions between all pages

**Independent Test**: Navigate between pages and observe smooth fade transition with ease-out easing

**Why Third**: Enhances perceived quality after foundational P1 items complete

### Tests (Write First - TDD)

- [ ] T025 [P] [US3] Create unit test for PageTransition component in tests/unit/components/ui/PageTransition.test.tsx
- [ ] T026 [P] [US3] Create E2E test for page transitions in tests/e2e/page-transitions.spec.ts

### Implementation

- [ ] T027 [US3] Create PageTransition component in components/ui/PageTransition.tsx with 300ms fade and ease-out
- [ ] T028 [US3] Add transition styles to app/globals.css (.transition-opacity duration-300 ease-out)
- [ ] T029 [US3] Add prefers-reduced-motion media query to app/globals.css (disable animations when enabled)
- [ ] T030 [US3] Wrap protected layout with PageTransition in app/(protected)/layout.tsx
- [ ] T031 [US3] Implement transition interruption handling in components/ui/PageTransition.tsx

### Verification

- [ ] T032 [US3] Run PageTransition unit tests and verify all pass
- [ ] T033 [US3] Run E2E transition tests and verify all pass
- [ ] T034 [US3] Manual test: Navigate rapidly between pages and verify smooth 300ms transitions

**Checkpoint**: Smooth page transitions working, interruptible, respect reduced-motion

---

## Phase 5: User Story 4 - Card Flip Animation (P2)

**Goal**: Add 3D Y-axis flip animation to flashcards (600ms, ease-out)

**Independent Test**: Click "Show Answer" and observe smooth 3D Y-axis flip with 600ms duration

**Why Fourth**: Significantly improves quiz experience after basic transitions

### Tests (Write First - TDD)

- [ ] T035 [P] [US4] Create unit test for QuizCard flip animation in tests/unit/components/quiz/QuizCard.test.tsx
- [ ] T036 [P] [US4] Create E2E test for card flip in tests/e2e/quiz-card-flip.spec.ts

### Implementation

- [ ] T037 [US4] Add 3D flip CSS classes to app/globals.css (.flip-card, .flip-card-inner with preserve-3d)
- [ ] T038 [US4] Add flip animation state management to components/quiz/QuizCard.tsx (Y-axis rotation, 600ms)
- [ ] T039 [US4] Implement ease-out easing for flip animation in components/quiz/QuizCard.tsx
- [ ] T040 [US4] Add CSS 3D transform feature detection in components/quiz/QuizCard.tsx
- [ ] T041 [US4] Implement 2D fallback animation (fade) for unsupported browsers in components/quiz/QuizCard.tsx
- [ ] T042 [US4] Disable flip interaction during animation in components/quiz/QuizCard.tsx

### Verification

- [ ] T043 [US4] Run QuizCard unit tests and verify all pass
- [ ] T044 [US4] Run E2E flip tests and verify all pass
- [ ] T045 [US4] Manual test: Click show answer and verify 600ms Y-axis flip at 60fps

**Checkpoint**: Card flip animation working with 3D transforms and 2D fallback

---

## Phase 6: User Story 5 - Card Stack Effect (P3)

**Goal**: Add 3D card stack visualization (current + up to 2 behind, adaptive)

**Independent Test**: View quiz with 3+ cards and observe 2 cards stacked behind with perspective

**Why Fifth**: Visual enhancement after core animations complete

### Tests (Write First - TDD)

- [ ] T046 [P] [US5] Create unit test for card stack rendering in tests/unit/components/quiz/QuizInterface.test.tsx
- [ ] T047 [P] [US5] Create E2E test for card stack with various card counts in tests/e2e/quiz-card-stack.spec.ts

### Implementation

- [ ] T048 [US5] Add card stack CSS to app/globals.css (transform translateY/scale, z-index)
- [ ] T049 [US5] Implement adaptive card stack logic in components/quiz/QuizInterface.tsx (show min(2, remaining))
- [ ] T050 [US5] Add 3D perspective effect to card stack in components/quiz/QuizInterface.tsx
- [ ] T051 [US5] Implement 2D fallback stack (opacity/scale) for unsupported browsers in components/quiz/QuizInterface.tsx
- [ ] T052 [US5] Add ease-out animation for stack updates in components/quiz/QuizInterface.tsx

### Verification

- [ ] T053 [US5] Run QuizInterface unit tests and verify all pass
- [ ] T054 [US5] Run E2E stack tests with 1, 2, 3, and 50 cards and verify all pass
- [ ] T055 [US5] Manual test: View quiz with different card counts and verify adaptive stack (3 total max)

**Checkpoint**: Card stack effect working with adaptive count and 3D perspective

---

## Phase 7: User Story 6 - Navigation Arrows (P3)

**Goal**: Add bi-directional navigation arrows with wrapping (first ↔ last)

**Independent Test**: Click arrows to navigate and verify wrapping works (last→first, first→last)

**Why Sixth**: Navigation enhancement builds on card stack visualization

### Tests (Write First - TDD)

- [ ] T056 [P] [US6] Create unit test for navigation arrows in tests/unit/components/quiz/QuizInterface.test.tsx
- [ ] T057 [P] [US6] Create integration test for arrow wrapping in tests/integration/quiz-navigation.test.ts

### Implementation

- [ ] T058 [US6] Add navigation arrow UI to components/quiz/QuizInterface.tsx (left/right buttons)
- [ ] T059 [US6] Implement forward navigation logic in components/quiz/QuizInterface.tsx (next or wrap to first)
- [ ] T060 [US6] Implement backward navigation logic in components/quiz/QuizInterface.tsx (previous or wrap to last)
- [ ] T061 [US6] Add hover feedback styles for arrows in app/globals.css
- [ ] T062 [US6] Implement unrated card tracking in components/quiz/QuizInterface.tsx (cards remain in queue until rated)
- [ ] T063 [US6] Update completion detection to require all cards rated in components/quiz/QuizInterface.tsx

### Verification

- [ ] T064 [US6] Run navigation arrow unit tests and verify all pass
- [ ] T065 [US6] Run integration wrapping tests and verify all pass
- [ ] T066 [US6] Manual test: Navigate through cards with arrows and verify wrapping behavior

**Checkpoint**: Navigation arrows working with wrapping and unrated card tracking

---

## Phase 8: User Story 7 - Confetti Animation (P4)

**Goal**: Add celebratory confetti animation when completing last card

**Independent Test**: Rate the final card and observe 2-3 second confetti animation

**Why Last**: Delight factor - lowest priority enhancement

### Tests (Write First - TDD)

- [ ] T067 [P] [US7] Create unit test for confetti trigger in tests/unit/components/quiz/QuizInterface.test.tsx
- [ ] T068 [P] [US7] Create E2E test for confetti on completion in tests/e2e/quiz-completion.spec.ts

### Implementation

- [ ] T069 [US7] Create confetti wrapper in lib/animations/confetti.ts with canvas-confetti integration
- [ ] T070 [US7] Add graceful failure handling to lib/animations/confetti.ts (try/catch, console.warn)
- [ ] T071 [US7] Trigger confetti on last card completion in components/quiz/QuizInterface.tsx
- [ ] T072 [US7] Implement 2-3 second auto-cleanup for confetti in components/quiz/QuizInterface.tsx
- [ ] T073 [US7] Add prefers-reduced-motion detection to confetti trigger in lib/animations/confetti.ts

### Verification

- [ ] T074 [US7] Run confetti unit tests and verify all pass
- [ ] T075 [US7] Run E2E completion tests and verify all pass
- [ ] T076 [US7] Manual test: Complete quiz and verify confetti triggers 100% of time

**Checkpoint**: Confetti animation working on quiz completion with graceful degradation

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Final polish, accessibility, and cross-browser compatibility

- [ ] T077 [P] Add comprehensive prefers-reduced-motion support across all animations in app/globals.css
- [ ] T078 [P] Add CSS 3D transform feature detection script in lib/utils/feature-detection.ts
- [ ] T079 [P] Verify all animations use ease-out easing consistently in app/globals.css
- [ ] T080 [P] Add loading state for canvas-confetti library import in lib/animations/confetti.ts
- [ ] T081 Test all animations at 60fps with browser DevTools performance profiler
- [ ] T082 Test WCAG AA contrast compliance across all pages with axe DevTools
- [ ] T083 Test animations with prefers-reduced-motion enabled (all should disable)
- [ ] T084 Test CSS 3D transform fallbacks in browsers without support
- [ ] T085 Run full test suite (unit, integration, E2E) and verify all tests pass
- [ ] T086 Update CLAUDE.md with canvas-confetti library if not already added

**Checkpoint**: All polish complete, tests passing, production-ready

---

## Dependencies & Execution Order

### User Story Dependencies

**Independent Stories** (can implement in any order within priority tier):

- US1 (Loading States) - No dependencies
- US2 (Dark Mode Contrast) - No dependencies
- US3 (Page Transitions) - No dependencies
- US4 (Card Flip) - No dependencies
- US5 (Card Stack) - No dependencies (standalone visual effect)
- US6 (Navigation Arrows) - No dependencies (standalone navigation)
- US7 (Confetti) - Depends on US6 (needs completion detection logic)

**Recommended Order** (by priority):

1. **P1 Tier**: US1, US2 (parallel) → Foundation for polished UX
2. **P2 Tier**: US3, US4 (parallel) → Core animations
3. **P3 Tier**: US5, US6 (parallel) → Enhanced interactions
4. **P4 Tier**: US7 → Delight factor

### Parallel Execution Examples

**Phase 2 (US1) - 4 parallel test tasks**:

```bash
T004, T005, T006, T007 can run in parallel (different test files)
```

**Phase 3 (US2) - 3 parallel test tasks**:

```bash
T015, T016, T017 can run in parallel (different test files)
```

**Phase 4 (US3) - 2 parallel test tasks**:

```bash
T025, T026 can run in parallel (unit vs E2E)
```

**P1 Tier (US1 + US2) - Can implement in parallel**:

```bash
After T003, split team:
- Developer A: T004-T014 (Loading States)
- Developer B: T015-T024 (Dark Mode Contrast)
```

**P2 Tier (US3 + US4) - Can implement in parallel**:

```bash
After P1 complete, split team:
- Developer A: T025-T034 (Page Transitions)
- Developer B: T035-T045 (Card Flip)
```

---

## Implementation Strategy

### MVP (Minimum Viable Product)

**Scope**: User Story 1 only (Loading States)

- **Why**: Foundation for perceived performance improvement
- **Tasks**: T001-T014 (14 tasks)
- **Value**: Immediate UX improvement, independently testable

### Incremental Delivery

**Release 1** (P1 - Foundation):

- US1: Loading States (T001-T014)
- US2: Dark Mode Contrast (T015-T024)
- **Value**: Responsive feel + accessibility compliance

**Release 2** (P2 - Core Animations):

- US3: Page Transitions (T025-T034)
- US4: Card Flip (T035-T045)
- **Value**: Professional polish + engaging quiz experience

**Release 3** (P3 - Enhanced Interactions):

- US5: Card Stack (T046-T055)
- US6: Navigation Arrows (T056-T066)
- **Value**: Visual depth + navigation flexibility

**Release 4** (P4 - Delight):

- US7: Confetti (T067-T076)
- Polish Phase (T077-T086)
- **Value**: Gamification + production-ready quality

---

## Testing Strategy

### Test-First Approach (TDD)

**ALL tests must be written BEFORE implementation**:

1. Write failing test (Red)
2. Implement minimum code to pass (Green)
3. Refactor while keeping tests green (Refactor)

### Test Coverage by Type

**Unit Tests** (components in isolation):

- LoadingSpinner rendering and accessibility
- PageTransition fade behavior
- QuizCard flip animation state
- QuizInterface stack/arrows/confetti logic

**Integration Tests** (component interactions):

- Page loading states across all pages
- Dark mode contrast compliance
- Navigation arrow wrapping behavior

**E2E Tests** (full user journeys):

- Page transition smoothness (Playwright)
- Card flip visual correctness
- Card stack rendering with various counts
- Confetti trigger on completion

### Performance Testing

- All animations must maintain 60fps (measured with Chrome DevTools)
- Page transitions must complete within 300ms
- Card flip must complete within 600ms
- Loading feedback must appear within 100ms

---

## Acceptance Criteria Validation

Each user story is complete when:

**US1**: ✓ Loading spinners appear within 100ms on all 3 pages
**US2**: ✓ All text/UI passes WCAG AA contrast (4.5:1 text, 3:1 UI components)
**US3**: ✓ Page transitions complete in 300ms with ease-out, are interruptible
**US4**: ✓ Card flips in 600ms on Y-axis at 60fps with ease-out
**US5**: ✓ Adaptive card stack (up to 3 cards) with 3D perspective or 2D fallback
**US6**: ✓ Navigation arrows navigate and wrap (first↔last), track unrated cards
**US7**: ✓ Confetti triggers 100% on completion, clears after 2-3 seconds

---

## Task Summary

**Total Tasks**: 86
**Setup Phase**: 3 tasks
**User Story Phases**: 73 tasks (8 stories × ~9 tasks average)
**Polish Phase**: 10 tasks

**Task Breakdown by Story**:

- Setup: 3 tasks
- US1 (Loading States): 11 tasks
- US2 (Dark Mode Contrast): 10 tasks
- US3 (Page Transitions): 10 tasks
- US4 (Card Flip): 11 tasks
- US5 (Card Stack): 10 tasks
- US6 (Navigation Arrows): 11 tasks
- US7 (Confetti): 10 tasks
- Polish: 10 tasks

**Parallel Opportunities**: 35+ tasks marked with [P] can run in parallel

**Estimated Completion**:

- MVP (US1 only): 14 tasks
- P1 Foundation (US1+US2): 24 tasks
- P2 Core (US1-4): 44 tasks
- Full Feature (US1-7 + Polish): 86 tasks

---

**Next Steps**: Begin with T001 (install canvas-confetti) and proceed through each phase in order, completing tests before implementation per TDD methodology.
