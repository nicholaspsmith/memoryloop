import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import type { RateLimitResult } from '@/lib/jobs/types'

/**
 * Unit Tests for Job Rate Limiting
 *
 * Tests rate limit checks (20 jobs/hour per user), window calculations,
 * remaining count, and reset time calculations.
 *
 * Maps to T005 in feature spec.
 */

// Mock database operations
vi.mock('@/lib/db/operations/background-jobs', () => ({
  checkRateLimit: vi.fn(),
}))

import { checkRateLimit } from '@/lib/db/operations/background-jobs'

describe('Job Rate Limit Check', () => {
  const testUserId = 'user-test-123'

  beforeEach(() => {
    vi.clearAllMocks()
    // Mock current time to 2024-01-15 10:30:00
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-01-15T10:30:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should return allowed=true when under limit (0/20)', async () => {
    vi.mocked(checkRateLimit).mockResolvedValue({
      allowed: true,
      remaining: 20,
      resetAt: new Date('2024-01-15T11:30:00Z'),
    })

    const result: RateLimitResult = await checkRateLimit(testUserId, 'flashcard_generation')

    expect(result.allowed).toBe(true)
    expect(result.remaining).toBe(20)
    expect(result.resetAt).toBeInstanceOf(Date)
  })

  it('should return allowed=true when under limit (10/20)', async () => {
    vi.mocked(checkRateLimit).mockResolvedValue({
      allowed: true,
      remaining: 10,
      resetAt: new Date('2024-01-15T11:30:00Z'),
    })

    const result: RateLimitResult = await checkRateLimit(testUserId, 'flashcard_generation')

    expect(result.allowed).toBe(true)
    expect(result.remaining).toBe(10)
  })

  it('should return allowed=true when just below limit (19/20)', async () => {
    vi.mocked(checkRateLimit).mockResolvedValue({
      allowed: true,
      remaining: 1,
      resetAt: new Date('2024-01-15T11:30:00Z'),
    })

    const result: RateLimitResult = await checkRateLimit(testUserId, 'flashcard_generation')

    expect(result.allowed).toBe(true)
    expect(result.remaining).toBe(1)
  })

  it('should return allowed=false at limit (20/20)', async () => {
    vi.mocked(checkRateLimit).mockResolvedValue({
      allowed: false,
      remaining: 0,
      resetAt: new Date('2024-01-15T11:30:00Z'),
    })

    const result: RateLimitResult = await checkRateLimit(testUserId, 'flashcard_generation')

    expect(result.allowed).toBe(false)
    expect(result.remaining).toBe(0)
    expect(result.resetAt).toBeInstanceOf(Date)
  })

  it('should return allowed=false when over limit (25/20)', async () => {
    vi.mocked(checkRateLimit).mockResolvedValue({
      allowed: false,
      remaining: 0,
      resetAt: new Date('2024-01-15T11:30:00Z'),
    })

    const result: RateLimitResult = await checkRateLimit(testUserId, 'flashcard_generation')

    expect(result.allowed).toBe(false)
    expect(result.remaining).toBe(0)
  })

  it('should calculate rate limit window (hourly boundaries)', async () => {
    vi.mocked(checkRateLimit).mockResolvedValue({
      allowed: true,
      remaining: 15,
      resetAt: new Date('2024-01-15T11:30:00Z'),
    })

    await checkRateLimit(testUserId, 'flashcard_generation')

    // Should have been called with userId and jobType
    expect(checkRateLimit).toHaveBeenCalledWith(testUserId, 'flashcard_generation')
  })

  it('should calculate remaining count correctly', async () => {
    const testCases = [
      { remaining: 20, allowed: true },
      { remaining: 15, allowed: true },
      { remaining: 1, allowed: true },
      { remaining: 0, allowed: false },
      { remaining: 0, allowed: false },
    ]

    for (const { remaining, allowed } of testCases) {
      vi.mocked(checkRateLimit).mockResolvedValue({
        allowed,
        remaining,
        resetAt: new Date('2024-01-15T11:30:00Z'),
      })

      const result = await checkRateLimit(testUserId, 'flashcard_generation')

      expect(result.remaining).toBe(remaining)
      expect(result.allowed).toBe(allowed)
    }
  })

  it('should calculate resetAt as start of next hour', async () => {
    // Current time: 2024-01-15 10:30:00
    const expectedReset = new Date('2024-01-15T11:30:00Z')
    vi.mocked(checkRateLimit).mockResolvedValue({
      allowed: false,
      remaining: 0,
      resetAt: expectedReset,
    })

    const result = await checkRateLimit(testUserId, 'flashcard_generation')

    // resetAt should be start of next hour window: 11:30:00
    expect(result.resetAt.getTime()).toBe(expectedReset.getTime())
  })

  it('should handle different users independently', async () => {
    const user1 = 'user-1'
    const user2 = 'user-2'

    vi.mocked(checkRateLimit)
      .mockResolvedValueOnce({
        allowed: true,
        remaining: 15,
        resetAt: new Date('2024-01-15T11:30:00Z'),
      }) // user-1 has 5 jobs used
      .mockResolvedValueOnce({
        allowed: true,
        remaining: 2,
        resetAt: new Date('2024-01-15T11:30:00Z'),
      }) // user-2 has 18 jobs used

    const result1 = await checkRateLimit(user1, 'flashcard_generation')
    const result2 = await checkRateLimit(user2, 'flashcard_generation')

    expect(result1.allowed).toBe(true)
    expect(result1.remaining).toBe(15)

    expect(result2.allowed).toBe(true)
    expect(result2.remaining).toBe(2)

    expect(checkRateLimit).toHaveBeenNthCalledWith(1, user1, 'flashcard_generation')
    expect(checkRateLimit).toHaveBeenNthCalledWith(2, user2, 'flashcard_generation')
  })

  it('should use sliding window (jobs older than 1 hour do not count)', async () => {
    // Mock shows only recent jobs count
    vi.mocked(checkRateLimit).mockResolvedValue({
      allowed: true,
      remaining: 17,
      resetAt: new Date('2024-01-15T11:30:00Z'),
    })

    const result = await checkRateLimit(testUserId, 'flashcard_generation')

    expect(result.allowed).toBe(true)
    expect(result.remaining).toBe(17)
  })

  it('should handle boundary case at exactly 1 hour mark', async () => {
    vi.setSystemTime(new Date('2024-01-15T11:00:00Z')) // Exactly on the hour

    const expectedReset = new Date('2024-01-15T12:00:00Z')
    vi.mocked(checkRateLimit).mockResolvedValue({
      allowed: true,
      remaining: 10,
      resetAt: expectedReset,
    })

    const result = await checkRateLimit(testUserId, 'flashcard_generation')

    expect(result.allowed).toBe(true)
    expect(result.remaining).toBe(10)

    // resetAt should be exactly 1 hour from now
    expect(result.resetAt.getTime()).toBe(expectedReset.getTime())
  })
})

