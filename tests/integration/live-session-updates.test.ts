import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { closeDbConnection } from '@/lib/db/client'
import { createUser } from '@/lib/db/operations/users'
import { createConversation } from '@/lib/db/operations/conversations'
import { createMessage } from '@/lib/db/operations/messages'
import { createFlashcard, updateFlashcardFSRSState } from '@/lib/db/operations/flashcards'
import { createDeck } from '@/lib/db/operations/decks'
import { addCardsToDeck, removeCardsFromDeck } from '@/lib/db/operations/deck-cards'
import {
  detectDeckChanges,
  getAllFlashcardsInDeck,
  getDueFlashcardsForDeck,
} from '@/lib/fsrs/deck-scheduler'
import { scheduleCard } from '@/lib/fsrs/scheduler'
import { Rating } from 'ts-fsrs'
import { hashPassword } from '@/lib/auth/helpers'

/**
 * Integration Tests for Live Session Updates
 *
 * Tests concurrent deck editing during active sessions:
 * - Added cards appear in session queue if FSRS-due
 * - Removed cards are skipped if not yet reviewed
 * - Session continues with original card set + dynamic updates
 *
 * Maps to T076 in Phase 7 (Tests)
 * Tests FR-030, FR-031
 */

describe('Live Session Updates Integration', () => {
  let testUserId: string
  let testConversationId: string
  let testMessageId: string
  let testDeckId: string

  beforeAll(async () => {
    // Create test user
    const passwordHash = await hashPassword('TestPass123!')
    const user = await createUser({
      email: `test-live-updates-${Date.now()}@example.com`,
      passwordHash,
      name: 'Live Updates Test User',
    })
    testUserId = user.id

    // Create conversation and message
    const conversation = await createConversation({
      userId: testUserId,
      title: 'Live Updates Test Conversation',
    })
    testConversationId = conversation.id

    const message = await createMessage({
      conversationId: testConversationId,
      userId: testUserId,
      role: 'assistant',
      content: 'Test content for live session updates.',
    })
    testMessageId = message.id

    // Create test deck
    const deck = await createDeck({
      userId: testUserId,
      name: 'Live Updates Test Deck',
    })
    testDeckId = deck.id
  })

  afterAll(async () => {
    await closeDbConnection()
  })

  describe('Card Addition During Session (FR-030)', () => {
    it('should detect newly added cards', async () => {
      // Create initial card set
      const fc1 = await createFlashcard({
        userId: testUserId,
        conversationId: testConversationId,
        messageId: testMessageId,
        question: 'Initial Card 1',
        answer: 'Answer 1',
      })

      const fc2 = await createFlashcard({
        userId: testUserId,
        conversationId: testConversationId,
        messageId: testMessageId,
        question: 'Initial Card 2',
        answer: 'Answer 2',
      })

      await addCardsToDeck(testDeckId, [fc1.id, fc2.id])

      // Simulate session start
      const originalCards = await getAllFlashcardsInDeck(testDeckId, testUserId)
      const originalCardIds = originalCards.map((c) => c.id)

      // Add new card during session
      const fc3 = await createFlashcard({
        userId: testUserId,
        conversationId: testConversationId,
        messageId: testMessageId,
        question: 'Added Card 3',
        answer: 'Answer 3',
      })

      await addCardsToDeck(testDeckId, [fc3.id])

      // Detect changes
      const changes = await detectDeckChanges(testDeckId, testUserId, originalCardIds)

      expect(changes.hasChanges).toBe(true)
      expect(changes.addedCards.length).toBe(1)
      expect(changes.addedCards[0].id).toBe(fc3.id)
      expect(changes.removedCardIds.length).toBe(0)
    })

    it('should only include due cards in added cards list', async () => {
      // Create a new deck for this test
      const deck = await createDeck({
        userId: testUserId,
        name: 'Due Cards Filter Deck',
      })

      // Create initial card
      const fc1 = await createFlashcard({
        userId: testUserId,
        conversationId: testConversationId,
        messageId: testMessageId,
        question: 'Initial Due Card',
        answer: 'Answer',
      })

      await addCardsToDeck(deck.id, [fc1.id])

      // Simulate session start
      const originalCards = await getAllFlashcardsInDeck(deck.id, testUserId)
      const originalCardIds = originalCards.map((c) => c.id)

      // Add a card that's due now (default state)
      const fc2 = await createFlashcard({
        userId: testUserId,
        conversationId: testConversationId,
        messageId: testMessageId,
        question: 'Added Due Card',
        answer: 'Answer',
      })

      // Add a card that's not due (schedule it far into future)
      const fc3 = await createFlashcard({
        userId: testUserId,
        conversationId: testConversationId,
        messageId: testMessageId,
        question: 'Added Future Card',
        answer: 'Answer',
      })

      // Schedule fc3 multiple times to push due date into future
      let currentCard = fc3.fsrsState
      for (let i = 0; i < 5; i++) {
        const { card: scheduledCard } = scheduleCard(currentCard, Rating.Easy)
        currentCard = scheduledCard
      }
      await updateFlashcardFSRSState(fc3.id, currentCard)

      await addCardsToDeck(deck.id, [fc2.id, fc3.id])

      // Detect changes
      const changes = await detectDeckChanges(deck.id, testUserId, originalCardIds)

      expect(changes.hasChanges).toBe(true)
      // Only fc2 should be in added cards (fc3 is not due)
      expect(changes.addedCards.length).toBe(1)
      expect(changes.addedCards[0].id).toBe(fc2.id)
    })

    it('should handle multiple cards added simultaneously', async () => {
      const deck = await createDeck({
        userId: testUserId,
        name: 'Multi Add Deck',
      })

      // Create initial card
      const fc1 = await createFlashcard({
        userId: testUserId,
        conversationId: testConversationId,
        messageId: testMessageId,
        question: 'Initial Card',
        answer: 'Answer',
      })

      await addCardsToDeck(deck.id, [fc1.id])

      // Simulate session start
      const originalCards = await getAllFlashcardsInDeck(deck.id, testUserId)
      const originalCardIds = originalCards.map((c) => c.id)

      // Add multiple cards
      const newCards: string[] = []
      for (let i = 0; i < 5; i++) {
        const fc = await createFlashcard({
          userId: testUserId,
          conversationId: testConversationId,
          messageId: testMessageId,
          question: `Multi Add Card ${i}`,
          answer: `Answer ${i}`,
        })
        newCards.push(fc.id)
      }

      await addCardsToDeck(deck.id, newCards)

      // Detect changes
      const changes = await detectDeckChanges(deck.id, testUserId, originalCardIds)

      expect(changes.hasChanges).toBe(true)
      expect(changes.addedCards.length).toBe(5)

      const addedIds = changes.addedCards.map((c) => c.id)
      newCards.forEach((id) => {
        expect(addedIds).toContain(id)
      })
    })
  })

  describe('Card Removal During Session (FR-031)', () => {
    it('should detect removed cards', async () => {
      // Create cards
      const fc1 = await createFlashcard({
        userId: testUserId,
        conversationId: testConversationId,
        messageId: testMessageId,
        question: 'Removal Test Card 1',
        answer: 'Answer 1',
      })

      const fc2 = await createFlashcard({
        userId: testUserId,
        conversationId: testConversationId,
        messageId: testMessageId,
        question: 'Removal Test Card 2',
        answer: 'Answer 2',
      })

      const fc3 = await createFlashcard({
        userId: testUserId,
        conversationId: testConversationId,
        messageId: testMessageId,
        question: 'Removal Test Card 3',
        answer: 'Answer 3',
      })

      const deck = await createDeck({
        userId: testUserId,
        name: 'Removal Test Deck',
      })

      await addCardsToDeck(deck.id, [fc1.id, fc2.id, fc3.id])

      // Simulate session start
      const originalCards = await getAllFlashcardsInDeck(deck.id, testUserId)
      const originalCardIds = originalCards.map((c) => c.id)

      // Remove a card during session
      await removeCardsFromDeck(deck.id, [fc2.id])

      // Detect changes
      const changes = await detectDeckChanges(deck.id, testUserId, originalCardIds)

      expect(changes.hasChanges).toBe(true)
      expect(changes.removedCardIds.length).toBe(1)
      expect(changes.removedCardIds[0]).toBe(fc2.id)
      expect(changes.addedCards.length).toBe(0)
    })

    it('should handle multiple cards removed simultaneously', async () => {
      const deck = await createDeck({
        userId: testUserId,
        name: 'Multi Remove Deck',
      })

      // Create 5 cards
      const cardIds: string[] = []
      for (let i = 0; i < 5; i++) {
        const fc = await createFlashcard({
          userId: testUserId,
          conversationId: testConversationId,
          messageId: testMessageId,
          question: `Multi Remove Card ${i}`,
          answer: `Answer ${i}`,
        })
        cardIds.push(fc.id)
      }

      await addCardsToDeck(deck.id, cardIds)

      // Simulate session start
      const originalCards = await getAllFlashcardsInDeck(deck.id, testUserId)
      const originalCardIds = originalCards.map((c) => c.id)

      // Remove 3 cards
      const toRemove = [cardIds[0], cardIds[2], cardIds[4]]
      await removeCardsFromDeck(deck.id, toRemove)

      // Detect changes
      const changes = await detectDeckChanges(deck.id, testUserId, originalCardIds)

      expect(changes.hasChanges).toBe(true)
      expect(changes.removedCardIds.length).toBe(3)

      toRemove.forEach((id) => {
        expect(changes.removedCardIds).toContain(id)
      })
    })

    it('should preserve flashcards in database after removal from deck', async () => {
      const deck = await createDeck({
        userId: testUserId,
        name: 'Preserve Flashcard Deck',
      })

      const fc = await createFlashcard({
        userId: testUserId,
        conversationId: testConversationId,
        messageId: testMessageId,
        question: 'Preserve Test Card',
        answer: 'Preserve Answer',
      })

      await addCardsToDeck(deck.id, [fc.id])

      // Remove from deck
      await removeCardsFromDeck(deck.id, [fc.id])

      // Verify deck doesn't have the card
      const deckCards = await getAllFlashcardsInDeck(deck.id, testUserId)
      expect(deckCards.some((c) => c.id === fc.id)).toBe(false)

      // Flashcard should still exist globally
      // (we can test this by adding it to another deck)
      const deck2 = await createDeck({
        userId: testUserId,
        name: 'Second Deck',
      })

      // Should be able to add the same flashcard to new deck
      const result = await addCardsToDeck(deck2.id, [fc.id])
      expect(result.added).toBe(1)
    })
  })

  describe('Combined Add/Remove Operations', () => {
    it('should detect both additions and removals', async () => {
      const deck = await createDeck({
        userId: testUserId,
        name: 'Combined Changes Deck',
      })

      // Initial cards
      const fc1 = await createFlashcard({
        userId: testUserId,
        conversationId: testConversationId,
        messageId: testMessageId,
        question: 'Combined Initial 1',
        answer: 'Answer 1',
      })

      const fc2 = await createFlashcard({
        userId: testUserId,
        conversationId: testConversationId,
        messageId: testMessageId,
        question: 'Combined Initial 2',
        answer: 'Answer 2',
      })

      await addCardsToDeck(deck.id, [fc1.id, fc2.id])

      // Simulate session start
      const originalCards = await getAllFlashcardsInDeck(deck.id, testUserId)
      const originalCardIds = originalCards.map((c) => c.id)

      // Remove one card
      await removeCardsFromDeck(deck.id, [fc1.id])

      // Add two new cards
      const fc3 = await createFlashcard({
        userId: testUserId,
        conversationId: testConversationId,
        messageId: testMessageId,
        question: 'Combined Added 1',
        answer: 'Answer 3',
      })

      const fc4 = await createFlashcard({
        userId: testUserId,
        conversationId: testConversationId,
        messageId: testMessageId,
        question: 'Combined Added 2',
        answer: 'Answer 4',
      })

      await addCardsToDeck(deck.id, [fc3.id, fc4.id])

      // Detect changes
      const changes = await detectDeckChanges(deck.id, testUserId, originalCardIds)

      expect(changes.hasChanges).toBe(true)
      expect(changes.addedCards.length).toBe(2)
      expect(changes.removedCardIds.length).toBe(1)

      expect(changes.removedCardIds[0]).toBe(fc1.id)
      const addedIds = changes.addedCards.map((c) => c.id)
      expect(addedIds).toContain(fc3.id)
      expect(addedIds).toContain(fc4.id)
    })
  })

  describe('No Changes Scenario', () => {
    it('should return no changes when deck composition unchanged', async () => {
      const deck = await createDeck({
        userId: testUserId,
        name: 'No Changes Deck',
      })

      const fc1 = await createFlashcard({
        userId: testUserId,
        conversationId: testConversationId,
        messageId: testMessageId,
        question: 'No Change Card 1',
        answer: 'Answer 1',
      })

      const fc2 = await createFlashcard({
        userId: testUserId,
        conversationId: testConversationId,
        messageId: testMessageId,
        question: 'No Change Card 2',
        answer: 'Answer 2',
      })

      await addCardsToDeck(deck.id, [fc1.id, fc2.id])

      // Simulate session start
      const originalCards = await getAllFlashcardsInDeck(deck.id, testUserId)
      const originalCardIds = originalCards.map((c) => c.id)

      // No changes made

      // Detect changes
      const changes = await detectDeckChanges(deck.id, testUserId, originalCardIds)

      expect(changes.hasChanges).toBe(false)
      expect(changes.addedCards.length).toBe(0)
      expect(changes.removedCardIds.length).toBe(0)
    })

    it('should handle empty deck', async () => {
      const deck = await createDeck({
        userId: testUserId,
        name: 'Empty Changes Deck',
      })

      // Simulate session start with empty deck
      const originalCardIds: string[] = []

      // Detect changes (still empty)
      const changes = await detectDeckChanges(deck.id, testUserId, originalCardIds)

      expect(changes.hasChanges).toBe(false)
      expect(changes.addedCards.length).toBe(0)
      expect(changes.removedCardIds.length).toBe(0)
    })
  })

  describe('Live Updates Flow Integration', () => {
    it('should support complete live update workflow', async () => {
      const deck = await createDeck({
        userId: testUserId,
        name: 'Live Workflow Deck',
      })

      // Step 1: Create initial deck with cards
      const initialCards: string[] = []
      for (let i = 0; i < 3; i++) {
        const fc = await createFlashcard({
          userId: testUserId,
          conversationId: testConversationId,
          messageId: testMessageId,
          question: `Workflow Card ${i}`,
          answer: `Answer ${i}`,
        })
        initialCards.push(fc.id)
      }

      await addCardsToDeck(deck.id, initialCards)

      // Step 2: Start session (capture initial state)
      const sessionCards = await getAllFlashcardsInDeck(deck.id, testUserId)
      const sessionCardIds = sessionCards.map((c) => c.id)
      const dueCards1 = await getDueFlashcardsForDeck(deck.id, testUserId)

      expect(sessionCardIds.length).toBe(3)
      expect(dueCards1.length).toBe(3) // All are due by default

      // Step 3: During session, add new due card
      const newCard = await createFlashcard({
        userId: testUserId,
        conversationId: testConversationId,
        messageId: testMessageId,
        question: 'Live Added Card',
        answer: 'Live Answer',
      })

      await addCardsToDeck(deck.id, [newCard.id])

      // Step 4: Detect changes
      const changes1 = await detectDeckChanges(deck.id, testUserId, sessionCardIds)

      expect(changes1.hasChanges).toBe(true)
      expect(changes1.addedCards.length).toBe(1)
      expect(changes1.addedCards[0].id).toBe(newCard.id)

      // Step 5: During session, remove a card
      await removeCardsFromDeck(deck.id, [initialCards[1]])

      // Step 6: Detect changes again
      const changes2 = await detectDeckChanges(deck.id, testUserId, sessionCardIds)

      expect(changes2.hasChanges).toBe(true)
      expect(changes2.addedCards.length).toBe(1) // Still has the added card
      expect(changes2.removedCardIds.length).toBe(1)
      expect(changes2.removedCardIds[0]).toBe(initialCards[1])

      // Step 7: Get updated due cards
      const dueCards2 = await getDueFlashcardsForDeck(deck.id, testUserId)

      // Should have 3 cards: 2 original + 1 new (minus 1 removed)
      expect(dueCards2.length).toBe(3)

      const dueCardIds = dueCards2.map((c) => c.id)
      expect(dueCardIds).toContain(initialCards[0]) // Still there
      expect(dueCardIds).not.toContain(initialCards[1]) // Removed
      expect(dueCardIds).toContain(initialCards[2]) // Still there
      expect(dueCardIds).toContain(newCard.id) // Added
    })

    it('should maintain session integrity across multiple change detection calls', async () => {
      const deck = await createDeck({
        userId: testUserId,
        name: 'Multi Detection Deck',
      })

      const fc = await createFlashcard({
        userId: testUserId,
        conversationId: testConversationId,
        messageId: testMessageId,
        question: 'Multi Detection Card',
        answer: 'Answer',
      })

      await addCardsToDeck(deck.id, [fc.id])

      // Capture session state
      const originalCards = await getAllFlashcardsInDeck(deck.id, testUserId)
      const originalCardIds = originalCards.map((c) => c.id)

      // Add a new card
      const fc2 = await createFlashcard({
        userId: testUserId,
        conversationId: testConversationId,
        messageId: testMessageId,
        question: 'Multi Detection Added',
        answer: 'Answer 2',
      })

      await addCardsToDeck(deck.id, [fc2.id])

      // First detection
      const changes1 = await detectDeckChanges(deck.id, testUserId, originalCardIds)
      expect(changes1.addedCards.length).toBe(1)

      // Second detection (same original state)
      const changes2 = await detectDeckChanges(deck.id, testUserId, originalCardIds)
      expect(changes2.addedCards.length).toBe(1)

      // Both should report the same change
      expect(changes1.addedCards[0].id).toBe(changes2.addedCards[0].id)
    })
  })
})
