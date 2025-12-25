import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { closeDbConnection } from '@/lib/db/client'
import { createUser } from '@/lib/db/operations/users'
import { createConversation } from '@/lib/db/operations/conversations'
import { createMessage } from '@/lib/db/operations/messages'
import {
  createFlashcard,
  getFlashcardById,
  updateFlashcardFSRSState,
} from '@/lib/db/operations/flashcards'
import { createDeck, updateDeck } from '@/lib/db/operations/decks'
import { addCardsToDeck } from '@/lib/db/operations/deck-cards'
import {
  getDueFlashcardsForDeck,
  getNewFlashcardsForDeck,
  getEffectiveFSRSSettings,
  getAllFlashcardsInDeck,
} from '@/lib/fsrs/deck-scheduler'
import { scheduleCard } from '@/lib/fsrs/scheduler'
import { Rating, State } from 'ts-fsrs'
import { hashPassword } from '@/lib/auth/helpers'

/**
 * Integration Tests for Deck-Filtered FSRS Scheduling
 *
 * Tests FSRS scheduling correctness within deck sessions:
 * - Global FSRS state updates when rating cards in deck sessions
 * - Deck-specific override settings apply correctly
 * - Only cards from specified deck appear in session
 * - FSRS ordering is correct (New > Learning > Relearning > Review)
 *
 * Maps to T075 in Phase 7 (Tests)
 * Tests FR-010, FR-027, FR-028, FR-029
 */

