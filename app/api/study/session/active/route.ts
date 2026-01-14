import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { getActiveSessionWithGoal } from '@/lib/db/operations/study-sessions'
import * as logger from '@/lib/logger'

/**
 * GET /api/study/session/active
 *
 * Check for an active (resumable) study session.
 * Query params:
 *   - goalId (optional): Filter by specific goal
 *
 * Returns session info if found, or null.
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const goalId = searchParams.get('goalId') || undefined

    const activeSession = await getActiveSessionWithGoal(session.user.id, goalId)

    if (!activeSession) {
      return NextResponse.json({
        hasActiveSession: false,
        session: null,
      })
    }

    // Calculate progress info
    const cardIds = activeSession.cardIds as string[]
    const responses = activeSession.responses as Array<{
      cardId: string
      rating: number
      timeMs: number
    }>
    const totalCards = cardIds.length
    const responsesCount = responses.length
    const percentComplete = totalCards > 0 ? Math.round((responsesCount / totalCards) * 100) : 0

    logger.info('Found active session', {
      sessionId: activeSession.id,
      goalId: activeSession.goalId,
      percentComplete,
    })

    return NextResponse.json({
      hasActiveSession: true,
      session: {
        sessionId: activeSession.id,
        goalId: activeSession.goalId,
        goalTitle: activeSession.goalTitle,
        mode: activeSession.mode,
        progress: {
          currentIndex: activeSession.currentIndex,
          totalCards,
          responsesCount,
          percentComplete,
        },
        startedAt: activeSession.startedAt,
        lastActivityAt: activeSession.lastActivityAt,
        expiresAt: activeSession.expiresAt,
        // Timed mode info
        ...(activeSession.mode === 'timed' && {
          timeRemainingMs: activeSession.timeRemainingMs,
          score: activeSession.score,
        }),
      },
    })
  } catch (error) {
    logger.error('Failed to check for active session', error as Error, {
      path: '/api/study/session/active',
    })

    return NextResponse.json({ error: 'Failed to check for active session' }, { status: 500 })
  }
}
