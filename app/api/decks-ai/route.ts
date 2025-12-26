import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { generateDeckSuggestions } from '@/lib/ai/deck-generation'
import { z } from 'zod'

/**
 * POST /api/decks-ai
 * Generate AI-powered deck suggestions using hybrid vector + LLM approach
 *
 * Pipeline:
 * 1. Vector search (LanceDB) for semantically similar flashcards
 * 2. LLM re-ranking (Claude API) for semantic filtering
 *
 * Maps to T062-T064 in Phase 6 (FR-013, FR-014, FR-015)
 */

// Request validation schema (T063)
const DeckGenerationRequestSchema = z.object({
  topic: z
    .string()
    .min(3, 'Topic must be at least 3 characters')
    .max(500, 'Topic must not exceed 500 characters'),
  minCards: z.number().int().min(1).max(50).optional().default(5),
  maxCards: z.number().int().min(1).max(50).optional().default(15),
  vectorSearchLimit: z.number().int().min(10).max(100).optional().default(40),
})

export async function POST(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()

    // Validate request (T063)
    const validation = DeckGenerationRequestSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        {
          error: validation.error.issues[0].message,
          details: validation.error.issues,
        },
        { status: 400 }
      )
    }

    const { topic, minCards, maxCards, vectorSearchLimit } = validation.data

    // Validate minCards <= maxCards
    if (minCards > maxCards) {
      return NextResponse.json(
        { error: 'minCards must be less than or equal to maxCards' },
        { status: 400 }
      )
    }

    // Generate suggestions
    const result = await generateDeckSuggestions({
      topic,
      userId: session.user.id,
      minCards,
      maxCards,
      vectorSearchLimit,
    })

    // Format response (T064)
    const response = {
      suggestions: result.suggestions.map((s) => ({
        flashcardId: s.flashcardId,
        front: s.front,
        back: s.back,
        tags: s.tags || [],
        relevanceScore: s.relevanceScore,
        relevanceReason: s.relevanceReason || null,
        vectorSimilarity: s.vectorSimilarity,
      })),
      metadata: {
        candidateCount: result.metadata.candidateCount,
        llmFiltered: result.metadata.llmFiltered,
        processingTimeMs: result.metadata.processingTimeMs,
        vectorSearchTimeMs: result.metadata.vectorSearchTimeMs,
        llmFilteringTimeMs: result.metadata.llmFilteringTimeMs || null,
        warnings: result.metadata.warnings,
      },
    }

    return NextResponse.json(response, { status: 200 })
  } catch (error) {
    console.error('[API] AI deck generation error:', error)

    // Handle specific errors
    if (error instanceof Error) {
      if (error.message.includes('Vector search service unavailable')) {
        return NextResponse.json(
          {
            error: error.message,
            fallback: 'manual',
          },
          { status: 503 }
        )
      }

      if (error.message.includes('Claude API')) {
        return NextResponse.json(
          {
            error: 'AI filtering unavailable. Please try again later.',
            fallback: 'vector-only',
          },
          { status: 503 }
        )
      }
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
