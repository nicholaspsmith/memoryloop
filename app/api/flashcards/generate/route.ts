import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { z } from 'zod'
import { getMessageById } from '@/lib/db/operations/messages'
import { getFlashcardsByMessageId } from '@/lib/db/operations/flashcards'
import { createJob, checkRateLimit, incrementRateLimit } from '@/lib/db/operations/background-jobs'
import { JobType } from '@/lib/db/drizzle-schema'

/**
 * POST /api/flashcards/generate
 *
 * Generate flashcards from a Claude (assistant) message
 *
 * Maps to FR-008, FR-009, FR-017, FR-018, FR-019
 */

const GenerateRequestSchema = z.object({
  messageId: z.string().uuid(),
  maxFlashcards: z.number().int().min(1).max(50).optional().default(20),
})

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 })
    }

    const userId = session.user.id

    // Parse and validate request body
    const body = await request.json()
    const { messageId, maxFlashcards } = GenerateRequestSchema.parse(body)

    // Get the message
    const message = await getMessageById(messageId)

    if (!message) {
      return NextResponse.json(
        { error: 'Message not found', code: 'MESSAGE_NOT_FOUND' },
        { status: 404 }
      )
    }

    // Verify message belongs to user
    if (message.userId !== userId) {
      return NextResponse.json({ error: 'Forbidden', code: 'FORBIDDEN' }, { status: 403 })
    }

    // Verify message is from assistant (FR-008)
    if (message.role !== 'assistant') {
      return NextResponse.json(
        {
          error: 'Can only generate flashcards from Claude (assistant) messages',
          code: 'INVALID_MESSAGE_ROLE',
        },
        { status: 400 }
      )
    }

    // Check if flashcards already generated (FR-017)
    const existingFlashcards = await getFlashcardsByMessageId(messageId)
    if (existingFlashcards.length > 0) {
      return NextResponse.json(
        {
          error: 'Flashcards have already been generated from this message',
          code: 'FLASHCARDS_ALREADY_EXIST',
          existingFlashcardIds: existingFlashcards.map((fc) => fc.id),
        },
        { status: 409 }
      )
    }

    // Check rate limit before creating job
    const rateLimit = await checkRateLimit(userId, JobType.FLASHCARD_GENERATION)
    if (!rateLimit.allowed) {
      const retryAfter = Math.ceil((rateLimit.resetAt.getTime() - Date.now()) / 1000)
      return NextResponse.json(
        {
          error: 'Rate limit exceeded. Maximum 20 jobs per hour.',
          code: 'RATE_LIMITED',
          retryAfter,
        },
        { status: 429 }
      )
    }

    console.log(`[FlashcardGenerate] Creating background job for message ${messageId}`)

    // Create background job instead of sync generation
    const job = await createJob({
      type: JobType.FLASHCARD_GENERATION,
      payload: {
        messageId,
        content: message.content,
        maxFlashcards,
      },
      userId,
    })

    // Increment rate limit counter
    await incrementRateLimit(userId, JobType.FLASHCARD_GENERATION)

    console.log(`[FlashcardGenerate] Created job ${job.id} for message ${messageId}`)

    // Return job info for polling
    return NextResponse.json(
      {
        success: true,
        job: {
          id: job.id,
          type: job.type,
          status: job.status,
          createdAt: job.createdAt,
        },
        message: 'Flashcard generation started. Poll /api/jobs/{jobId} for status.',
      },
      { status: 202 }
    )
  } catch (error) {
    console.error('[FlashcardGenerate] Error:', error)

    // Handle Zod validation errors
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Invalid request data',
          code: 'VALIDATION_ERROR',
          details: error.issues,
        },
        { status: 400 }
      )
    }

    // Generic error
    return NextResponse.json(
      {
        error: 'Failed to create flashcard generation job',
        code: 'INTERNAL_ERROR',
      },
      { status: 500 }
    )
  }
}
