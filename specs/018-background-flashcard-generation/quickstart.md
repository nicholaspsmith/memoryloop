# Quickstart: Background Flashcard Generation

**Feature**: 018-background-flashcard-generation
**Date**: 2025-12-30

## Overview

This guide explains how to implement background job processing for LLM-dependent generation operations (flashcards, distractors, skill trees).

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend                                  │
├─────────────────────────────────────────────────────────────────┤
│  1. User triggers generation                                     │
│  2. POST /api/jobs → receives jobId                             │
│  3. Poll GET /api/jobs/{jobId} every 3s                         │
│  4. Display GenerationPlaceholder while pending/processing       │
│  5. On completed: show content; On failed: show retry button     │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                        API Layer                                 │
├─────────────────────────────────────────────────────────────────┤
│  POST /api/jobs                                                  │
│    → Validate payload                                            │
│    → Check rate limit (20/hour/user/type)                       │
│    → Create job record (status: pending)                         │
│    → Return { id, status: 'pending' }                           │
│                                                                  │
│  GET /api/jobs/{jobId}                                          │
│    → Fetch job from DB                                          │
│    → If pending: trigger processing (inline)                    │
│    → Return current status                                      │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Job Processor                                 │
├─────────────────────────────────────────────────────────────────┤
│  processJob(job):                                                │
│    1. Set status = 'processing', startedAt = now                │
│    2. Execute handler based on job.type                         │
│    3. On success: status = 'completed', store result            │
│    4. On failure:                                                │
│       - If attempts < maxAttempts: reset to pending with delay  │
│       - Else: status = 'failed', store error                    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Job Handlers                                  │
├─────────────────────────────────────────────────────────────────┤
│  FlashcardJobHandler:                                            │
│    → Call generateFlashcardsFromContent()                       │
│    → Create flashcard records                                    │
│    → Return { flashcardIds, count }                             │
│                                                                  │
│  DistractorJobHandler:                                          │
│    → Call generateDistractors()                                 │
│    → Create distractor records                                   │
│    → Return { distractors, flashcardId }                        │
│                                                                  │
│  SkillTreeJobHandler:                                           │
│    → Call generateSkillTree()                                   │
│    → Create skill node records                                   │
│    → Return { treeId, nodeCount, depth }                        │
└─────────────────────────────────────────────────────────────────┘
```

## Implementation Steps

### Step 1: Database Operations

Create `lib/db/operations/background-jobs.ts`:

```typescript
import { eq, and, lt, desc } from 'drizzle-orm'
import { backgroundJobs, jobRateLimits, JobStatus, JobType } from '../drizzle-schema'
import type { NewBackgroundJob, BackgroundJob } from '../drizzle-schema'

export async function createJob(db, job: NewBackgroundJob): Promise<BackgroundJob> {
  const [created] = await db.insert(backgroundJobs).values(job).returning()
  return created
}

export async function getJobById(db, jobId: string): Promise<BackgroundJob | null> {
  const [job] = await db.select().from(backgroundJobs).where(eq(backgroundJobs.id, jobId))
  return job ?? null
}

export async function updateJobStatus(
  db,
  jobId: string,
  status: JobStatusValue,
  updates: Partial<BackgroundJob>
): Promise<void> {
  await db
    .update(backgroundJobs)
    .set({ status, ...updates })
    .where(eq(backgroundJobs.id, jobId))
}

export async function getPendingJobForUser(db, userId: string): Promise<BackgroundJob | null> {
  const now = new Date()
  const [job] = await db
    .select()
    .from(backgroundJobs)
    .where(
      and(
        eq(backgroundJobs.userId, userId),
        eq(backgroundJobs.status, JobStatus.PENDING),
        // Either no retry scheduled or retry time has passed
        or(isNull(backgroundJobs.nextRetryAt), lt(backgroundJobs.nextRetryAt, now))
      )
    )
    .orderBy(desc(backgroundJobs.priority), backgroundJobs.createdAt)
    .limit(1)
  return job ?? null
}

export async function resetStaleJobs(db): Promise<number> {
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000)
  const result = await db
    .update(backgroundJobs)
    .set({ status: JobStatus.PENDING })
    .where(
      and(
        eq(backgroundJobs.status, JobStatus.PROCESSING),
        lt(backgroundJobs.startedAt, fiveMinutesAgo)
      )
    )
  return result.rowCount ?? 0
}
```

### Step 2: Rate Limiting

Add to `lib/db/operations/background-jobs.ts`:

```typescript
const RATE_LIMIT = 20 // jobs per hour per type

