import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { getFlashcardsByUserId } from '@/lib/db/operations/flashcards'

/**
 * GET /api/quiz/due
 *
 * Get flashcards due for review based on FSRS scheduling
 *
 * Maps to FR-011 (due cards for quiz session)
 */
export async function GET() {
  try {
    // Check authentication
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized', code: 'UNAUTHORIZED' },
        { status: 401 }
      )
    }

    const userId = session.user.id

    // Get all user's flashcards
    const allFlashcards = await getFlashcardsByUserId(userId)

    const now = new Date()

    // Filter for due cards (FR-011: FSRS due date <= now)
    const dueCards = allFlashcards.filter((card) => {
      const dueDate = new Date(card.fsrsState.due)
      return dueDate <= now
    })

    // Sort by due date (most overdue first)
    const sortedDueCards = dueCards.sort((a, b) => {
      const dueA = new Date(a.fsrsState.due).getTime()
      const dueB = new Date(b.fsrsState.due).getTime()
      return dueA - dueB
    })

    console.log(
      `[QuizDue] Found ${sortedDueCards.length} due cards for user ${userId}`
    )

    return NextResponse.json({
      success: true,
      flashcards: sortedDueCards,
      count: sortedDueCards.length,
      totalCards: allFlashcards.length,
    })
  } catch (error) {
    console.error('[QuizDue] Error:', error)

    return NextResponse.json(
      {
        error: 'Failed to retrieve due flashcards',
        code: 'INTERNAL_ERROR',
      },
      { status: 500 }
    )
  }
}
