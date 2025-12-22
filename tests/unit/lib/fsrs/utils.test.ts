import { describe, it, expect } from 'vitest'
import { State } from 'ts-fsrs'
import { objectToCard, cardToObject } from '@/lib/fsrs/utils'

/**
 * Unit Tests for FSRS Utility Functions
 *
 * Tests the Card <-> Object conversion functions
 * with focus on handling null/undefined learning_steps
 */

describe('FSRS Utils', () => {
  describe('objectToCard', () => {
    it('should handle undefined learning_steps by defaulting to 0', () => {
      const obj = {
        state: State.New,
        due: Date.now(),
        stability: 0,
        difficulty: 0,
        elapsed_days: 0,
        scheduled_days: 0,
        // learning_steps is undefined
        reps: 0,
        lapses: 0,
      }

      const card = objectToCard(obj)

      expect(card.learning_steps).toBe(0)
    })

    it('should handle null learning_steps by defaulting to 0', () => {
      const obj = {
        state: State.New,
        due: Date.now(),
        stability: 0,
        difficulty: 0,
        elapsed_days: 0,
        scheduled_days: 0,
        learning_steps: null as unknown as number,
        reps: 0,
        lapses: 0,
      }

      const card = objectToCard(obj)

      // nullish coalescing (??) treats null as nullish, so it should default to 0
      expect(card.learning_steps).toBe(0)
    })

    it('should preserve explicit learning_steps value of 0', () => {
      const obj = {
        state: State.New,
        due: Date.now(),
        stability: 0,
        difficulty: 0,
        elapsed_days: 0,
        scheduled_days: 0,
        learning_steps: 0,
        reps: 0,
        lapses: 0,
      }

      const card = objectToCard(obj)

      expect(card.learning_steps).toBe(0)
    })

    it('should preserve positive learning_steps value', () => {
      const obj = {
        state: State.Learning,
        due: Date.now(),
        stability: 2.5,
        difficulty: 5.0,
        elapsed_days: 1,
        scheduled_days: 3,
        learning_steps: 2,
        reps: 5,
        lapses: 1,
      }

      const card = objectToCard(obj)

      expect(card.learning_steps).toBe(2)
    })

    it('should convert due timestamp to Date object', () => {
      const dueTimestamp = Date.now()
      const obj = {
        state: State.New,
        due: dueTimestamp,
        stability: 0,
        difficulty: 0,
        elapsed_days: 0,
        scheduled_days: 0,
        reps: 0,
        lapses: 0,
      }

      const card = objectToCard(obj)

      expect(card.due).toBeInstanceOf(Date)
      expect(card.due.getTime()).toBe(dueTimestamp)
    })

    it('should handle undefined last_review', () => {
      const obj = {
        state: State.New,
        due: Date.now(),
        stability: 0,
        difficulty: 0,
        elapsed_days: 0,
        scheduled_days: 0,
        reps: 0,
        lapses: 0,
        // last_review is undefined
      }

      const card = objectToCard(obj)

      expect(card.last_review).toBeUndefined()
    })

    it('should convert last_review timestamp to Date', () => {
      const lastReviewTimestamp = Date.now() - 86400000
      const obj = {
        state: State.Review,
        due: Date.now(),
        stability: 10,
        difficulty: 5,
        elapsed_days: 1,
        scheduled_days: 7,
        reps: 3,
        lapses: 0,
        last_review: lastReviewTimestamp,
      }

      const card = objectToCard(obj)

      expect(card.last_review).toBeInstanceOf(Date)
      expect(card.last_review!.getTime()).toBe(lastReviewTimestamp)
    })

    it('should include all required Card fields', () => {
      const obj = {
        state: State.Review,
        due: Date.now(),
        stability: 10.5,
        difficulty: 4.5,
        elapsed_days: 5,
        scheduled_days: 10,
        learning_steps: 1,
        reps: 8,
        lapses: 2,
        last_review: Date.now() - 86400000,
      }

      const card = objectToCard(obj)

      expect(card).toHaveProperty('state', obj.state)
      expect(card).toHaveProperty('due')
      expect(card).toHaveProperty('stability', obj.stability)
      expect(card).toHaveProperty('difficulty', obj.difficulty)
      expect(card).toHaveProperty('elapsed_days', obj.elapsed_days)
      expect(card).toHaveProperty('scheduled_days', obj.scheduled_days)
      expect(card).toHaveProperty('learning_steps', obj.learning_steps)
      expect(card).toHaveProperty('reps', obj.reps)
      expect(card).toHaveProperty('lapses', obj.lapses)
      expect(card).toHaveProperty('last_review')
    })
  })

  describe('cardToObject', () => {
    it('should include learning_steps in output', () => {
      const card = {
        state: State.Learning,
        due: new Date(),
        stability: 5.0,
        difficulty: 5.0,
        elapsed_days: 1,
        scheduled_days: 3,
        learning_steps: 2,
        reps: 3,
        lapses: 0,
        last_review: new Date(),
      }

      const obj = cardToObject(card)

      expect(obj.learning_steps).toBe(2)
    })

    it('should convert due Date to timestamp', () => {
      const dueDate = new Date()
      const card = {
        state: State.New,
        due: dueDate,
        stability: 0,
        difficulty: 0,
        elapsed_days: 0,
        scheduled_days: 0,
        learning_steps: 0,
        reps: 0,
        lapses: 0,
      }

      const obj = cardToObject(card)

      expect(typeof obj.due).toBe('number')
      expect(obj.due).toBe(dueDate.getTime())
    })

    it('should convert last_review Date to timestamp', () => {
      const lastReviewDate = new Date()
      const card = {
        state: State.Review,
        due: new Date(),
        stability: 10,
        difficulty: 5,
        elapsed_days: 1,
        scheduled_days: 7,
        learning_steps: 0,
        reps: 3,
        lapses: 0,
        last_review: lastReviewDate,
      }

      const obj = cardToObject(card)

      expect(typeof obj.last_review).toBe('number')
      expect(obj.last_review).toBe(lastReviewDate.getTime())
    })

    it('should handle undefined last_review', () => {
      const card = {
        state: State.New,
        due: new Date(),
        stability: 0,
        difficulty: 0,
        elapsed_days: 0,
        scheduled_days: 0,
        learning_steps: 0,
        reps: 0,
        lapses: 0,
        last_review: undefined,
      }

      const obj = cardToObject(card)

      expect(obj.last_review).toBeUndefined()
    })

    it('should preserve all numeric fields', () => {
      const card = {
        state: State.Review,
        due: new Date(),
        stability: 15.5,
        difficulty: 6.2,
        elapsed_days: 7,
        scheduled_days: 14,
        learning_steps: 3,
        reps: 12,
        lapses: 2,
        last_review: new Date(),
      }

      const obj = cardToObject(card)

      expect(obj.state).toBe(card.state)
      expect(obj.stability).toBe(card.stability)
      expect(obj.difficulty).toBe(card.difficulty)
      expect(obj.elapsed_days).toBe(card.elapsed_days)
      expect(obj.scheduled_days).toBe(card.scheduled_days)
      expect(obj.learning_steps).toBe(card.learning_steps)
      expect(obj.reps).toBe(card.reps)
      expect(obj.lapses).toBe(card.lapses)
    })
  })

  describe('Round-trip: objectToCard -> cardToObject', () => {
    it('should preserve all values through round-trip', () => {
      const original = {
        state: State.Review,
        due: Date.now(),
        stability: 20.5,
        difficulty: 5.5,
        elapsed_days: 10,
        scheduled_days: 21,
        learning_steps: 2,
        reps: 15,
        lapses: 3,
        last_review: Date.now() - 86400000 * 7,
      }

      const card = objectToCard(original)
      const result = cardToObject(card)

      expect(result.state).toBe(original.state)
      expect(result.due).toBe(original.due)
      expect(result.stability).toBe(original.stability)
      expect(result.difficulty).toBe(original.difficulty)
      expect(result.elapsed_days).toBe(original.elapsed_days)
      expect(result.scheduled_days).toBe(original.scheduled_days)
      expect(result.learning_steps).toBe(original.learning_steps)
      expect(result.reps).toBe(original.reps)
      expect(result.lapses).toBe(original.lapses)
      expect(result.last_review).toBe(original.last_review)
    })

    it('should handle missing learning_steps in round-trip by defaulting to 0', () => {
      const original = {
        state: State.New,
        due: Date.now(),
        stability: 0,
        difficulty: 0,
        elapsed_days: 0,
        scheduled_days: 0,
        // learning_steps is missing
        reps: 0,
        lapses: 0,
      }

      const card = objectToCard(original)
      const result = cardToObject(card)

      expect(result.learning_steps).toBe(0)
    })
  })
})
