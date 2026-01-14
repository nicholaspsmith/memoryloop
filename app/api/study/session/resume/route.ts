import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { z } from 'zod'
import { getSessionById } from '@/lib/db/operations/study-sessions'
import { getDb } from '@/lib/db/pg-client'
import { flashcards, skillNodes } from '@/lib/db/drizzle-schema'
import { eq, inArray } from 'drizzle-orm'
import { getDistractorsForFlashcard } from '@/lib/db/operations/distractors'
import * as logger from '@/lib/logger'

/**
 * POST /api/study/session/resume
 *
 * Resume an active study session.
 * Fetches fresh card data for the session's card IDs.
 */

const ResumeRequestSchema = z.object({
  sessionId: z.string().uuid(),
})

interface StudyCard {
  id: string
  question: string
  answer: string
  cardType: 'flashcard' | 'multiple_choice'
  distractors?: string[]
  nodeId: string
  nodeTitle: string
  fsrsState: {
    state: string
    due: string
    stability: number
    difficulty: number
  }
}

export async function POST(request: NextRequest) {
  try {
    const authSession = await auth()
    if (!authSession?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const parseResult = ResumeRequestSchema.safeParse(body)
    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parseResult.error.issues[0].message },
        { status: 400 }
      )
    }

    const { sessionId } = parseResult.data

    // Get session
    const studySession = await getSessionById(sessionId)
    if (!studySession) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    // Verify ownership
    if (studySession.userId !== authSession.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Check if session is still active
    if (studySession.status !== 'active') {
      return NextResponse.json(
        { error: 'Session is no longer active', status: studySession.status },
        { status: 400 }
      )
    }

    // Check if session has expired
    if (new Date(studySession.expiresAt) < new Date()) {
      return NextResponse.json({ error: 'Session has expired' }, { status: 400 })
    }

    // Fetch fresh card data
    const cardIds = studySession.cardIds as string[]
    const db = getDb()

    const cardsData = await db
      .select({
        id: flashcards.id,
        question: flashcards.question,
        answer: flashcards.answer,
        cardType: flashcards.cardType,
        cardMetadata: flashcards.cardMetadata,
        fsrsState: flashcards.fsrsState,
        skillNodeId: flashcards.skillNodeId,
        nodeTitle: skillNodes.title,
      })
      .from(flashcards)
      .innerJoin(skillNodes, eq(flashcards.skillNodeId, skillNodes.id))
      .where(inArray(flashcards.id, cardIds))

    // Create a map for ordering
    const cardMap = new Map(cardsData.map((c) => [c.id, c]))

    // Build study cards in original order
    const needsDistractors = ['multiple_choice', 'mixed', 'timed'].includes(studySession.mode)

    const studyCardsWithNulls = await Promise.all(
      cardIds.map(async (cardId) => {
        const card = cardMap.get(cardId)
        if (!card) {
          // Card was deleted - return placeholder
          return null
        }

        const fsrs = card.fsrsState as Record<string, unknown>
        const metadata = card.cardMetadata as { distractors?: string[] } | null

        const studyCard: StudyCard = {
          id: card.id,
          question: card.question,
          answer: card.answer,
          cardType: card.cardType as 'flashcard' | 'multiple_choice',
          nodeId: card.skillNodeId!,
          nodeTitle: card.nodeTitle,
          fsrsState: {
            state: ['New', 'Learning', 'Review', 'Relearning'][fsrs.state as number] || 'New',
            due: new Date(fsrs.due as number).toISOString(),
            stability: (fsrs.stability as number) || 0,
            difficulty: (fsrs.difficulty as number) || 0,
          },
        }

        // Load distractors for MC cards
        if (needsDistractors && studyCard.cardType === 'multiple_choice') {
          const dbDistractors = await getDistractorsForFlashcard(card.id)
          if (dbDistractors.length >= 3) {
            studyCard.distractors = dbDistractors.map((d) => d.content)
          } else if (metadata?.distractors && metadata.distractors.length >= 3) {
            studyCard.distractors = metadata.distractors
          }
        }

        return studyCard
      })
    )

    // Filter out null cards (deleted)
    const validCards = studyCardsWithNulls.filter((c): c is StudyCard => c !== null)

    const responses = studySession.responses as Array<{
      cardId: string
      rating: number
      timeMs: number
    }>

    logger.info('Session resumed', {
      sessionId,
      currentIndex: studySession.currentIndex,
      totalCards: validCards.length,
      responsesCount: responses.length,
    })

    return NextResponse.json({
      sessionId: studySession.id,
      mode: studySession.mode,
      cards: validCards,
      currentIndex: studySession.currentIndex,
      responses,
      startedAt: studySession.startedAt,
      // Timed mode info
      ...(studySession.mode === 'timed' && {
        timeRemainingMs: studySession.timeRemainingMs,
        score: studySession.score,
        timedSettings: studySession.timedSettings,
      }),
      // Guided mode info
      ...(studySession.isGuided && {
        isGuided: true,
        currentNodeId: studySession.currentNodeId,
      }),
    })
  } catch (error) {
    logger.error('Failed to resume session', error as Error, {
      path: '/api/study/session/resume',
    })

    return NextResponse.json({ error: 'Failed to resume session' }, { status: 500 })
  }
}
