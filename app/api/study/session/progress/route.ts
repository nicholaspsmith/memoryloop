import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { z } from 'zod'
import {
  getSessionById,
  addSessionResponse,
  updateSessionProgress,
} from '@/lib/db/operations/study-sessions'
import * as logger from '@/lib/logger'

/**
 * POST /api/study/session/progress
 *
 * Save session progress. Called:
 * - After each card rating
 * - On visibility change (tab hidden)
 * - On page unload (via sendBeacon)
 */

const ProgressRequestSchema = z.object({
  sessionId: z.string().uuid(),
  currentIndex: z.number().int().min(0),
  // Latest response to add (optional - only when rating a card)
  response: z
    .object({
      cardId: z.string().uuid(),
      rating: z.number().int().min(1).max(4),
      timeMs: z.number().int().min(0),
    })
    .optional(),
  // Timed mode updates
  timeRemainingMs: z.number().int().min(0).optional(),
  score: z.number().int().min(0).optional(),
})

export async function POST(request: NextRequest) {
  try {
    const authSession = await auth()
    if (!authSession?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Handle both JSON and sendBeacon (which sends text/plain)
    let body: unknown
    const contentType = request.headers.get('content-type') || ''
    if (contentType.includes('application/json')) {
      body = await request.json()
    } else {
      // sendBeacon sends as text/plain
      const text = await request.text()
      try {
        body = JSON.parse(text)
      } catch {
        return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
      }
    }

    const parseResult = ProgressRequestSchema.safeParse(body)
    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parseResult.error.issues[0].message },
        { status: 400 }
      )
    }

    const { sessionId, currentIndex, response, timeRemainingMs, score } = parseResult.data

    // Get session
    const studySession = await getSessionById(sessionId)
    if (!studySession) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    // Verify ownership
    if (studySession.userId !== authSession.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Only update if session is still active
    if (studySession.status !== 'active') {
      return NextResponse.json({ error: 'Session is no longer active' }, { status: 400 })
    }

    // Update progress
    if (response) {
      // Add new response
      await addSessionResponse(
        sessionId,
        response,
        currentIndex,
        timeRemainingMs !== undefined || score !== undefined
          ? { timeRemainingMs, score }
          : undefined
      )
    } else {
      // Just update index/timed state
      await updateSessionProgress(sessionId, {
        currentIndex,
        timeRemainingMs,
        score,
      })
    }

    logger.debug('Session progress saved', {
      sessionId,
      currentIndex,
      hasResponse: !!response,
    })

    return NextResponse.json({
      success: true,
      lastActivityAt: new Date().toISOString(),
    })
  } catch (error) {
    logger.error('Failed to save session progress', error as Error, {
      path: '/api/study/session/progress',
    })

    return NextResponse.json({ error: 'Failed to save progress' }, { status: 500 })
  }
}
