/**
 * Background Jobs API Routes
 *
 * POST /api/jobs - Create a new background job
 * GET /api/jobs - List user's jobs with optional filters
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import {
  createJob,
  checkRateLimit,
  incrementRateLimit,
  getJobsByUserId,
} from '@/lib/db/operations/background-jobs'
import { JobType } from '@/lib/db/drizzle-schema'
import type { CreateJobRequest, JobTypeValue } from '@/lib/jobs/types'

// Valid job types
const validJobTypes = new Set<string>([
  JobType.FLASHCARD_GENERATION,
  JobType.DISTRACTOR_GENERATION,
  JobType.SKILL_TREE_GENERATION,
])

/**
 * POST /api/jobs
 * Create a new background job with rate limit check
 */
export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized', code: 'AUTH_REQUIRED' }, { status: 401 })
    }

    const userId = session.user.id

    // Parse request body
    const body = (await request.json()) as CreateJobRequest
    const { type, payload, priority = 0 } = body

    // Validate job type
    if (!type || !validJobTypes.has(type)) {
      return NextResponse.json(
        {
          error: `Invalid job type. Must be one of: ${Array.from(validJobTypes).join(', ')}`,
          code: 'VALIDATION_ERROR',
        },
        { status: 400 }
      )
    }

    // Validate payload exists
    if (!payload || typeof payload !== 'object') {
      return NextResponse.json(
        { error: 'Invalid payload', code: 'VALIDATION_ERROR' },
        { status: 400 }
      )
    }

    // Check rate limit (20 jobs/hour/user/type)
    const rateLimit = await checkRateLimit(userId, type)
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

    // Create job
    const job = await createJob({
      type: type as JobTypeValue,
      payload,
      priority,
      userId,
    })

    // Increment rate limit counter
    await incrementRateLimit(userId, type)

    return NextResponse.json(job, { status: 201 })
  } catch (error) {
    console.error('[Jobs API] POST error:', error)
    return NextResponse.json(
      { error: 'Failed to create job', code: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/jobs
 * List user's jobs with optional filters
 *
 * Query params:
 * - type: Filter by job type
 * - status: Filter by job status
 * - limit: Max results (default 20, max 100)
 */
export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized', code: 'AUTH_REQUIRED' }, { status: 401 })
    }

    const userId = session.user.id
    const { searchParams } = new URL(request.url)

    // Parse query parameters
    const type = searchParams.get('type') || undefined
    const status = searchParams.get('status') || undefined
    const limitParam = searchParams.get('limit')
    const limit = limitParam ? Math.min(parseInt(limitParam, 10), 100) : 20

    // Get jobs with filters
    const jobs = await getJobsByUserId(userId, { type, status, limit })

    return NextResponse.json({ jobs })
  } catch (error) {
    console.error('[Jobs API] GET error:', error)
    return NextResponse.json(
      { error: 'Failed to retrieve jobs', code: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
}
