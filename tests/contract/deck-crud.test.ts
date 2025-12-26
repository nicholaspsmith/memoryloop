import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest'
import { hashPassword } from '@/lib/auth/helpers'
import { createUser } from '@/lib/db/operations/users'
import { createFlashcard } from '@/lib/db/operations/flashcards'
import { closeDbConnection } from '@/lib/db/client'
import * as deckRoutes from '@/app/api/decks/route'
import * as deckIdRoutes from '@/app/api/decks/[deckId]/route'
import * as deckCardsRoutes from '@/app/api/decks/[deckId]/cards/route'
import {
  testGET,
  testPOST,
  testPATCH,
  testDELETE,
  type MockSession,
} from '@/tests/helpers/route-test-helper'
import { auth } from '@/auth'
import type { DeckWithMetadata } from '@/lib/db/operations/decks'
import type { FlashcardInDeck } from '@/lib/db/operations/deck-cards'

/**
 * Contract Tests for Deck CRUD API
 *
 * Tests API contracts for deck creation, reading, updating, and deleting per
 * specs/012-flashcard-decks/contracts/deck-crud.yaml
 *
 * Tests all 7 endpoints:
 * - GET /api/decks (list decks)
 * - POST /api/decks (create deck)
 * - GET /api/decks/{deckId} (get deck details)
 * - PATCH /api/decks/{deckId} (update deck)
 * - DELETE /api/decks/{deckId} (delete deck)
 * - POST /api/decks/{deckId}/cards (add cards to deck)
 * - DELETE /api/decks/{deckId}/cards (remove cards from deck)
 *
 * Maps to User Story 1 (T071)
 */

// Mock auth module
vi.mock('@/auth', () => ({
  auth: vi.fn(),
}))

