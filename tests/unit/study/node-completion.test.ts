import { describe, it, expect, beforeEach, vi } from 'vitest'
import { State } from 'ts-fsrs'

/**
 * Unit Tests for Node Completion Logic (T011)
 *
 * Tests the isNodeComplete function that determines if a skill node
 * is complete based on FSRS state of all its flashcards.
 *
 * A node is complete when ALL cards have fsrsState.state >= 2
 * (Review or Relearning state).
 *
 * These tests WILL FAIL until implementation is created.
 */

// Mock database client
vi.mock('@/lib/db/pg-client', () => ({
  getDb: vi.fn(),
}))

import { getDb } from '@/lib/db/pg-client'
import { isNodeComplete } from '@/lib/study/node-completion'

describe('isNodeComplete', () => {
  const mockDb = {
    select: vi.fn(),
  }

  const mockSelectBuilder = {
    from: vi.fn(),
    where: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getDb).mockReturnValue(mockDb as any)
    mockDb.select.mockReturnValue(mockSelectBuilder)
    mockSelectBuilder.from.mockReturnValue(mockSelectBuilder)
  })

  it('should return true when all cards have state >= 2', async () => {
    const nodeId = 'node-123'

    // Mock flashcards with states: 2 (Review), 3 (Relearning), 2 (Review)
    mockSelectBuilder.where.mockResolvedValue([
      {
        id: 'card-1',
        fsrsState: { state: State.Review }, // state = 2
      },
      {
        id: 'card-2',
        fsrsState: { state: State.Relearning }, // state = 3
      },
      {
        id: 'card-3',
        fsrsState: { state: State.Review }, // state = 2
      },
    ])

    const result = await isNodeComplete(nodeId)

    expect(result).toBe(true)
    expect(mockDb.select).toHaveBeenCalled()
  })

  it('should return false when any card has state < 2', async () => {
    const nodeId = 'node-123'

    // Mock flashcards with states: 2 (Review), 1 (Learning), 2 (Review)
    mockSelectBuilder.where.mockResolvedValue([
      {
        id: 'card-1',
        fsrsState: { state: State.Review }, // state = 2
      },
      {
        id: 'card-2',
        fsrsState: { state: State.Learning }, // state = 1
      },
      {
        id: 'card-3',
        fsrsState: { state: State.Review }, // state = 2
      },
    ])

    const result = await isNodeComplete(nodeId)

    expect(result).toBe(false)
  })

  it('should return false when node has no cards', async () => {
    const nodeId = 'node-empty'

    // Mock empty cards array
    mockSelectBuilder.where.mockResolvedValue([])

    const result = await isNodeComplete(nodeId)

    expect(result).toBe(false)
  })

  it('should return true for cards in Relearning state (3)', async () => {
    const nodeId = 'node-123'

    // All cards in Relearning state
    mockSelectBuilder.where.mockResolvedValue([
      {
        id: 'card-1',
        fsrsState: { state: State.Relearning }, // state = 3
      },
      {
        id: 'card-2',
        fsrsState: { state: State.Relearning }, // state = 3
      },
    ])

    const result = await isNodeComplete(nodeId)

    expect(result).toBe(true)
  })

  it('should return false for cards in New state (0)', async () => {
    const nodeId = 'node-123'

    // Cards in New state
    mockSelectBuilder.where.mockResolvedValue([
      {
        id: 'card-1',
        fsrsState: { state: State.New }, // state = 0
      },
    ])

    const result = await isNodeComplete(nodeId)

    expect(result).toBe(false)
  })

  it('should return false for cards in Learning state (1)', async () => {
    const nodeId = 'node-123'

    // Cards in Learning state
    mockSelectBuilder.where.mockResolvedValue([
      {
        id: 'card-1',
        fsrsState: { state: State.Learning }, // state = 1
      },
      {
        id: 'card-2',
        fsrsState: { state: State.Learning }, // state = 1
      },
    ])

    const result = await isNodeComplete(nodeId)

    expect(result).toBe(false)
  })

  it('should handle mixed states correctly', async () => {
    const nodeId = 'node-123'

    // One card still in Learning state
    mockSelectBuilder.where.mockResolvedValue([
      {
        id: 'card-1',
        fsrsState: { state: State.Review }, // state = 2
      },
      {
        id: 'card-2',
        fsrsState: { state: State.Relearning }, // state = 3
      },
      {
        id: 'card-3',
        fsrsState: { state: State.New }, // state = 0 - blocks completion
      },
    ])

    const result = await isNodeComplete(nodeId)

    expect(result).toBe(false)
  })

  it('should only query active flashcards (status = active)', async () => {
    const nodeId = 'node-123'

    mockSelectBuilder.where.mockResolvedValue([
      {
        id: 'card-1',
        fsrsState: { state: State.Review },
      },
    ])

    await isNodeComplete(nodeId)

    // Should filter by nodeId and status = 'active'
    expect(mockSelectBuilder.where).toHaveBeenCalled()
  })
})
