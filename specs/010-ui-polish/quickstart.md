# Quickstart Guide: UI Polish & Enhanced Interactions

**Feature**: UI Polish & Enhanced Interactions
**Branch**: `010-ui-polish`
**Last Updated**: 2025-12-22

## Overview

This guide provides a quick reference for implementing UI polish features including loading states, dark mode contrast fixes, page transitions, card animations, navigation arrows, and celebration effects.

## Prerequisites

- Node.js 20.x or later
- npm or yarn package manager
- Modern web browser for testing
- Basic understanding of React, Next.js App Router, and Tailwind CSS

## Quick Setup

### 1. Install Dependencies

```bash
# Install canvas-confetti for celebration animation
npm install canvas-confetti
npm install --save-dev @types/canvas-confetti
```

### 2. File Structure

All changes are in existing project structure:

```text
app/
├── (protected)/
│   ├── chat/page.tsx      # Add loading states
│   ├── quiz/page.tsx      # Add loading states
│   ├── settings/page.tsx  # Add loading states + contrast fixes
│   └── layout.tsx         # Add page transitions
└── globals.css            # Add transition styles

components/
├── quiz/
│   ├── QuizCard.tsx       # Add 3D flip animation
│   └── QuizInterface.tsx  # Add stack, arrows, confetti
└── ui/
    ├── LoadingSpinner.tsx # Create new
    └── PageTransition.tsx # Create new

lib/
└── animations/
    └── confetti.ts        # Create new
```

## Implementation Checklist

### Phase 1: Loading States (P1)

- [ ] Create `components/ui/LoadingSpinner.tsx`
- [ ] Wrap async content in `<Suspense>` with LoadingSpinner fallback
- [ ] Apply to chat, quiz, and settings pages
- [ ] Test: Navigate to each page and verify spinner appears before content

### Phase 2: Dark Mode Contrast (P1)

- [ ] Audit all text elements in settings page dark mode
- [ ] Replace low-contrast colors (e.g., `text-gray-400` → `text-gray-200`)
- [ ] Verify WCAG AA compliance (4.5:1 minimum)
- [ ] Test: Toggle dark mode and check text visibility

### Phase 3: Page Transitions (P2)

- [ ] Create `components/ui/PageTransition.tsx` with fade effect
- [ ] Add transition wrapper to protected layout
- [ ] Configure 300ms fade duration in globals.css
- [ ] Test: Navigate between pages and observe smooth fade

### Phase 4: Card Flip Animation (P2)

- [ ] Add 3D flip CSS to `QuizCard.tsx`
- [ ] Implement Y-axis rotation on show answer click
- [ ] Set 600ms duration with ease-out timing
- [ ] Test: Click show answer and verify smooth flip

### Phase 5: Card Stack Effect (P3)

- [ ] Modify `QuizInterface.tsx` to render top 3 cards
- [ ] Apply CSS transforms for stacking (translate + scale)
- [ ] Update stack when card changes
- [ ] Test: Load quiz with 5+ cards, verify 2-3 visible behind current

### Phase 6: Navigation Arrows (P3)

- [ ] Add left/right arrow buttons to `QuizInterface.tsx`
- [ ] Implement wrapping logic (first ↔ last)
- [ ] Track unrated cards in state
- [ ] Test: Navigate through cards, verify wrapping works

### Phase 7: Confetti Celebration (P4)

- [ ] Create `lib/animations/confetti.ts` wrapper
- [ ] Trigger confetti when all cards rated
- [ ] Add graceful failure handling
- [ ] Test: Complete quiz session, verify confetti appears

## Key Code Snippets

### Loading Spinner Component

```tsx
// components/ui/LoadingSpinner.tsx
export function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center p-8" role="status">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600 dark:border-gray-600 dark:border-t-blue-400" />
      <span className="sr-only">Loading...</span>
    </div>
  )
}
```

### Page Transition Wrapper

```tsx
// components/ui/PageTransition.tsx
'use client'

import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'

export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [isTransitioning, setIsTransitioning] = useState(false)

  useEffect(() => {
    setIsTransitioning(true)
    const timer = setTimeout(() => setIsTransitioning(false), 50)
    return () => clearTimeout(timer)
  }, [pathname])

  return (
    <div
      className={`transition-opacity duration-300 ${isTransitioning ? 'opacity-0' : 'opacity-100'}`}
    >
      {children}
    </div>
  )
}
```

### 3D Card Flip

```css
/* Add to globals.css */
.flip-card {
  perspective: 1000px;
}

.flip-card-inner {
  position: relative;
  width: 100%;
  height: 100%;
  transition: transform 0.6s ease-out;
  transform-style: preserve-3d;
}

.flip-card-inner.flipped {
  transform: rotateY(180deg);
}

.flip-card-front,
.flip-card-back {
  position: absolute;
  width: 100%;
  height: 100%;
  backface-visibility: hidden;
}

.flip-card-back {
  transform: rotateY(180deg);
}
```

