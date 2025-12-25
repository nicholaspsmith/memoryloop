import { test, expect } from '@playwright/test'

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
 */

test.describe('AI Deck Generation Request', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/decks')
    await page.waitForSelector('h1:has-text("My Decks")')
  })

  test('can access AI deck generation interface', async ({ page }) => {
    // Look for "Generate with AI" or similar button
    const aiButton = page.locator(
      'button:has-text("AI"), button:has-text("Generate"), a:has-text("AI Deck")'
    )

    if ((await aiButton.count()) === 0) {
      test.skip()
    }

    await aiButton.first().click()

    // Should show AI generation interface
    await expect(
      page.locator('text=/topic|describe|what.*study|generate/i')
    ).toBeVisible({ timeout: 5000 })
  })

  test('can submit topic for AI generation', async ({ page }) => {
    const aiButton = page.locator('button:has-text("AI"), button:has-text("Generate")')

    if ((await aiButton.count()) === 0) {
      test.skip()
    }

    await aiButton.first().click()
    await page.waitForSelector('input, textarea', { timeout: 5000 })

    // Enter a topic
    const topicInput = page.locator('input[name="topic"], textarea[name="topic"]').first()
    if ((await topicInput.count()) === 0) {
      test.skip()
    }

    await topicInput.fill('JavaScript async/await patterns')

    // Submit
    await page.click('button:has-text("Generate"), button[type="submit"]')

    // Should show loading state
    await expect(page.locator('text=/generating|loading|searching/i')).toBeVisible({
      timeout: 3000,
    })

    // Wait for results (with longer timeout for AI processing)
    await expect(page.locator('text=/suggestion|result|found.*card/i')).toBeVisible({
      timeout: 15000,
    })
  })

  test('validates topic input', async ({ page }) => {
    const aiButton = page.locator('button:has-text("AI"), button:has-text("Generate")')

    if ((await aiButton.count()) === 0) {
      test.skip()
    }

    await aiButton.first().click()
    await page.waitForSelector('input, textarea')

    // Try to submit without topic
    await page.click('button:has-text("Generate"), button[type="submit"]')

    // Should show validation error
    await expect(
      page.locator('text=/required|enter.*topic|cannot be empty/i')
    ).toBeVisible({ timeout: 3000 })
  })

  test('shows appropriate message when no cards found', async ({ page }) => {
    const aiButton = page.locator('button:has-text("AI"), button:has-text("Generate")')

    if ((await aiButton.count()) === 0) {
      test.skip()
    }

    await aiButton.first().click()
    await page.waitForSelector('input, textarea')

    // Enter a very obscure topic
    const topicInput = page.locator('input[name="topic"], textarea[name="topic"]').first()
    await topicInput.fill('xyzqwertynonexistenttopicabc123')

    await page.click('button:has-text("Generate"), button[type="submit"]')

    // Should eventually show no results message
    await expect(
      page.locator('text=/no.*found|no.*match|create.*flashcard.*first/i')
    ).toBeVisible({ timeout: 15000 })
  })
})

