import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * Unit Tests for Guided Study Flow (T012)
 *
 * Tests the getNextIncompleteNode and getNodeProgress functions
 * that power the guided study experience.
 *
 * getNextIncompleteNode returns the first incomplete node in
 * depth-first order (ordered by path: "1" < "1.1" < "1.1.1" < "1.2" < "2")
 *
 * getNodeProgress returns progress information for all nodes.
 *
 * These tests WILL FAIL until implementation is created.
 */

// Mock database client
vi.mock('@/lib/db/pg-client', () => ({
  getDb: vi.fn(),
}))

// Mock the isNodeComplete function
vi.mock('@/lib/study/node-completion', () => ({
  isNodeComplete: vi.fn(),
}))

import { getDb } from '@/lib/db/pg-client'
import { getNextIncompleteNode, getNodeProgress } from '@/lib/study/guided-flow'

describe('getNextIncompleteNode', () => {
  const mockDb = {
    select: vi.fn(),
  }

  const mockSelectBuilder = {
    from: vi.fn(),
    leftJoin: vi.fn(),
    where: vi.fn(),
    groupBy: vi.fn(),
    having: vi.fn(),
    orderBy: vi.fn(),
    limit: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getDb).mockReturnValue(mockDb as any)
    mockDb.select.mockReturnValue(mockSelectBuilder)
    mockSelectBuilder.from.mockReturnValue(mockSelectBuilder)
    mockSelectBuilder.leftJoin.mockReturnValue(mockSelectBuilder)
    mockSelectBuilder.where.mockReturnValue(mockSelectBuilder)
    mockSelectBuilder.groupBy.mockReturnValue(mockSelectBuilder)
    mockSelectBuilder.having.mockReturnValue(mockSelectBuilder)
    mockSelectBuilder.orderBy.mockReturnValue(mockSelectBuilder)
    mockSelectBuilder.limit.mockResolvedValue([])
  })

  it('should return first incomplete node in depth-first order', async () => {
    const treeId = 'tree-123'

    // Mock the query result - limit returns the first incomplete node
    mockSelectBuilder.limit.mockResolvedValue([
      {
        id: 'node-1.1',
        path: '1.1',
        title: 'Node 1.1',
        description: null,
        depth: 2,
        totalCards: 5,
        completedCards: 2,
      },
    ])

    const result = await getNextIncompleteNode(treeId)

    expect(result).toEqual({
      id: 'node-1.1',
      path: '1.1',
      title: 'Node 1.1',
      description: null,
      depth: 2,
      totalCards: 5,
      completedCards: 2,
      isComplete: false,
    })
  })

  it('should skip completed nodes', async () => {
    const treeId = 'tree-123'

    // The HAVING clause filters out completed nodes
    // So limit returns the first incomplete node
    mockSelectBuilder.limit.mockResolvedValue([
      {
        id: 'node-1.2',
        path: '1.2',
        title: 'Node 1.2',
        description: null,
        depth: 2,
        totalCards: 3,
        completedCards: 1,
      },
    ])

    const result = await getNextIncompleteNode(treeId)

    expect(result).toEqual({
      id: 'node-1.2',
      path: '1.2',
      title: 'Node 1.2',
      description: null,
      depth: 2,
      totalCards: 3,
      completedCards: 1,
      isComplete: false,
    })
  })

  it('should return null when all nodes are complete', async () => {
    const treeId = 'tree-123'

    // HAVING clause filters out all nodes (all complete)
    // So limit returns empty array
    mockSelectBuilder.limit.mockResolvedValue([])

    const result = await getNextIncompleteNode(treeId)

    expect(result).toBeNull()
  })

  it('should return null when tree has no cards yet', async () => {
    const treeId = 'tree-empty'

    // HAVING clause requires at least 1 card (count > 0)
    // So nodes with no cards are filtered out
    mockSelectBuilder.limit.mockResolvedValue([])

    const result = await getNextIncompleteNode(treeId)

    // Returns null since nodes must have at least one card
    expect(result).toBeNull()
  })

  it('should order by path correctly (depth-first)', async () => {
    const treeId = 'tree-123'

    // orderBy(asc(path)) ensures 1.1.1 comes before 1.2
    // limit(1) returns the first incomplete node in depth-first order
    mockSelectBuilder.limit.mockResolvedValue([
      {
        id: 'node-1.1.1',
        path: '1.1.1',
        title: 'Node 1.1.1',
        description: null,
        depth: 3,
        totalCards: 4,
        completedCards: 1,
      },
    ])

    const result = await getNextIncompleteNode(treeId)

    expect(result).toEqual({
      id: 'node-1.1.1',
      path: '1.1.1',
      title: 'Node 1.1.1',
      description: null,
      depth: 3,
      totalCards: 4,
      completedCards: 1,
      isComplete: false,
    })
  })

  it('should only query enabled nodes (isEnabled = true)', async () => {
    const treeId = 'tree-123'

    mockSelectBuilder.limit.mockResolvedValue([
      {
        id: 'node-1',
        path: '1',
        title: 'Node 1',
        description: null,
        depth: 1,
        totalCards: 2,
        completedCards: 0,
      },
    ])

    await getNextIncompleteNode(treeId)

    // Should filter by treeId and isEnabled = true
    expect(mockSelectBuilder.where).toHaveBeenCalled()
  })
})

