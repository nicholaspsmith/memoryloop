# Distractor Generator Tests

## Overview

This directory contains unit tests for the distractor generator service (`lib/ai/distractor-generator.ts`).

## Test Coverage (T001 and T002)

### T001: Distractor Generator Core Functionality

Tests in `distractor-generator.test.ts` cover:

1. **Success case**: Returns exactly 3 distractors
2. **Timing**: Includes `generationTimeMs` in response
3. **Error handling**: Handles Claude API errors gracefully
4. **Timeout**: Times out after 5 seconds
5. **Invalid responses**: Handles malformed JSON, wrong distractor count
6. **Input validation**: Handles empty question/answer

### T002: Distractor Validation

Tests in `distractor-generator.test.ts` cover:

1. **Valid case**: Returns true for 3 valid distractors
2. **Count validation**: Rejects arrays with != 3 items
3. **Uniqueness**: Rejects if any distractor matches correct answer (case-insensitive, ignores whitespace)
4. **Duplicates**: Rejects if distractors have duplicates (case-insensitive, ignores whitespace)
5. **Empty checks**: Rejects empty strings or whitespace-only distractors
6. **Content types**: Works with numbers, technical content, multi-word answers

## Running Tests

```bash
# Run all distractor generator tests
npx vitest run tests/unit/lib/ai/distractor-generator.test.ts

# Run with watch mode
npx vitest watch tests/unit/lib/ai/distractor-generator.test.ts
```

## Expected Behavior (TDD)

These tests are written BEFORE implementation (Test-Driven Development). They currently FAIL because:

- `lib/ai/distractor-generator.ts` does not exist yet
- Functions `generateDistractors` and `validateDistractors` are not implemented

Next step: Implement the service to make these tests pass (Tasks T003-T006).

## Contract Reference

See `/specs/017-multi-choice-distractors/contracts/distractor-api.md` for:

- API contract specifications
- Expected response format
- Error handling requirements

See `/specs/017-multi-choice-distractors/data-model.md` for:

- Validation rules implementation
- Rating calculation logic
- Data flow diagrams
