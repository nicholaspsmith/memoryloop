import { test, expect, Page } from '@playwright/test'

/**
 * AI Deck Generation E2E Tests (User Story 3)
 *
 * End-to-end workflow:
 * 1. Request AI deck generation
 * 2. Review suggestions from AI
 * 3. Accept/reject individual cards
 * 4. Create deck from accepted suggestions
 * 5. Verify deck was created correctly
 *
 * Maps to T080 in Phase 7 (E2E Tests)
 * Tests User Story 3 (FR-020 through FR-026)
 *
 * Note: Uses API mocking to avoid dependency on LanceDB/vector search in CI
 */

// Mock response for successful AI deck generation
const mockSuccessResponse = {
  suggestions: [
    {
      flashcardId: 'mock-card-1',
      front: 'What is async/await in JavaScript?',
      back: 'Async/await is syntactic sugar for promises that makes asynchronous code look synchronous.',
      tags: ['javascript', 'async'],
      relevanceScore: 0.95,
      relevanceReason: 'Directly related to async programming patterns',
      vectorSimilarity: 0.89,
    },
    {
      flashcardId: 'mock-card-2',
      front: 'How do you handle errors with async/await?',
      back: 'Use try/catch blocks to handle errors in async functions.',
      tags: ['javascript', 'error-handling'],
      relevanceScore: 0.88,
      relevanceReason: 'Related to async error handling patterns',
      vectorSimilarity: 0.82,
    },
    {
      flashcardId: 'mock-card-3',
      front: 'What is the difference between Promise.all and Promise.allSettled?',
      back: 'Promise.all fails fast on first rejection, while Promise.allSettled waits for all to complete.',
      tags: ['javascript', 'promises'],
      relevanceScore: 0.85,
      relevanceReason: 'Related to promise patterns used with async/await',
      vectorSimilarity: 0.78,
    },
  ],
  metadata: {
    candidateCount: 3,
    llmFiltered: true,
    processingTimeMs: 150,
    vectorSearchTimeMs: 50,
    llmFilteringTimeMs: 100,
    warnings: [],
  },
}

// Mock response for no results found
const mockNoResultsResponse = {
  suggestions: [],
  metadata: {
    candidateCount: 0,
    llmFiltered: false,
    processingTimeMs: 50,
    vectorSearchTimeMs: 50,
    llmFilteringTimeMs: null,
    warnings: ['No flashcards found matching your topic. Create some flashcards first!'],
  },
}

// Helper to set up API mocking for AI deck generation
async function mockAIEndpoint(page: Page, response: object) {
  await page.route('**/api/decks-ai', async (route) => {
    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 100))
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(response),
    })
  })
}

test.describe('AI Deck Generation Request', () => {
  test.beforeEach(async ({ page }) => {
    // Set up API mocking before navigating
    await mockAIEndpoint(page, mockSuccessResponse)
    await page.goto('/decks')
    await page.waitForSelector('h1:has-text("My Decks")')
  })

  test('can access AI deck generation interface', async ({ page }) => {
    // Look for "Generate with AI" or similar button
    const aiButton = page.locator('[data-testid="ai-generate-button"]')

    if ((await aiButton.count()) === 0) {
      test.skip()
    }

    await aiButton.click()

    // Should show AI generation interface
    await expect(page.locator('[data-testid="ai-generation-dialog"]')).toBeVisible({
      timeout: 5000,
    })
  })

  test('can submit topic for AI generation', async ({ page }) => {
    const aiButton = page.locator('[data-testid="ai-generate-button"]')

    if ((await aiButton.count()) === 0) {
      test.skip()
    }

    await aiButton.click()
    await page.waitForSelector('[data-testid="ai-topic-input"]', { timeout: 5000 })

    // Enter a topic
    const topicInput = page.locator('[data-testid="ai-topic-input"]')
    await topicInput.fill('JavaScript async/await patterns')

    // Submit
    await page.click('[data-testid="generate-suggestions-button"]')

    // Should show loading state
    await expect(page.locator('text=/Searching|Analyzing/i')).toBeVisible({
      timeout: 3000,
    })

    // Wait for results (mock response is fast)
    await expect(page.locator('text=/Suggested Cards|selected/i')).toBeVisible({
      timeout: 5000,
    })
  })

  test('validates topic input', async ({ page }) => {
    const aiButton = page.locator('[data-testid="ai-generate-button"]')

    if ((await aiButton.count()) === 0) {
      test.skip()
    }

    await aiButton.click()
    await page.waitForSelector('[data-testid="ai-topic-input"]')

    // The generate button should be disabled with empty/short input
    const generateButton = page.locator('[data-testid="generate-suggestions-button"]')
    await expect(generateButton).toBeDisabled()

    // Enter a short topic (less than 3 chars)
    const topicInput = page.locator('[data-testid="ai-topic-input"]')
    await topicInput.fill('ab')
    await expect(generateButton).toBeDisabled()

    // Enter a valid topic
    await topicInput.fill('abc')
    await expect(generateButton).toBeEnabled()
  })

  test('shows appropriate message when no cards found', async ({ page }) => {
    // Override mock to return empty results
    await page.unrouteAll()
    await mockAIEndpoint(page, mockNoResultsResponse)

    const aiButton = page.locator('[data-testid="ai-generate-button"]')

    if ((await aiButton.count()) === 0) {
      test.skip()
    }

    await aiButton.click()
    await page.waitForSelector('[data-testid="ai-topic-input"]')

    // Enter a topic
    const topicInput = page.locator('[data-testid="ai-topic-input"]')
    await topicInput.fill('xyzqwertynonexistenttopicabc123')

    await page.click('[data-testid="generate-suggestions-button"]')

    // Should show warning message about no results
    await expect(page.locator('text=/No flashcards found|Create some flashcards/i')).toBeVisible({
      timeout: 5000,
    })
  })
})

