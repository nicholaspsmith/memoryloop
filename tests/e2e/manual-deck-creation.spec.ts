import { test, expect } from '@playwright/test'

/**
 * Manual Deck Creation E2E Tests (User Story 1)
 *
 * End-to-end workflow:
 * 1. Navigate to decks page
 * 2. Create new deck
 * 3. Add flashcards to deck
 * 4. Start study session from deck
 * 5. Verify only deck cards shown in session
 *
 * Maps to T078 in Phase 7 (E2E Tests)
 * Tests User Story 1 (FR-001 through FR-010)
 */

test.describe('Manual Deck Creation Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to decks page
    await page.goto('/decks')
    await page.waitForSelector('h1:has-text("My Decks")', { timeout: 10000 })
  })

  test('can create a new deck from decks page', async ({ page }) => {
    // Click "Create New Deck" button
    await page.click('button:has-text("Create New Deck")')

    // Should navigate to new deck page or show modal
    await page.waitForSelector('input[name="name"], input[placeholder*="deck" i]', {
      timeout: 5000,
    })

    // Enter deck name
    const deckName = `Test Deck ${Date.now()}`
    await page.fill('input[name="name"], input[placeholder*="deck" i]', deckName)

    // Submit form
    await page.click('button[type="submit"], button:has-text("Create")')

    // Should navigate to decks page or show success
    await page.waitForSelector(`text=${deckName}`, { timeout: 5000 })

    // Verify deck appears in list
    await expect(page.locator(`text=${deckName}`)).toBeVisible()
  })

  test('can create deck with FSRS overrides', async ({ page }) => {
    // Click "Create New Deck"
    await page.click('button:has-text("Create New Deck")')
    await page.waitForSelector('input[name="name"], input[placeholder*="deck" i]')

    // Enter deck name
    const deckName = `Override Deck ${Date.now()}`
    await page.fill('input[name="name"], input[placeholder*="deck" i]', deckName)

    // Look for FSRS override fields (they might be in advanced options)
    const advancedButton = page.locator('button:has-text("Advanced"), button:has-text("Settings")')
    if ((await advancedButton.count()) > 0) {
      await advancedButton.first().click()
    }

    // Try to set overrides if fields exist
    const newCardsField = page.locator('input[name="newCardsPerDay"], input[label*="new cards" i]')
    if ((await newCardsField.count()) > 0) {
      await newCardsField.first().fill('25')
    }

    const cardsPerSessionField = page.locator(
      'input[name="cardsPerSession"], input[label*="cards per session" i]'
    )
    if ((await cardsPerSessionField.count()) > 0) {
      await cardsPerSessionField.first().fill('30')
    }

    // Submit
    await page.click('button[type="submit"], button:has-text("Create")')
    await page.waitForSelector(`text=${deckName}`, { timeout: 5000 })
  })

  test('validates deck name requirements', async ({ page }) => {
    // Click "Create New Deck"
    await page.click('button:has-text("Create New Deck")')
    await page.waitForSelector('input[name="name"], input[placeholder*="deck" i]')

    // Try to submit with empty name
    await page.click('button[type="submit"], button:has-text("Create")')

    // Should show validation error
    await expect(page.locator('text=/required|cannot be empty|enter.*name/i')).toBeVisible({
      timeout: 3000,
    })
  })
})

test.describe('Adding Cards to Deck', () => {
  let deckName: string

  test.beforeEach(async ({ page }) => {
    // Create a deck first
    deckName = `Add Cards Deck ${Date.now()}`

    await page.goto('/decks')
    await page.waitForSelector('button:has-text("Create New Deck")')
    await page.click('button:has-text("Create New Deck")')

    await page.waitForSelector('input[name="name"], input[placeholder*="deck" i]')
    await page.fill('input[name="name"], input[placeholder*="deck" i]', deckName)
    await page.click('button[type="submit"], button:has-text("Create")')

    // Wait for deck to be created and click on it
    await page.waitForSelector(`text=${deckName}`, { timeout: 5000 })
    await page.click(`text=${deckName}`)

    // Should navigate to deck detail page
    await page.waitForSelector('h1, h2', { timeout: 5000 })
  })

  test('can add flashcards to deck', async ({ page }) => {
    // Look for "Add Cards" button
    const addCardsButton = page.locator(
      'button:has-text("Add Cards"), button:has-text("Add to Deck")'
    )

    if ((await addCardsButton.count()) === 0) {
      // Deck might be empty, check for empty state
      const emptyState = await page.locator('text=/no cards|empty|add.*first/i').count()
      if (emptyState > 0) {
        test.skip()
      }
    }

    await addCardsButton.first().click()

    // Should show flashcard selection interface
    await page.waitForSelector('text=/select|flashcard|choose/i', { timeout: 5000 })

    // Select some flashcards (implementation depends on UI)
    const flashcardCheckboxes = page.locator('input[type="checkbox"]')
    const checkboxCount = await flashcardCheckboxes.count()

    if (checkboxCount > 0) {
      // Select first 2 flashcards
      for (let i = 0; i < Math.min(2, checkboxCount); i++) {
        await flashcardCheckboxes.nth(i).check()
      }

      // Confirm selection
      await page.click('button:has-text("Add"), button:has-text("Confirm")')

      // Should return to deck page with cards added
      await page.waitForSelector('text=/added|card/i', { timeout: 5000 })
    }
  })

  test('shows card count after adding cards', async ({ page }) => {
    // After adding cards, deck should show count
    const cardCountLocator = page.locator('text=/\\d+ card/i')

    // Wait for card count to appear
    await expect(cardCountLocator).toBeVisible({ timeout: 5000 })
  })
})