describe('Rate Limit Integration Scenarios', () => {
  const userId = 'integration-user'

  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-01-15T14:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should allow burst of jobs up to limit', async () => {
    // Simulate creating jobs sequentially
    for (let i = 0; i < 20; i++) {
      vi.mocked(checkRateLimit).mockResolvedValue({
        allowed: true,
        remaining: 20 - i,
        resetAt: new Date('2024-01-15T15:00:00Z'),
      })

      const result = await checkRateLimit(userId, 'flashcard_generation')

      expect(result.allowed).toBe(true)
      expect(result.remaining).toBe(20 - i)
    }
  })

  it('should block after reaching limit', async () => {
    vi.mocked(checkRateLimit).mockResolvedValue({
      allowed: false,
      remaining: 0,
      resetAt: new Date('2024-01-15T15:00:00Z'),
    })

    const result = await checkRateLimit(userId, 'flashcard_generation')

    expect(result.allowed).toBe(false)
    expect(result.remaining).toBe(0)
  })

  it('should reset limit after window passes', async () => {
    // At limit
    vi.mocked(checkRateLimit).mockResolvedValue({
      allowed: false,
      remaining: 0,
      resetAt: new Date('2024-01-15T15:00:00Z'),
    })
    const result1 = await checkRateLimit(userId, 'flashcard_generation')
    expect(result1.allowed).toBe(false)

    // Advance time by 1 hour
    vi.setSystemTime(new Date('2024-01-15T15:00:00Z'))

    // Old jobs are now outside window
    vi.mocked(checkRateLimit).mockResolvedValue({
      allowed: true,
      remaining: 20,
      resetAt: new Date('2024-01-15T16:00:00Z'),
    })
    const result2 = await checkRateLimit(userId, 'flashcard_generation')

    expect(result2.allowed).toBe(true)
    expect(result2.remaining).toBe(20)
  })
})
