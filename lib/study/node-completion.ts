import { getDb } from '@/lib/db/pg-client'
import { flashcards } from '@/lib/db/drizzle-schema'
import { eq, and } from 'drizzle-orm'
import * as logger from '@/lib/logger'

/**
 * Check if a skill node is complete based on FSRS state of its cards.
 *
 * A node is complete when all its active flashcards have reached
 * Review (state >= 2) or Relearning (state = 3) state.
 *
 * @param nodeId - The skill node ID to check
 * @returns true if node is complete, false otherwise
 */
export async function isNodeComplete(nodeId: string): Promise<boolean> {
  const db = getDb()

  // Get all active flashcards for this node
  const cards = await db
    .select({
      id: flashcards.id,
      fsrsState: flashcards.fsrsState,
    })
    .from(flashcards)
    .where(and(eq(flashcards.skillNodeId, nodeId), eq(flashcards.status, 'active')))

  // Node with no cards is not complete
  if (cards.length === 0) {
    return false
  }

  // Check if all cards have state >= 2 (Review or Relearning)
  const isComplete = cards.every((card) => {
    const state = (card.fsrsState as { state: number })?.state ?? 0
    return state >= 2
  })

  if (isComplete) {
    logger.info('[NodeCompletion] Node marked complete', {
      nodeId,
      totalCards: cards.length,
    })
  }

  return isComplete
}

/**
 * Get completion stats for a node
 */
export async function getNodeCompletionStats(nodeId: string): Promise<{
  totalCards: number
  completedCards: number
  isComplete: boolean
}> {
  const db = getDb()

  const cards = await db
    .select({
      fsrsState: flashcards.fsrsState,
    })
    .from(flashcards)
    .where(and(eq(flashcards.skillNodeId, nodeId), eq(flashcards.status, 'active')))

  const totalCards = cards.length
  const completedCards = cards.filter((card) => {
    const state = (card.fsrsState as { state: number })?.state ?? 0
    return state >= 2
  }).length

  return {
    totalCards,
    completedCards,
    isComplete: totalCards > 0 && completedCards === totalCards,
  }
}
