/**
 * Flashcard Generation Job Handler
 *
 * Wraps the existing generateFlashcardsFromContent function and:
 * - Validates message ownership
 * - Generates flashcards from content
 * - Persists flashcards to database
 * - Triggers distractor generation (non-blocking)
 *
 * Maps to spec: 018-background-flashcard-generation
 */

import { generateFlashcardsFromContent } from '@/lib/claude/flashcard-generator'
import { createFlashcard } from '@/lib/db/operations/flashcards'
import { getMessageById } from '@/lib/db/operations/messages'
import { getSkillNodeById, incrementNodeCardCount } from '@/lib/db/operations/skill-nodes'
import { createJob } from '@/lib/db/operations/background-jobs'
import { registerHandler } from '@/lib/jobs/processor'
import { JobType } from '@/lib/db/drizzle-schema'
import type {
  FlashcardGenerationPayload,
  FlashcardGenerationResult,
  DistractorGenerationPayload,
  JobHandler,
} from '@/lib/jobs/types'
import * as logger from '@/lib/logger'

/**
 * Build content string from node title and description
 */
function buildNodeContent(title: string, description?: string | null): string {
  return `Topic: ${title}\n\n${description || `Learn about ${title}`}`
}

/**
 * Handle flashcard generation from message content
 *
 * @param payload - Job payload with messageId and content
 * @param userId - User ID from job record
 * @returns Result with created flashcard IDs and count
 * @throws Error if message not found or unauthorized
 */
export async function handleFlashcardGeneration(
  payload: FlashcardGenerationPayload,
  userId: string
): Promise<FlashcardGenerationResult> {
  // Determine if this is node-based or message-based generation
  const isNodeBased = !!payload.nodeId

  if (isNodeBased) {
    // Node-based generation (for skill tree nodes)
    logger.info('[FlashcardJob] Starting node-based flashcard generation', {
      nodeId: payload.nodeId,
      userId,
      maxCards: payload.maxCards ?? 5,
    })

    // Fetch node from database
    const node = await getSkillNodeById(payload.nodeId!)
    if (!node) {
      throw new Error('Node not found')
    }

    // Build content from node title and description
    const content = buildNodeContent(node.title, node.description)
    const maxCards = payload.maxCards ?? 5

    logger.info('[FlashcardJob] Node validated, generating flashcards', {
      nodeId: payload.nodeId,
      nodeTitle: node.title,
      contentLength: content.length,
    })

    // Generate flashcard pairs using Claude
    const flashcardPairs = await generateFlashcardsFromContent(content, {
      userApiKey: process.env.ANTHROPIC_API_KEY,
    })

    if (flashcardPairs.length === 0) {
      logger.info('[FlashcardJob] No flashcards generated from node content', {
        nodeId: payload.nodeId,
      })
      return { flashcardIds: [], count: 0 }
    }

    // Limit to maxCards
    const pairsToCreate = flashcardPairs.slice(0, maxCards)

    logger.info('[FlashcardJob] Generated flashcard pairs for node', {
      nodeId: payload.nodeId,
      generated: flashcardPairs.length,
      creating: pairsToCreate.length,
    })

    // Persist flashcards to database
    const flashcardIds: string[] = []
    for (const pair of pairsToCreate) {
      const flashcard = await createFlashcard({
        userId,
        conversationId: null,
        messageId: null,
        skillNodeId: payload.nodeId,
        question: pair.question,
        answer: pair.answer,
      })

      flashcardIds.push(flashcard.id)

      // Trigger distractor generation (non-blocking)
      const distractorPayload: DistractorGenerationPayload = {
        flashcardId: flashcard.id,
        question: pair.question,
        answer: pair.answer,
      }

      createJob({
        type: JobType.DISTRACTOR_GENERATION,
        payload: distractorPayload,
        userId,
        priority: 0,
      }).catch((error) => {
        logger.error('[FlashcardJob] Failed to enqueue distractor generation', error as Error, {
          flashcardId: flashcard.id,
        })
      })
    }

    // Update node card count
    await incrementNodeCardCount(payload.nodeId!, flashcardIds.length)

    logger.info('[FlashcardJob] Node flashcard generation completed', {
      nodeId: payload.nodeId,
      flashcardIds,
      count: flashcardIds.length,
    })

    return {
      flashcardIds,
      count: flashcardIds.length,
    }
  }

  // Message-based generation (existing flow)
  logger.info('[FlashcardJob] Starting flashcard generation', {
    messageId: payload.messageId,
    userId,
    contentLength: payload.content?.length ?? 0,
  })

  // Validate message exists and belongs to user
  const message = await getMessageById(payload.messageId!)
  if (!message) {
    throw new Error('Message not found')
  }
  if (message.userId !== userId) {
    throw new Error('Unauthorized')
  }

  logger.info('[FlashcardJob] Message validated, generating flashcards')

  // Generate flashcard pairs using Claude
  const flashcardPairs = await generateFlashcardsFromContent(payload.content!, {
    userApiKey: process.env.ANTHROPIC_API_KEY,
  })

  if (flashcardPairs.length === 0) {
    logger.info('[FlashcardJob] No flashcards generated from content')
    return { flashcardIds: [], count: 0 }
  }

  logger.info('[FlashcardJob] Generated flashcard pairs', { count: flashcardPairs.length })

  // Persist flashcards to database
  const flashcardIds: string[] = []
  for (const pair of flashcardPairs) {
    const flashcard = await createFlashcard({
      userId,
      conversationId: message.conversationId,
      messageId: payload.messageId!,
      question: pair.question,
      answer: pair.answer,
    })

    flashcardIds.push(flashcard.id)

    // Trigger distractor generation (non-blocking)
    const distractorPayload: DistractorGenerationPayload = {
      flashcardId: flashcard.id,
      question: pair.question,
      answer: pair.answer,
    }

    // Fire and forget - don't await
    createJob({
      type: JobType.DISTRACTOR_GENERATION,
      payload: distractorPayload,
      userId,
      priority: 0, // Lower priority than flashcard generation
    }).catch((error) => {
      logger.error('[FlashcardJob] Failed to enqueue distractor generation', error as Error, {
        flashcardId: flashcard.id,
      })
    })
  }

  logger.info('[FlashcardJob] Flashcard generation completed', {
    flashcardIds,
    count: flashcardIds.length,
  })

  return {
    flashcardIds,
    count: flashcardIds.length,
  }
}

// Register handler with job processor
const wrappedHandler: JobHandler<FlashcardGenerationPayload, FlashcardGenerationResult> = async (
  payload,
  job
) => {
  if (!job.userId) {
    throw new Error('Job requires userId')
  }
  return handleFlashcardGeneration(payload, job.userId)
}

registerHandler(JobType.FLASHCARD_GENERATION, wrappedHandler)
