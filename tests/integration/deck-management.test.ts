import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { closeDbConnection } from '@/lib/db/client'
import { createUser } from '@/lib/db/operations/users'
import { createFlashcard } from '@/lib/db/operations/flashcards'
import { createConversation } from '@/lib/db/operations/conversations'
import { createMessage } from '@/lib/db/operations/messages'
import { createDeck, getDeck, listDecks, deleteDeck, updateDeck } from '@/lib/db/operations/decks'
import { addCardsToDeck, getCardCount } from '@/lib/db/operations/deck-cards'
import { hashPassword } from '@/lib/auth/helpers'

/**
 * Integration Tests for Deck Management
 *
 * Tests end-to-end deck creation with limit enforcement.
 * Validates 100-deck limit and 1000-card-per-deck limit.
 *
 * Maps to T074 in Phase 7 (Tests)
 * Tests FR-003, FR-010, FR-033, FR-032
 */

describe('Deck Management Integration', () => {
  let testUserId: string
  let testConversationId: string
  let testMessageId: string
  let testFlashcardIds: string[] = []

  beforeAll(async () => {
    // Create test user
    const passwordHash = await hashPassword('TestPass123!')
    const user = await createUser({
      email: `test-deck-mgmt-${Date.now()}@example.com`,
      passwordHash,
      name: 'Deck Management Test User',
    })
    testUserId = user.id

    // Create test conversation
    const conversation = await createConversation({
      userId: testUserId,
      title: 'Deck Management Test Conversation',
    })
    testConversationId = conversation.id

    // Create test message
    const message = await createMessage({
      conversationId: testConversationId,
      userId: testUserId,
      role: 'assistant',
      content: 'Educational content for deck management tests.',
    })
    testMessageId = message.id

    // Create 10 test flashcards for card limit tests
    for (let i = 0; i < 10; i++) {
      const flashcard = await createFlashcard({
        userId: testUserId,
        conversationId: testConversationId,
        messageId: testMessageId,
        question: `Test question ${i + 1}`,
        answer: `Test answer ${i + 1}`,
      })
      testFlashcardIds.push(flashcard.id)
    }
  })

  afterAll(async () => {
    await closeDbConnection()
  })

  describe('Deck Creation (FR-003, FR-033)', () => {
    it('should create a deck successfully', async () => {
      const deck = await createDeck({
        userId: testUserId,
        name: 'Test Deck 1',
      })

      expect(deck).toBeDefined()
      expect(deck.id).toBeDefined()
      expect(deck.userId).toBe(testUserId)
      expect(deck.name).toBe('Test Deck 1')
      expect(deck.cardCount).toBe(0)
      expect(deck.archived).toBe(false)
    })

    it('should create deck with FSRS overrides', async () => {
      const deck = await createDeck({
        userId: testUserId,
        name: 'Test Deck with Overrides',
        newCardsPerDayOverride: 25,
        cardsPerSessionOverride: 75,
      })

      expect(deck.newCardsPerDayOverride).toBe(25)
      expect(deck.cardsPerSessionOverride).toBe(75)
    })

    it('should reject empty deck name', async () => {
      await expect(
        createDeck({
          userId: testUserId,
          name: '   ',
        })
      ).rejects.toThrow('Deck name must be 1-200 characters')
    })

    it('should reject deck name over 200 characters', async () => {
      const longName = 'A'.repeat(201)
      await expect(
        createDeck({
          userId: testUserId,
          name: longName,
        })
      ).rejects.toThrow('Deck name must be 1-200 characters')
    })

    it('should reject negative FSRS overrides', async () => {
      await expect(
        createDeck({
          userId: testUserId,
          name: 'Test Deck',
          newCardsPerDayOverride: -5,
        })
      ).rejects.toThrow('new_cards_per_day_override must be non-negative')
    })
  })

  describe('100-Deck Limit Enforcement (FR-033)', () => {
    it('should enforce 100-deck limit per user', async () => {
      // Create a fresh test user to avoid interference from other tests
      const passwordHash = await hashPassword('TestPass123!')
      const limitTestUser = await createUser({
        email: `test-deck-limit-${Date.now()}@example.com`,
        passwordHash,
        name: 'Deck Limit Test User',
      })

      // Create 100 decks
      for (let i = 0; i < 100; i++) {
        await createDeck({
          userId: limitTestUser.id,
          name: `Deck ${i + 1}`,
        })
      }

      // Verify we have exactly 100 decks
      const decks = await listDecks(limitTestUser.id)
      expect(decks.length).toBe(100)

      // Attempt to create 101st deck should fail
      await expect(
        createDeck({
          userId: limitTestUser.id,
          name: 'Deck 101',
        })
      ).rejects.toThrow('Maximum deck limit reached (100 decks)')
    }, 60000)

    it('should allow creating deck after deleting one', async () => {
      // Create a fresh test user
      const passwordHash = await hashPassword('TestPass123!')
      const deleteTestUser = await createUser({
        email: `test-deck-delete-${Date.now()}@example.com`,
        passwordHash,
        name: 'Deck Delete Test User',
      })

      // Create 100 decks
      const deckIds: string[] = []
      for (let i = 0; i < 100; i++) {
        const deck = await createDeck({
          userId: deleteTestUser.id,
          name: `Deck ${i + 1}`,
        })
        deckIds.push(deck.id)
      }

      // Delete one deck
      await deleteDeck(deckIds[0])

      // Should now be able to create another deck
      const newDeck = await createDeck({
        userId: deleteTestUser.id,
        name: 'Replacement Deck',
      })
      expect(newDeck).toBeDefined()
      expect(newDeck.name).toBe('Replacement Deck')

      // Verify count is back to 100
      const decks = await listDecks(deleteTestUser.id)
      expect(decks.length).toBe(100)
    }, 60000)

    it('should not count archived decks toward 100-deck limit', async () => {
      // Create a fresh test user
      const passwordHash = await hashPassword('TestPass123!')
      const archiveTestUser = await createUser({
        email: `test-deck-archive-${Date.now()}@example.com`,
        passwordHash,
        name: 'Deck Archive Test User',
      })

      // Create 100 decks
      const deckIds: string[] = []
      for (let i = 0; i < 100; i++) {
        const deck = await createDeck({
          userId: archiveTestUser.id,
          name: `Deck ${i + 1}`,
        })
        deckIds.push(deck.id)
      }

      // Archive one deck
      await updateDeck(deckIds[0], { archived: true })

      // Should now be able to create another deck (archived doesn't count)
      const newDeck = await createDeck({
        userId: archiveTestUser.id,
        name: 'New Active Deck',
      })
      expect(newDeck).toBeDefined()

      // Verify we have 100 active decks + 1 archived
      const activeDecks = await listDecks(archiveTestUser.id, { archived: false })
      const archivedDecks = await listDecks(archiveTestUser.id, { archived: true })
      expect(activeDecks.length).toBe(100)
      expect(archivedDecks.length).toBe(1)
    }, 60000)
  })

  describe('1000-Card Limit per Deck (FR-032)', () => {
    it('should add cards to deck successfully', async () => {
      const deck = await createDeck({
        userId: testUserId,
        name: 'Card Test Deck',
      })

      const result = await addCardsToDeck(deck.id, [testFlashcardIds[0], testFlashcardIds[1]])

      expect(result.added).toBe(2)
      expect(result.skipped).toBe(0)

      const cardCount = await getCardCount(deck.id)
      expect(cardCount).toBe(2)
    })

    it('should handle idempotent card additions', async () => {
      const deck = await createDeck({
        userId: testUserId,
        name: 'Idempotent Test Deck',
      })

      // Add cards first time
      const result1 = await addCardsToDeck(deck.id, [testFlashcardIds[0], testFlashcardIds[1]])
      expect(result1.added).toBe(2)

      // Add same cards again
      const result2 = await addCardsToDeck(deck.id, [testFlashcardIds[0], testFlashcardIds[1]])
      expect(result2.added).toBe(0)
      expect(result2.skipped).toBe(2)

      // Card count should still be 2
      const cardCount = await getCardCount(deck.id)
      expect(cardCount).toBe(2)
    })

    it('should enforce 1000-card limit per deck', async () => {
      // Create a fresh test user and many flashcards
      const passwordHash = await hashPassword('TestPass123!')
      const cardLimitUser = await createUser({
        email: `test-card-limit-${Date.now()}@example.com`,
        passwordHash,
        name: 'Card Limit Test User',
      })

      const conversation = await createConversation({
        userId: cardLimitUser.id,
        title: 'Card Limit Test Conversation',
      })

      const message = await createMessage({
        conversationId: conversation.id,
        userId: cardLimitUser.id,
        role: 'assistant',
        content: 'Content for card limit tests.',
      })

      // Create 1005 flashcards
      const flashcardIds: string[] = []
      for (let i = 0; i < 1005; i++) {
        const flashcard = await createFlashcard({
          userId: cardLimitUser.id,
          conversationId: conversation.id,
          messageId: message.id,
          question: `Question ${i + 1}`,
          answer: `Answer ${i + 1}`,
        })
        flashcardIds.push(flashcard.id)
      }

      const deck = await createDeck({
        userId: cardLimitUser.id,
        name: 'Card Limit Test Deck',
      })

      // Add 1000 cards successfully
      const result1 = await addCardsToDeck(deck.id, flashcardIds.slice(0, 1000))
      expect(result1.added).toBe(1000)

      const cardCount = await getCardCount(deck.id)
      expect(cardCount).toBe(1000)

      // Attempt to add more cards should fail
      await expect(addCardsToDeck(deck.id, flashcardIds.slice(1000, 1005))).rejects.toThrow(
        'Deck limit reached (1000 cards maximum)'
      )

      // Card count should still be 1000
      const finalCount = await getCardCount(deck.id)
      expect(finalCount).toBe(1000)
    }, 120000)
  })

  describe('Deck Deletion and Count Updates', () => {
    it('should delete deck successfully', async () => {
      const deck = await createDeck({
        userId: testUserId,
        name: 'Deck to Delete',
      })

      // Add some cards
      await addCardsToDeck(deck.id, [testFlashcardIds[0], testFlashcardIds[1]])

      // Delete the deck
      await deleteDeck(deck.id)

      // Deck should no longer exist
      const retrieved = await getDeck(deck.id)
      expect(retrieved).toBeNull()

      // Flashcards should still exist (not cascade deleted)
      // This is implicitly tested by other tests that reuse testFlashcardIds
    })

    it('should update deck count after deletion', async () => {
      const initialDecks = await listDecks(testUserId)
      const initialCount = initialDecks.length

      const deck = await createDeck({
        userId: testUserId,
        name: 'Temporary Deck',
      })

      const afterCreate = await listDecks(testUserId)
      expect(afterCreate.length).toBe(initialCount + 1)

      await deleteDeck(deck.id)

      const afterDelete = await listDecks(testUserId)
      expect(afterDelete.length).toBe(initialCount)
    })

    it('should fail to delete non-existent deck', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000'
      await expect(deleteDeck(fakeId)).rejects.toThrow('Deck not found')
    })
  })

  describe('Deck Metadata and Listing', () => {
    it('should list decks with card counts', async () => {
      const deck1 = await createDeck({
        userId: testUserId,
        name: 'Deck with 2 cards',
      })
      await addCardsToDeck(deck1.id, [testFlashcardIds[0], testFlashcardIds[1]])

      const deck2 = await createDeck({
        userId: testUserId,
        name: 'Deck with 3 cards',
      })
      await addCardsToDeck(deck2.id, [
        testFlashcardIds[2],
        testFlashcardIds[3],
        testFlashcardIds[4],
      ])

      const decks = await listDecks(testUserId)

      const foundDeck1 = decks.find((d) => d.id === deck1.id)
      const foundDeck2 = decks.find((d) => d.id === deck2.id)

      expect(foundDeck1).toBeDefined()
      expect(foundDeck1!.cardCount).toBe(2)

      expect(foundDeck2).toBeDefined()
      expect(foundDeck2!.cardCount).toBe(3)
    })

    it('should filter decks by archived status', async () => {
      const activeDeck = await createDeck({
        userId: testUserId,
        name: 'Active Deck',
      })

      const archivedDeck = await createDeck({
        userId: testUserId,
        name: 'Archived Deck',
      })
      await updateDeck(archivedDeck.id, { archived: true })

      const activeDecks = await listDecks(testUserId, { archived: false })
      const archivedDecks = await listDecks(testUserId, { archived: true })

      expect(activeDecks.some((d) => d.id === activeDeck.id)).toBe(true)
      expect(activeDecks.some((d) => d.id === archivedDeck.id)).toBe(false)

      expect(archivedDecks.some((d) => d.id === archivedDeck.id)).toBe(true)
      expect(archivedDecks.some((d) => d.id === activeDeck.id)).toBe(false)
    })

    it('should sort decks by name', async () => {
      await createDeck({ userId: testUserId, name: 'Zebra Deck' })
      await createDeck({ userId: testUserId, name: 'Alpha Deck' })
      await createDeck({ userId: testUserId, name: 'Beta Deck' })

      const decks = await listDecks(testUserId, { sortBy: 'name' })

      // Should be alphabetically sorted
      const names = decks.map((d) => d.name)
      const sortedNames = [...names].sort()
      expect(names).toEqual(sortedNames)
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty flashcard array', async () => {
      const deck = await createDeck({
        userId: testUserId,
        name: 'Empty Add Test',
      })

      const result = await addCardsToDeck(deck.id, [])
      expect(result.added).toBe(0)
      expect(result.skipped).toBe(0)
    })

    it('should handle user with no decks', async () => {
      const passwordHash = await hashPassword('TestPass123!')
      const emptyUser = await createUser({
        email: `test-empty-${Date.now()}@example.com`,
        passwordHash,
        name: 'Empty User',
      })

      const decks = await listDecks(emptyUser.id)
      expect(decks.length).toBe(0)
    })

    it('should trim deck names', async () => {
      const deck = await createDeck({
        userId: testUserId,
        name: '  Trimmed Deck  ',
      })

      expect(deck.name).toBe('Trimmed Deck')
    })
  })
})
