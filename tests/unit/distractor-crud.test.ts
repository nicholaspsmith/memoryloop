import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { Distractor } from '@/lib/db/drizzle-schema'

/**
 * Unit Tests for Distractor CRUD Operations
 *
 * Tests the database operations for multiple-choice distractors.
 * Distractors are AI-generated wrong answers used in multiple-choice study mode.
 * Each flashcard can have up to 3 distractors (positions 0, 1, 2).
 *
 * Functions tested:
 * - getDistractorsForFlashcard(flashcardId)
 * - createDistractors(flashcardId, contents[])
 * - deleteDistractorsForFlashcard(flashcardId)
 */

// Mock the database query builder
const mockOrderBy = vi.fn()
const mockWhere = vi.fn()
const mockReturning = vi.fn()
const mockValues = vi.fn()
const mockFrom = vi.fn()
const mockSelect = vi.fn()
const mockInsert = vi.fn()
const mockDelete = vi.fn()

// Mock getDb to return our mocked query builder
vi.mock('@/lib/db/pg-client', () => ({
  getDb: vi.fn(() => ({
    select: mockSelect,
    insert: mockInsert,
    delete: mockDelete,
  })),
}))

// Import after mocking
import {
  getDistractorsForFlashcard,
  createDistractors,
  deleteDistractorsForFlashcard,
} from '@/lib/db/operations/distractors'

