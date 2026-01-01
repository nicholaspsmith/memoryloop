import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { getGoalByIdForUser } from '@/lib/db/operations/goals'
import { getNextIncompleteNode, getNodeProgress, getTreeIdForGoal } from '@/lib/study/guided-flow'
import * as logger from '@/lib/logger'

/**
 * GET /api/study/next-node?goalId={goalId}
 *
 * Get the next incomplete node in depth-first order for guided study.
 * Returns null if all nodes are complete or no cards have been generated yet.
 *
 * Per contracts/guided-study.md
 */
export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const goalId = request.nextUrl.searchParams.get('goalId')
  if (!goalId) {
    return NextResponse.json({ error: 'goalId is required' }, { status: 400 })
  }

  // Validate user owns the goal
  const goal = await getGoalByIdForUser(goalId, session.user.id)
  if (!goal) {
    return NextResponse.json({ error: 'Goal not found' }, { status: 404 })
  }

  // Get skill tree for goal
  const treeId = await getTreeIdForGoal(goalId)
  if (!treeId) {
    return NextResponse.json({ error: 'Goal has no skill tree' }, { status: 404 })
  }

  logger.debug('[NextNode] Getting next incomplete node', {
    goalId,
    treeId,
    userId: session.user.id,
  })

  // Get next node and progress
  const [nextNode, { summary }] = await Promise.all([
    getNextIncompleteNode(treeId),
    getNodeProgress(treeId),
  ])

  const percentComplete =
    summary.totalNodes > 0 ? Math.round((summary.completedNodes / summary.totalNodes) * 100) : 0

  if (!nextNode) {
    // Tree complete or no cards yet
    const isComplete = summary.completedNodes === summary.totalNodes && summary.totalNodes > 0
    return NextResponse.json({
      hasNextNode: false,
      node: null,
      progress: {
        totalNodes: summary.totalNodes,
        completedNodes: summary.completedNodes,
        percentComplete,
      },
      message: isComplete
        ? "Congratulations! You've completed all nodes in this skill tree."
        : 'Cards are still being generated. Please wait a moment.',
    })
  }

  return NextResponse.json({
    hasNextNode: true,
    node: {
      id: nextNode.id,
      title: nextNode.title,
      description: nextNode.description,
      depth: nextNode.depth,
      path: nextNode.path,
    },
    progress: {
      totalNodes: summary.totalNodes,
      completedNodes: summary.completedNodes,
      percentComplete,
    },
  })
}