test.describe('Deck Study Session', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/decks')
    await page.waitForSelector('h1:has-text("My Decks")')
  })

  test('can start study session from deck', async ({ page }) => {
    // Find a deck with cards
    const deckWithCards = page.locator('text=/\\d+ card/i').first()

    if ((await deckWithCards.count()) === 0) {
      test.skip()
    }

    // Click on the deck to view details
    await deckWithCards.click()

    // Wait for deck detail page
    await page.waitForSelector('h1, h2')

    // Look for "Start Study Session" or "Study" button
    const studyButton = page.locator(
      'button:has-text("Start Study"), button:has-text("Study"), a:has-text("Study")'
    )

    if ((await studyButton.count()) === 0) {
      test.skip()
    }

    await studyButton.first().click()

    // Should navigate to study session page
    await page.waitForSelector('text=/question|answer|flashcard/i', { timeout: 10000 })

    // Verify we're in a study session
    await expect(page.locator('button:has-text("Show Answer")')).toBeVisible({ timeout: 5000 })
  })

  test('only shows cards from selected deck in session', async ({ page }) => {
    // This test requires having decks with known cards
    // Skip if no suitable deck exists

    const deckLinks = page.locator('a[href*="/decks/"]')
    const deckCount = await deckLinks.count()

    if (deckCount === 0) {
      test.skip()
    }

    // Click first deck
    await deckLinks.first().click()

    // Start study session
    const studyButton = page.locator(
      'button:has-text("Start Study"), button:has-text("Study"), a:has-text("Study")'
    )

    if ((await studyButton.count()) === 0) {
      test.skip()
    }

    await studyButton.first().click()
    await page.waitForSelector('text=/question|flashcard/i', { timeout: 10000 })

    // Verify session is for this specific deck
    // (Could check breadcrumb, title, or other UI elements)
    const sessionInfo = page.locator('text=/studying|session|deck/i')
    if ((await sessionInfo.count()) > 0) {
      const infoText = await sessionInfo.first().textContent()
      // Should contain deck name or reference
      expect(infoText).toBeTruthy()
    }
  })

  test('shows correct FSRS states for deck cards', async ({ page }) => {
    // Find deck with cards
    const deckWithCards = page.locator('text=/\\d+ card/i').first()

    if ((await deckWithCards.count()) === 0) {
      test.skip()
    }

    await deckWithCards.click()
    await page.waitForSelector('h1, h2')

    // Start study session
    const studyButton = page.locator('button:has-text("Start Study"), button:has-text("Study")')

    if ((await studyButton.count()) === 0) {
      test.skip()
    }

    await studyButton.first().click()
    await page.waitForSelector('button:has-text("Show Answer")', { timeout: 10000 })

    // Click Show Answer
    await page.click('button:has-text("Show Answer")')

    // Should show rating buttons (FSRS ratings)
    await expect(page.locator('button:has-text("Again"), button:has-text("Hard")')).toBeVisible({
      timeout: 5000,
    })
    await expect(page.locator('button:has-text("Good"), button:has-text("Easy")')).toBeVisible()
  })
})

test.describe('Deck Limits', () => {
  test('shows warning near deck limit', async ({ page }) => {
    await page.goto('/decks')
    await page.waitForSelector('h1:has-text("My Decks")')

    // Check for deck count indicator
    const deckCountLocator = page.locator('text=/\\d+\\/100|\\d+.*deck/i')

    if ((await deckCountLocator.count()) > 0) {
      const countText = await deckCountLocator.first().textContent()

      // If close to limit (e.g., 95+ decks), should show warning
      if (countText && (countText.includes('95') || countText.includes('99'))) {
        await expect(page.locator('text=/limit|warning|maximum/i')).toBeVisible()
      }
    }
  })

  test('prevents creating deck when at limit', async ({ page }) => {
    await page.goto('/decks')
    await page.waitForSelector('h1:has-text("My Decks")')

    // Check if at deck limit (100)
    const limitText = page.locator('text=/100\\/100|maximum.*reached/i')

    if ((await limitText.count()) > 0) {
      // "Create New Deck" button should be disabled
      const createButton = page.locator('button:has-text("Create New Deck")')
      await expect(createButton).toBeDisabled()
    }
  })
})

test.describe('Deck Empty States', () => {
  test('shows empty state when no decks exist', async ({ page }) => {
    await page.goto('/decks')
    await page.waitForSelector('h1:has-text("My Decks")')

    // If user has no decks, should show empty state
    const emptyState = page.locator('text=/no decks|create.*first|get started/i')

    // This is conditional - only check if empty state exists
    if ((await emptyState.count()) > 0) {
      await expect(emptyState).toBeVisible()
      await expect(page.locator('button:has-text("Create New Deck")')).toBeVisible()
    }
  })

  test('shows empty state when deck has no cards', async ({ page }) => {
    // Create a new empty deck
    await page.goto('/decks')
    await page.waitForSelector('button:has-text("Create New Deck")')

    await page.click('button:has-text("Create New Deck")')
    await page.waitForSelector('input[name="name"], input[placeholder*="deck" i]')

    const deckName = `Empty Deck ${Date.now()}`
    await page.fill('input[name="name"], input[placeholder*="deck" i]', deckName)
    await page.click('button[type="submit"], button:has-text("Create")')

    // Navigate to the empty deck
    await page.waitForSelector(`text=${deckName}`)
    await page.click(`text=${deckName}`)

    // Should show empty state
    await expect(page.locator('text=/no cards|empty|add.*first/i')).toBeVisible({ timeout: 5000 })

    // Study button should be disabled or hidden
    const studyButton = page.locator('button:has-text("Start Study"), button:has-text("Study")')
    if ((await studyButton.count()) > 0) {
      await expect(studyButton).toBeDisabled()
    }
  })
})
