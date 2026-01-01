import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { getGoalByIdForUser } from '@/lib/db/operations/goals'
import { getNodeProgress, getTreeIdForGoal } from '@/lib/study/guided-flow'
import * as logger from '@/lib/logger'

interface RouteContext {
  params: Promise<{ goalId: string }>
}

/**
 * GET /api/goals/[goalId]/skill-tree/progress
 *
 * Get node progress for all nodes in a goal's skill tree.
 * Returns progress statistics for each node and summary totals.
 *
 * Maps to contracts/guided-flow.md - Get Node Progress
 */
export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 })
    }

    const userId = session.user.id
    const { goalId } = await context.params

    // Validate user owns the goal
    const goal = await getGoalByIdForUser(goalId, userId)
    if (!goal) {
      return NextResponse.json({ error: 'Goal not found', code: 'NOT_FOUND' }, { status: 404 })
    }

    // Get skill tree for goal
    const treeId = await getTreeIdForGoal(goalId)
    if (!treeId) {
      return NextResponse.json(
        { error: 'Goal has no skill tree', code: 'NOT_FOUND' },
        { status: 404 }
      )
    }

    logger.debug('[Progress] Getting node progress', { goalId, treeId, userId })

    const { nodes, summary } = await getNodeProgress(treeId)

    return NextResponse.json({
      nodes: nodes.map((node) => ({
        id: node.id,
        path: node.path,
        totalCards: node.totalCards,
        completedCards: node.completedCards,
        isComplete: node.isComplete,
      })),
      summary,
    })
  } catch (error) {
    logger.error('Failed to get node progress', error as Error)
    return NextResponse.json(
      { error: 'Failed to retrieve node progress', code: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
}