describe('Distractor CRUD Operations', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Setup default mock chain for select queries
    mockSelect.mockReturnValue({ from: mockFrom })
    mockFrom.mockReturnValue({ where: mockWhere })
    mockWhere.mockReturnValue({ orderBy: mockOrderBy })

    // Setup default mock chain for insert queries
    mockInsert.mockReturnValue({ values: mockValues })
    mockValues.mockReturnValue({ returning: mockReturning })

    // Setup default mock chain for delete queries
    mockDelete.mockReturnValue({ where: mockWhere })
  })

  describe('createDistractors', () => {
    it('should create exactly 3 distractors with positions 0, 1, 2', async () => {
      const flashcardId = 'flashcard-123'
      const contents = ['Wrong answer 1', 'Wrong answer 2', 'Wrong answer 3']

      const expectedDistractors: Distractor[] = [
        {
          id: 'distractor-1',
          flashcardId,
          content: 'Wrong answer 1',
          position: 0,
          createdAt: new Date('2024-01-01'),
        },
        {
          id: 'distractor-2',
          flashcardId,
          content: 'Wrong answer 2',
          position: 1,
          createdAt: new Date('2024-01-01'),
        },
        {
          id: 'distractor-3',
          flashcardId,
          content: 'Wrong answer 3',
          position: 2,
          createdAt: new Date('2024-01-01'),
        },
      ]

      mockReturning.mockResolvedValue(expectedDistractors)

      await createDistractors(flashcardId, contents)

      // Verify insert was called
      expect(mockInsert).toHaveBeenCalledTimes(1)

      // Verify values were passed correctly
      expect(mockValues).toHaveBeenCalledTimes(1)
      const passedValues = mockValues.mock.calls[0][0]

      expect(passedValues).toHaveLength(3)
      expect(passedValues[0]).toEqual({
        flashcardId,
        content: 'Wrong answer 1',
        position: 0,
      })
      expect(passedValues[1]).toEqual({
        flashcardId,
        content: 'Wrong answer 2',
        position: 1,
      })
      expect(passedValues[2]).toEqual({
        flashcardId,
        content: 'Wrong answer 3',
        position: 2,
      })
    })

    it('should return the created distractors', async () => {
      const flashcardId = 'flashcard-456'
      const contents = ['Distractor A', 'Distractor B', 'Distractor C']

      const expectedDistractors: Distractor[] = [
        {
          id: 'dist-a',
          flashcardId,
          content: 'Distractor A',
          position: 0,
          createdAt: new Date('2024-01-15'),
        },
        {
          id: 'dist-b',
          flashcardId,
          content: 'Distractor B',
          position: 1,
          createdAt: new Date('2024-01-15'),
        },
        {
          id: 'dist-c',
          flashcardId,
          content: 'Distractor C',
          position: 2,
          createdAt: new Date('2024-01-15'),
        },
      ]

      mockReturning.mockResolvedValue(expectedDistractors)

      const result = await createDistractors(flashcardId, contents)

      expect(result).toEqual(expectedDistractors)
      expect(result).toHaveLength(3)
      expect(result[0].content).toBe('Distractor A')
      expect(result[1].content).toBe('Distractor B')
      expect(result[2].content).toBe('Distractor C')
    })

    it('should handle creating distractors with special characters', async () => {
      const flashcardId = 'flashcard-789'
      const contents = ['Option with "quotes"', "Option with 'apostrophe'", 'Option with & symbols']

      const expectedDistractors: Distractor[] = contents.map((content, index) => ({
        id: `dist-${index}`,
        flashcardId,
        content,
        position: index,
        createdAt: new Date(),
      }))

      mockReturning.mockResolvedValue(expectedDistractors)

      const result = await createDistractors(flashcardId, contents)

      expect(result[0].content).toBe('Option with "quotes"')
      expect(result[1].content).toBe("Option with 'apostrophe'")
      expect(result[2].content).toBe('Option with & symbols')
    })
  })

  describe('getDistractorsForFlashcard', () => {
    it('should return distractors ordered by position', async () => {
      const flashcardId = 'flashcard-abc'

      const mockDistractors: Distractor[] = [
        {
          id: 'dist-1',
          flashcardId,
          content: 'First distractor',
          position: 0,
          createdAt: new Date('2024-01-01'),
        },
        {
          id: 'dist-2',
          flashcardId,
          content: 'Second distractor',
          position: 1,
          createdAt: new Date('2024-01-01'),
        },
        {
          id: 'dist-3',
          flashcardId,
          content: 'Third distractor',
          position: 2,
          createdAt: new Date('2024-01-01'),
        },
      ]

      mockOrderBy.mockResolvedValue(mockDistractors)

      const result = await getDistractorsForFlashcard(flashcardId)

      // Verify the query chain was called correctly
      expect(mockSelect).toHaveBeenCalledTimes(1)
      expect(mockFrom).toHaveBeenCalledTimes(1)
      expect(mockWhere).toHaveBeenCalledTimes(1)
      expect(mockOrderBy).toHaveBeenCalledTimes(1)

      // Verify results are in correct order
      expect(result).toEqual(mockDistractors)
      expect(result[0].position).toBe(0)
      expect(result[1].position).toBe(1)
      expect(result[2].position).toBe(2)
    })

    it('should return empty array for non-existent flashcard', async () => {
      const flashcardId = 'non-existent-flashcard'

      mockOrderBy.mockResolvedValue([])

      const result = await getDistractorsForFlashcard(flashcardId)

      expect(result).toEqual([])
      expect(result).toHaveLength(0)
    })

    it('should return empty array for flashcard without distractors', async () => {
      const flashcardId = 'flashcard-without-distractors'

      mockOrderBy.mockResolvedValue([])

      const result = await getDistractorsForFlashcard(flashcardId)

      expect(result).toEqual([])
      expect(mockSelect).toHaveBeenCalledTimes(1)
    })

    it('should handle flashcards with less than 3 distractors', async () => {
      const flashcardId = 'flashcard-partial'

      const mockDistractors: Distractor[] = [
        {
          id: 'dist-1',
          flashcardId,
          content: 'Only distractor',
          position: 0,
          createdAt: new Date('2024-01-01'),
        },
      ]

      mockOrderBy.mockResolvedValue(mockDistractors)

      const result = await getDistractorsForFlashcard(flashcardId)

      expect(result).toHaveLength(1)
      expect(result[0].content).toBe('Only distractor')
    })
  })

  describe('deleteDistractorsForFlashcard', () => {
    it('should remove all distractors for a flashcard', async () => {
      const flashcardId = 'flashcard-to-delete'

      mockWhere.mockResolvedValue(undefined)

      await deleteDistractorsForFlashcard(flashcardId)

      // Verify delete was called
      expect(mockDelete).toHaveBeenCalledTimes(1)
      expect(mockWhere).toHaveBeenCalledTimes(1)
    })

    it('should not throw error when deleting from flashcard with no distractors', async () => {
      const flashcardId = 'flashcard-no-distractors'

      mockWhere.mockResolvedValue(undefined)

      await expect(deleteDistractorsForFlashcard(flashcardId)).resolves.not.toThrow()

      expect(mockDelete).toHaveBeenCalledTimes(1)
    })

    it('should not throw error when deleting non-existent flashcard', async () => {
      const flashcardId = 'non-existent-flashcard'

      mockWhere.mockResolvedValue(undefined)

      await expect(deleteDistractorsForFlashcard(flashcardId)).resolves.not.toThrow()

      expect(mockDelete).toHaveBeenCalledTimes(1)
    })
  })

  describe('Distractor Data Integrity', () => {
    it('should preserve exact content when creating distractors', async () => {
      const flashcardId = 'flashcard-integrity'
      const contents = [
        'Kubernetes orchestrates containers',
        'Docker Swarm is an alternative',
        'Apache Mesos provides resource management',
      ]

      const expectedDistractors: Distractor[] = contents.map((content, index) => ({
        id: `dist-${index}`,
        flashcardId,
        content,
        position: index,
        createdAt: new Date(),
      }))

      mockReturning.mockResolvedValue(expectedDistractors)

      const result = await createDistractors(flashcardId, contents)

      expect(result[0].content).toBe(contents[0])
      expect(result[1].content).toBe(contents[1])
      expect(result[2].content).toBe(contents[2])
    })

    it('should maintain position ordering across operations', async () => {
      const flashcardId = 'flashcard-ordering'
      const contents = ['Third', 'First', 'Second']

      // Create distractors
      const createdDistractors: Distractor[] = contents.map((content, index) => ({
        id: `dist-${index}`,
        flashcardId,
        content,
        position: index,
        createdAt: new Date(),
      }))

      mockReturning.mockResolvedValue(createdDistractors)
      await createDistractors(flashcardId, contents)

      // Get distractors (should be ordered by position)
      const orderedDistractors: Distractor[] = [
        createdDistractors[0], // position 0: "Third"
        createdDistractors[1], // position 1: "First"
        createdDistractors[2], // position 2: "Second"
      ]

      mockOrderBy.mockResolvedValue(orderedDistractors)
      const result = await getDistractorsForFlashcard(flashcardId)

      // Verify positions are preserved in order
      expect(result[0].position).toBe(0)
      expect(result[0].content).toBe('Third')
      expect(result[1].position).toBe(1)
      expect(result[1].content).toBe('First')
      expect(result[2].position).toBe(2)
      expect(result[2].content).toBe('Second')
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty string content in distractors', async () => {
      const flashcardId = 'flashcard-edge'
      const contents = ['', 'Valid distractor', '']

      const expectedDistractors: Distractor[] = contents.map((content, index) => ({
        id: `dist-${index}`,
        flashcardId,
        content,
        position: index,
        createdAt: new Date(),
      }))

      mockReturning.mockResolvedValue(expectedDistractors)

      const result = await createDistractors(flashcardId, contents)

      expect(result[0].content).toBe('')
      expect(result[1].content).toBe('Valid distractor')
      expect(result[2].content).toBe('')
    })

    it('should handle very long distractor content', async () => {
      const flashcardId = 'flashcard-long'
      const longContent = 'A'.repeat(500)
      const contents = [longContent, 'Short', 'Medium length answer']

      const expectedDistractors: Distractor[] = contents.map((content, index) => ({
        id: `dist-${index}`,
        flashcardId,
        content,
        position: index,
        createdAt: new Date(),
      }))

      mockReturning.mockResolvedValue(expectedDistractors)

      const result = await createDistractors(flashcardId, contents)

      expect(result[0].content).toHaveLength(500)
      expect(result[0].content).toBe(longContent)
    })

    it('should handle unicode and emoji in distractor content', async () => {
      const flashcardId = 'flashcard-unicode'
      const contents = ['日本語', '🚀 Rocket', 'Café']

      const expectedDistractors: Distractor[] = contents.map((content, index) => ({
        id: `dist-${index}`,
        flashcardId,
        content,
        position: index,
        createdAt: new Date(),
      }))

      mockReturning.mockResolvedValue(expectedDistractors)

      const result = await createDistractors(flashcardId, contents)

      expect(result[0].content).toBe('日本語')
      expect(result[1].content).toBe('🚀 Rocket')
      expect(result[2].content).toBe('Café')
    })
  })
})
