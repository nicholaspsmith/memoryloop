# Study Integration Tests

This directory contains integration tests for the study system.

## multi-choice-rating.test.ts

Integration tests for time-based rating calculation in multiple choice mode.

### Coverage (Tests T010-T013)

Per spec `017-multi-choice-distractors`:

- **T010**: Integration test for time-based rating calculation
- **T011**: Fast correct answers (≤10s) map to Rating.Good (3)
- **T012**: Slow correct answers (>10s) map to Rating.Hard (2) ⚠️ NOT YET IMPLEMENTED
- **T013**: Incorrect answers map to Rating.Again (1)

### Time-Based Rating Logic (to be implemented in `/app/api/study/rate/route.ts`)

```
Time threshold: 10 seconds (10000ms)

For multiple_choice mode:
- rating === 1 (incorrect) → Always use Rating.Again (1)
- rating > 1 (correct) && responseTimeMs ≤ 10000ms → Rating.Good (3)
- rating > 1 (correct) && responseTimeMs > 10000ms → Rating.Hard (2)

For flashcard mode:
- Use rating as-is (no time-based adjustment)
```

### Test Status

**Current**: 2 failing tests (expected - feature not implemented)

- `should apply Rating.Hard for correct answer in 15 seconds` - FAILS
- `should apply Rating.Hard for correct answer in 30 seconds` - FAILS

**Expected after implementation**: All 10 tests pass

### Running Tests

```bash
npm run test:integration -- tests/integration/study/multi-choice-rating.test.ts
```

### FSRS Rating Intervals (for reference)

Based on default FSRS parameters for new cards:

- **Rating.Again (1)**: ~1 minute
- **Rating.Hard (2)**: ~5 minutes
- **Rating.Good (3)**: ~10 minutes
- **Rating.Easy (4)**: ~7 days

These intervals are used by the tests to verify correct rating application.
