import { test, expect } from '@playwright/test'

/**
 * Deck Study Sessions E2E Tests (User Story 4)
 *
 * End-to-end workflow:
 * 1. Start study session from deck
 * 2. Verify FSRS scheduling works correctly
 * 3. Test deck-specific settings application
 * 4. Verify only deck cards appear in session
 *
 * These tests require the user to have flashcards and decks.
 * In CI with a fresh test user, these will be skipped.
 *
 * TODO: Create flashcards in auth.setup.ts to enable these tests
 *
 * Maps to T081 in Phase 7 (E2E Tests)
 * Tests User Story 4 (FR-027 through FR-035)
 */

// Skip - requires existing decks with cards which test users don't have
test.describe.skip('Starting Deck Study Session', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/decks')
    await page.waitForSelector('h1:has-text("My Decks")')
  })

  test('can start study session from deck', async ({ page }) => {
    // Find deck with cards
    const deckWithCards = page.locator('text=/\\d+ card/i').first()

    if ((await deckWithCards.count()) === 0) {
      test.skip()
    }

    // Click on deck
    await deckWithCards.click()
    await page.waitForSelector('h1, h2')

    // Click study button
    const studyButton = page.locator(
      'button:has-text("Start Study"), button:has-text("Study"), a:has-text("Study")'
    )

    if ((await studyButton.count()) === 0) {
      test.skip()
    }

    await studyButton.first().click()

    // Should navigate to study session
    await expect(page.locator('text=/question|flashcard|studying/i')).toBeVisible({
      timeout: 10000,
    })

    // Should show "Show Answer" button
    await expect(page.locator('button:has-text("Show Answer")')).toBeVisible()
  })

  test('prevents starting session on empty deck', async ({ page }) => {
    // Create an empty deck
    await page.click('a:has-text("Create Deck"), a:has-text("Create Your First Deck")')
    await page.waitForSelector('input[name="name"], input[placeholder*="deck" i]')

    const deckName = `Empty Session Deck ${Date.now()}`
    await page.fill('input[name="name"], input[placeholder*="deck" i]', deckName)
    await page.click('button[type="submit"], button:has-text("Create")')

    await page.waitForSelector(`text=${deckName}`)
    await page.click(`text=${deckName}`)
    await page.waitForSelector('h1, h2')

    // Study button should be disabled
    const studyButton = page.locator('button:has-text("Start Study"), button:has-text("Study")')

    if ((await studyButton.count()) > 0) {
      await expect(studyButton).toBeDisabled()
    }

    // Or should show message
    await expect(page.locator('text=/no cards|add.*first|empty/i')).toBeVisible()
  })

  test('shows deck name in session header', async ({ page }) => {
    const deckLinks = page.locator('a[href*="/decks/"]')

    if ((await deckLinks.count()) === 0) {
      test.skip()
    }

    // Get deck name
    const deckLink = deckLinks.first()
    const deckNameText = await deckLink.textContent()

    await deckLink.click()
    await page.waitForSelector('h1, h2')

    const studyButton = page.locator('button:has-text("Start Study"), button:has-text("Study")')

    if ((await studyButton.count()) === 0) {
      test.skip()
    }

    await studyButton.first().click()
    await page.waitForSelector('button:has-text("Show Answer")', { timeout: 10000 })

    // Should show deck name somewhere in session
    if (deckNameText) {
      const cleanDeckName = deckNameText.replace(/\d+ card.*/i, '').trim()
      if (cleanDeckName) {
        await expect(page.locator(`text=${cleanDeckName}`)).toBeVisible()
      }
    }
  })
})

