# Research: Landing Page

**Feature Branch**: `029-landing-page`
**Date**: 2026-01-11
**Purpose**: Document existing patterns and decisions for landing page implementation

## Existing Codebase Analysis

### 1. App Router Structure

The project uses Next.js App Router with route groups:

```
app/
├── (protected)/     # Requires authentication
├── (auth)/          # Public auth pages (login, signup, etc.)
├── api/             # API routes
└── page.tsx         # Root redirect logic
```

**Key insight**: Route groups (parentheses) organize routes without affecting URLs. The landing page should follow this pattern.

### 2. Authentication Pattern

All pages check authentication using the same pattern:

```typescript
// From app/(auth)/login/page.tsx
import { auth } from '@/auth'
import { redirect } from 'next/navigation'

export default async function Page() {
  const session = await auth()

  if (session) {
    redirect('/goals')
  }

  // Render page for unauthenticated users
}
```

**Key insight**: `auth()` is a server-side async function. Session contains `user.id`, `user.email`, `user.name`, `user.emailVerified`.

### 3. Current Root Page Behavior

**File**: `app/page.tsx`

```typescript
import { redirect } from 'next/navigation'
import { auth } from '@/auth'

export default async function Home() {
  const session = await auth()

  if (session) {
    redirect('/goals')
  } else {
    redirect('/login')
  }
}
```

**Current behavior**:

- Authenticated → `/goals`
- Unauthenticated → `/login`

**Target behavior**:

- Authenticated → `/goals`
- Unauthenticated → Render landing page (no redirect)

### 4. Design System

#### Colors

```css
/* Background */
bg-gray-50 dark:bg-gray-900

/* Text */
text-gray-900 dark:text-gray-100      /* Primary */
text-gray-600 dark:text-gray-400      /* Secondary/muted */

/* Accent */
bg-blue-600 hover:bg-blue-700         /* Primary button */
text-blue-600 hover:text-blue-700     /* Links */
```

#### Typography

```css
/* Headings */
text-4xl font-bold                    /* H1 */
text-2xl font-bold                    /* H2 */
text-xl font-semibold                 /* H3 */

/* Body */
text-base                             /* Default */
text-sm                               /* Small */
```

#### Layout

```css
/* Centered container */
flex min-h-screen items-center justify-center

/* Responsive padding */
px-4 sm:px-6 lg:px-8
py-12 sm:py-16 lg:py-24

/* Max-width containers */
max-w-md          /* Auth pages (narrow) */
max-w-5xl         /* Content pages (wide) */
max-w-7xl         /* Full-width sections */
```

### 5. Component Patterns

#### Logo Component

**File**: `components/ui/Logo.tsx`

```typescript
interface LogoProps {
  showText?: boolean
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

// Usage
<Logo showText={true} size="lg" />
```

#### PageTransition

**File**: `components/ui/PageTransition.tsx`

Provides 300ms fade-in animation for page content.

```typescript
<PageTransition>
  {children}
</PageTransition>
```

### 6. Dark Mode Support

Project uses Tailwind's dark mode with `dark:` prefix. All components should include dark mode variants.

Example pattern:

```jsx
<div className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">
```

### 7. Assets Available

**Public folder**: `/public/`

- `logo.svg` - Main logo
- `favicon.svg` - Favicon
- `apple-touch-icon.png` - iOS icon
- PWA icons (192px, 512px)

No illustrations/images currently exist for landing page. Will use Tailwind styling and possibly inline SVG icons.

## Design Decisions

### Decision 1: Route Structure

**Options considered**:

1. Create `/app/(landing)/page.tsx` and redirect from root
2. Render landing directly at `/app/page.tsx`

**Decision**: Option 2 - Render landing directly at root

**Rationale**: Simpler implementation, avoids extra redirect, follows pattern of other root pages rendering content directly.

### Decision 2: Component Architecture

**Options considered**:

1. Single monolithic landing page component
2. Multiple section components

**Decision**: Option 2 - Multiple section components

**Rationale**:

- Enables independent testing
- Matches natural page sections
- Easier to maintain and update individual sections
- Follows modularity principle from constitution

### Decision 3: Styling Approach

**Options considered**:

1. Add new CSS modules
2. Use Tailwind only

**Decision**: Option 2 - Tailwind only

**Rationale**:

- Consistent with existing codebase
- No new build complexity
- Dark mode support built-in
- No additional dependencies

### Decision 4: Illustrations

**Options considered**:

1. Custom illustrations/images
2. Inline SVG icons
3. Text-only with good typography

**Decision**: Option 2/3 - Inline SVG icons with strong typography

**Rationale**:

- Per spec clarification: "text with static images" for simplicity
- Inline SVGs avoid asset loading issues
- Can use Heroicons or similar for consistent icon style
- Keeps initial implementation fast

## Performance Considerations

### Target: <3 second page load (SC-001)

**Strategies**:

1. Server-side rendering (no client-side JS required for initial view)
2. No external fonts (use system fonts initially)
3. Inline critical CSS via Tailwind
4. Lazy load any below-fold images
5. Static content = cacheable

### Target: 10-second value comprehension (SC-002)

**Strategies**:

1. Clear headline visible immediately (above fold)
2. Minimal text, maximum clarity
3. Visual hierarchy guides reading order
4. CTA visible without scrolling

## Testing Requirements

### E2E Tests (Playwright)

1. **Routing tests**:
   - Unauthenticated user sees landing at `/`
   - Authenticated user redirected to `/goals`
   - CTA buttons navigate correctly

2. **Content tests**:
   - Key elements visible (headline, CTA, tutorial section)
   - Dark mode toggles work
   - Responsive layout at mobile/tablet/desktop

3. **Performance tests**:
   - Page load under 3 seconds
   - No console errors

### Unit Tests (Vitest)

1. **Component tests**:
   - Each section renders expected content
   - Links have correct href values
   - Heading hierarchy is correct (h1 → h2 → h3)

2. **Accessibility tests**:
   - Button text is descriptive
   - Images have alt text
   - Color contrast passes

## References

- Spec: `/specs/029-landing-page/spec.md`
- Constitution: `/.specify/memory/constitution.md`
- Auth module: `/auth.ts`
- Login page (pattern reference): `/app/(auth)/login/page.tsx`
- Logo component: `/components/ui/Logo.tsx`
