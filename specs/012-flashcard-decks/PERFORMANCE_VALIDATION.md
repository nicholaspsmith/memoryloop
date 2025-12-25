# Performance Validation Checklist

**Feature**: 012-flashcard-decks
**Date**: 2025-12-25
**Status**: Ready for validation

## Overview

This document outlines the performance validation requirements for the flashcard deck feature. All tests should be run in a production-like environment with representative data.

## Test Environment Setup

1. **Database Seeding**:
   - Create test user account
   - Generate 100+ flashcards with embeddings
   - Create 50+ decks with varying card counts
   - Ensure LanceDB has vector embeddings for all flashcards

2. **Prerequisites**:
   - PostgreSQL running with production configuration
   - LanceDB service available
   - Claude API access configured
   - Application running in production mode (`NODE_ENV=production`)

## Validation Tests

### T082: Deck UI Load Performance (SC-007)

**Requirement**: Deck UI loads 50+ decks in <2s

**Test Steps**:
1. Create a test user with exactly 50 decks
2. Navigate to `/decks` page
3. Measure time from page navigation to full render
4. Repeat test 5 times and calculate average

**Measurement Method**:
```javascript
// In browser console or E2E test
const start = performance.now()
// Navigate to /decks
await page.goto('/decks')
await page.waitForSelector('[data-testid="deck-list"]')
const end = performance.now()
console.log(`Load time: ${end - start}ms`)
```

**Success Criteria**:
- ✅ Average load time < 2000ms
- ✅ No layout shifts during load
- ✅ All 50 decks visible

**Status**: ⬜ Not tested
**Results**: _Record results here_

---

### T083: AI Deck Generation Performance (SC-006)

**Requirement**: AI deck generation completes in <10s for 100+ candidates

**Test Steps**:
1. Ensure user has 100+ flashcards with LanceDB embeddings
2. Call AI generation endpoint with a topic that matches many cards
3. Measure total processing time from request to response
4. Repeat test 5 times with different topics

**API Test**:
```bash
# Using curl with timing
time curl -X POST http://localhost:3000/api/decks-ai \
  -H "Content-Type: application/json" \
  -b "cookies.txt" \
  -d '{"topic": "programming fundamentals", "maxCards": 15}'
```

**Measurement Points**:
- Total request time (end-to-end)
- Vector search time (from response metadata)
- LLM filtering time (from response metadata)

**Success Criteria**:
- ✅ Total processing time < 10000ms
- ✅ Vector search completes in < 5000ms
- ✅ LLM filtering completes in < 5000ms
- ✅ Returns 5-15 relevant suggestions

**Status**: ⬜ Not tested
**Results**: _Record results here_

---

### T084: Live Session Updates Performance (SC-011)

**Requirement**: Live deck updates appear in session queue within 5s

**Test Steps**:
1. Start a deck study session in one browser window/tab
2. In another window, add a new due card to the same deck
3. Measure time until the new card appears in session queue
4. Repeat test 5 times

**Test Approach**:
```javascript
// Window 1: Start session
const sessionStart = Date.now()
// POST /api/study/deck-session
const response = await fetch('/api/study/deck-session', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ deckId: 'test-deck-id' })
})

// Window 2: Add card to deck (after 5s delay)
setTimeout(async () => {
  await fetch(`/api/decks/${deckId}/cards`, {
    method: 'POST',
    body: JSON.stringify({ flashcardIds: ['new-card-id'] })
  })
}, 5000)

// Window 1: Detect when new card appears
// (Implementation depends on polling/SSE mechanism)
```

**Success Criteria**:
- ✅ Added cards detected within 5000ms
- ✅ Removed cards handled gracefully
- ✅ No duplicate cards in queue

**Status**: ⬜ Not tested
**Results**: _Record results here_

---

### T085: Quickstart Validation

**Requirement**: Execute all 4 scenarios from quickstart.md and verify expected behavior

**Test Steps**:

#### Scenario 1: Manual Deck Creation and Study
1. Follow all steps in `quickstart.md` Scenario 1
2. Verify each API response matches expected schema
3. Confirm deck appears in user's deck list
4. Verify study session starts correctly

**Status**: ⬜ Not tested

#### Scenario 2: Deck Editing and Management
1. Follow all steps in `quickstart.md` Scenario 2
2. Verify rename operation updates deck name
3. Verify add/remove cards operations work
4. Confirm archive/unarchive functionality

**Status**: ⬜ Not tested

#### Scenario 3: AI-Powered Deck Generation
1. Follow all steps in `quickstart.md` Scenario 3
2. Verify AI generation returns suggestions
3. Confirm deck creation from suggestions
4. Verify fallback behavior (vector search only)

**Status**: ⬜ Not tested

#### Scenario 4: Deck-Filtered Study with Overrides
1. Follow all steps in `quickstart.md` Scenario 4
2. Verify deck-specific FSRS settings apply
3. Confirm only deck cards appear in session
4. Verify setting precedence (session > deck > global)

**Status**: ⬜ Not tested

---

## Performance Optimization Notes

### If Tests Fail

**T082 (Deck UI Load > 2s)**:
- Enable React.memo() for DeckCard components
- Implement virtual scrolling for large deck lists
- Add database indexes on decks.userId and decks.archived
- Consider pagination for 50+ decks

**T083 (AI Generation > 10s)**:
- Increase vectorSearchLimit for better LLM candidates
- Implement caching for frequently requested topics
- Consider parallel LLM calls for large candidate sets
- Optimize LanceDB query with proper indexes

**T084 (Live Updates > 5s)**:
- Implement Server-Sent Events (SSE) instead of polling
- Add WebSocket support for real-time updates
- Reduce polling interval (currently not implemented)
- Add optimistic UI updates

## Automated Testing

For continuous performance monitoring, consider:

1. **Lighthouse CI**: For frontend load performance
2. **k6 or Artillery**: For API endpoint load testing
3. **Playwright Performance Tests**: For E2E timing validation

Example Playwright performance test:
```typescript
test('deck page loads quickly', async ({ page }) => {
  const startTime = Date.now()

  await page.goto('/decks')
  await page.waitForLoadState('networkidle')

  const endTime = Date.now()
  const loadTime = endTime - startTime

  expect(loadTime).toBeLessThan(2000)
})
```

## Sign-Off

**Tester**: _____________________
**Date**: _____________________
**All Tests Passed**: ⬜ Yes ⬜ No
**Notes**: _____________________