### Card Stack Effect

```tsx
// In QuizInterface.tsx
const stackedCards = cards.slice(currentIndex, currentIndex + 3)

return (
  <div className="relative h-96">
    {stackedCards.map((card, index) => (
      <div
        key={card.id}
        className="absolute inset-0 transition-all duration-300"
        style={{
          transform: `translateY(${index * 8}px) scale(${1 - index * 0.02})`,
          zIndex: stackedCards.length - index,
          opacity: index === 0 ? 1 : 0.5,
        }}
      >
        <QuizCard card={card} isActive={index === 0} />
      </div>
    ))}
  </div>
)
```

### Confetti Integration

```typescript
// lib/animations/confetti.ts
import confetti from 'canvas-confetti'

export function celebrateCompletion() {
  try {
    return confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
    })
  } catch (error) {
    console.warn('Confetti animation failed:', error)
    // Graceful degradation - continue without confetti
  }
}
```

### Navigation Arrows

```tsx
// In QuizInterface.tsx
function handlePrevious() {
  setCurrentIndex(prev => prev === 0 ? cards.length - 1 : prev - 1);
}

function handleNext() {
  setCurrentIndex(prev => prev === cards.length - 1 ? 0 : prev + 1);
}

// UI
<button onClick={handlePrevious} aria-label="Previous card">←</button>
<button onClick={handleNext} aria-label="Next card">→</button>
```

## Testing Quick Reference

### Run Tests

```bash
# Unit tests
npm test

# Integration tests
npm run test:integration

# E2E tests
npm run test:e2e

# Type checking
npm run typecheck

# Linting
npm run lint
```

### Manual Testing Checklist

**Loading States**:

- [ ] Navigate to /chat - spinner appears briefly
- [ ] Navigate to /quiz - spinner appears briefly
- [ ] Navigate to /settings - spinner appears briefly

**Dark Mode Contrast**:

- [ ] Toggle to dark mode on settings page
- [ ] All text is clearly readable
- [ ] No low-contrast gray text on dark background

**Page Transitions**:

- [ ] Navigate between pages - smooth fade
- [ ] Rapid navigation - transitions complete gracefully
- [ ] Back/forward buttons - consistent transitions

**Card Flip**:

- [ ] Click "Show Answer" - card flips smoothly
- [ ] Flip completes in ~600ms
- [ ] No jittery motion

**Card Stack**:

- [ ] Load quiz with 5+ cards
- [ ] See 2-3 cards stacked behind current
- [ ] Stack updates when rating card

**Navigation Arrows**:

- [ ] Click next arrow through all cards
- [ ] Last card → next → wraps to first card
- [ ] First card → previous → wraps to last card

**Confetti**:

- [ ] Complete quiz session (rate all cards)
- [ ] Confetti animation plays
- [ ] Lasts 2-3 seconds then disappears

## Performance Verification

### Animation Performance

Check Chrome DevTools Performance tab:

- [ ] Page transitions maintain 60fps
- [ ] Card flip maintains 60fps
- [ ] No layout thrashing during animations

### Accessibility

Check with browser DevTools:

- [ ] All animations respect `prefers-reduced-motion`
- [ ] Loading spinners have proper `aria-label`
- [ ] Keyboard navigation still works during transitions

## Common Issues & Solutions

### Issue: Card flip shows both sides briefly

**Solution**: Ensure `backface-visibility: hidden` is set on both card faces

### Issue: Page transitions feel sluggish

**Solution**: Verify 300ms duration in CSS, check for JavaScript blocking rendering

### Issue: Card stack renders behind current card

**Solution**: Check z-index values, ensure decreasing order for stacked cards

### Issue: Confetti doesn't appear

**Solution**: Check browser console for errors, verify canvas-confetti loaded, check network tab

### Issue: Dark mode text still low contrast

**Solution**: Use browser DevTools to measure contrast ratio, adjust to minimum 4.5:1

## Next Steps

After completing implementation:

1. Run full test suite: `npm test && npm run test:integration && npm run test:e2e`
2. Verify all acceptance criteria from spec.md
3. Test across browsers (Chrome, Firefox, Safari)
4. Create atomic commits following .claude/rules.md
5. Prepare for code review

## Reference Links

- [Spec](./spec.md) - Full feature specification
- [Plan](./plan.md) - Implementation plan
- [Research](./research.md) - Technical decisions and rationale
- [canvas-confetti docs](https://www.npmjs.com/package/canvas-confetti)
- [WCAG Contrast Guidelines](https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum.html)
- [CSS 3D Transforms](https://developer.mozilla.org/en-US/docs/Web/CSS/transform-function/rotateY)