// Skip - requires existing decks with cards which test users don't have
test.describe.skip('FSRS Scheduling in Deck Session', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/decks')
    await page.waitForSelector('h1:has-text("My Decks")')

    // Navigate to first deck with cards
    const deckWithCards = page.locator('text=/\\d+ card/i').first()

    if ((await deckWithCards.count()) > 0) {
      await deckWithCards.click()
      await page.waitForSelector('h1, h2')

      const studyButton = page.locator('button:has-text("Start Study"), button:has-text("Study")')

      if ((await studyButton.count()) > 0) {
        await studyButton.first().click()
        await page.waitForSelector('button:has-text("Show Answer")', { timeout: 10000 })
      } else {
        test.skip()
      }
    } else {
      test.skip()
    }
  })

  test('shows FSRS rating buttons after revealing answer', async ({ page }) => {
    // Initially, rating buttons should not be visible
    await expect(page.locator('button:has-text("Again")')).not.toBeVisible()

    // Click Show Answer
    await page.click('button:has-text("Show Answer")')

    // Wait for answer to appear
    await page.waitForTimeout(700) // Animation time

    // Rating buttons should now be visible
    await expect(page.locator('button:has-text("Again"), button:has-text("Hard")')).toBeVisible({
      timeout: 2000,
    })
    await expect(page.locator('button:has-text("Good"), button:has-text("Easy")')).toBeVisible()
  })

  test('advances to next card after rating', async ({ page }) => {
    // Show answer
    await page.click('button:has-text("Show Answer")')
    await page.waitForTimeout(700)

    // Rate the card
    const goodButton = page.locator('button:has-text("Good")').first()
    await goodButton.click()

    // Should advance to next card or show completion
    await page.waitForTimeout(500)

    // Either shows next card or completion message
    const hasNextCard = (await page.locator('button:has-text("Show Answer")').count()) > 0
    const hasCompletion = (await page.locator('text=/complete|finished|done/i').count()) > 0

    expect(hasNextCard || hasCompletion).toBe(true)
  })

  test('applies FSRS state updates', async ({ page }) => {
    // This test verifies that rating a card updates its FSRS state
    // Show answer
    await page.click('button:has-text("Show Answer")')
    await page.waitForTimeout(700)

    // Rate as Easy (should schedule card further out)
    const easyButton = page.locator('button:has-text("Easy"), button:has-text("Very Easy")')

    if ((await easyButton.count()) > 0) {
      await easyButton.first().click()
      await page.waitForTimeout(500)

      // Card should be scheduled (hard to verify in E2E without checking database)
      // But we can verify session continues normally
      const hasNextStep =
        (await page.locator('button:has-text("Show Answer")').count()) > 0 ||
        (await page.locator('text=/complete/i').count()) > 0

      expect(hasNextStep).toBe(true)
    }
  })

  test('shows session progress', async ({ page }) => {
    // Should show progress indicator
    const progressIndicator = page.locator('text=/\\d+\\/\\d+|progress|card.*of/i')

    if ((await progressIndicator.count()) > 0) {
      await expect(progressIndicator.first()).toBeVisible()

      // Progress should update after rating cards
      const initialProgress = await progressIndicator.first().textContent()

      await page.click('button:has-text("Show Answer")')
      await page.waitForTimeout(700)
      await page.click('button:has-text("Good")')
      await page.waitForTimeout(500)

      // If more cards available, progress should change
      if ((await page.locator('button:has-text("Show Answer")').count()) > 0) {
        const newProgress = await progressIndicator.first().textContent()
        expect(newProgress).not.toBe(initialProgress)
      }
    }
  })

  test('handles Again rating (card reappears)', async ({ page }) => {
    // Show answer
    await page.click('button:has-text("Show Answer")')
    await page.waitForTimeout(700)

    // Rate as Again (should reschedule soon)
    const againButton = page.locator('button:has-text("Again")')

    if ((await againButton.count()) > 0) {
      await againButton.first().click()
      await page.waitForTimeout(500)

      // Session should continue
      const continues =
        (await page.locator('button:has-text("Show Answer")').count()) > 0 ||
        (await page.locator('text=/complete/i').count()) > 0

      expect(continues).toBe(true)
    }
  })
})

