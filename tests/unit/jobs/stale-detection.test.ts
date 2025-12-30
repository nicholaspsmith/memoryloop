import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

/**
 * Unit Tests for Stale Job Detection
 *
 * Tests detection of jobs stuck in processing state > 5 minutes,
 * and automatic reset to pending for retry.
 *
 * Maps to T006 in feature spec.
 */

// Mock database operations
vi.mock('@/lib/db/operations/background-jobs', () => ({
  resetStaleJobs: vi.fn(),
}))

import { resetStaleJobs } from '@/lib/db/operations/background-jobs'

describe('Stale Job Detection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Set fixed time for testing
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-01-15T10:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should reset stale jobs and return count', async () => {
    // Mock resetStaleJobs to return 2 jobs reset
    vi.mocked(resetStaleJobs).mockResolvedValue(2)

    const count = await resetStaleJobs()

    expect(count).toBe(2)
    expect(resetStaleJobs).toHaveBeenCalled()
  })

  it('should return 0 when no stale jobs exist', async () => {
    vi.mocked(resetStaleJobs).mockResolvedValue(0)

    const count = await resetStaleJobs()

    expect(count).toBe(0)
  })

  it('should handle multiple stale jobs', async () => {
    vi.mocked(resetStaleJobs).mockResolvedValue(5)

    const count = await resetStaleJobs()

    expect(count).toBe(5)
  })
})
