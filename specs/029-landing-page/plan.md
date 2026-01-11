# Implementation Plan: Landing Page

**Branch**: `029-landing-page` | **Date**: 2026-01-11 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/029-landing-page/spec.md`

## Summary

Create a public landing page for Loopi that displays value proposition, a "How It Works" tutorial, and authentication CTAs. Non-authenticated users see the landing page at root URL; authenticated users are redirected to their goals dashboard. Uses existing Next.js App Router patterns with server-side auth checks.

## Technical Context

**Language/Version**: TypeScript 5.7.0, Node.js 20+
**Primary Dependencies**: Next.js 16.0.10, React 19.2.3, Tailwind CSS 4.0.0, NextAuth 5.0.0-beta.30
**Storage**: N/A (landing page is static content, no database interaction)
**Testing**: Vitest (unit), Playwright (E2E)
**Target Platform**: Web (responsive: mobile-first, desktop-optimized)
**Project Type**: Web application (Next.js App Router)
**Performance Goals**: <3 second page load (SC-001), 10-second value comprehension (SC-002)
**Constraints**: Must work without JavaScript (SSR), accessible (WCAG 2.1 AA), dark mode support
**Scale/Scope**: Single page with 4 sections (hero, benefits, tutorial, CTA)

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principle              | Status     | Evidence                                                                         |
| ---------------------- | ---------- | -------------------------------------------------------------------------------- |
| I. Documentation-First | ✅ PASS    | Spec complete with 4 user stories, 9 functional requirements, 5 success criteria |
| II. Test-First (TDD)   | ✅ PLANNED | E2E tests for routing, visual regression for layout in tasks                     |
| III. Modularity        | ✅ PASS    | Landing page is self-contained, uses existing auth module                        |
| IV. Simplicity (YAGNI) | ✅ PASS    | Static content, no new abstractions, reuses existing patterns                    |
| V. Observability       | ✅ PASS    | Server-side rendering, standard logging via Next.js                              |
| VI. Atomic Commits     | ✅ PLANNED | Will follow .claude/rules.md for all commits                                     |

**Gate Status**: PASSED - Proceed to Phase 0

## Project Structure

### Documentation (this feature)

```text
specs/029-landing-page/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output (minimal - no data model needed)
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   └── landing-page-contract.md
└── tasks.md             # Phase 2 output (/speckit.tasks command)
```

### Source Code (repository root)

```text
app/
├── page.tsx                    # MODIFY: Update redirect logic for unauthenticated users
├── (landing)/                  # NEW: Landing page route group
│   └── page.tsx               # NEW: Landing page component (server component)
├── (auth)/                     # EXISTING: Auth pages (login, signup)
└── (protected)/                # EXISTING: Protected routes

components/
├── landing/                    # NEW: Landing page components
│   ├── HeroSection.tsx        # NEW: Hero with headline, value prop, primary CTA
│   ├── BenefitsSection.tsx    # NEW: Key benefits grid
│   ├── HowItWorksSection.tsx  # NEW: 3-step tutorial
│   └── CTASection.tsx         # NEW: Final call-to-action
└── ui/
    └── Logo.tsx               # EXISTING: Reuse for landing page header

tests/
├── e2e/
│   └── landing-page.spec.ts   # NEW: E2E tests for landing page flows
└── unit/
    └── components/
        └── landing/           # NEW: Unit tests for landing components
```

**Structure Decision**: Using Next.js App Router route groups. Landing page placed in `(landing)` group to keep it separate from `(auth)` and `(protected)` groups while maintaining clean URL at root.

## Complexity Tracking

> No constitution violations - landing page is straightforward static content using existing patterns.

| Aspect              | Decision             | Rationale                                                  |
| ------------------- | -------------------- | ---------------------------------------------------------- |
| Route structure     | `(landing)/page.tsx` | Follows existing pattern of route groups                   |
| Component structure | 4 section components | Matches natural page sections, enables independent testing |
| State management    | None                 | Static content, auth check only                            |
| Styling             | Tailwind CSS only    | Matches existing codebase, no new dependencies             |

## Phase 0: Research

### Existing Patterns Analysis

**Auth Check Pattern** (from `app/(auth)/login/page.tsx`):

```typescript
import { auth } from '@/auth'
import { redirect } from 'next/navigation'

export default async function Page() {
  const session = await auth()
  if (session) {
    redirect('/goals')
  }
  // ... render page
}
```

**Layout Pattern** (from `app/(auth)/login/page.tsx`):

```typescript
<div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900 px-4 py-12 sm:px-6 lg:px-8">
  <div className="w-full max-w-md space-y-8">
    {/* content */}
  </div>