describe('Deck-Filtered FSRS Integration', () => {
  let testUserId: string
  let testConversationId: string
  let testMessageId: string
  let deck1Id: string
  let deck2Id: string
  let flashcard1Id: string // In deck1
  let flashcard2Id: string // In deck1
  let flashcard3Id: string // In deck2
  let flashcard4Id: string // In deck1 (new card)

  beforeAll(async () => {
    // Create test user
    const passwordHash = await hashPassword('TestPass123!')
    const user = await createUser({
      email: `test-deck-fsrs-${Date.now()}@example.com`,
      passwordHash,
      name: 'Deck FSRS Test User',
    })
    testUserId = user.id

    // Create conversation and message
    const conversation = await createConversation({
      userId: testUserId,
      title: 'Deck FSRS Test Conversation',
    })
    testConversationId = conversation.id

    const message = await createMessage({
      conversationId: testConversationId,
      userId: testUserId,
      role: 'assistant',
      content: 'Test content for FSRS deck filtering.',
    })
    testMessageId = message.id

    // Create two decks
    const deck1 = await createDeck({
      userId: testUserId,
      name: 'Deck 1 with Overrides',
      newCardsPerDayOverride: 15,
      cardsPerSessionOverride: 25,
    })
    deck1Id = deck1.id

    const deck2 = await createDeck({
      userId: testUserId,
      name: 'Deck 2 No Overrides',
    })
    deck2Id = deck2.id

    // Create flashcards
    const fc1 = await createFlashcard({
      userId: testUserId,
      conversationId: testConversationId,
      messageId: testMessageId,
      question: 'Question 1',
      answer: 'Answer 1',
    })
    flashcard1Id = fc1.id

    const fc2 = await createFlashcard({
      userId: testUserId,
      conversationId: testConversationId,
      messageId: testMessageId,
      question: 'Question 2',
      answer: 'Answer 2',
    })
    flashcard2Id = fc2.id

    const fc3 = await createFlashcard({
      userId: testUserId,
      conversationId: testConversationId,
      messageId: testMessageId,
      question: 'Question 3',
      answer: 'Answer 3',
    })
    flashcard3Id = fc3.id

    // Create a new card (state = New)
    const fc4 = await createFlashcard({
      userId: testUserId,
      conversationId: testConversationId,
      messageId: testMessageId,
      question: 'Question 4 New',
      answer: 'Answer 4 New',
    })
    flashcard4Id = fc4.id

    // Add cards to decks
    await addCardsToDeck(deck1Id, [flashcard1Id, flashcard2Id, flashcard4Id])
    await addCardsToDeck(deck2Id, [flashcard3Id])

    // Set flashcard1 to Learning state (state = 1) by scheduling it once
    const fc1Current = await getFlashcardById(flashcard1Id)
    const { card: fc1Scheduled } = scheduleCard(fc1Current!.fsrsState, Rating.Good)
    await updateFlashcardFSRSState(flashcard1Id, fc1Scheduled)

    // Set flashcard2 to Review state (state = 2) by scheduling it multiple times
    let fc2Current = await getFlashcardById(flashcard2Id)
    // Review 1
    let { card: fc2Scheduled } = scheduleCard(fc2Current!.fsrsState, Rating.Good)
    await updateFlashcardFSRSState(flashcard2Id, fc2Scheduled)
    // Review 2
    fc2Current = await getFlashcardById(flashcard2Id)
    const result2 = scheduleCard(fc2Current!.fsrsState, Rating.Good)
    fc2Scheduled = result2.card
    await updateFlashcardFSRSState(flashcard2Id, fc2Scheduled)
    // Review 3
    fc2Current = await getFlashcardById(flashcard2Id)
    const result3 = scheduleCard(fc2Current!.fsrsState, Rating.Good)
    fc2Scheduled = result3.card
    await updateFlashcardFSRSState(flashcard2Id, fc2Scheduled)
  })

  afterAll(async () => {
    await closeDbConnection()
  })

  describe('Deck Filtering (FR-010, FR-027)', () => {
    it('should only return cards from specified deck', async () => {
      const deck1Cards = await getAllFlashcardsInDeck(deck1Id, testUserId)
      const deck2Cards = await getAllFlashcardsInDeck(deck2Id, testUserId)

      // Deck 1 should have 3 cards
      expect(deck1Cards.length).toBe(3)
      const deck1CardIds = deck1Cards.map((c) => c.id)
      expect(deck1CardIds).toContain(flashcard1Id)
      expect(deck1CardIds).toContain(flashcard2Id)
      expect(deck1CardIds).toContain(flashcard4Id)
      expect(deck1CardIds).not.toContain(flashcard3Id)

      // Deck 2 should have 1 card
      expect(deck2Cards.length).toBe(1)
      expect(deck2Cards[0].id).toBe(flashcard3Id)
    })

    it('should filter due cards by deck membership', async () => {
      const dueCards = await getDueFlashcardsForDeck(deck1Id, testUserId)

      // Should only get due cards from deck1
      const dueCardIds = dueCards.map((c) => c.id)
      expect(dueCardIds).not.toContain(flashcard3Id) // This is in deck2
    })

    it('should filter new cards by deck membership', async () => {
      const newCards = await getNewFlashcardsForDeck(deck1Id, testUserId, 10)

      // Should only get new cards from deck1
      expect(newCards.length).toBeGreaterThan(0)
      const newCardIds = newCards.map((c) => c.id)

      // flashcard4 is new and in deck1
      expect(newCardIds).toContain(flashcard4Id)

      // None should be from deck2
      expect(newCardIds).not.toContain(flashcard3Id)
    })
  })

  describe('FSRS Settings Precedence (FR-028, FR-029)', () => {
    it('should use global defaults when no overrides set', async () => {
      const settings = await getEffectiveFSRSSettings(deck2Id)

      expect(settings.source).toBe('global')
      expect(settings.newCardsPerDay).toBe(20) // Global default
      expect(settings.cardsPerSession).toBe(50) // Global default
    })

    it('should use deck overrides when set', async () => {
      const settings = await getEffectiveFSRSSettings(deck1Id)

      expect(settings.source).toBe('deck')
      expect(settings.newCardsPerDay).toBe(15) // Deck override
      expect(settings.cardsPerSession).toBe(25) // Deck override
    })

    it('should prioritize session overrides over deck overrides', async () => {
      const settings = await getEffectiveFSRSSettings(deck1Id, {
        newCardsPerDay: 30,
        cardsPerSession: 40,
      })

      expect(settings.source).toBe('session')
      expect(settings.newCardsPerDay).toBe(30) // Session override
      expect(settings.cardsPerSession).toBe(40) // Session override
    })

    it('should partially override deck settings', async () => {
      const settings = await getEffectiveFSRSSettings(deck1Id, {
        newCardsPerDay: 35,
        // cardsPerSession not overridden
      })

      expect(settings.source).toBe('session')
      expect(settings.newCardsPerDay).toBe(35) // Session override
      expect(settings.cardsPerSession).toBe(25) // Deck override
    })

    it('should apply newCardsPerDay limit to new card retrieval', async () => {
      // Deck1 has newCardsPerDayOverride = 15
      const newCards = await getNewFlashcardsForDeck(deck1Id, testUserId, 15)

      // Should not exceed deck override limit
      expect(newCards.length).toBeLessThanOrEqual(15)
    })
  })

  describe('Global FSRS State Updates', () => {
    it('should update global flashcard state after rating in deck session', async () => {
      // Get a card from deck1
      const cardBefore = await getFlashcardById(flashcard1Id)
      expect(cardBefore).toBeDefined()

      const initialReps = cardBefore!.fsrsState.reps

      // Schedule the card (simulate rating in deck session)
      const { card: updatedCard } = scheduleCard(cardBefore!.fsrsState, Rating.Good)

      // Update global state
      await updateFlashcardFSRSState(flashcard1Id, updatedCard)

      // Verify global state was updated
      const cardAfter = await getFlashcardById(flashcard1Id)
      expect(cardAfter).toBeDefined()
      expect(cardAfter!.fsrsState.reps).toBe(initialReps + 1)
      expect(cardAfter!.fsrsState.due.getTime()).toBeGreaterThan(
        cardBefore!.fsrsState.due.getTime()
      )
    })

    it('should persist FSRS state across deck boundaries', async () => {
      // Get card from deck1
      const card = await getFlashcardById(flashcard1Id)
      expect(card).toBeDefined()

      const originalReps = card!.fsrsState.reps

      // Schedule it with Good rating
      const { card: updatedCard } = scheduleCard(card!.fsrsState, Rating.Good)
      await updateFlashcardFSRSState(flashcard1Id, updatedCard)

      // Create a new deck and add the same card
      const deck3 = await createDeck({
        userId: testUserId,
        name: 'Deck 3 Cross-Deck Test',
      })
      await addCardsToDeck(deck3.id, [flashcard1Id])

      // Get card from deck3
      const deck3Cards = await getAllFlashcardsInDeck(deck3.id, testUserId)
      const cardInDeck3 = deck3Cards.find((c) => c.id === flashcard1Id)

      // FSRS state should be the updated state, not the original
      expect(cardInDeck3).toBeDefined()
      expect(cardInDeck3!.fsrsState.reps).toBe(originalReps + 1)
    })
  })

  describe('FSRS Ordering and State Priority', () => {
    it('should order due cards by FSRS state priority', async () => {
      // Get due cards from deck1
      const dueCards = await getDueFlashcardsForDeck(deck1Id, testUserId)

      if (dueCards.length < 2) {
        // Skip if not enough due cards
        return
      }

      // Verify ordering: New (0) > Learning (1) > Relearning (3) > Review (2)
      const statePriority: { [key: number]: number } = {
        0: 1, // New
        1: 2, // Learning
        3: 3, // Relearning
        2: 4, // Review
      }

      for (let i = 1; i < dueCards.length; i++) {
        const prevPriority = statePriority[dueCards[i - 1].fsrsState.state] ?? 5
        const currPriority = statePriority[dueCards[i].fsrsState.state] ?? 5

        // Previous card should have equal or higher priority
        expect(prevPriority).toBeLessThanOrEqual(currPriority)
      }
    })

    it('should order cards within same state by due date', async () => {
      // Create multiple cards in Learning state with different due dates
      const passwordHash = await hashPassword('TestPass123!')
      const orderTestUser = await createUser({
        email: `test-fsrs-order-${Date.now()}@example.com`,
        passwordHash,
        name: 'FSRS Order Test User',
      })

      const conversation = await createConversation({
        userId: orderTestUser.id,
        title: 'Order Test Conversation',
      })

      const message = await createMessage({
        conversationId: conversation.id,
        userId: orderTestUser.id,
        role: 'assistant',
        content: 'Order test content.',
      })

      const deck = await createDeck({
        userId: orderTestUser.id,
        name: 'Order Test Deck',
      })

      // Create 3 cards and put them all in Learning state
      const cardIds: string[] = []
      for (let i = 0; i < 3; i++) {
        const fc = await createFlashcard({
          userId: orderTestUser.id,
          conversationId: conversation.id,
          messageId: message.id,
          question: `Order Test ${i}`,
          answer: `Answer ${i}`,
        })
        cardIds.push(fc.id)

        // Schedule to Learning state
        const { card: scheduledCard } = scheduleCard(fc.fsrsState, Rating.Good)
        await updateFlashcardFSRSState(fc.id, scheduledCard)

        await addCardsToDeck(deck.id, [fc.id])
      }

      // Get due cards
      const dueCards = await getDueFlashcardsForDeck(deck.id, orderTestUser.id)

      // Filter to Learning state only
      const learningCards = dueCards.filter((c) => c.fsrsState.state === State.Learning)

      if (learningCards.length > 1) {
        // Verify they're ordered by due date within Learning state
        for (let i = 1; i < learningCards.length; i++) {
          const prevDue = learningCards[i - 1].fsrsState.due.getTime()
          const currDue = learningCards[i].fsrsState.due.getTime()
          expect(prevDue).toBeLessThanOrEqual(currDue)
        }
      }
    })
  })

  describe('Edge Cases', () => {
    it('should handle deck with no due cards', async () => {
      // Create a deck with only future-due cards
      const passwordHash = await hashPassword('TestPass123!')
      const emptyUser = await createUser({
        email: `test-empty-deck-${Date.now()}@example.com`,
        passwordHash,
        name: 'Empty Deck Test User',
      })

      const conversation = await createConversation({
        userId: emptyUser.id,
        title: 'Empty Test Conversation',
      })

      const message = await createMessage({
        conversationId: conversation.id,
        userId: emptyUser.id,
        role: 'assistant',
        content: 'Empty test content.',
      })

      const emptyDeck = await createDeck({
        userId: emptyUser.id,
        name: 'Empty Due Deck',
      })

      // Create a card and schedule it far in the future
      const fc = await createFlashcard({
        userId: emptyUser.id,
        conversationId: conversation.id,
        messageId: message.id,
        question: 'Future Question',
        answer: 'Future Answer',
      })

      // Schedule it multiple times to push due date far into future
      let currentCard = fc.fsrsState
      for (let i = 0; i < 5; i++) {
        const { card: scheduledCard } = scheduleCard(currentCard, Rating.Easy)
        currentCard = scheduledCard
      }
      await updateFlashcardFSRSState(fc.id, currentCard)

      await addCardsToDeck(emptyDeck.id, [fc.id])

      // Get due cards
      const dueCards = await getDueFlashcardsForDeck(emptyDeck.id, emptyUser.id)

      // Should have no due cards
      expect(dueCards.length).toBe(0)
    })

    it('should handle deck with only new cards', async () => {
      const passwordHash = await hashPassword('TestPass123!')
      const newCardsUser = await createUser({
        email: `test-new-cards-${Date.now()}@example.com`,
        passwordHash,
        name: 'New Cards Test User',
      })

      const conversation = await createConversation({
        userId: newCardsUser.id,
        title: 'New Cards Test Conversation',
      })

      const message = await createMessage({
        conversationId: conversation.id,
        userId: newCardsUser.id,
        role: 'assistant',
        content: 'New cards test content.',
      })

      const newCardsDeck = await createDeck({
        userId: newCardsUser.id,
        name: 'New Cards Only Deck',
      })

      // Create 5 new cards
      const newCardIds: string[] = []
      for (let i = 0; i < 5; i++) {
        const fc = await createFlashcard({
          userId: newCardsUser.id,
          conversationId: conversation.id,
          messageId: message.id,
          question: `New Card ${i}`,
          answer: `Answer ${i}`,
        })
        newCardIds.push(fc.id)
      }

      await addCardsToDeck(newCardsDeck.id, newCardIds)

      // Get new cards (limit 3)
      const newCards = await getNewFlashcardsForDeck(newCardsDeck.id, newCardsUser.id, 3)

      expect(newCards.length).toBe(3)
      expect(newCards.every((c) => c.fsrsState.state === State.New)).toBe(true)
    })

    it('should handle non-existent deck gracefully', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000'

      await expect(getEffectiveFSRSSettings(fakeId)).rejects.toThrow('Deck not found')
    })

    it('should handle empty deck', async () => {
      const emptyDeck = await createDeck({
        userId: testUserId,
        name: 'Empty Deck',
      })

      const dueCards = await getDueFlashcardsForDeck(emptyDeck.id, testUserId)
      const newCards = await getNewFlashcardsForDeck(emptyDeck.id, testUserId, 10)

      expect(dueCards.length).toBe(0)
      expect(newCards.length).toBe(0)
    })
  })

  describe('Deck Override Updates', () => {
    it('should reflect updated deck overrides in settings', async () => {
      // Create deck without overrides
      const deck = await createDeck({
        userId: testUserId,
        name: 'Override Update Test Deck',
      })

      // Initial settings should be global
      const settings1 = await getEffectiveFSRSSettings(deck.id)
      expect(settings1.source).toBe('global')

      // Update deck with overrides
      await updateDeck(deck.id, {
        newCardsPerDayOverride: 100,
        cardsPerSessionOverride: 200,
      })

      // Settings should now reflect deck overrides
      const settings2 = await getEffectiveFSRSSettings(deck.id)
      expect(settings2.source).toBe('deck')
      expect(settings2.newCardsPerDay).toBe(100)
      expect(settings2.cardsPerSession).toBe(200)

      // Clear overrides
      await updateDeck(deck.id, {
        newCardsPerDayOverride: null,
        cardsPerSessionOverride: null,
      })

      // Should revert to global
      const settings3 = await getEffectiveFSRSSettings(deck.id)
      expect(settings3.source).toBe('global')
    })
  })
})