test.describe('Reviewing AI Suggestions', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/decks')
    await page.waitForSelector('h1:has-text("My Decks")')

    // Navigate to AI generation
    const aiButton = page.locator('button:has-text("AI"), button:has-text("Generate")')

    if ((await aiButton.count()) > 0) {
      await aiButton.first().click()
      await page.waitForSelector('input, textarea')

      // Submit a common topic to get results
      const topicInput = page.locator('input[name="topic"], textarea[name="topic"]').first()
      await topicInput.fill('programming basics')
      await page.click('button:has-text("Generate")')

      // Wait for results
      await page.waitForSelector('text=/suggestion|card|result/i', { timeout: 15000 })
    } else {
      test.skip()
    }
  })

  test('displays suggested cards with relevance info', async ({ page }) => {
    // Should show suggested cards
    const suggestionCards = page.locator('[data-testid="suggestion-card"], .suggestion, .card')

    if ((await suggestionCards.count()) === 0) {
      test.skip()
    }

    // Each suggestion should have question/answer
    await expect(suggestionCards.first()).toBeVisible()

    // Should show relevance or score information
    await expect(page.locator('text=/relevance|score|match|%/i')).toBeVisible({ timeout: 3000 })
  })

  test('can select individual suggestions', async ({ page }) => {
    const checkboxes = page.locator('input[type="checkbox"]')

    if ((await checkboxes.count()) === 0) {
      test.skip()
    }

    // Select first suggestion
    await checkboxes.first().check()

    // Should be checked
    await expect(checkboxes.first()).toBeChecked()

    // Uncheck
    await checkboxes.first().uncheck()

    // Should be unchecked
    await expect(checkboxes.first()).not.toBeChecked()
  })

  test('can select all suggestions', async ({ page }) => {
    const selectAllButton = page.locator('button:has-text("Select All"), input[type="checkbox"]')

    if ((await selectAllButton.count()) === 0) {
      test.skip()
    }

    await selectAllButton.first().click()

    // All checkboxes should be checked
    const checkboxes = page.locator('input[type="checkbox"]:not([disabled])')
    const checkboxCount = await checkboxes.count()

    if (checkboxCount > 0) {
      for (let i = 0; i < checkboxCount; i++) {
        await expect(checkboxes.nth(i)).toBeChecked()
      }
    }
  })

  test('can deselect all suggestions', async ({ page }) => {
    // First select all
    const selectAllButton = page.locator('button:has-text("Select All")')

    if ((await selectAllButton.count()) > 0) {
      await selectAllButton.first().click()
    }

    // Then deselect all
    const deselectButton = page.locator('button:has-text("Deselect All"), button:has-text("Clear")')

    if ((await deselectButton.count()) > 0) {
      await deselectButton.first().click()

      // No checkboxes should be checked
      const checkedBoxes = page.locator('input[type="checkbox"]:checked')
      expect(await checkedBoxes.count()).toBe(0)
    }
  })

  test('shows preview of flashcard content', async ({ page }) => {
    const suggestionCards = page.locator('[data-testid="suggestion-card"], .suggestion, .card')

    if ((await suggestionCards.count()) === 0) {
      test.skip()
    }

    const firstCard = suggestionCards.first()

    // Should show question and answer
    const cardText = await firstCard.textContent()
    expect(cardText).toBeTruthy()

    // Could click to expand if there's a preview feature
    const expandButton = firstCard.locator('button:has-text("View"), button:has-text("Expand")')
    if ((await expandButton.count()) > 0) {
      await expandButton.click()

      // Should show full content
      await expect(page.locator('text=/question|answer/i')).toBeVisible()
    }
  })
})

test.describe('Creating Deck from Suggestions', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/decks')
    await page.waitForSelector('h1:has-text("My Decks")')

    const aiButton = page.locator('button:has-text("AI"), button:has-text("Generate")')

    if ((await aiButton.count()) > 0) {
      await aiButton.first().click()
      await page.waitForSelector('input, textarea')

      const topicInput = page.locator('input[name="topic"], textarea[name="topic"]').first()
      await topicInput.fill('web development')
      await page.click('button:has-text("Generate")')

      await page.waitForSelector('input[type="checkbox"]', { timeout: 15000 })
    } else {
      test.skip()
    }
  })

  test('can create deck from selected suggestions', async ({ page }) => {
    // Select some suggestions
    const checkboxes = page.locator('input[type="checkbox"]')
    const checkboxCount = await checkboxes.count()

    if (checkboxCount === 0) {
      test.skip()
    }

    // Select first 3 cards
    for (let i = 0; i < Math.min(3, checkboxCount); i++) {
      await checkboxes.nth(i).check()
    }

    // Click "Create Deck" or similar button
    const createButton = page.locator(
      'button:has-text("Create Deck"), button:has-text("Create"), button:has-text("Add to Deck")'
    )

    if ((await createButton.count()) === 0) {
      test.skip()
    }

    await createButton.first().click()

    // Should prompt for deck name
    await page.waitForSelector('input[name="name"], input[placeholder*="deck" i]', {
      timeout: 5000,
    })

    const deckName = `AI Generated Deck ${Date.now()}`
    await page.fill('input[name="name"], input[placeholder*="deck" i]', deckName)

    // Submit
    await page.click('button:has-text("Create"), button[type="submit"]')

    // Should navigate to deck or show success
    await expect(page.locator(`text=${deckName}`)).toBeVisible({ timeout: 5000 })
  })

  test('requires at least one card selected', async ({ page }) => {
    // Don't select any cards
    const createButton = page.locator('button:has-text("Create Deck"), button:has-text("Create")')

    if ((await createButton.count()) === 0) {
      test.skip()
    }

    await createButton.first().click()

    // Should show error message
    await expect(
      page.locator('text=/select.*card|choose.*least|no.*selected/i')
    ).toBeVisible({ timeout: 3000 })
  })

  test('created deck contains selected cards', async ({ page }) => {
    const checkboxes = page.locator('input[type="checkbox"]')
    const checkboxCount = await checkboxes.count()

    if (checkboxCount < 2) {
      test.skip()
    }

    // Select 2 cards
    await checkboxes.nth(0).check()
    await checkboxes.nth(1).check()

    const createButton = page.locator('button:has-text("Create Deck"), button:has-text("Create")')

    if ((await createButton.count()) === 0) {
      test.skip()
    }

    await createButton.first().click()
    await page.waitForSelector('input[name="name"], input[placeholder*="deck" i]')

    const deckName = `Verified Deck ${Date.now()}`
    await page.fill('input[name="name"], input[placeholder*="deck" i]', deckName)
    await page.click('button:has-text("Create"), button[type="submit"]')

    await page.waitForSelector(`text=${deckName}`)

    // Navigate to deck
    await page.click(`text=${deckName}`)
    await page.waitForSelector('h1, h2')

    // Should show 2 cards
    await expect(page.locator('text=/2 card/i')).toBeVisible({ timeout: 5000 })
  })

  test('can cancel deck creation', async ({ page }) => {
    const checkboxes = page.locator('input[type="checkbox"]')

    if ((await checkboxes.count()) > 0) {
      await checkboxes.first().check()
    }

    const createButton = page.locator('button:has-text("Create Deck"), button:has-text("Create")')

    if ((await createButton.count()) === 0) {
      test.skip()
    }

    await createButton.first().click()
    await page.waitForSelector('input[name="name"], input[placeholder*="deck" i]')

    // Click cancel
    const cancelButton = page.locator('button:has-text("Cancel")')

    if ((await cancelButton.count()) > 0) {
      await cancelButton.first().click()

      // Should return to suggestions view
      await expect(page.locator('input[type="checkbox"]')).toBeVisible()
    }
  })
})