test.describe('Reviewing AI Suggestions', () => {
  test.beforeEach(async ({ page }) => {
    // Set up API mocking
    await mockAIEndpoint(page, mockSuccessResponse)
    await page.goto('/decks')
    await page.waitForSelector('h1:has-text("My Decks")')

    // Navigate to AI generation
    const aiButton = page.locator('[data-testid="ai-generate-button"]')

    if ((await aiButton.count()) > 0) {
      await aiButton.click()
      await page.waitForSelector('[data-testid="ai-topic-input"]')

      // Submit a common topic to get results
      const topicInput = page.locator('[data-testid="ai-topic-input"]')
      await topicInput.fill('programming basics')
      await page.click('[data-testid="generate-suggestions-button"]')

      // Wait for results
      await page.waitForSelector('text=/Suggested Cards/i', { timeout: 5000 })
    } else {
      test.skip()
    }
  })

  test('displays suggested cards with relevance info', async ({ page }) => {
    // Should show suggested cards with checkboxes
    const checkboxes = page.locator('input[type="checkbox"]')
    expect(await checkboxes.count()).toBeGreaterThan(0)

    // Should show relevance percentage (at least one)
    await expect(page.locator('text=/% relevant/i').first()).toBeVisible({ timeout: 3000 })
  })

  test('can select individual suggestions', async ({ page }) => {
    const checkboxes = page.locator('input[type="checkbox"]')
    expect(await checkboxes.count()).toBeGreaterThan(0)

    // Initially all should be checked (pre-selected)
    await expect(checkboxes.first()).toBeChecked()

    // Uncheck first
    await checkboxes.first().uncheck()
    await expect(checkboxes.first()).not.toBeChecked()

    // Check again
    await checkboxes.first().check()
    await expect(checkboxes.first()).toBeChecked()
  })

  test('can select all suggestions', async ({ page }) => {
    // First deselect all
    const deselectButton = page.getByRole('button', { name: 'Deselect All' })
    await deselectButton.click()

    // Then select all
    const selectAllButton = page.getByRole('button', { name: 'Select All', exact: true })
    await selectAllButton.click()

    // All checkboxes should be checked
    const checkboxes = page.locator('input[type="checkbox"]')
    const checkboxCount = await checkboxes.count()

    for (let i = 0; i < checkboxCount; i++) {
      await expect(checkboxes.nth(i)).toBeChecked()
    }
  })

  test('can deselect all suggestions', async ({ page }) => {
    // Click deselect all
    const deselectButton = page.getByRole('button', { name: 'Deselect All' })
    await deselectButton.click()

    // No checkboxes should be checked
    const checkedBoxes = page.locator('input[type="checkbox"]:checked')
    expect(await checkedBoxes.count()).toBe(0)
  })

  test('shows preview of flashcard content', async ({ page }) => {
    // Should show the flashcard front/back content (at least one matching element)
    await expect(page.locator('text=/async\\/await/i').first()).toBeVisible()
    await expect(page.locator('text=/syntactic sugar/i').first()).toBeVisible()
  })
})

