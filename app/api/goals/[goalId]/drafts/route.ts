import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { getGoalByIdForUser } from '@/lib/db/operations/goals'
import { getSkillTreeByGoalId, getSkillTreeWithNodes } from '@/lib/db/operations/skill-trees'
import {
  getDraftsByUserId,
  deleteNodeDrafts,
  type DraftFlashcard,
} from '@/lib/db/operations/flashcards'
import * as logger from '@/lib/logger'

/**
 * GET /api/goals/[goalId]/drafts
 *
 * Get all draft flashcards for a goal (across all nodes).
 * Used to show "You have X cards pending review" banner.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ goalId: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { goalId } = await params

    // Validate goal belongs to user
    const goal = await getGoalByIdForUser(goalId, session.user.id)
    if (!goal) {
      return NextResponse.json({ error: 'Goal not found' }, { status: 404 })
    }

    // Get skill tree to filter drafts by this goal's nodes
    const skillTree = await getSkillTreeByGoalId(goalId)
    if (!skillTree) {
      return NextResponse.json({ drafts: [], nodeInfo: {} })
    }

    const treeWithNodes = await getSkillTreeWithNodes(skillTree.id)
    if (!treeWithNodes) {
      return NextResponse.json({ drafts: [], nodeInfo: {} })
    }

    const nodes = treeWithNodes.nodes
    const nodeIds = new Set(nodes.map((n) => n.id))
    const nodeMap = new Map(
      nodes.map((n) => [n.id, { title: n.title, description: n.description }])
    )

    // Get all user's drafts and filter to this goal's nodes
    const allDrafts = await getDraftsByUserId(session.user.id)
    const goalDrafts = allDrafts.filter((d) => d.skillNodeId && nodeIds.has(d.skillNodeId))

    // Group drafts by node
    const draftsByNode: Record<string, DraftFlashcard[]> = {}
    for (const draft of goalDrafts) {
      const nodeId = draft.skillNodeId!
      if (!draftsByNode[nodeId]) {
        draftsByNode[nodeId] = []
      }
      draftsByNode[nodeId].push(draft)
    }

    // Build response with node info
    const nodeInfo: Record<
      string,
      { title: string; description: string | null; draftCount: number }
    > = {}
    for (const nodeId of Object.keys(draftsByNode)) {
      const node = nodeMap.get(nodeId)
      if (node) {
        nodeInfo[nodeId] = {
          title: node.title,
          description: node.description,
          draftCount: draftsByNode[nodeId].length,
        }
      }
    }

    return NextResponse.json({
      totalDrafts: goalDrafts.length,
      nodeInfo,
      drafts: goalDrafts.map((d) => ({
        id: d.id,
        nodeId: d.skillNodeId,
        question: d.question,
        answer: d.answer,
        cardType: d.cardType,
        createdAt: d.createdAt,
      })),
    })
  } catch (error) {
    logger.error('Failed to get drafts', error as Error, {
      path: '/api/goals/[goalId]/drafts',
    })

    return NextResponse.json({ error: 'Failed to get drafts' }, { status: 500 })
  }
}

/**
 * DELETE /api/goals/[goalId]/drafts
 *
 * Delete all drafts for a specific node.
 * Query param: nodeId (required)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ goalId: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { goalId } = await params
    const { searchParams } = new URL(request.url)
    const nodeId = searchParams.get('nodeId')

    if (!nodeId) {
      return NextResponse.json({ error: 'nodeId is required' }, { status: 400 })
    }

    // Validate goal belongs to user
    const goal = await getGoalByIdForUser(goalId, session.user.id)
    if (!goal) {
      return NextResponse.json({ error: 'Goal not found' }, { status: 404 })
    }

    // Delete drafts for this node
    const deletedCount = await deleteNodeDrafts(nodeId)

    logger.info('Deleted drafts', { goalId, nodeId, deletedCount })

    return NextResponse.json({ deleted: deletedCount })
  } catch (error) {
    logger.error('Failed to delete drafts', error as Error, {
      path: '/api/goals/[goalId]/drafts',
    })

    return NextResponse.json({ error: 'Failed to delete drafts' }, { status: 500 })
  }
}
