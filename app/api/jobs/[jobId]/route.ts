/**
 * Job Status and Retry API Routes
 *
 * GET /api/jobs/[jobId] - Get job status (triggers processing if pending)
 * POST /api/jobs/[jobId] - Retry a failed job
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import {
  getJobById,
  resetStaleJobs,
  createJob,
  checkRateLimit,
  incrementRateLimit,
} from '@/lib/db/operations/background-jobs'
import { processJob, canProcessJob } from '@/lib/jobs/processor'
import { JobStatus } from '@/lib/db/drizzle-schema'
import type { JobTypeValue } from '@/lib/jobs/types'

type RouteParams = { params: Promise<{ jobId: string }> }

/**
 * GET /api/jobs/[jobId]
 * Get job status and trigger processing if pending
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    // Check authentication
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized', code: 'AUTH_REQUIRED' }, { status: 401 })
    }

    const { jobId } = await params

    // Reset any stale jobs first (processing > 5 minutes)
    await resetStaleJobs()

    // Get the job
    const job = await getJobById(jobId)
    if (!job || job.userId !== session.user.id) {
      return NextResponse.json({ error: 'Job not found', code: 'NOT_FOUND' }, { status: 404 })
    }

    // Trigger processing if pending and ready (piggyback on poll request)
    if (canProcessJob(job)) {
      // Process in background, don't await
      processJob(job).catch((error) => {
        console.error(`[Jobs API] Background processing error for job ${jobId}:`, error)
      })
    }

    return NextResponse.json(job)
  } catch (error) {
    console.error('[Jobs API] GET [jobId] error:', error)
    return NextResponse.json(
      { error: 'Failed to retrieve job', code: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/jobs/[jobId]
 * Retry a failed job by creating a new job with the same payload
 */
export async function POST(_request: NextRequest, { params }: RouteParams) {
  try {
    // Check authentication
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized', code: 'AUTH_REQUIRED' }, { status: 401 })
    }

    const userId = session.user.id
    const { jobId } = await params

    // Get the original job
    const originalJob = await getJobById(jobId)
    if (!originalJob || originalJob.userId !== userId) {
      return NextResponse.json({ error: 'Job not found', code: 'NOT_FOUND' }, { status: 404 })
    }

    // Only allow retry on failed jobs
    if (originalJob.status !== JobStatus.FAILED) {
      return NextResponse.json(
        {
          error: 'Only failed jobs can be retried',
          code: 'INVALID_STATE',
        },
        { status: 400 }
      )
    }

    // Check rate limit for the new job
    const rateLimit = await checkRateLimit(userId, originalJob.type)
    if (!rateLimit.allowed) {
      const retryAfter = Math.ceil((rateLimit.resetAt.getTime() - Date.now()) / 1000)
      return NextResponse.json(
        {
          error: 'Rate limit exceeded. Maximum 20 jobs per hour per type.',
          code: 'RATE_LIMITED',
          retryAfter,
        },
        { status: 429 }
      )
    }

    // Create a new job with the same payload
    const newJob = await createJob({
      type: originalJob.type as JobTypeValue,
      payload: originalJob.payload,
      priority: originalJob.priority,
      userId,
    })

    // Increment rate limit counter
    await incrementRateLimit(userId, originalJob.type)

    return NextResponse.json(newJob, { status: 201 })
  } catch (error) {
    console.error('[Jobs API] POST [jobId] error:', error)
    return NextResponse.json(
      { error: 'Failed to retry job', code: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
}
