/**
 * Distractor Generation API Endpoint
 *
 * POST /api/study/distractors
 *
 * Generates 3 plausible but incorrect distractors for a flashcard's correct answer.
 * Used by the multiple choice study mode to create quiz-style options.
 *
 * @module app/api/study/distractors/route
 */

import { NextRequest, NextResponse } from 'next/server'
import { generateDistractors } from '@/lib/ai/distractor-generator'
import { auth } from '@/auth'
import { z } from 'zod'

// ============================================================================
// Request Validation Schema (T008)
// ============================================================================

const GenerateDistractorsRequestSchema = z.object({
  flashcardId: z.string().uuid(),
  question: z.string().min(1, 'Question is required').max(500, 'Question too long'),
  answer: z.string().min(1, 'Answer is required').max(200, 'Answer too long'),
})

// ============================================================================
// Response Types (per contracts/distractor-api.md)
// ============================================================================

interface GenerateDistractorsResponse {
  distractors: [string, string, string]
  generationTimeMs: number
}

interface DistractorErrorResponse {
  error: string
  fallbackRequired: true
}

// ============================================================================
// POST Handler (T007)
// ============================================================================

export async function POST(
  request: NextRequest
): Promise<NextResponse<GenerateDistractorsResponse | DistractorErrorResponse>> {
  try {
    // Authenticate user
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized', fallbackRequired: true }, { status: 401 })
    }

    // Parse and validate request body (T008)
    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON body', fallbackRequired: true },
        { status: 400 }
      )
    }

    const validation = GenerateDistractorsRequestSchema.safeParse(body)
    if (!validation.success) {
      const errorMessage = validation.error.issues
        .map((i) => `${i.path.join('.')}: ${i.message}`)
        .join(', ')
      return NextResponse.json(
        { error: `Validation error: ${errorMessage}`, fallbackRequired: true },
        { status: 400 }
      )
    }

    const { flashcardId, question, answer } = validation.data

    // Log request start per plan.md observability section
    console.info('[Distractor API] Generation request', {
      flashcardId,
      questionLength: question.length,
    })

    // Generate distractors
    const result = await generateDistractors(question, answer)

    if (!result.success || !result.distractors) {
      // Log failure per plan.md
      console.warn('[Distractor API] Generation failed', {
        flashcardId,
        error: result.error,
        generationTimeMs: result.generationTimeMs,
        fallbackTriggered: true,
      })

      return NextResponse.json(
        {
          error: result.error || 'Failed to generate distractors',
          fallbackRequired: true,
        },
        { status: 500 }
      )
    }

    // Log success per plan.md
    console.info('[Distractor API] Generation success', {
      flashcardId,
      generationTimeMs: result.generationTimeMs,
    })

    return NextResponse.json({
      distractors: result.distractors,
      generationTimeMs: result.generationTimeMs,
    })
  } catch (error) {
    // Catch-all error handler
    console.error('[Distractor API] Unexpected error', error)

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Internal server error',
        fallbackRequired: true,
      },
      { status: 500 }
    )
  }
}