export async function checkRateLimit(
  db,
  userId: string,
  jobType: string
): Promise<{ allowed: boolean; remaining: number; resetAt: Date }> {
  const windowStart = new Date()
  windowStart.setMinutes(0, 0, 0) // Round to hour

  const [record] = await db
    .select()
    .from(jobRateLimits)
    .where(
      and(
        eq(jobRateLimits.userId, userId),
        eq(jobRateLimits.jobType, jobType),
        eq(jobRateLimits.windowStart, windowStart)
      )
    )

  const count = record?.count ?? 0
  const resetAt = new Date(windowStart.getTime() + 60 * 60 * 1000)

  return {
    allowed: count < RATE_LIMIT,
    remaining: Math.max(0, RATE_LIMIT - count),
    resetAt,
  }
}

export async function incrementRateLimit(db, userId: string, jobType: string): Promise<void> {
  const windowStart = new Date()
  windowStart.setMinutes(0, 0, 0)

  await db
    .insert(jobRateLimits)
    .values({ userId, jobType, windowStart, count: 1 })
    .onConflictDoUpdate({
      target: [jobRateLimits.userId, jobRateLimits.jobType, jobRateLimits.windowStart],
      set: { count: sql`${jobRateLimits.count} + 1` },
    })
}
```

### Step 3: Job Processor

Create `lib/jobs/processor.ts`:

```typescript
import { BackgroundJob, JobStatus } from '@/lib/db/drizzle-schema'
import { updateJobStatus } from '@/lib/db/operations/background-jobs'
import { handleFlashcardJob } from './handlers/flashcard-job'
import { handleDistractorJob } from './handlers/distractor-job'
import { handleSkillTreeJob } from './handlers/skill-tree-job'

const handlers = {
  flashcard_generation: handleFlashcardJob,
  distractor_generation: handleDistractorJob,
  skill_tree_generation: handleSkillTreeJob,
}

export async function processJob(db, job: BackgroundJob): Promise<void> {
  const handler = handlers[job.type]
  if (!handler) {
    throw new Error(`Unknown job type: ${job.type}`)
  }

  // Mark as processing
  await updateJobStatus(db, job.id, JobStatus.PROCESSING, {
    startedAt: new Date(),
    attempts: job.attempts + 1,
  })

  try {
    const result = await handler(job.payload)
    await updateJobStatus(db, job.id, JobStatus.COMPLETED, {
      result,
      completedAt: new Date(),
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'

    if (job.attempts + 1 >= job.maxAttempts) {
      // Max retries reached
      await updateJobStatus(db, job.id, JobStatus.FAILED, {
        error: errorMessage,
        completedAt: new Date(),
      })
    } else {
      // Schedule retry with exponential backoff
      const delay = Math.pow(2, job.attempts) * 1000 // 1s, 2s, 4s
      await updateJobStatus(db, job.id, JobStatus.PENDING, {
        error: errorMessage,
        nextRetryAt: new Date(Date.now() + delay),
      })
    }
  }
}
```

### Step 4: Job Handlers

Create `lib/jobs/handlers/flashcard-job.ts`:

```typescript
import { generateFlashcardsFromContent } from '@/lib/claude/flashcard-generator'
import { createFlashcard } from '@/lib/db/operations/flashcards'
import type { FlashcardGenerationPayload, FlashcardGenerationResult } from '../types'

export async function handleFlashcardJob(
  payload: FlashcardGenerationPayload
): Promise<FlashcardGenerationResult> {
  const { content, messageId, goalId, nodeId } = payload

  // Generate flashcards using existing generator
  const cards = await generateFlashcardsFromContent(content, {
    apiKey: process.env.ANTHROPIC_API_KEY!,
  })

  // Persist to database
  const flashcardIds: string[] = []
  for (const card of cards) {
    const created = await createFlashcard({
      question: card.question,
      answer: card.answer,
      messageId,
      goalId,
      nodeId,
    })
    flashcardIds.push(created.id)
  }

  return { flashcardIds, count: flashcardIds.length }
}
```

### Step 5: API Routes

Create `app/api/jobs/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getDb } from '@/lib/db/pg-client'
import { createJob, checkRateLimit, incrementRateLimit } from '@/lib/db/operations/background-jobs'

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { type, payload, priority = 0 } = body

  const db = getDb()

  // Check rate limit
  const rateLimit = await checkRateLimit(db, session.user.id, type)
  if (!rateLimit.allowed) {
    return NextResponse.json(
      {
        error: 'Rate limit exceeded. Maximum 20 jobs per hour per type.',
        code: 'RATE_LIMITED',
        retryAfter: Math.ceil((rateLimit.resetAt.getTime() - Date.now()) / 1000),
      },
      { status: 429 }
    )
  }

  // Create job
  const job = await createJob(db, {
    type,
    payload,
    priority,
    userId: session.user.id,
  })

  // Increment rate limit counter
  await incrementRateLimit(db, session.user.id, type)

  return NextResponse.json(job, { status: 201 })
}
```

Create `app/api/jobs/[jobId]/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getDb } from '@/lib/db/pg-client'
import { getJobById, resetStaleJobs } from '@/lib/db/operations/background-jobs'
import { processJob } from '@/lib/jobs/processor'
import { JobStatus } from '@/lib/db/drizzle-schema'