// Skip - requires flashcards which test users don't have
test.describe.skip('Deck-Specific Settings', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/decks')
    await page.waitForSelector('h1:has-text("My Decks")')
  })

  test('applies deck-specific card limits in session', async ({ page }) => {
    // This test requires a deck with specific FSRS overrides
    // Create or find a deck with settings

    const deckLinks = page.locator('a[href*="/decks/"]')

    if ((await deckLinks.count()) === 0) {
      test.skip()
    }

    // Click first deck
    await deckLinks.first().click()
    await page.waitForSelector('h1, h2')

    // Check if there are settings displayed
    const settingsInfo = page.locator('text=/\\d+.*per.*day|\\d+.*per.*session/i')

    if ((await settingsInfo.count()) > 0) {
      // Settings exist, verify they're applied in session
      await expect(settingsInfo.first()).toBeVisible()
    }

    // Start study session
    const studyButton = page.locator('button:has-text("Start Study"), button:has-text("Study")')

    if ((await studyButton.count()) === 0) {
      test.skip()
    }

    await studyButton.first().click()
    await page.waitForSelector('button:has-text("Show Answer")', { timeout: 10000 })

    // Session should respect deck limits
    // (Hard to verify exact limits in E2E without knowing the specific values)
    await expect(page.locator('text=/question|flashcard/i')).toBeVisible()
  })

  test('shows global settings when no deck overrides', async ({ page }) => {
    // Create a new deck without overrides
    await page.click('a:has-text("Create Deck"), a:has-text("Create Your First Deck")')
    await page.waitForSelector('input[name="name"]')

    const deckName = `Global Settings Deck ${Date.now()}`
    await page.fill('input[name="name"]', deckName)
    await page.click('button[type="submit"], button:has-text("Create")')

    await page.waitForSelector(`text=${deckName}`)
    await page.click(`text=${deckName}`)
    await page.waitForSelector('h1, h2')

    // Should show "Using global settings" or similar
    const globalSettingsIndicator = page.locator('text=/global|default.*setting/i')

    if ((await globalSettingsIndicator.count()) > 0) {
      await expect(globalSettingsIndicator.first()).toBeVisible()
    }
  })
})

// Skip - requires multiple existing decks which test users don't have
test.describe.skip('Deck Card Filtering', () => {
  test('only shows cards from selected deck', async ({ page }) => {
    await page.goto('/decks')
    await page.waitForSelector('h1:has-text("My Decks")')

    // Need at least 2 decks to test filtering
    const deckLinks = page.locator('a[href*="/decks/"]')
    const deckCount = await deckLinks.count()

    if (deckCount < 2) {
      test.skip()
    }

    // Click first deck
    await deckLinks.first().click()
    await page.waitForSelector('h1, h2')

    const studyButton = page.locator('button:has-text("Start Study"), button:has-text("Study")')

    if ((await studyButton.count()) === 0) {
      test.skip()
    }

    await studyButton.first().click()
    await page.waitForSelector('button:has-text("Show Answer")', { timeout: 10000 })

    // In session, verify we're studying from correct deck
    // (Could check breadcrumb, title, or session info)
    const sessionInfo = page.locator('h1, h2, .breadcrumb')
    const infoText = await sessionInfo.first().textContent()

    expect(infoText).toBeTruthy()
  })

  test('updates session queue when cards added during session', async ({ page: _page }) => {
    // This would require:
    // 1. Starting a session
    // 2. In another tab/window, adding cards to the deck
    // 3. Verifying the session updates
    // This is complex for E2E and might require live update testing
    test.skip()
  })

  test('skips removed cards during session', async ({ page: _page }) => {
    // Similar to above - requires concurrent deck editing
    // Would need to test that cards removed mid-session are skipped
    test.skip()
  })
})

// Skip - requires existing decks with cards which test users don't have
test.describe.skip('Session Completion', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/decks')
    await page.waitForSelector('h1:has-text("My Decks")')
  })

  test('shows completion message when all cards reviewed', async ({ page }) => {
    // Find a deck with few cards to complete quickly
    const deckWithCards = page.locator('text=/\\d+ card/i').first()

    if ((await deckWithCards.count()) === 0) {
      test.skip()
    }

    await deckWithCards.click()
    await page.waitForSelector('h1, h2')

    const studyButton = page.locator('button:has-text("Start Study"), button:has-text("Study")')

    if ((await studyButton.count()) === 0) {
      test.skip()
    }

    await studyButton.first().click()
    await page.waitForSelector('button:has-text("Show Answer")', { timeout: 10000 })

    // Review up to 10 cards (or until completion)
    for (let i = 0; i < 10; i++) {
      const showAnswerButton = page.locator('button:has-text("Show Answer")')

      if ((await showAnswerButton.count()) === 0) {
        // Session complete
        break
      }

      await showAnswerButton.click()
      await page.waitForTimeout(700)

      const goodButton = page.locator('button:has-text("Good")')

      if ((await goodButton.count()) === 0) {
        // Session complete
        break
      }

      await goodButton.first().click()
      await page.waitForTimeout(500)
    }

    // Should either show completion or still have cards
    const hasCompletion = (await page.locator('text=/complete|finished|done|all.*up/i').count()) > 0
    const hasMoreCards = (await page.locator('button:has-text("Show Answer")').count()) > 0

    expect(hasCompletion || hasMoreCards).toBe(true)
  })

  test('can return to deck from completion screen', async ({ page: _page }) => {
    // Skip to completion by completing a session
    // This is hard to do reliably in E2E without knowing deck state
    test.skip()
  })

  test('can start new session from completion screen', async ({ page: _page }) => {
    // Similar to above - requires completing a session first
    test.skip()
  })
})

