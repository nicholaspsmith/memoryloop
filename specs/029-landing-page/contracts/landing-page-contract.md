# Landing Page Component Contracts

**Feature Branch**: `029-landing-page`
**Date**: 2026-01-11

## Overview

This document defines the contracts for landing page components. All components are server components with no props (static content).

---

## 1. HeroSection

### Purpose

Primary above-the-fold content that immediately communicates product value and provides signup CTA.

### Interface

```typescript
// components/landing/HeroSection.tsx
export function HeroSection(): JSX.Element
```

### Rendered Output

| Element       | Content                                            | Attributes                     |
| ------------- | -------------------------------------------------- | ------------------------------ |
| Logo          | Loopi logo                                         | `size="lg"`, `showText={true}` |
| H1            | "Your AI-powered skill tree for learning anything" | Required for SEO/accessibility |
| Subheadline   | Value proposition (1-2 sentences)                  | `<p>` tag                      |
| Primary CTA   | "Get Started Free"                                 | `href="/signup"`               |
| Secondary CTA | "Sign In"                                          | `href="/login"`                |

### Accessibility Requirements

- `<h1>` is the only h1 on the page
- CTA buttons have descriptive text
- Focus states visible
- Minimum contrast ratio: 4.5:1

### Responsive Behavior

| Breakpoint          | Layout                          |
| ------------------- | ------------------------------- |
| Mobile (<640px)     | Stack vertically, centered      |
| Tablet (640-1024px) | Larger text, same layout        |
| Desktop (>1024px)   | Max font sizes, horizontal CTAs |

---

## 2. BenefitsSection

### Purpose

Reinforce value proposition with specific benefits. Encourages users to continue reading.

### Interface

```typescript
// components/landing/BenefitsSection.tsx
export function BenefitsSection(): JSX.Element
```

### Rendered Output

| Element   | Content                  |
| --------- | ------------------------ |
| H2        | "Why Loopi?" or similar  |
| Benefit 1 | AI-Powered Skill Trees   |
| Benefit 2 | Spaced Repetition (FSRS) |
| Benefit 3 | Learn Anything           |

Each benefit should include:

- Icon (inline SVG or emoji placeholder)
- Title (bold)
- Description (1-2 sentences)

### Layout Contract

```
Mobile:    [Benefit 1]
           [Benefit 2]
           [Benefit 3]

Tablet:    [Benefit 1] [Benefit 2]
           [Benefit 3]

Desktop:   [Benefit 1] [Benefit 2] [Benefit 3]
```

### Accessibility Requirements

- `<h2>` for section heading
- Benefits can use `<h3>` or styled divs
- Icons should be decorative (aria-hidden) or have alt text

---

## 3. HowItWorksSection

### Purpose

Educate users on the product workflow. Addresses User Story 2 (Learn How Loopi Works).

### Interface

```typescript
// components/landing/HowItWorksSection.tsx
export function HowItWorksSection(): JSX.Element
```

### Rendered Output

| Element | Content           |
| ------- | ----------------- |
| H2      | "How It Works"    |
| Step 1  | Set Your Goal     |
| Step 2  | Study with AI     |
| Step 3  | Review & Remember |

Each step includes:

- Step number (1, 2, 3)
- Title
- Description (1-2 sentences)
- Optional: Icon or illustration

### Layout Contract

```
Mobile:    Step 1
           ↓
           Step 2
           ↓
           Step 3

Desktop:   [Step 1] → [Step 2] → [Step 3]
```

### Visual Flow

Steps should have visual connectors (arrows or lines) showing progression.

### Accessibility Requirements

- `<h2>` for section heading
- Numbered steps clearly announced
- Visual connectors are decorative (not required for understanding)

---

## 4. CTASection

### Purpose

Final conversion opportunity. Reinforces call-to-action for users who read the full page.

### Interface

```typescript
// components/landing/CTASection.tsx
export function CTASection(): JSX.Element
```

### Rendered Output

| Element    | Content                             | Attributes                  |
| ---------- | ----------------------------------- | --------------------------- |
| H2         | "Ready to start learning?"          | Compelling, action-oriented |
| CTA Button | "Create Free Account"               | `href="/signup"`            |
| Optional   | Secondary text or feature highlight |                             |

### Design Contract

- Visually distinct background (subtle contrast from previous section)
- Centered content
- Large, prominent button

### Accessibility Requirements

- `<h2>` for section heading
- Button is clearly a link to signup
- Sufficient contrast for readability

---

## Page Assembly Contract

### Route: `/` (root)

### Authentication Behavior

```typescript
// Pseudocode contract
if (authenticated) {
  redirect('/goals')
} else {
  render(LandingPage)
}
```

### Component Order

```tsx
<main>
  <HeroSection />
  <BenefitsSection />
  <HowItWorksSection />
  <CTASection />
</main>
```

### Page Metadata

```typescript
export const metadata = {
  title: 'Loopi - AI-Powered Skill Trees for Learning Anything',
  description:
    'Set any learning goal and Loopi builds your personalized path. Master skills faster with AI-generated content and science-backed spaced repetition.',
}
```

---

## Testing Contracts

### E2E Test Cases

| Test                         | Expected Behavior     |
| ---------------------------- | --------------------- |
| Unauthenticated visit to `/` | Landing page renders  |
| Authenticated visit to `/`   | Redirect to `/goals`  |
| Click "Get Started Free"     | Navigate to `/signup` |
| Click "Sign In"              | Navigate to `/login`  |
| Page load time               | < 3 seconds           |

### Unit Test Cases

| Component         | Test                                 |
| ----------------- | ------------------------------------ |
| HeroSection       | Renders h1 with expected text        |
| HeroSection       | Contains links to /signup and /login |
| BenefitsSection   | Renders 3 benefits                   |
| HowItWorksSection | Renders 3 steps in order             |
| CTASection        | Contains link to /signup             |

---

## Style Contracts

### Shared Styles (all sections)

```css
/* Section padding */
section {
  @apply py-16 sm:py-24 lg:py-32;
}

/* Container */
.container {
  @apply mx-auto max-w-7xl px-4 sm:px-6 lg:px-8;
}

/* Headings */
h2 {
  @apply text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100 mb-8;
}
```

### Color Alternation

```
HeroSection:      bg-gray-50 dark:bg-gray-900
BenefitsSection:  bg-white dark:bg-gray-800
HowItWorksSection: bg-gray-50 dark:bg-gray-900
CTASection:       bg-blue-600 dark:bg-blue-700 (accent)
```