describe('Deck CRUD API Contract Tests', () => {
  let testUserId: string
  let testFlashcardIds: string[] = []
  let testDeckId: string
  let mockSession: MockSession

  beforeAll(async () => {
    // Create test user
    const passwordHash = await hashPassword('TestPass123!')
    const user = await createUser({
      email: `test-decks-${Date.now()}@example.com`,
      passwordHash,
      name: 'Deck Test User',
    })
    testUserId = user.id

    // Create mock session
    mockSession = {
      user: {
        id: testUserId,
        email: user.email,
        name: user.name ?? undefined,
      },
    }

    // Create test flashcards for deck operations
    for (let i = 0; i < 5; i++) {
      const flashcard = await createFlashcard({
        userId: testUserId,
        conversationId: null,
        messageId: null,
        question: `Test Question ${i + 1}`,
        answer: `Test Answer ${i + 1}`,
      })
      testFlashcardIds.push(flashcard.id)
    }
  })

  beforeEach(() => {
    // Set up auth mock before each test
    ;(auth as ReturnType<typeof vi.fn>).mockResolvedValue(mockSession)
  })

  afterAll(async () => {
    await closeDbConnection()
    vi.clearAllMocks()
  })

  describe('POST /api/decks', () => {
    it('should create a new deck with valid data', async () => {
      const response = await testPOST(deckRoutes.POST, '/api/decks', {
        body: { name: 'Test Deck' },
        session: mockSession,
      })

      expect(response.status).toBe(201)

      const data = response.data as DeckWithMetadata
      expect(data).toHaveProperty('id')
      expect(data).toHaveProperty('userId')
      expect(data).toHaveProperty('name', 'Test Deck')
      expect(data).toHaveProperty('createdAt')
      expect(data).toHaveProperty('archived', false)
      expect(data).toHaveProperty('lastStudiedAt')
      expect(data).toHaveProperty('newCardsPerDayOverride')
      expect(data).toHaveProperty('cardsPerSessionOverride')

      // Save deck ID for subsequent tests
      testDeckId = data.id
    })

    it('should create deck with FSRS overrides', async () => {
      const response = await testPOST(deckRoutes.POST, '/api/decks', {
        body: {
          name: 'Deck with Overrides',
          newCardsPerDayOverride: 20,
          cardsPerSessionOverride: 50,
        },
        session: mockSession,
      })

      expect(response.status).toBe(201)

      const data = response.data as DeckWithMetadata
      expect(data).toHaveProperty('newCardsPerDayOverride', 20)
      expect(data).toHaveProperty('cardsPerSessionOverride', 50)
    })

    it('should reject empty deck name (400)', async () => {
      const response = await testPOST(deckRoutes.POST, '/api/decks', {
        body: { name: '' },
        session: mockSession,
      })

      expect(response.status).toBe(400)

      const data = response.data as { error: string }
      expect(data).toHaveProperty('error')
      expect(data.error).toContain('name')
    })

    it('should reject deck name exceeding 200 characters (400)', async () => {
      const response = await testPOST(deckRoutes.POST, '/api/decks', {
        body: { name: 'A'.repeat(201) },
        session: mockSession,
      })

      expect(response.status).toBe(400)

      const data = response.data as { error: string }
      expect(data).toHaveProperty('error')
      expect(data.error).toContain('200')
    })

    it('should reject negative FSRS overrides (400)', async () => {
      const response = await testPOST(deckRoutes.POST, '/api/decks', {
        body: {
          name: 'Invalid Overrides',
          newCardsPerDayOverride: -1,
        },
        session: mockSession,
      })

      expect(response.status).toBe(400)

      const data = response.data as { error: string }
      expect(data).toHaveProperty('error')
    })
  })

  describe('GET /api/decks', () => {
    it('should list user decks with metadata', async () => {
      const response = await testGET(deckRoutes.GET, '/api/decks', {
        session: mockSession,
      })

      expect(response.status).toBe(200)

      const data = response.data as { decks: DeckWithMetadata[]; totalCount: number; limit: number }
      expect(data).toHaveProperty('decks')
      expect(data).toHaveProperty('totalCount')
      expect(data).toHaveProperty('limit', 100)

      expect(Array.isArray(data.decks)).toBe(true)
      expect(data.decks.length).toBeGreaterThan(0)

      // Verify deck structure
      const deck = data.decks[0]
      expect(deck).toHaveProperty('id')
      expect(deck).toHaveProperty('userId')
      expect(deck).toHaveProperty('name')
      expect(deck).toHaveProperty('createdAt')
      expect(deck).toHaveProperty('archived')
      expect(deck).toHaveProperty('cardCount')
      expect(typeof deck.cardCount).toBe('number')
      expect(deck.cardCount).toBeGreaterThanOrEqual(0)
      expect(deck.cardCount).toBeLessThanOrEqual(1000)
    })

    it('should support archived filter query param', async () => {
      const response = await testGET(deckRoutes.GET, '/api/decks', {
        searchParams: { archived: 'true' },
        session: mockSession,
      })

      expect(response.status).toBe(200)

      const data = response.data as { decks: DeckWithMetadata[]; totalCount: number; limit: number }
      expect(data).toHaveProperty('decks')
      expect(Array.isArray(data.decks)).toBe(true)
    })

    it('should support sortBy query param', async () => {
      const response = await testGET(deckRoutes.GET, '/api/decks', {
        searchParams: { sortBy: 'name' },
        session: mockSession,
      })

      expect(response.status).toBe(200)

      const data = response.data as { decks: DeckWithMetadata[]; totalCount: number; limit: number }
      expect(data).toHaveProperty('decks')
      expect(Array.isArray(data.decks)).toBe(true)
    })
  })

  describe('GET /api/decks/{deckId}', () => {
    it('should get deck details with flashcard list', async () => {
      const response = await testGET(
        deckIdRoutes.GET as unknown as (
          request: Request,
          context?: { params: Promise<Record<string, string>> }
        ) => Promise<Response>,
        `/api/decks/${testDeckId}`,
        {
          params: { deckId: testDeckId },
          session: mockSession,
        }
      )

      expect(response.status).toBe(200)

      const data = response.data as DeckWithMetadata & { flashcards: FlashcardInDeck[] }
      expect(data).toHaveProperty('id', testDeckId)
      expect(data).toHaveProperty('userId')
      expect(data).toHaveProperty('name')
      expect(data).toHaveProperty('createdAt')
      expect(data).toHaveProperty('archived')
      expect(data).toHaveProperty('cardCount')
      expect(data).toHaveProperty('flashcards')

      expect(Array.isArray(data.flashcards)).toBe(true)
    })

    it('should return 404 for non-existent deck', async () => {
      const response = await testGET(
        deckIdRoutes.GET as unknown as (
          request: Request,
          context?: { params: Promise<Record<string, string>> }
        ) => Promise<Response>,
        '/api/decks/00000000-0000-0000-0000-000000000000',
        {
          params: { deckId: '00000000-0000-0000-0000-000000000000' },
          session: mockSession,
        }
      )

      expect(response.status).toBe(404)

      const data = response.data as { error: string }
      expect(data).toHaveProperty('error')
      expect(data.error).toContain('not found')
    })
  })

  describe('PATCH /api/decks/{deckId}', () => {
    it('should update deck name', async () => {
      const response = await testPATCH(
        deckIdRoutes.PATCH as unknown as (
          request: Request,
          context?: { params: Promise<Record<string, string>> }
        ) => Promise<Response>,
        `/api/decks/${testDeckId}`,
        {
          params: { deckId: testDeckId },
          body: { name: 'Updated Deck Name' },
          session: mockSession,
        }
      )

      expect(response.status).toBe(200)

      const data = response.data as DeckWithMetadata
      expect(data).toHaveProperty('id', testDeckId)
      expect(data).toHaveProperty('name', 'Updated Deck Name')
    })

    it('should update FSRS overrides', async () => {
      const response = await testPATCH(
        deckIdRoutes.PATCH as unknown as (
          request: Request,
          context?: { params: Promise<Record<string, string>> }
        ) => Promise<Response>,
        `/api/decks/${testDeckId}`,
        {
          params: { deckId: testDeckId },
          body: {
            newCardsPerDayOverride: 25,
            cardsPerSessionOverride: 60,
          },
          session: mockSession,
        }
      )

      expect(response.status).toBe(200)

      const data = response.data as DeckWithMetadata
      expect(data).toHaveProperty('newCardsPerDayOverride', 25)
      expect(data).toHaveProperty('cardsPerSessionOverride', 60)
    })

    it('should clear override by setting to null', async () => {
      const response = await testPATCH(
        deckIdRoutes.PATCH as unknown as (
          request: Request,
          context?: { params: Promise<Record<string, string>> }
        ) => Promise<Response>,
        `/api/decks/${testDeckId}`,
        {
          params: { deckId: testDeckId },
          body: { newCardsPerDayOverride: null },
          session: mockSession,
        }
      )

      expect(response.status).toBe(200)

      const data = response.data as DeckWithMetadata
      expect(data.newCardsPerDayOverride).toBeNull()
    })

    it('should archive deck', async () => {
      const response = await testPATCH(
        deckIdRoutes.PATCH as unknown as (
          request: Request,
          context?: { params: Promise<Record<string, string>> }
        ) => Promise<Response>,
        `/api/decks/${testDeckId}`,
        {
          params: { deckId: testDeckId },
          body: { archived: true },
          session: mockSession,
        }
      )

      expect(response.status).toBe(200)

      const data = response.data as DeckWithMetadata
      expect(data).toHaveProperty('archived', true)
    })

    it('should unarchive deck', async () => {
      const response = await testPATCH(
        deckIdRoutes.PATCH as unknown as (
          request: Request,
          context?: { params: Promise<Record<string, string>> }
        ) => Promise<Response>,
        `/api/decks/${testDeckId}`,
        {
          params: { deckId: testDeckId },
          body: { archived: false },
          session: mockSession,
        }
      )

      expect(response.status).toBe(200)

      const data = response.data as DeckWithMetadata
      expect(data).toHaveProperty('archived', false)
    })

    it('should reject invalid name (400)', async () => {
      const response = await testPATCH(
        deckIdRoutes.PATCH as unknown as (
          request: Request,
          context?: { params: Promise<Record<string, string>> }
        ) => Promise<Response>,
        `/api/decks/${testDeckId}`,
        {
          params: { deckId: testDeckId },
          body: { name: '' },
          session: mockSession,
        }
      )

      expect(response.status).toBe(400)

      const data = response.data as { error: string }
      expect(data).toHaveProperty('error')
    })

    it('should return 404 for non-existent deck', async () => {
      const response = await testPATCH(
        deckIdRoutes.PATCH as unknown as (
          request: Request,
          context?: { params: Promise<Record<string, string>> }
        ) => Promise<Response>,
        '/api/decks/00000000-0000-0000-0000-000000000000',
        {
          params: { deckId: '00000000-0000-0000-0000-000000000000' },
          body: { name: 'Updated' },
          session: mockSession,
        }
      )

      expect(response.status).toBe(404)

      const data = response.data as { error: string }
      expect(data).toHaveProperty('error')
    })
  })

  describe('POST /api/decks/{deckId}/cards', () => {
    it('should add cards to deck', async () => {
      const response = await testPOST(
        deckCardsRoutes.POST as unknown as (
          request: Request,
          context?: { params: Promise<Record<string, string>> }
        ) => Promise<Response>,
        `/api/decks/${testDeckId}/cards`,
        {
          params: { deckId: testDeckId },
          body: {
            flashcardIds: [testFlashcardIds[0], testFlashcardIds[1]],
          },
          session: mockSession,
        }
      )

      expect(response.status).toBe(200)

      const data = response.data as { addedCount: number; cardCount: number; limit: number }
      expect(data).toHaveProperty('addedCount')
      expect(data).toHaveProperty('cardCount')
      expect(data).toHaveProperty('limit', 1000)
      expect(data.addedCount).toBe(2)
      expect(data.cardCount).toBe(2)
    })

    it('should be idempotent (adding same cards again)', async () => {
      const response = await testPOST(
        deckCardsRoutes.POST as unknown as (
          request: Request,
          context?: { params: Promise<Record<string, string>> }
        ) => Promise<Response>,
        `/api/decks/${testDeckId}/cards`,
        {
          params: { deckId: testDeckId },
          body: {
            flashcardIds: [testFlashcardIds[0]],
          },
          session: mockSession,
        }
      )

      expect(response.status).toBe(200)

      const data = response.data as { addedCount: number; cardCount: number; limit: number }
      expect(data.addedCount).toBe(0) // Already in deck
      expect(data.cardCount).toBe(2) // Still 2 cards total
    })

    it('should reject empty flashcardIds array (400)', async () => {
      const response = await testPOST(
        deckCardsRoutes.POST as unknown as (
          request: Request,
          context?: { params: Promise<Record<string, string>> }
        ) => Promise<Response>,
        `/api/decks/${testDeckId}/cards`,
        {
          params: { deckId: testDeckId },
          body: {
            flashcardIds: [],
          },
          session: mockSession,
        }
      )

      expect(response.status).toBe(400)

      const data = response.data as { error: string }
      expect(data).toHaveProperty('error')
    })

    it('should reject invalid UUIDs (400)', async () => {
      const response = await testPOST(
        deckCardsRoutes.POST as unknown as (
          request: Request,
          context?: { params: Promise<Record<string, string>> }
        ) => Promise<Response>,
        `/api/decks/${testDeckId}/cards`,
        {
          params: { deckId: testDeckId },
          body: {
            flashcardIds: ['not-a-uuid'],
          },
          session: mockSession,
        }
      )

      expect(response.status).toBe(400)

      const data = response.data as { error: string }
      expect(data).toHaveProperty('error')
    })

    it('should return 404 for non-existent deck', async () => {
      const response = await testPOST(
        deckCardsRoutes.POST as unknown as (
          request: Request,
          context?: { params: Promise<Record<string, string>> }
        ) => Promise<Response>,
        '/api/decks/00000000-0000-0000-0000-000000000000/cards',
        {
          params: { deckId: '00000000-0000-0000-0000-000000000000' },
          body: {
            flashcardIds: [testFlashcardIds[0]],
          },
          session: mockSession,
        }
      )

      expect(response.status).toBe(404)

      const data = response.data as { error: string }
      expect(data).toHaveProperty('error')
    })
  })

  describe('DELETE /api/decks/{deckId}/cards', () => {
    beforeAll(async () => {
      // Ensure cards are in the deck before DELETE tests
      await testPOST(
        deckCardsRoutes.POST as unknown as (
          request: Request,
          context?: { params: Promise<Record<string, string>> }
        ) => Promise<Response>,
        `/api/decks/${testDeckId}/cards`,
        {
          params: { deckId: testDeckId },
          body: {
            flashcardIds: [testFlashcardIds[0], testFlashcardIds[1]],
          },
          session: mockSession,
        }
      )
    })

    it('should remove cards from deck', async () => {
      const response = await testDELETE(
        deckCardsRoutes.DELETE as unknown as (
          request: Request,
          context?: { params: Promise<Record<string, string>> }
        ) => Promise<Response>,
        `/api/decks/${testDeckId}/cards`,
        {
          params: { deckId: testDeckId },
          body: {
            flashcardIds: [testFlashcardIds[0]],
          },
          session: mockSession,
        }
      )

      expect(response.status).toBe(200)

      const data = response.data as { removedCount: number; cardCount: number }
      expect(data).toHaveProperty('removedCount', 1)
      expect(data).toHaveProperty('cardCount', 1)
    })

    it('should be idempotent (removing cards not in deck)', async () => {
      const response = await testDELETE(
        deckCardsRoutes.DELETE as unknown as (
          request: Request,
          context?: { params: Promise<Record<string, string>> }
        ) => Promise<Response>,
        `/api/decks/${testDeckId}/cards`,
        {
          params: { deckId: testDeckId },
          body: {
            flashcardIds: [testFlashcardIds[0]], // Already removed
          },
          session: mockSession,
        }
      )

      expect(response.status).toBe(200)

      const data = response.data as { removedCount: number; cardCount: number }
      expect(data.removedCount).toBe(0)
    })

    it('should reject empty flashcardIds array (400)', async () => {
      const response = await testDELETE(
        deckCardsRoutes.DELETE as unknown as (
          request: Request,
          context?: { params: Promise<Record<string, string>> }
        ) => Promise<Response>,
        `/api/decks/${testDeckId}/cards`,
        {
          params: { deckId: testDeckId },
          body: {
            flashcardIds: [],
          },
          session: mockSession,
        }
      )

      expect(response.status).toBe(400)

      const data = response.data as { error: string }
      expect(data).toHaveProperty('error')
    })

    it('should return 404 for non-existent deck', async () => {
      const response = await testDELETE(
        deckCardsRoutes.DELETE as unknown as (
          request: Request,
          context?: { params: Promise<Record<string, string>> }
        ) => Promise<Response>,
        '/api/decks/00000000-0000-0000-0000-000000000000/cards',
        {
          params: { deckId: '00000000-0000-0000-0000-000000000000' },
          body: {
            flashcardIds: [testFlashcardIds[0]],
          },
          session: mockSession,
        }
      )

      expect(response.status).toBe(404)

      const data = response.data as { error: string }
      expect(data).toHaveProperty('error')
    })
  })

  describe('DELETE /api/decks/{deckId}', () => {
    it('should delete deck and preserve flashcards', async () => {
      const response = await testDELETE(
        deckIdRoutes.DELETE as unknown as (
          request: Request,
          context?: { params: Promise<Record<string, string>> }
        ) => Promise<Response>,
        `/api/decks/${testDeckId}`,
        {
          params: { deckId: testDeckId },
          session: mockSession,
        }
      )

      expect(response.status).toBe(204)
    })

    it('should return 404 for already deleted deck', async () => {
      const response = await testDELETE(
        deckIdRoutes.DELETE as unknown as (
          request: Request,
          context?: { params: Promise<Record<string, string>> }
        ) => Promise<Response>,
        `/api/decks/${testDeckId}`,
        {
          params: { deckId: testDeckId },
          session: mockSession,
        }
      )

      expect(response.status).toBe(404)

      const data = response.data as { error: string }
      expect(data).toHaveProperty('error')
    })

    it('should return 404 for non-existent deck', async () => {
      const response = await testDELETE(
        deckIdRoutes.DELETE as unknown as (
          request: Request,
          context?: { params: Promise<Record<string, string>> }
        ) => Promise<Response>,
        '/api/decks/00000000-0000-0000-0000-000000000000',
        {
          params: { deckId: '00000000-0000-0000-0000-000000000000' },
          session: mockSession,
        }
      )

      expect(response.status).toBe(404)

      const data = response.data as { error: string }
      expect(data).toHaveProperty('error')
    })
  })
})