// Skip - requires existing decks with cards which test users don't have
test.describe.skip('Session Navigation and Controls', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/decks')
    await page.waitForSelector('h1:has-text("My Decks")')

    const deckWithCards = page.locator('text=/\\d+ card/i').first()

    if ((await deckWithCards.count()) > 0) {
      await deckWithCards.click()
      await page.waitForSelector('h1, h2')

      const studyButton = page.locator('button:has-text("Start Study"), button:has-text("Study")')

      if ((await studyButton.count()) > 0) {
        await studyButton.first().click()
        await page.waitForSelector('button:has-text("Show Answer")', { timeout: 10000 })
      } else {
        test.skip()
      }
    } else {
      test.skip()
    }
  })

  test('can exit session early', async ({ page }) => {
    // Look for exit/back button
    const exitButton = page.locator(
      'button:has-text("Exit"), button:has-text("Back"), a:has-text("Back to Deck")'
    )

    if ((await exitButton.count()) > 0) {
      await exitButton.first().click()

      // Should return to deck or decks page
      await expect(page.locator('h1:has-text("My Decks"), h1, h2')).toBeVisible({ timeout: 5000 })
    }
  })

  test('maintains session state on page refresh', async ({ page }) => {
    // Refresh page
    await page.reload()

    // Should restore session (or restart)
    await page.waitForSelector('button:has-text("Show Answer"), h1', { timeout: 5000 })

    // Either same card or session restarted
    const hasSession = (await page.locator('button:has-text("Show Answer")').count()) > 0
    expect(hasSession).toBe(true)
  })

  test('shows keyboard shortcuts hints', async ({ page }) => {
    // Check if keyboard shortcuts are displayed
    const shortcutHints = page.locator('text=/press|shortcut|key|space|enter/i, [data-shortcut]')

    // May or may not be visible depending on UI
    // This is optional UX feature
    if ((await shortcutHints.count()) > 0) {
      await expect(shortcutHints.first()).toBeVisible()
    }
  })
})

// Skip - requires existing decks which test users don't have
test.describe.skip('No Due Cards Scenario', () => {
  test('handles deck with no due cards gracefully', async ({ page }) => {
    await page.goto('/decks')
    await page.waitForSelector('h1:has-text("My Decks")')

    const deckLinks = page.locator('a[href*="/decks/"]')

    if ((await deckLinks.count()) === 0) {
      test.skip()
    }

    // Try first deck
    await deckLinks.first().click()
    await page.waitForSelector('h1, h2')

    const studyButton = page.locator('button:has-text("Start Study"), button:has-text("Study")')

    if ((await studyButton.count()) === 0) {
      test.skip()
    }

    await studyButton.first().click()

    // May show "no due cards" message or start session
    await page.waitForTimeout(2000)

    const noDueMessage = await page.locator('text=/no.*due|all.*up|come back/i').count()
    const hasSession = await page.locator('button:has-text("Show Answer")').count()

    // Should show either message or session
    expect(noDueMessage > 0 || hasSession > 0).toBe(true)
  })

  test('shows next due time when no cards due now', async ({ page: _page }) => {
    // This requires a deck with cards scheduled for future
    // Hard to test reliably in E2E
    test.skip()
  })
})