export async function GET(request: NextRequest, { params }: { params: { jobId: string } }) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const db = getDb()
  const { jobId } = params

  // Reset any stale jobs first
  await resetStaleJobs(db)

  const job = await getJobById(db, jobId)
  if (!job || job.userId !== session.user.id) {
    return NextResponse.json({ error: 'Job not found' }, { status: 404 })
  }

  // Trigger processing if pending (piggyback on poll request)
  if (job.status === JobStatus.PENDING) {
    // Process in background, don't await
    processJob(db, job).catch(console.error)
  }

  return NextResponse.json(job)
}
```

### Step 6: Frontend Polling Hook

Create `hooks/useJobStatus.ts`:

```typescript
import { useState, useEffect, useCallback } from 'react'

interface Job {
  id: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  result?: unknown
  error?: string
}

export function useJobStatus(jobId: string | null) {
  const [job, setJob] = useState<Job | null>(null)
  const [isPolling, setIsPolling] = useState(false)

  const poll = useCallback(async () => {
    if (!jobId) return

    const response = await fetch(`/api/jobs/${jobId}`)
    if (response.ok) {
      const data = await response.json()
      setJob(data)
      return data.status
    }
    return null
  }, [jobId])

  useEffect(() => {
    if (!jobId) return

    let interval: NodeJS.Timeout
    let pollCount = 0

    const startPolling = async () => {
      setIsPolling(true)
      const status = await poll()

      if (status === 'completed' || status === 'failed') {
        setIsPolling(false)
        return
      }

      // Adaptive polling interval
      pollCount++
      let delay = 3000 // 3 seconds default
      if (pollCount > 10) delay = 5000 // After 30s, slow to 5s
      if (pollCount > 34) delay = 10000 // After 2min, slow to 10s
      if (pollCount > 94) {
        // After 10min, stop
        setIsPolling(false)
        return
      }

      interval = setTimeout(startPolling, delay)
    }

    startPolling()

    return () => clearTimeout(interval)
  }, [jobId, poll])

  const retry = useCallback(async () => {
    if (!jobId || job?.status !== 'failed') return null

    const response = await fetch(`/api/jobs/${jobId}`, { method: 'POST' })
    if (response.ok) {
      const newJob = await response.json()
      setJob(newJob)
      return newJob.id
    }
    return null
  }, [jobId, job?.status])

  return { job, isPolling, retry }
}
```

### Step 7: Placeholder Component

Create `components/ui/GenerationPlaceholder.tsx`:

```tsx
interface GenerationPlaceholderProps {
  jobType: 'flashcard' | 'distractor' | 'skill_tree'
  status: 'pending' | 'processing' | 'failed'
  error?: string
  onRetry?: () => void
}

const typeLabels = {
  flashcard: 'flashcards',
  distractor: 'answer choices',
  skill_tree: 'skill tree',
}

export function GenerationPlaceholder({
  jobType,
  status,
  error,
  onRetry,
}: GenerationPlaceholderProps) {
  const label = typeLabels[jobType]

  if (status === 'failed') {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4">
        <div className="flex items-center gap-2 text-red-700">
          <AlertCircle className="h-5 w-5" />
          <span>Failed to generate {label}</span>
        </div>
        {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
        {onRetry && (
          <button
            onClick={onRetry}
            className="mt-2 text-sm font-medium text-red-700 hover:underline"
          >
            Try again
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="animate-pulse rounded-lg border border-gray-200 bg-gray-50 p-4">
      <div className="flex items-center gap-2 text-gray-500">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span>Generating {label}...</span>
      </div>
    </div>
  )
}
```

## Testing Strategy

### Unit Tests

- Job processor state transitions
- Rate limit calculation
- Stale job detection
- Payload validation

### Integration Tests

- POST /api/jobs creates job and returns ID
- GET /api/jobs/{id} returns correct status
- Rate limiting rejects excess requests
- Retry creates new job from failed job

### E2E Tests

- User triggers flashcard generation → sees placeholder → sees cards
- User navigates away → returns → sees completed content
- Failed generation shows retry button → retry succeeds

## Migration

The WIP migration at `drizzle/0009_add_background_jobs.sql` is already complete. Run:

```bash
npm run db:migrate
```

## Rollback Plan

If issues arise:

1. Revert API routes to synchronous calls
2. Jobs table remains but is unused
3. No data migration needed