describe('getNodeProgress', () => {
  const mockDb = {
    select: vi.fn(),
  }

  const mockSelectBuilder = {
    from: vi.fn(),
    leftJoin: vi.fn(),
    where: vi.fn(),
    groupBy: vi.fn(),
    orderBy: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getDb).mockReturnValue(mockDb as any)
    mockDb.select.mockReturnValue(mockSelectBuilder)
    mockSelectBuilder.from.mockReturnValue(mockSelectBuilder)
    mockSelectBuilder.leftJoin.mockReturnValue(mockSelectBuilder)
    mockSelectBuilder.where.mockReturnValue(mockSelectBuilder)
    mockSelectBuilder.groupBy.mockReturnValue(mockSelectBuilder)
    mockSelectBuilder.orderBy.mockResolvedValue([])
  })

  it('should return progress for all nodes', async () => {
    const treeId = 'tree-123'

    // Mock query results - groupBy returns one row per node with aggregated counts
    mockSelectBuilder.orderBy.mockResolvedValue([
      {
        id: 'node-1',
        path: '1',
        title: 'Node 1',
        description: null,
        depth: 1,
        totalCards: 2,
        completedCards: 2,
      },
      {
        id: 'node-2',
        path: '2',
        title: 'Node 2',
        description: null,
        depth: 1,
        totalCards: 1,
        completedCards: 0,
      },
    ])

    const result = await getNodeProgress(treeId)

    expect(result.nodes).toHaveLength(2)
    expect(result.nodes[0]).toEqual({
      id: 'node-1',
      path: '1',
      title: 'Node 1',
      description: null,
      depth: 1,
      totalCards: 2,
      completedCards: 2,
      isComplete: true,
    })
    expect(result.nodes[1]).toEqual({
      id: 'node-2',
      path: '2',
      title: 'Node 2',
      description: null,
      depth: 1,
      totalCards: 1,
      completedCards: 0,
      isComplete: false,
    })
  })

  it('should calculate summary correctly', async () => {
    const treeId = 'tree-123'

    // Mock aggregate query results
    mockSelectBuilder.orderBy.mockResolvedValue([
      {
        id: 'node-1',
        path: '1',
        title: 'Node 1',
        description: null,
        depth: 1,
        totalCards: 2,
        completedCards: 2,
      },
      {
        id: 'node-2',
        path: '2',
        title: 'Node 2',
        description: null,
        depth: 1,
        totalCards: 2,
        completedCards: 0,
      },
    ])

    const result = await getNodeProgress(treeId)

    expect(result.summary).toEqual({
      totalNodes: 2,
      completedNodes: 1, // Only node-1 is complete
      totalCards: 4,
      completedCards: 2, // Only card-1 and card-2 are complete
    })
  })

  it('should handle nodes with no cards', async () => {
    const treeId = 'tree-123'

    // Node with LEFT JOIN to flashcards returns count = 0
    mockSelectBuilder.orderBy.mockResolvedValue([
      {
        id: 'node-1',
        path: '1',
        title: 'Node 1',
        description: null,
        depth: 1,
        totalCards: 0,
        completedCards: 0,
      },
    ])

    const result = await getNodeProgress(treeId)

    expect(result.nodes[0]).toEqual({
      id: 'node-1',
      path: '1',
      title: 'Node 1',
      description: null,
      depth: 1,
      totalCards: 0,
      completedCards: 0,
      isComplete: false,
    })
  })

  it('should handle empty tree', async () => {
    const treeId = 'tree-empty'

    mockSelectBuilder.orderBy.mockResolvedValue([])

    const result = await getNodeProgress(treeId)

    expect(result.nodes).toHaveLength(0)
    expect(result.summary).toEqual({
      totalNodes: 0,
      completedNodes: 0,
      totalCards: 0,
      completedCards: 0,
    })
  })
})