</div>
```

**Logo Usage** (from `components/ui/Logo.tsx`):

```typescript
import Logo from '@/components/ui/Logo'
<Logo showText={true} size="lg" />
```

### Design System Reference

- **Colors**: `bg-gray-50 dark:bg-gray-900` (background), `text-gray-900 dark:text-gray-100` (text)
- **Accents**: `bg-blue-600 hover:bg-blue-700` (primary buttons)
- **Typography**: `text-4xl font-bold` (h1), `text-xl` (subheadings), `text-base` (body)
- **Spacing**: `space-y-8`, `py-12 sm:py-16 lg:py-24`
- **Responsive**: `sm:`, `md:`, `lg:` breakpoint prefixes

### Key Files to Reference

| File                         | Purpose                            |
| ---------------------------- | ---------------------------------- |
| `app/(auth)/login/page.tsx`  | Layout pattern, auth check pattern |
| `app/(auth)/signup/page.tsx` | CTA styling, form layout           |
| `components/ui/Logo.tsx`     | Logo component API                 |
| `app/page.tsx`               | Current redirect logic to modify   |
| `app/globals.css`            | Custom animations, base styles     |

## Phase 1: Design

### Component Contracts

#### 1. HeroSection

**Props**: None (static content)

**Renders**:

- Logo (large)
- Headline: "Your AI-powered skill tree for learning anything"
- Subheadline: Brief value proposition (1-2 sentences)
- Primary CTA: "Get Started Free" → `/signup`
- Secondary link: "Already have an account? Sign in" → `/login`

**Accessibility**:

- `<h1>` for main headline
- Button has descriptive text
- Sufficient color contrast

#### 2. BenefitsSection

**Props**: None (static content)

**Renders**:

- Section heading: "Why Loopi?"
- 3-4 benefit cards in responsive grid
  - AI-powered skill trees
  - Spaced repetition (FSRS)
  - Learn anything
  - Track progress

**Layout**: `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6`

#### 3. HowItWorksSection

**Props**: None (static content)

**Renders**:

- Section heading: "How It Works"
- 3 numbered steps with icons/illustrations:
  1. Set your learning goal
  2. Study with AI-generated content
  3. Review with spaced repetition

**Layout**: Vertical stack on mobile, horizontal on desktop

#### 4. CTASection

**Props**: None (static content)

**Renders**:

- Compelling headline: "Ready to start learning?"
- Primary CTA button: "Create Free Account" → `/signup`
- Optional: Feature highlight or social proof

### Page Flow

```
/ (root URL)
    │
    ├── Authenticated? ──Yes──► Redirect to /goals
    │
    └── Not authenticated?
            │
            └── Render Landing Page
                    │
                    ├── HeroSection (with CTA → /signup)
                    ├── BenefitsSection
                    ├── HowItWorksSection
                    └── CTASection (with CTA → /signup)
```

### Routing Changes

**Current** (`app/page.tsx`):

```typescript
// Redirects all unauthenticated users to /login
if (!session) redirect('/login')
```

**New** (`app/page.tsx`):

```typescript
// Redirect authenticated to dashboard, show landing for others
if (session) redirect('/goals')
// Render landing page content
return <LandingPage />
```

**Alternative**: Create `app/(landing)/page.tsx` and update root to redirect there for unauthenticated users. Simpler to just render landing content at root.

## Phase 2: Implementation Sequence

See `/specs/029-landing-page/tasks.md` (generated by `/speckit.tasks`)

### High-Level Task Order

1. **Setup**: Create component directory structure
2. **Components**: Build section components (Hero → Benefits → HowItWorks → CTA)
3. **Page**: Assemble landing page with auth logic
4. **Routing**: Update root page.tsx to show landing for unauthenticated
5. **Tests**: E2E tests for routing and visibility
6. **Polish**: Responsive adjustments, dark mode verification

### Testing Strategy

**E2E Tests** (Playwright):

- Unauthenticated user sees landing page at `/`
- Authenticated user redirected to `/goals` from `/`
- CTA buttons navigate to correct auth pages
- Page loads within performance budget

**Unit Tests** (Vitest):

- Component renders with correct content
- Accessibility: proper heading hierarchy
- Links have correct href attributes

## Appendix: Content Draft

### Hero Section Content

**Headline**: "Your AI-powered skill tree for learning anything"

**Subheadline**: "Set any learning goal, and Loopi builds your personalized path. Master skills faster with AI-generated content and science-backed spaced repetition."

### Benefits Content

1. **AI-Powered Skill Trees**: "Tell Loopi what you want to learn, and it creates a structured skill tree breaking down complex topics into manageable steps."

2. **Spaced Repetition**: "Using the FSRS algorithm, Loopi schedules reviews at optimal intervals so you remember what you learn forever."

3. **Learn Anything**: "From programming to languages, cooking to music theory—Loopi adapts to any subject you want to master."

### How It Works Steps

1. **Set Your Goal**: "Enter what you want to learn. Loopi analyzes your goal and creates a personalized skill tree."

2. **Study with AI**: "Each skill comes with AI-generated flashcards and explanations tailored to your level."

3. **Review & Remember**: "Loopi schedules reviews based on how well you know each concept. The more you review, the less often you need to."
