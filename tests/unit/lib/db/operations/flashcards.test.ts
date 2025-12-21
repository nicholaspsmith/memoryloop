import { describe, it, expect } from 'vitest'
import { State } from 'ts-fsrs'
import { FlashcardSchema } from '@/types/db'

/**
 * Unit Tests for Flashcard Data Transformation
 *
 * Tests the data transformation and validation for flashcards
 * with focus on null handling for FSRS state fields
 *
 * Note: These tests validate that the Zod schema and transformation
 * logic handle edge cases correctly. The actual transformFlashcardFromDB
 * function is internal but this tests the end result.
 */

describe('Flashcard Data Transformation', () => {
  describe('FSRSState null handling in validation', () => {
    // Helper to create a valid flashcard for testing
    function createValidFlashcard(fsrsOverrides: Record<string, unknown> = {}) {
      return {
        id: '123e4567-e89b-12d3-a456-426614174000',
        userId: '123e4567-e89b-12d3-a456-426614174001',
        conversationId: '123e4567-e89b-12d3-a456-426614174002',
        messageId: '123e4567-e89b-12d3-a456-426614174003',
        question: 'What is TypeScript?',
        answer: 'A typed superset of JavaScript.',
        questionEmbedding: null,
        createdAt: Date.now(),
        fsrsState: {
          due: new Date(),
          stability: 0,
          difficulty: 0,
          elapsed_days: 0,
          scheduled_days: 0,
          learning_steps: 0,
          reps: 0,
          lapses: 0,
          state: State.New,
          last_review: undefined,
          ...fsrsOverrides,
        },
      }
    }

    it('should validate flashcard with all FSRS fields set to 0', () => {
      const flashcard = createValidFlashcard()

      const result = FlashcardSchema.safeParse(flashcard)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.fsrsState.learning_steps).toBe(0)
      }
    })

    it('should validate flashcard with positive learning_steps', () => {
      const flashcard = createValidFlashcard({ learning_steps: 3 })

      const result = FlashcardSchema.safeParse(flashcard)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.fsrsState.learning_steps).toBe(3)
      }
    })

    it('should validate flashcard with valid stability and difficulty', () => {
      const flashcard = createValidFlashcard({
        stability: 15.5,
        difficulty: 5.5,
      })

      const result = FlashcardSchema.safeParse(flashcard)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.fsrsState.stability).toBe(15.5)
        expect(result.data.fsrsState.difficulty).toBe(5.5)
      }
    })

    it('should validate flashcard with all FSRS state values', () => {
      const lastReview = new Date(Date.now() - 86400000)
      const flashcard = createValidFlashcard({
        stability: 20.5,
        difficulty: 6.0,
        elapsed_days: 7,
        scheduled_days: 14,
        learning_steps: 2,
        reps: 10,
        lapses: 1,
        state: State.Review,
        last_review: lastReview,
      })

      const result = FlashcardSchema.safeParse(flashcard)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.fsrsState.stability).toBe(20.5)
        expect(result.data.fsrsState.difficulty).toBe(6.0)
        expect(result.data.fsrsState.elapsed_days).toBe(7)
        expect(result.data.fsrsState.scheduled_days).toBe(14)
        expect(result.data.fsrsState.learning_steps).toBe(2)
        expect(result.data.fsrsState.reps).toBe(10)
        expect(result.data.fsrsState.lapses).toBe(1)
        expect(result.data.fsrsState.state).toBe(State.Review)
        expect(result.data.fsrsState.last_review).toEqual(lastReview)
      }
    })

    it('should handle undefined last_review', () => {
      const flashcard = createValidFlashcard({ last_review: undefined })

      const result = FlashcardSchema.safeParse(flashcard)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.fsrsState.last_review).toBeUndefined()
      }
    })

    it('should validate due date is a Date object', () => {
      const dueDate = new Date()
      const flashcard = createValidFlashcard({ due: dueDate })

      const result = FlashcardSchema.safeParse(flashcard)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.fsrsState.due).toEqual(dueDate)
      }
    })

    it('should reject null learning_steps (requires transformation before validation)', () => {
      const flashcard = createValidFlashcard({ learning_steps: null })

      const result = FlashcardSchema.safeParse(flashcard)

      // This should fail because Zod expects number, not null
      // The transformFlashcardFromDB function should convert null to 0 before validation
      expect(result.success).toBe(false)
    })

    it('should use default when learning_steps is missing from input', () => {
      const flashcard = createValidFlashcard()
      // Simulate missing learning_steps (like when Zod default kicks in)
      const fsrsWithoutLearningSteps = { ...flashcard.fsrsState }
      delete (fsrsWithoutLearningSteps as any).learning_steps

      const flashcardWithMissingField = {
        ...flashcard,
        fsrsState: fsrsWithoutLearningSteps,
      }

      const result = FlashcardSchema.safeParse(flashcardWithMissingField)

      expect(result.success).toBe(true)
      if (result.success) {
        // Zod default(0) should kick in for missing field
        expect(result.data.fsrsState.learning_steps).toBe(0)
      }
    })
  })

  describe('Null-safe transformation simulation', () => {
    // Simulate what transformFlashcardFromDB does
    function transformFsrsState(raw: Record<string, unknown>) {
      return {
        ...raw,
        due: new Date(raw.due as number),
        last_review: raw.last_review ? new Date(raw.last_review as number) : undefined,
        // Add null-safe defaults for all numeric fields
        learning_steps: (raw.learning_steps as number) ?? 0,
        elapsed_days: (raw.elapsed_days as number) ?? 0,
        scheduled_days: (raw.scheduled_days as number) ?? 0,
        reps: (raw.reps as number) ?? 0,
        lapses: (raw.lapses as number) ?? 0,
        stability: (raw.stability as number) ?? 0,
        difficulty: (raw.difficulty as number) ?? 0,
        state: (raw.state as number) ?? 0,
      }
    }

    it('should convert null learning_steps to 0', () => {
      const raw = {
        due: Date.now(),
        stability: null,
        difficulty: null,
        elapsed_days: null,
        scheduled_days: null,
        learning_steps: null,
        reps: null,
        lapses: null,
        state: null,
        last_review: null,
      }

      const transformed = transformFsrsState(raw)

      expect(transformed.learning_steps).toBe(0)
      expect(transformed.stability).toBe(0)
      expect(transformed.difficulty).toBe(0)
      expect(transformed.reps).toBe(0)
      expect(transformed.lapses).toBe(0)
    })

    it('should preserve valid numeric values', () => {
      const raw = {
        due: Date.now(),
        stability: 10.5,
        difficulty: 5.5,
        elapsed_days: 7,
        scheduled_days: 14,
        learning_steps: 2,
        reps: 10,
        lapses: 1,
        state: State.Review,
        last_review: Date.now() - 86400000,
      }

      const transformed = transformFsrsState(raw)

      expect(transformed.learning_steps).toBe(2)
      expect(transformed.stability).toBe(10.5)
      expect(transformed.difficulty).toBe(5.5)
      expect(transformed.reps).toBe(10)
      expect(transformed.lapses).toBe(1)
    })

    it('should convert due timestamp to Date', () => {
      const dueTimestamp = Date.now()
      const raw = {
        due: dueTimestamp,
        stability: 0,
        difficulty: 0,
        elapsed_days: 0,
        scheduled_days: 0,
        learning_steps: 0,
        reps: 0,
        lapses: 0,
        state: 0,
        last_review: null,
      }

      const transformed = transformFsrsState(raw)

      expect(transformed.due).toBeInstanceOf(Date)
      expect(transformed.due.getTime()).toBe(dueTimestamp)
    })

    it('should handle null last_review as undefined', () => {
      const raw = {
        due: Date.now(),
        stability: 0,
        difficulty: 0,
        elapsed_days: 0,
        scheduled_days: 0,
        learning_steps: 0,
        reps: 0,
        lapses: 0,
        state: 0,
        last_review: null,
      }

      const transformed = transformFsrsState(raw)

      expect(transformed.last_review).toBeUndefined()
    })

    it('should convert last_review timestamp to Date when present', () => {
      const lastReviewTimestamp = Date.now() - 86400000
      const raw = {
        due: Date.now(),
        stability: 0,
        difficulty: 0,
        elapsed_days: 0,
        scheduled_days: 0,
        learning_steps: 0,
        reps: 0,
        lapses: 0,
        state: 0,
        last_review: lastReviewTimestamp,
      }

      const transformed = transformFsrsState(raw)

      expect(transformed.last_review).toBeInstanceOf(Date)
      expect(transformed.last_review!.getTime()).toBe(lastReviewTimestamp)
    })
  })
})
