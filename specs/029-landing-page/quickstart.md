# Quickstart: Landing Page Implementation

**Feature Branch**: `029-landing-page`
**Date**: 2026-01-11

## Prerequisites

- Node.js 20+
- pnpm (package manager)
- Local development environment set up

## Getting Started

```bash
# Ensure you're on the feature branch
git checkout 029-landing-page

# Install dependencies
pnpm install

# Start development server
pnpm dev
```

## Key Files to Create/Modify

### New Files

| File                                       | Purpose                    |
| ------------------------------------------ | -------------------------- |
| `components/landing/HeroSection.tsx`       | Hero with headline and CTA |
| `components/landing/BenefitsSection.tsx`   | Benefits grid              |
| `components/landing/HowItWorksSection.tsx` | 3-step tutorial            |
| `components/landing/CTASection.tsx`        | Final call-to-action       |
| `components/landing/index.ts`              | Barrel export              |
| `tests/e2e/landing-page.spec.ts`           | E2E tests                  |

### Modified Files

| File           | Change                                     |
| -------------- | ------------------------------------------ |
| `app/page.tsx` | Remove login redirect, render landing page |

## Component Template

Use this template for each landing section component:

```typescript
// components/landing/HeroSection.tsx
import Link from 'next/link'
import Logo from '@/components/ui/Logo'

export function HeroSection() {
  return (
    <section className="py-16 sm:py-24 lg:py-32 bg-gray-50 dark:bg-gray-900">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
        <Logo showText size="lg" className="mx-auto mb-8" />

        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 dark:text-gray-100 mb-6">
          Your AI-powered skill tree for learning anything
        </h1>

        <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto mb-8">
          Set any learning goal, and Loopi builds your personalized path.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/signup"
            className="inline-flex items-center justify-center px-6 py-3 text-base font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Get Started Free
          </Link>

          <Link
            href="/login"
            className="inline-flex items-center justify-center px-6 py-3 text-base font-medium rounded-lg text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            Sign In
          </Link>
        </div>
      </div>
    </section>
  )
}
```

## Page Template

```typescript
// app/page.tsx
import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import { HeroSection } from '@/components/landing/HeroSection'
import { BenefitsSection } from '@/components/landing/BenefitsSection'
import { HowItWorksSection } from '@/components/landing/HowItWorksSection'
import { CTASection } from '@/components/landing/CTASection'

export default async function Home() {
  const session = await auth()

  // Redirect authenticated users to dashboard
  if (session) {
    redirect('/goals')
  }

  // Show landing page for unauthenticated users
  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <HeroSection />
      <BenefitsSection />
      <HowItWorksSection />
      <CTASection />
    </main>
  )
}
```

## Testing

### Run E2E Tests

```bash
# Run all Playwright tests
pnpm test:e2e

# Run only landing page tests
pnpm test:e2e tests/e2e/landing-page.spec.ts

# Run in headed mode for debugging
pnpm test:e2e --headed
```

### Run Unit Tests

```bash
# Run Vitest tests
pnpm test

# Run with coverage
pnpm test:coverage
```

## Design Tokens Reference

### Colors

```
Background: bg-gray-50 / dark:bg-gray-900
Text Primary: text-gray-900 / dark:text-gray-100
Text Secondary: text-gray-600 / dark:text-gray-400
Accent: bg-blue-600 / hover:bg-blue-700
```

### Typography

```
H1: text-4xl sm:text-5xl lg:text-6xl font-bold
H2: text-2xl sm:text-3xl font-bold
Body: text-base or text-lg
Small: text-sm
```

### Spacing

```
Section padding: py-16 sm:py-24 lg:py-32
Container: max-w-7xl mx-auto px-4 sm:px-6 lg:px-8
```

## Verification Checklist

Before marking complete:

- [ ] Landing page renders for unauthenticated users
- [ ] Authenticated users redirect to /goals
- [ ] All CTAs link to correct pages
- [ ] Dark mode works correctly
- [ ] Responsive on mobile/tablet/desktop
- [ ] Page loads in <3 seconds
- [ ] E2E tests pass
- [ ] No console errors
