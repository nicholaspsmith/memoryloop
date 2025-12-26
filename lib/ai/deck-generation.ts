/**
 * AI Deck Generation Service
 *
 * Hybrid pipeline for AI-powered flashcard deck creation:
 * 1. Vector search (LanceDB): Find semantically similar flashcards
 * 2. LLM re-ranking (Claude API): Filter and rank candidates by relevance
 *
 * Maps to T055-T061 in Phase 6 (User Story 3)
 */

import { searchSimilarFlashcardsWithScores } from '@/lib/db/operations/flashcards-lancedb'
import { getFlashcardById } from '@/lib/db/operations/flashcards'
import { getChatCompletion } from '@/lib/claude/client'
import * as logger from '@/lib/logger'

/**
 * Vector search result from LanceDB
 */
export interface VectorSearchResult {
  flashcardId: string
  vectorSimilarity: number
  front: string
  back: string
  tags?: string[]
}

/**
 * LLM re-ranked flashcard with relevance score
 */
export interface RankedFlashcard {
  flashcardId: string
  front: string
  back: string
  tags?: string[]
  relevanceScore: number // 0.0-1.0
  relevanceReason: string
  vectorSimilarity: number
}

/**
 * AI deck generation options
 */
export interface DeckGenerationOptions {
  topic: string
  userId: string
  minCards?: number
  maxCards?: number
  vectorSearchLimit?: number
}

/**
 * Generation result with metadata
 */
export interface DeckGenerationResult {
  suggestions: RankedFlashcard[]
  metadata: {
    candidateCount: number
    llmFiltered: boolean
    processingTimeMs: number
    vectorSearchTimeMs: number
    llmFilteringTimeMs?: number
    warnings: string[]
  }
}

/**
 * Generate AI-powered deck suggestions (T055)
 *
 * Two-stage pipeline:
 * 1. Vector search for candidates
 * 2. LLM re-ranking for semantic filtering
 */
export async function generateDeckSuggestions(
  options: DeckGenerationOptions
): Promise<DeckGenerationResult> {
  const startTime = Date.now()
  const { topic, userId, minCards = 5, maxCards = 15, vectorSearchLimit = 40 } = options

  const warnings: string[] = []

  try {
    // Stage 1: Vector search (T056)
    const vectorStartTime = Date.now()
    const candidates = await searchCandidateFlashcards(topic, userId, vectorSearchLimit)
    const vectorSearchTimeMs = Date.now() - vectorStartTime

    logger.info('AI deck generation: vector search complete', {
      userId,
      topic,
      candidateCount: candidates.length,
      vectorSearchTimeMs,
    })

    // Handle insufficient candidates (T059)
    if (candidates.length === 0) {
      logger.warn('AI deck generation: no candidates found', {
        userId,
        topic,
      })

      return {
        suggestions: [],
        metadata: {
          candidateCount: 0,
          llmFiltered: false,
          processingTimeMs: Date.now() - startTime,
          vectorSearchTimeMs,
          warnings: [
            'No matching flashcards found. Try creating flashcards related to this topic first.',
          ],
        },
      }
    }

    if (candidates.length < minCards) {
      warnings.push(
        `Only ${candidates.length} matching cards found. Consider creating more flashcards on this topic.`
      )
    }

    // Stage 2: LLM re-ranking (T057)
    let rankedCards: RankedFlashcard[]
    let llmFiltered = false
    let llmFilteringTimeMs: number | undefined

    try {
      const llmStartTime = Date.now()
      rankedCards = await rerankWithLLM(topic, candidates, minCards, maxCards)
      llmFilteringTimeMs = Date.now() - llmStartTime
      llmFiltered = true

      logger.info('AI deck generation: LLM filtering complete', {
        userId,
        topic,
        rankedCount: rankedCards.length,
        llmFilteringTimeMs,
      })
    } catch (error) {
      // Handle Claude API unavailable (T061)
      logger.error('AI deck generation: LLM re-ranking failed', error as Error, {
        userId,
        topic,
        candidateCount: candidates.length,
      })

      warnings.push('AI filtering unavailable. Returning vector search results only.')

      // Fallback to vector search results
      rankedCards = candidates.slice(0, maxCards).map((c) => ({
        flashcardId: c.flashcardId,
        front: c.front,
        back: c.back,
        tags: c.tags,
        relevanceScore: c.vectorSimilarity,
        relevanceReason: 'Based on vector similarity (AI filtering unavailable)',
        vectorSimilarity: c.vectorSimilarity,
      }))
    }

    const processingTimeMs = Date.now() - startTime

    logger.info('AI deck generation: complete', {
      userId,
      topic,
      suggestionsCount: rankedCards.length,
      processingTimeMs,
      llmFiltered,
    })

    return {
      suggestions: rankedCards,
      metadata: {
        candidateCount: candidates.length,
        llmFiltered,
        processingTimeMs,
        vectorSearchTimeMs,
        llmFilteringTimeMs,
        warnings,
      },
    }
  } catch (error) {
    // Handle LanceDB unavailable (T060)
    logger.error('AI deck generation: vector search failed', error as Error, {
      userId,
      topic,
    })

    throw new Error('Vector search service unavailable. Please try manual deck creation.')
  }
}

