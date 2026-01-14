import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { z } from 'zod'
import { getSessionById, abandonSession } from '@/lib/db/operations/study-sessions'
import * as logger from '@/lib/logger'

/**
 * DELETE /api/study/session/abandon
 *
 * Explicitly abandon an active study session.
 * Called when user chooses to start a new session instead of resuming.
 */

const AbandonRequestSchema = z.object({
  sessionId: z.string().uuid(),
})

export async function DELETE(request: NextRequest) {
  try {
    const authSession = await auth()
    if (!authSession?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const parseResult = AbandonRequestSchema.safeParse(body)
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

    // Only abandon if still active
    if (studySession.status !== 'active') {
      return NextResponse.json({
        success: true,
        message: 'Session was already ' + studySession.status,
      })
    }

    await abandonSession(sessionId)

    logger.info('Session abandoned', {
      sessionId,
      userId: authSession.user.id,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error('Failed to abandon session', error as Error, {
      path: '/api/study/session/abandon',
    })

    return NextResponse.json({ error: 'Failed to abandon session' }, { status: 500 })
  }
}
