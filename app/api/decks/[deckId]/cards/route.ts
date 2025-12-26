import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { getDeck } from '@/lib/db/operations/decks'
import { addCardsToDeck, removeCardsFromDeck, getCardCount } from '@/lib/db/operations/deck-cards'

/**
 * POST /api/decks/[deckId]/cards
 * Add cards to deck (with 1000-card limit validation)
 * Idempotent: Cards already in deck are skipped
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ deckId: string }> }
) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { deckId } = await params
    const body = await request.json()

    // Validate request body
    if (!Array.isArray(body.flashcardIds)) {
      return NextResponse.json({ error: 'flashcard_ids must be an array' }, { status: 400 })
    }

    if (body.flashcardIds.length === 0) {
      return NextResponse.json({ error: 'flashcardIds cannot be empty' }, { status: 400 })
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    const invalidIds = body.flashcardIds.filter((id: string) => !uuidRegex.test(id))
    if (invalidIds.length > 0) {
      return NextResponse.json(
        { error: `Invalid UUID format: ${invalidIds.join(', ')}` },
        { status: 400 }
      )
    }

    // Verify deck exists and ownership
    const deck = await getDeck(deckId)

    if (!deck) {
      return NextResponse.json({ error: 'Deck not found' }, { status: 404 })
    }

    if (deck.userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    try {
      const result = await addCardsToDeck(deckId, body.flashcardIds)
      const cardCount = await getCardCount(deckId)

      return NextResponse.json(
        {
          addedCount: result.added,
          cardCount,
          limit: 1000,
        },
        { status: 200 }
      )
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'

      // Check for limit error
      if (message.includes('Deck limit reached')) {
        return NextResponse.json(
          {
            error: message,
            code: 'DECK_LIMIT_EXCEEDED',
          },
          { status: 403 }
        )
      }

      // Re-throw for generic error handling
      throw error
    }
  } catch (error) {
    console.error('Error adding cards to deck:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * DELETE /api/decks/[deckId]/cards
 * Remove cards from deck
 * Idempotent: Returns count of actually removed cards
 * Preserves flashcards (only removes from deck)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ deckId: string }> }
) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { deckId } = await params
    const body = await request.json()

    // Validate request body
    if (!Array.isArray(body.flashcardIds)) {
      return NextResponse.json({ error: 'flashcard_ids must be an array' }, { status: 400 })
    }

    if (body.flashcardIds.length === 0) {
      return NextResponse.json({ error: 'flashcardIds cannot be empty' }, { status: 400 })
    }

    // Verify deck exists and ownership
    const deck = await getDeck(deckId)

    if (!deck) {
      return NextResponse.json({ error: 'Deck not found' }, { status: 404 })
    }

    if (deck.userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const removedCount = await removeCardsFromDeck(deckId, body.flashcardIds)
    const cardCount = await getCardCount(deckId)

    return NextResponse.json(
      {
        removedCount,
        cardCount,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Error removing cards from deck:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