/**
 * Stage 1: Vector search for candidate flashcards (T056)
 */
async function searchCandidateFlashcards(
  topic: string,
  userId: string,
  limit: number
): Promise<VectorSearchResult[]> {
  // Get flashcard IDs with similarity scores from LanceDB
  const searchResults = await searchSimilarFlashcardsWithScores(topic, userId, limit)

  // Fetch full flashcard data from PostgreSQL
  const candidates: VectorSearchResult[] = []

  for (const result of searchResults) {
    const flashcard = await getFlashcardById(result.id)

    if (flashcard) {
      candidates.push({
        flashcardId: flashcard.id,
        vectorSimilarity: result.similarity,
        front: flashcard.question,
        back: flashcard.answer,
        tags: [], // Tags not currently stored in database
      })
    }
  }

  return candidates
}

/**
 * Stage 2: LLM re-ranking and semantic filtering (T057)
 */
async function rerankWithLLM(
  topic: string,
  candidates: VectorSearchResult[],
  minCards: number,
  maxCards: number
): Promise<RankedFlashcard[]> {
  // Build flashcard context for Claude
  const flashcardContext = candidates
    .map((card, idx) => {
      const answerPreview = card.back.length > 200 ? card.back.substring(0, 200) + '...' : card.back
      return `${idx + 1}. [ID: ${card.flashcardId}]
   Q: ${card.front}
   A: ${answerPreview}`
    })
    .join('\n\n')

  const systemPrompt = `You are a study deck curator. Analyze flashcards and rate their relevance to a given topic.

For each flashcard, provide:
1. Relevance score (0-10, where 10 = perfectly relevant, 0 = completely irrelevant)
2. Brief explanation (1 sentence, max 100 characters)

Return ${minCards}-${maxCards} most relevant flashcards (minimum score 6/10).

Return JSON array: [{"id": "flashcard-uuid", "score": 8, "explanation": "Directly addresses the topic"}]`

  const userPrompt = `Topic: "${topic}"

Flashcards to analyze:
${flashcardContext}

Return the ${minCards}-${maxCards} most relevant flashcards as JSON.`

  // Call Claude API
  const response = await getChatCompletion({
    messages: [{ role: 'user', content: userPrompt }],
    systemPrompt: systemPrompt,
  })

  // Parse JSON response
  const rankings = JSON.parse(response) as Array<{
    id: string
    score: number
    explanation: string
  }>

  // Map back to full flashcard data with normalized scores
  const rankedCards = rankings
    .filter((r) => r.score >= 6)
    .map((r) => {
      const candidate = candidates.find((c) => c.flashcardId === r.id)!
      return {
        flashcardId: r.id,
        front: candidate.front,
        back: candidate.back,
        tags: candidate.tags,
        relevanceScore: r.score / 10, // Normalize 0-10 to 0.0-1.0
        relevanceReason: r.explanation,
        vectorSimilarity: candidate.vectorSimilarity,
      }
    })
    .slice(0, maxCards)

  return rankedCards
}