test.describe('Creating Deck from Suggestions', () => {
  // Use a valid UUID format for the mock deck ID
  const mockDeckId = '00000000-0000-4000-8000-000000000001'

  test.beforeEach(async ({ page }) => {
    // Set up API mocking
    await mockAIEndpoint(page, mockSuccessResponse)

    // Mock deck creation endpoint
    await page.route('**/api/decks', async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ id: mockDeckId, name: 'web development' }),
        })
      } else {
        await route.continue()
      }
    })

    // Mock adding cards to deck endpoint
    await page.route(`**/api/decks/${mockDeckId}/cards`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, addedCount: 3 }),
      })
    })

    await page.goto('/decks')
    await page.waitForSelector('h1:has-text("My Decks")')

    const aiButton = page.locator('[data-testid="ai-generate-button"]')

    if ((await aiButton.count()) > 0) {
      await aiButton.click()
      await page.waitForSelector('[data-testid="ai-topic-input"]')

      const topicInput = page.locator('[data-testid="ai-topic-input"]')
      await topicInput.fill('web development')
      await page.click('[data-testid="generate-suggestions-button"]')

      await page.waitForSelector('input[type="checkbox"]', { timeout: 5000 })
    } else {
      test.skip()
    }
  })

  test('can create deck from selected suggestions', async ({ page }) => {
    // All cards are pre-selected, verify checkboxes exist
    const checkboxes = page.locator('input[type="checkbox"]')
    expect(await checkboxes.count()).toBe(3)

    // Click "Create Deck" button
    const createButton = page.locator('button:has-text("Create Deck")')
    await createButton.click()

    // Should navigate to the new deck page
    await page.waitForURL(`**/decks/${mockDeckId}`, { timeout: 5000 })
  })

  test('requires at least one card selected', async ({ page }) => {
    // Deselect all cards
    const deselectButton = page.getByRole('button', { name: 'Deselect All' })
    await deselectButton.click()

    // The create deck button should be disabled when no cards are selected
    const createButton = page.locator('button:has-text("Create Deck")')
    await expect(createButton).toBeDisabled()

    // Button text should indicate 0 cards
    await expect(createButton).toContainText('0 cards')
  })

  test('shows selected card count in create button', async ({ page }) => {
    // Verify button shows card count
    const createButton = page.locator('button:has-text("Create Deck")')
    await expect(createButton).toContainText('3 cards')

    // Deselect one card
    const checkboxes = page.locator('input[type="checkbox"]')
    await checkboxes.first().uncheck()

    // Button should update count
    await expect(createButton).toContainText('2 cards')
  })

  test('can reset and start over', async ({ page }) => {
    // Click "Start Over" button
    const startOverButton = page.locator('button:has-text("Start Over")')
    await startOverButton.click()

    // Should show the topic input again
    await expect(page.locator('[data-testid="ai-topic-input"]')).toBeVisible()

    // Suggestions should be gone
    await expect(page.locator('text=/Suggested Cards/i')).not.toBeVisible()
  })
})

test.describe('AI Generation Performance', () => {
  test('completes generation within reasonable time', async ({ page }) => {
    // Set up mock with slight delay to test timing
    await page.route('**/api/decks-ai', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 200))
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockSuccessResponse),
      })
    })

    await page.goto('/decks')
    await page.waitForSelector('h1:has-text("My Decks")')

    const aiButton = page.locator('[data-testid="ai-generate-button"]')
    await aiButton.click()
    await page.waitForSelector('[data-testid="ai-topic-input"]')

    const topicInput = page.locator('[data-testid="ai-topic-input"]')
    await topicInput.fill('TypeScript types')

    const startTime = Date.now()

    await page.click('[data-testid="generate-suggestions-button"]')

    // Wait for results
    await page.waitForSelector('text=/Suggested Cards/i', { timeout: 5000 })

    const endTime = Date.now()
    const duration = endTime - startTime

    // With mocking, should complete quickly (under 2 seconds)
    expect(duration).toBeLessThan(2000)
  })

  test('shows loading state during generation', async ({ page }) => {
    // Set up mock with delay to ensure loading state is visible
    await page.route('**/api/decks-ai', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 500))
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockSuccessResponse),
      })
    })

    await page.goto('/decks')
    await page.waitForSelector('h1:has-text("My Decks")')

    const aiButton = page.locator('[data-testid="ai-generate-button"]')
    await aiButton.click()
    await page.waitForSelector('[data-testid="ai-topic-input"]')

    const topicInput = page.locator('[data-testid="ai-topic-input"]')
    await topicInput.fill('React components')

    await page.click('[data-testid="generate-suggestions-button"]')

    // Should show loading indicator (Searching flashcards...)
    await expect(page.locator('text=/Searching flashcards/i')).toBeVisible({ timeout: 2000 })
  })

  test('disables submit button during generation', async ({ page }) => {
    // Set up mock with delay
    await page.route('**/api/decks-ai', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 500))
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockSuccessResponse),
      })
    })

    await page.goto('/decks')
    await page.waitForSelector('h1:has-text("My Decks")')

    const aiButton = page.locator('[data-testid="ai-generate-button"]')
    await aiButton.click()
    await page.waitForSelector('[data-testid="ai-topic-input"]')

    const topicInput = page.locator('[data-testid="ai-topic-input"]')
    await topicInput.fill('Node.js streams')

    const submitButton = page.locator('[data-testid="generate-suggestions-button"]')

    await submitButton.click()

    // Button should be disabled while generating
    await expect(submitButton).toBeDisabled({ timeout: 1000 })
  })
})

