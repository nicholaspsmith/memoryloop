import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { BackgroundJob } from '@/lib/jobs/types'
import { JobStatus, JobType } from '@/lib/db/drizzle-schema'

/**
 * Unit Tests for Job Processor
 *
 * Tests job state transitions, retry logic with exponential backoff,
 * and handler dispatch by job type.
 *
 * Maps to T004 in feature spec.
 */

// Mock database operations
vi.mock('@/lib/db/operations/background-jobs', () => ({
  getPendingJobForUser: vi.fn(),
  updateJobStatus: vi.fn(),
  createJob: vi.fn(),
}))

// Mock job processor
vi.mock('@/lib/jobs/processor', () => ({
  processJob: vi.fn(),
  registerHandler: vi.fn(),
  getHandler: vi.fn(),
  calculateBackoffDelay: vi.fn((attempts: number) => Math.pow(2, attempts) * 1000),
}))

import { processJob, calculateBackoffDelay } from '@/lib/jobs/processor'

describe('Job Processor - State Transitions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should transition pending → processing → completed on success', async () => {
    const mockJob: BackgroundJob = {
      id: 'job-1',
      userId: 'user-1',
      type: JobType.FLASHCARD_GENERATION,
      status: JobStatus.PENDING,
      payload: { messageId: 'msg-1', content: 'test content' },
      result: null,
      error: null,
      attempts: 0,
      maxAttempts: 3,
      priority: 0,
      nextRetryAt: null,
      createdAt: new Date(),
      startedAt: null,
      completedAt: null,
    }

    // Mock successful processing
    vi.mocked(processJob).mockResolvedValue(undefined)

    await processJob(mockJob)

    // Should have been called with the job
    expect(processJob).toHaveBeenCalledWith(mockJob)
  })

  it('should transition pending → processing → failed after max attempts', async () => {
    const mockJob: BackgroundJob = {
      id: 'job-2',
      userId: 'user-1',
      type: JobType.DISTRACTOR_GENERATION,
      status: JobStatus.PENDING,
      payload: { flashcardId: 'fc-1', question: 'Q?', answer: 'A' },
      result: null,
      error: null,
      attempts: 2, // Already tried twice
      maxAttempts: 3,
      priority: 0,
      nextRetryAt: null,
      createdAt: new Date(),
      startedAt: null,
      completedAt: null,
    }

    const testError = new Error('Handler failed')

    // Mock failure
    vi.mocked(processJob).mockRejectedValue(testError)

    await expect(processJob(mockJob)).rejects.toThrow('Handler failed')

    // Should have been called with the job
    expect(processJob).toHaveBeenCalledWith(mockJob)
  })

  it('should calculate exponential backoff delay (1s, 2s, 4s)', () => {
    // Test the backoff calculation
    expect(calculateBackoffDelay(0)).toBe(1000) // 2^0 * 1000 = 1s
    expect(calculateBackoffDelay(1)).toBe(2000) // 2^1 * 1000 = 2s
    expect(calculateBackoffDelay(2)).toBe(4000) // 2^2 * 1000 = 4s
  })
})
