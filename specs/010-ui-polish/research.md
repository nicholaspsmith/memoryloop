# Research & Technical Decisions: UI Polish & Enhanced Interactions

**Date**: 2025-12-22
**Feature**: UI Polish & Enhanced Interactions
**Status**: Complete - All decisions finalized during clarification phase

## Overview

This document captures the technical research and decisions made for implementing UI polish features. Most key decisions were resolved during the specification clarification phase, eliminating the need for extensive additional research.

## Key Decisions

### 1. Page Transition Animation Type

**Decision**: Fade transitions (opacity change)

**Rationale**:

- Most accessible option with no motion sickness risk
- Works well across all page types without directional bias
- Simpler implementation than slide or hybrid approaches
- Universally supported across all modern browsers
- Clean, professional aesthetic that matches the application design

**Alternatives Considered**:

- **Slide transitions**: Rejected due to added complexity of directional logic and potential motion sensitivity issues
- **Hybrid (fade + slide)**: Rejected due to unnecessary complexity for minimal UX benefit
- **Scale + fade**: Rejected due to higher animation complexity and potentially jarring effect

**Implementation Approach**:

- Use CSS transitions with opacity property
- Duration: 300ms (per FR-009)
- Interruptible via CSS animation cancellation
- Applied at layout level in Next.js App Router

### 2. Card Flip Animation Axis

**Decision**: Y-axis rotation

**Rationale**:

- Most intuitive and common for flashcard applications
- Mimics how physical flashcards are flipped (left-to-right)
- Better suited for horizontal card layouts
- Standard convention in flashcard UI patterns

**Alternatives Considered**:

- **X-axis (top-to-bottom)**: Rejected as less natural for flashcard metaphor
- **Z-axis**: Rejected as not appropriate for flip effect

**Implementation Approach**:

- CSS 3D transforms: `rotateY(180deg)`
- Transform origin: center of card
- Duration: 600ms (per FR-014)
- Preserve-3d for proper perspective

### 3. Card Stack Depth

**Decision**: Show 2-3 cards behind current card

**Rationale**:

- Provides sufficient depth perception without clutter
- Balances visual appeal with simplicity
- Avoids performance issues with rendering many stacked elements
- Standard pattern in card-based UI designs (e.g., Tinder, Duolingo)

**Alternatives Considered**:

- **Show all remaining cards**: Rejected due to visual clutter and potential 50+ card performance issues
- **Show 5-7 cards**: Rejected as unnecessary complexity
- **Dynamic percentage (10% of total)**: Rejected due to added logic complexity

**Implementation Approach**:

- Render top 3 cards (current + 2 behind)
- Use CSS transforms for offset and scale
- Z-index layering for proper stacking
- Translate and scale decrease: each card ~5-10px down, 95% scale

### 4. Navigation Arrow Behavior

**Decision**: Keep unrated cards in queue - user must rate all cards eventually before completing session

**Rationale**:

- Maintains integrity of spaced repetition system
- Ensures users don't accidentally skip cards
- Clear completion criteria (all cards rated)
- Prevents incomplete learning sessions

**Alternatives Considered**:

- **Remove from current session**: Rejected as users might skip difficult cards
- **Mark as "skipped" rating**: Rejected as adds complexity to FSRS scheduling
- **Allow infinite navigation**: Rejected as defeats purpose of spaced repetition

**Implementation Approach**:

- Track rated/unrated state in component state
- Filter unrated cards when determining completion
- Navigation wraps through all cards (rated or not)
- Confetti triggers only when all cards rated

### 5. Confetti Animation Library

**Decision**: canvas-confetti

**Rationale**:

- Lightweight: Only 3.5KB gzipped
- Actively maintained with regular updates
- Simple, well-documented API
- Excellent browser compatibility
- No dependencies
- Canvas-based for smooth performance

**Alternatives Considered**:

- **react-confetti**: Rejected due to larger size (11KB) and React-specific coupling
- **Custom implementation**: Rejected due to development/maintenance overhead
- **tsparticles**: Rejected as overkill (50KB+) for simple confetti effect

**Implementation Approach**:

```typescript
// lib/animations/confetti.ts
import confetti from 'canvas-confetti'

export function celebrateCompletion() {
  return confetti({
    particleCount: 100,
    spread: 70,
    origin: { y: 0.6 },
  })
}
```

## CSS Animation Best Practices

### Performance Optimization

**GPU Acceleration**:

- Use `transform` and `opacity` for animations (GPU-accelerated)
- Avoid animating `width`, `height`, `top`, `left` (CPU-intensive)
- Use `will-change` sparingly and only during animation

**Frame Rate Targets**:

- Target 60fps for all animations
- Use `requestAnimationFrame` for JS-driven animations
- Leverage CSS transitions for simple property changes

### Accessibility Considerations

**Motion Sensitivity**:

```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

**Keyboard Navigation**:

- Ensure all interactive elements remain keyboard accessible during animations
- Don't block interactions during transitions (interruptible per FR-010)

## Dark Mode Contrast Requirements

### WCAG AA Standards

**Minimum Contrast Ratios**:

- Normal text (< 18pt): 4.5:1
- Large text (≥ 18pt or 14pt bold): 3:1
- UI components and graphics: 3:1

**Testing Tools**:

- Chrome DevTools Contrast Ratio
- axe DevTools browser extension
- Automated tests using contrast calculation libraries

**Implementation Approach**:

- Audit current dark mode colors
- Replace low-contrast colors with WCAG AA compliant alternatives
- Use Tailwind's dark mode utilities: `dark:text-gray-100` instead of `dark:text-gray-400`

### Color Adjustments

**Current Issues** (identified in settings page):

- Text labels using `text-gray-400` on dark background (insufficient contrast)
- Some form inputs using low-contrast borders

**Proposed Fixes**:

```css
/* Before */
.dark .text-label {
  color: rgb(156 163 175); /* gray-400 */
}

/* After */
.dark .text-label {
  color: rgb(229 231 235); /* gray-200 - 7:1 contrast */
}
```

## Loading State Patterns

### React Suspense Boundaries

**Pattern**:

```tsx
<Suspense fallback={<LoadingSpinner />}>
  <ChatMessages />
</Suspense>
```

**Locations**:

- Chat page: Message list loading
- Quiz page: Flashcard data loading
- Settings page: User settings loading

### Custom Loading Component

**Design**:

- Simple spinner using Tailwind's animate-spin
- Consistent size and color across pages
- Accessible with `aria-label`

## Animation Timing Functions

**Easing Curves**:

- Page transitions: `ease-in-out` (smooth both directions)
- Card flip: `ease-out` (natural deceleration)
- Card stack update: `ease-in-out` (smooth reorganization)

**Durations** (from requirements):

- Page transition: 300ms
- Card flip: 600ms
- Card stack update: 300ms
- Confetti: 2000ms (automatic cleanup)

## Browser Compatibility

**Target Browsers**:

- Chrome/Edge: Last 2 versions
- Firefox: Last 2 versions
- Safari: Last 2 versions

**CSS Features Used**:

- CSS Transitions (universally supported)
- CSS 3D Transforms (universally supported)
- Canvas API (for confetti, universally supported)
- CSS Grid/Flexbox (universally supported)

**Graceful Degradation**:

- If CSS transforms not supported: Display without animation
- If canvas-confetti fails to load: Skip confetti (FR-028)
- If prefers-reduced-motion: Reduce/disable animations

## Performance Budgets

**Animation Performance**:

- No dropped frames during 3D flip animation
- Smooth 60fps during page transitions
- Card stack update without layout thrashing

**Library Budget**:

- canvas-confetti: 3.5KB gzipped
- No additional animation libraries needed
- Total JS addition: < 5KB

## Testing Strategy

### Unit Tests

**Component Tests**:

- QuizCard: Verify flip animation triggers on button click
- LoadingSpinner: Verify rendering and accessibility
- PageTransition: Verify fade transition applies

**Animation Tests**:

- Mock CSS transition events
- Verify animation classes applied/removed correctly
- Test animation duration matches requirements

### Integration Tests

**Navigation Tests**:

- Arrow wrapping: First → Last, Last → First
- Unrated card tracking: Verify cards remain in queue

**Contrast Tests**:

- Automated WCAG AA compliance checks
- Test all text elements in dark mode

### E2E Tests

**Visual Tests**:

- Page transition smoothness (Playwright screenshots)
- Card flip visual correctness
- Card stack rendering with 2-3 cards visible

**Interaction Tests**:

- Confetti triggers on quiz completion
- Loading spinners appear before content

## Implementation Priority

**Phase 1 (P1 - Critical)**:

1. Loading states on all pages
2. Dark mode contrast fixes

**Phase 2 (P2 - High)**: 3. Page fade transitions 4. Card flip animation

**Phase 3 (P3 - Medium)**: 5. Card stack effect 6. Navigation arrows with wrapping

**Phase 4 (P4 - Nice-to-Have)**: 7. Confetti celebration

## Risk Assessment

### Low Risk

- Page transitions: Standard CSS feature
- Loading spinners: Simple implementation
- Dark mode contrast: Color value changes only

### Medium Risk

- Card flip animation: Requires proper 3D transform setup
- Card stack effect: Needs careful z-index and transform management

### Mitigation Strategies

- Extensive browser testing for 3D transforms
- Performance profiling for card stack with 50 cards
- Fallback to no animation if performance degrades

## Conclusion

All technical decisions have been finalized with clear rationale and implementation approaches. No further research required before proceeding to task generation. The implementation plan follows YAGNI principles while meeting all functional requirements and success criteria.