test.describe('Fallback and Error Handling', () => {
  test('handles AI service unavailable gracefully', async ({ page }) => {
    // Mock API to return service unavailable error
    await page.route('**/api/decks-ai', async (route) => {
      await route.fulfill({
        status: 503,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'Vector search service unavailable. Please try again later.',
          fallback: 'manual',
        }),
      })
    })

    await page.goto('/decks')
    await page.waitForSelector('h1:has-text("My Decks")')

    const aiButton = page.locator('[data-testid="ai-generate-button"]')
    await aiButton.click()
    await page.waitForSelector('[data-testid="ai-topic-input"]')

    const topicInput = page.locator('[data-testid="ai-topic-input"]')
    await topicInput.fill('Docker containers')

    await page.click('[data-testid="generate-suggestions-button"]')

    // Should show error message
    await expect(page.locator('text=/Vector search service unavailable/i')).toBeVisible({
      timeout: 5000,
    })

    // Should show fallback option to create deck manually
    await expect(page.locator('text=/Create deck manually/i')).toBeVisible()
  })

  test('shows warning when LLM filtering unavailable', async ({ page }) => {
    // Mock API to return results with LLM unavailable warning
    const responseWithWarning = {
      ...mockSuccessResponse,
      metadata: {
        ...mockSuccessResponse.metadata,
        llmFiltered: false,
        warnings: ['Claude API unavailable. Results based on vector similarity only.'],
      },
    }

    await page.route('**/api/decks-ai', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(responseWithWarning),
      })
    })

    await page.goto('/decks')
    await page.waitForSelector('h1:has-text("My Decks")')

    const aiButton = page.locator('[data-testid="ai-generate-button"]')
    await aiButton.click()
    await page.waitForSelector('[data-testid="ai-topic-input"]')

    const topicInput = page.locator('[data-testid="ai-topic-input"]')
    await topicInput.fill('React components')

    await page.click('[data-testid="generate-suggestions-button"]')

    // Should show results
    await expect(page.locator('text=/Suggested Cards/i')).toBeVisible({ timeout: 5000 })

    // Should show warning about LLM being unavailable
    await expect(page.locator('text=/Claude API unavailable/i')).toBeVisible()
  })

  test('handles network errors gracefully', async ({ page }) => {
    // Mock API to fail with network error
    await page.route('**/api/decks-ai', async (route) => {
      await route.abort('failed')
    })

    await page.goto('/decks')
    await page.waitForSelector('h1:has-text("My Decks")')

    const aiButton = page.locator('[data-testid="ai-generate-button"]')
    await aiButton.click()
    await page.waitForSelector('[data-testid="ai-topic-input"]')

    const topicInput = page.locator('[data-testid="ai-topic-input"]')
    await topicInput.fill('Docker containers')

    await page.click('[data-testid="generate-suggestions-button"]')

    // Should show error message (network errors show as "fetch failed" or similar)
    await expect(page.locator('.bg-red-50, .bg-red-900\\/20')).toBeVisible({
      timeout: 5000,
    })
  })

  test('can close dialog and try again after error', async ({ page }) => {
    // First mock to fail
    await page.route('**/api/decks-ai', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal server error' }),
      })
    })

    await page.goto('/decks')
    await page.waitForSelector('h1:has-text("My Decks")')

    const aiButton = page.locator('[data-testid="ai-generate-button"]')
    await aiButton.click()
    await page.waitForSelector('[data-testid="ai-topic-input"]')

    const topicInput = page.locator('[data-testid="ai-topic-input"]')
    await topicInput.fill('Test topic')

    await page.click('[data-testid="generate-suggestions-button"]')

    // Should show error
    await expect(page.locator('text=/Internal server error/i')).toBeVisible({ timeout: 5000 })

    // Close dialog
    const closeButton = page.locator('[data-testid="ai-generation-dialog"] button').first()
    await closeButton.click()

    // Dialog should close
    await expect(page.locator('[data-testid="ai-generation-dialog"]')).toHaveAttribute(
      'aria-hidden',
      'true'
    )
  })
})