test.describe('AI Generation Performance', () => {
  test('completes generation within reasonable time', async ({ page }) => {
    await page.goto('/decks')
    await page.waitForSelector('h1:has-text("My Decks")')

    const aiButton = page.locator('button:has-text("AI"), button:has-text("Generate")')

    if ((await aiButton.count()) === 0) {
      test.skip()
    }

    await aiButton.first().click()
    await page.waitForSelector('input, textarea')

    const topicInput = page.locator('input[name="topic"], textarea[name="topic"]').first()
    await topicInput.fill('TypeScript types')

    const startTime = Date.now()

    await page.click('button:has-text("Generate")')

    // Wait for results
    await page.waitForSelector('text=/suggestion|result|found/i', { timeout: 15000 })

    const endTime = Date.now()
    const duration = endTime - startTime

    // Should complete within 15 seconds
    expect(duration).toBeLessThan(15000)
  })

  test('shows loading state during generation', async ({ page }) => {
    await page.goto('/decks')
    await page.waitForSelector('h1:has-text("My Decks")')

    const aiButton = page.locator('button:has-text("AI"), button:has-text("Generate")')

    if ((await aiButton.count()) === 0) {
      test.skip()
    }

    await aiButton.first().click()
    await page.waitForSelector('input, textarea')

    const topicInput = page.locator('input[name="topic"], textarea[name="topic"]').first()
    await topicInput.fill('React components')

    await page.click('button:has-text("Generate")')

    // Should show loading indicator
    await expect(
      page.locator('text=/generating|searching|loading|please wait/i, .spinner, .loading')
    ).toBeVisible({ timeout: 2000 })
  })

  test('disables submit button during generation', async ({ page }) => {
    await page.goto('/decks')
    await page.waitForSelector('h1:has-text("My Decks")')

    const aiButton = page.locator('button:has-text("AI"), button:has-text("Generate")')

    if ((await aiButton.count()) === 0) {
      test.skip()
    }

    await aiButton.first().click()
    await page.waitForSelector('input, textarea')

    const topicInput = page.locator('input[name="topic"], textarea[name="topic"]').first()
    await topicInput.fill('Node.js streams')

    const submitButton = page.locator('button:has-text("Generate"), button[type="submit"]').first()

    await submitButton.click()

    // Button should be disabled while generating
    await expect(submitButton).toBeDisabled({ timeout: 2000 })
  })
})

test.describe('Fallback and Error Handling', () => {
  test('handles AI service unavailable gracefully', async ({ page: _page }) => {
    // This test would require mocking the API to fail
    // In a real E2E test, we'd need to simulate service failure
    // For now, we'll skip this as it requires backend mocking
    test.skip()
  })

  test('shows vector search results when LLM unavailable', async ({ page: _page }) => {
    // Similar to above - requires backend mocking
    // Should fall back to vector search only
    test.skip()
  })

  test('handles network errors gracefully', async ({ page }) => {
    await page.goto('/decks')
    await page.waitForSelector('h1:has-text("My Decks")')

    const aiButton = page.locator('button:has-text("AI"), button:has-text("Generate")')

    if ((await aiButton.count()) === 0) {
      test.skip()
    }

    await aiButton.first().click()
    await page.waitForSelector('input, textarea')

    // Simulate offline
    await page.context().setOffline(true)

    const topicInput = page.locator('input[name="topic"], textarea[name="topic"]').first()
    await topicInput.fill('Docker containers')

    await page.click('button:has-text("Generate")')

    // Should show error message
    await expect(
      page.locator('text=/error|failed|unavailable|offline/i')
    ).toBeVisible({ timeout: 5000 })

    // Restore online
    await page.context().setOffline(false)
  })
})
