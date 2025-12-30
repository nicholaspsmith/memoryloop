import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { z } from 'zod'
import { getGoalByIdForUser } from '@/lib/db/operations/goals'
import { getSkillTreeByGoalId } from '@/lib/db/operations/skill-trees'
import { getSkillNodeById, updateSkillNode } from '@/lib/db/operations/skill-nodes'
import {
  countFlashcardsByNodeId,
  commitDraftFlashcards,
  deleteDraftFlashcards,
} from '@/lib/db/operations/flashcards'
import * as logger from '@/lib/logger'

/**
 * POST /api/goals/[goalId]/generate/commit
 *
 * Commit approved generated cards to the database.
 * Creates FSRS state, links to skill node, syncs to LanceDB.
 *
 * Per contracts/cards.md
 */

const CardSchema = z.object({
  tempId: z.string(), // Now the actual database ID from draft creation
  question: z.string().min(1),
  answer: z.string().min(1),
  cardType: z.enum(['flashcard', 'multiple_choice']),
  distractors: z.array(z.string()).optional(),
  approved: z.boolean(),
})

const CommitRequestSchema = z.object({
  cards: z.array(CardSchema),
  nodeId: z.string().uuid(),
  deckId: z.string().uuid().optional(), // Not used in current implementation
})

export async function POST(
  request: NextRequest,
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

    // Parse request body
    const body = await request.json()
    const parseResult = CommitRequestSchema.safeParse(body)
    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parseResult.error.issues[0].message },
        { status: 400 }
      )
    }

    const { cards, nodeId } = parseResult.data

    // Validate node exists and belongs to goal's skill tree
    const skillTree = await getSkillTreeByGoalId(goalId)
    if (!skillTree) {
      return NextResponse.json({ error: 'Goal has no skill tree' }, { status: 404 })
    }

    const node = await getSkillNodeById(nodeId)
    if (!node || node.treeId !== skillTree.id) {
      return NextResponse.json({ error: 'Node not found in this goal' }, { status: 404 })
    }

    // Separate approved and unapproved cards
    // tempId is now the actual database ID from draft creation
    const approvedCardIds = cards.filter((card) => card.approved).map((card) => card.tempId)
    const unapprovedCardIds = cards.filter((card) => !card.approved).map((card) => card.tempId)

    if (approvedCardIds.length === 0) {
      // Delete all drafts if none approved
      if (unapprovedCardIds.length > 0) {
        await deleteDraftFlashcards(unapprovedCardIds, session.user.id)
      }
      return NextResponse.json({ error: 'No approved cards to commit' }, { status: 400 })
    }

    logger.info('Committing draft cards', {
      goalId,
      nodeId,
      nodeTitle: node.title,
      totalCards: cards.length,
      approvedCards: approvedCardIds.length,
      unapprovedCards: unapprovedCardIds.length,
    })

    // Commit approved drafts (change status to 'active')
    const committedCount = await commitDraftFlashcards(approvedCardIds, session.user.id)

    // Delete unapproved drafts
    if (unapprovedCardIds.length > 0) {
      await deleteDraftFlashcards(unapprovedCardIds, session.user.id)
    }

    // Update node's card count (only count active cards)
    const newCardCount = await countFlashcardsByNodeId(nodeId)
    await updateSkillNode(nodeId, { cardCount: newCardCount })

    logger.info('Cards committed successfully', {
      goalId,
      nodeId,
      nodeTitle: node.title,
      committedCount,
      deletedDrafts: unapprovedCardIds.length,
      newCardCount,
    })

    return NextResponse.json(
      {
        committed: committedCount,
        skipped: unapprovedCardIds.length,
        nodeId,
      },
      { status: 201 }
    )
  } catch (error) {
    logger.error('Card commit failed', error as Error, {
      path: '/api/goals/[goalId]/generate/commit',
    })

    return NextResponse.json({ error: 'Failed to commit cards' }, { status: 500 })
  }
}
