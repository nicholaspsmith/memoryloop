import { getDb } from '@/lib/db/pg-client'
import { skillNodes, flashcards, skillTrees } from '@/lib/db/drizzle-schema'
import { eq, and, sql, asc } from 'drizzle-orm'
import * as logger from '@/lib/logger'

export interface NodeWithProgress {
  id: string
  title: string
  description: string | null
  depth: number
  path: string
  totalCards: number
  completedCards: number
  isComplete: boolean
}

export interface TreeProgress {
  nodes: NodeWithProgress[]
  summary: {
    totalNodes: number
    completedNodes: number
    totalCards: number
    completedCards: number
  }
}

/**
 * Get the next incomplete node in depth-first order
 *
 * Uses the path field for ordering (1 < 1.1 < 1.1.1 < 1.2 < 2)
 * Only considers enabled nodes with at least one card
 *
 * @param treeId - The skill tree ID
 * @returns The first incomplete node or null if all complete/no cards
 */
export async function getNextIncompleteNode(treeId: string): Promise<NodeWithProgress | null> {
  const db = getDb()

  // Query nodes with card counts and completion status
  // Uses raw SQL for the aggregate query with HAVING clause
  const result = await db
    .select({
      id: skillNodes.id,
      title: skillNodes.title,
      description: skillNodes.description,
      depth: skillNodes.depth,
      path: skillNodes.path,
      totalCards: sql<number>`count(${flashcards.id})::int`,
      completedCards: sql<number>`count(case when (${flashcards.fsrsState}->>'state')::int >= 2 then 1 end)::int`,
    })
    .from(skillNodes)
    .leftJoin(
      flashcards,
      and(eq(flashcards.skillNodeId, skillNodes.id), eq(flashcards.status, 'active'))
    )
    .where(and(eq(skillNodes.treeId, treeId), eq(skillNodes.isEnabled, true)))
    .groupBy(skillNodes.id)
    .having(
      sql`count(${flashcards.id}) > 0 AND count(case when (${flashcards.fsrsState}->>'state')::int >= 2 then 1 end) < count(${flashcards.id})`
    )
    .orderBy(asc(skillNodes.path))
    .limit(1)

  if (result.length === 0) {
    logger.debug('[GuidedFlow] No incomplete nodes found', { treeId })
    return null
  }

  const node = result[0]
  logger.debug('[GuidedFlow] Found next incomplete node', {
    treeId,
    nodeId: node.id,
    path: node.path,
    progress: `${node.completedCards}/${node.totalCards}`,
  })

  return {
    ...node,
    isComplete: false,
  }
}

/**
 * Get progress for all nodes in a skill tree
 */
export async function getNodeProgress(treeId: string): Promise<TreeProgress> {
  const db = getDb()

  const nodes = await db
    .select({
      id: skillNodes.id,
      title: skillNodes.title,
      description: skillNodes.description,
      depth: skillNodes.depth,
      path: skillNodes.path,
      totalCards: sql<number>`count(${flashcards.id})::int`,
      completedCards: sql<number>`count(case when (${flashcards.fsrsState}->>'state')::int >= 2 then 1 end)::int`,
    })
    .from(skillNodes)
    .leftJoin(
      flashcards,
      and(eq(flashcards.skillNodeId, skillNodes.id), eq(flashcards.status, 'active'))
    )
    .where(and(eq(skillNodes.treeId, treeId), eq(skillNodes.isEnabled, true)))
    .groupBy(skillNodes.id)
    .orderBy(asc(skillNodes.path))

  const nodesWithProgress: NodeWithProgress[] = nodes.map((node) => ({
    ...node,
    isComplete: node.totalCards > 0 && node.completedCards === node.totalCards,
  }))

  const summary = {
    totalNodes: nodes.length,
    completedNodes: nodesWithProgress.filter((n) => n.isComplete).length,
    totalCards: nodes.reduce((sum, n) => sum + n.totalCards, 0),
    completedCards: nodes.reduce((sum, n) => sum + n.completedCards, 0),
  }

  return { nodes: nodesWithProgress, summary }
}

/**
 * Get tree ID for a goal
 */
export async function getTreeIdForGoal(goalId: string): Promise<string | null> {
  const db = getDb()

  const [tree] = await db
    .select({ id: skillTrees.id })
    .from(skillTrees)
    .where(eq(skillTrees.goalId, goalId))
    .limit(1)

  return tree?.id ?? null
}
