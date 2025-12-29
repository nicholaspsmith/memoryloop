// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

/**
 * Unit Tests for Distractor Generator
 *
 * Tests the distractor generation service that creates plausible but incorrect
 * options for multiple choice questions using the Claude API.
 *
 * Per spec 017-multi-choice-distractors:
 * - Must return exactly 3 distractors
 * - Must complete within 5 seconds (timeout)
 * - Must handle Claude API errors gracefully
 * - Must validate distractors don't match correct answer
 */

// Mock the Claude client
vi.mock('@/lib/claude/client', () => ({
  getChatCompletion: vi.fn(),
}))

import { generateDistractors, validateDistractors } from '@/lib/ai/distractor-generator'
import { getChatCompletion } from '@/lib/claude/client'
import type { Mock } from 'vitest'

// Cast to access mock methods
const mockGetChatCompletion = getChatCompletion as Mock

describe('Distractor Generator', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('generateDistractors', () => {
    describe('T001: Unit test for distractor generator', () => {
      it('should return exactly 3 distractors on success', async () => {
        // Mock successful Claude response
        mockGetChatCompletion.mockResolvedValue(
          JSON.stringify({
            distractors: ['London', 'Berlin', 'Madrid'],
          })
        )

        const result = await generateDistractors('What is the capital of France?', 'Paris')

        expect(result.success).toBe(true)
        expect(result.distractors).toHaveLength(3)
        expect(result.distractors).toEqual(['London', 'Berlin', 'Madrid'])
      })

      it('should include generationTimeMs in response', async () => {
        mockGetChatCompletion.mockResolvedValue(
          JSON.stringify({
            distractors: ['London', 'Berlin', 'Madrid'],
          })
        )

        const result = await generateDistractors('What is the capital of France?', 'Paris')

        expect(result.generationTimeMs).toBeDefined()
        expect(typeof result.generationTimeMs).toBe('number')
        // Can be 0 if mock resolves instantly - just check it's a non-negative number
        expect(result.generationTimeMs).toBeGreaterThanOrEqual(0)
      })

      it('should handle Claude API errors gracefully', async () => {
        // Mock API error
        mockGetChatCompletion.mockRejectedValue(new Error('Claude API timeout'))

        const result = await generateDistractors('What is the capital of France?', 'Paris')

        expect(result.success).toBe(false)
        expect(result.error).toBeDefined()
        expect(result.error).toContain('Claude API timeout')
        expect(result.distractors).toBeUndefined()
      })

      it('should timeout after 5 seconds', async () => {
        // Mock slow response (>5 seconds)
        mockGetChatCompletion.mockImplementation(
          () =>
            new Promise((resolve) => {
              setTimeout(() => resolve(JSON.stringify({ distractors: ['a', 'b', 'c'] })), 6000)
            })
        )

        const startTime = Date.now()
        const result = await generateDistractors('What is the capital of France?', 'Paris')
        const duration = Date.now() - startTime

        expect(result.success).toBe(false)
        expect(result.error).toBeDefined()
        expect(duration).toBeLessThan(6000) // Should timeout before 6s
        expect(duration).toBeGreaterThanOrEqual(5000) // Should wait ~5s
      }, 10000) // Test timeout of 10s

      it('should handle invalid JSON response from Claude', async () => {
        mockGetChatCompletion.mockResolvedValue('invalid json response')

        const result = await generateDistractors('What is the capital of France?', 'Paris')

        expect(result.success).toBe(false)
        expect(result.error).toBeDefined()
      })

      it('should handle response with wrong number of distractors', async () => {
        mockGetChatCompletion.mockResolvedValue(
          JSON.stringify({
            distractors: ['London', 'Berlin'], // Only 2 instead of 3
          })
        )

        const result = await generateDistractors('What is the capital of France?', 'Paris')

        expect(result.success).toBe(false)
        expect(result.error).toBeDefined()
      })

      it('should handle empty question', async () => {
        const result = await generateDistractors('', 'Paris')

        expect(result.success).toBe(false)
        expect(result.error).toBeDefined()
      })

      it('should handle empty answer', async () => {
        const result = await generateDistractors('What is the capital of France?', '')

        expect(result.success).toBe(false)
        expect(result.error).toBeDefined()
      })
    })
  })

  describe('validateDistractors', () => {
    describe('T002: Unit test for distractor validation', () => {
      it('should return true for 3 valid distractors', () => {
        const distractors = ['London', 'Berlin', 'Madrid']
        const correctAnswer = 'Paris'

        const result = validateDistractors(distractors, correctAnswer)

        expect(result).toBe(true)
      })

      it('should reject if count is not 3 (too few)', () => {
        const distractors = ['London', 'Berlin']
        const correctAnswer = 'Paris'

        const result = validateDistractors(distractors, correctAnswer)

        expect(result).toBe(false)
      })

      it('should reject if count is not 3 (too many)', () => {
        const distractors = ['London', 'Berlin', 'Madrid', 'Rome']
        const correctAnswer = 'Paris'

        const result = validateDistractors(distractors, correctAnswer)

        expect(result).toBe(false)
      })

      it('should reject if count is not 3 (empty array)', () => {
        const distractors: string[] = []
        const correctAnswer = 'Paris'

        const result = validateDistractors(distractors, correctAnswer)

        expect(result).toBe(false)
      })

      it('should reject if any distractor matches correct answer (exact match)', () => {
        const distractors = ['London', 'Paris', 'Madrid']
        const correctAnswer = 'Paris'

        const result = validateDistractors(distractors, correctAnswer)

        expect(result).toBe(false)
      })

      it('should reject if any distractor matches correct answer (case-insensitive)', () => {
        const distractors = ['London', 'PARIS', 'Madrid']
        const correctAnswer = 'Paris'

        const result = validateDistractors(distractors, correctAnswer)

        expect(result).toBe(false)
      })

      it('should reject if any distractor matches correct answer (with whitespace)', () => {
        const distractors = ['London', '  Paris  ', 'Madrid']
        const correctAnswer = 'Paris'

        const result = validateDistractors(distractors, correctAnswer)

        expect(result).toBe(false)
      })

      it('should reject if distractors have duplicates (exact)', () => {
        const distractors = ['London', 'London', 'Madrid']
        const correctAnswer = 'Paris'

        const result = validateDistractors(distractors, correctAnswer)

        expect(result).toBe(false)
      })

      it('should reject if distractors have duplicates (case-insensitive)', () => {
        const distractors = ['London', 'london', 'Madrid']
        const correctAnswer = 'Paris'

        const result = validateDistractors(distractors, correctAnswer)

        expect(result).toBe(false)
      })

      it('should reject if distractors have duplicates (with whitespace)', () => {
        const distractors = ['London', '  London  ', 'Madrid']
        const correctAnswer = 'Paris'

        const result = validateDistractors(distractors, correctAnswer)

        expect(result).toBe(false)
      })

      it('should reject if any distractor is empty string', () => {
        const distractors = ['London', '', 'Madrid']
        const correctAnswer = 'Paris'

        const result = validateDistractors(distractors, correctAnswer)

        expect(result).toBe(false)
      })

      it('should reject if any distractor is whitespace only', () => {
        const distractors = ['London', '   ', 'Madrid']
        const correctAnswer = 'Paris'

        const result = validateDistractors(distractors, correctAnswer)

        expect(result).toBe(false)
      })

      it('should handle different types of content (numbers)', () => {
        const distractors = ['1776', '1492', '1865']
        const correctAnswer = '1789'

        const result = validateDistractors(distractors, correctAnswer)

        expect(result).toBe(true)
      })

      it('should handle technical content', () => {
        const distractors = ['O(n^2)', 'O(log n)', 'O(n log n)']
        const correctAnswer = 'O(n)'

        const result = validateDistractors(distractors, correctAnswer)

        expect(result).toBe(true)
      })

      it('should handle multi-word answers', () => {
        const distractors = ['William Shakespeare', 'Charles Dickens', 'Jane Austen']
        const correctAnswer = 'Mark Twain'

        const result = validateDistractors(distractors, correctAnswer)

        expect(result).toBe(true)
      })
    })
  })
})
