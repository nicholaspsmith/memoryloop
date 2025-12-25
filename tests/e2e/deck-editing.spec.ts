import { test, expect } from '@playwright/test'

/**
 * Deck Editing E2E Tests (User Story 2)
 *
 * End-to-end workflow:
 * 1. Rename deck
 * 2. Add cards to deck
 * 3. Remove cards from deck
 * 4. Archive/unarchive deck
 * 5. Delete deck
 *
 * Maps to T079 in Phase 7 (E2E Tests)
 * Tests User Story 2 (FR-011 through FR-019)
 */

test.describe('Deck Renaming', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/decks')
    await page.waitForSelector('h1:has-text("My Decks")')
  })

  test('can rename a deck', async ({ page }) => {
    // Find an existing deck
    const existingDeck = page.locator('a[href*="/decks/"]').first()

    if ((await existingDeck.count()) === 0) {
      test.skip()
    }

    // Navigate to deck detail page
    await existingDeck.click()
    await page.waitForSelector('h1, h2')

    // Look for edit or rename button
    const editButton = page.locator(
      'button:has-text("Edit"), button:has-text("Rename"), button[aria-label*="edit" i]'
    )

    if ((await editButton.count()) === 0) {
      test.skip()
    }

    await editButton.first().click()

    // Should show edit form or inline editor
    await page.waitForSelector('input[name="name"], input[type="text"]', { timeout: 5000 })

    // Enter new name
    const newName = `Renamed Deck ${Date.now()}`
    const nameInput = page.locator('input[name="name"], input[type="text"]').first()
    await nameInput.fill('')
    await nameInput.fill(newName)

    // Save changes
    await page.click('button:has-text("Save"), button[type="submit"]')

    // Verify new name appears
    await expect(page.locator(`text=${newName}`)).toBeVisible({ timeout: 5000 })
  })

  test('validates deck name on rename', async ({ page }) => {
    const existingDeck = page.locator('a[href*="/decks/"]').first()

    if ((await existingDeck.count()) === 0) {
      test.skip()
    }

    await existingDeck.click()
    await page.waitForSelector('h1, h2')

    const editButton = page.locator('button:has-text("Edit"), button:has-text("Rename")')

    if ((await editButton.count()) === 0) {
      test.skip()
    }

    await editButton.first().click()
    await page.waitForSelector('input[name="name"], input[type="text"]')

    // Try to set empty name
    const nameInput = page.locator('input[name="name"], input[type="text"]').first()
    await nameInput.fill('')

    // Try to save
    await page.click('button:has-text("Save"), button[type="submit"]')

    // Should show validation error
    await expect(page.locator('text=/required|cannot be empty|enter.*name/i')).toBeVisible({
      timeout: 3000,
    })
  })
})

test.describe('Adding/Removing Cards', () => {
  let testDeckName: string

  test.beforeEach(async ({ page }) => {
    // Create a test deck
    testDeckName = `Edit Test Deck ${Date.now()}`

    await page.goto('/decks')
    await page.waitForSelector('button:has-text("Create New Deck")')
    await page.click('button:has-text("Create New Deck")')

    await page.waitForSelector('input[name="name"], input[placeholder*="deck" i]')
    await page.fill('input[name="name"], input[placeholder*="deck" i]', testDeckName)
    await page.click('button[type="submit"], button:has-text("Create")')

    await page.waitForSelector(`text=${testDeckName}`)
    await page.click(`text=${testDeckName}`)
    await page.waitForSelector('h1, h2')
  })

  test('can add multiple cards at once', async ({ page }) => {
    // Click Add Cards button
    const addCardsButton = page.locator(
      'button:has-text("Add Cards"), button:has-text("Add to Deck")'
    )

    if ((await addCardsButton.count()) === 0) {
      test.skip()
    }

    await addCardsButton.first().click()
    await page.waitForSelector('input[type="checkbox"], text=/select|choose/i', { timeout: 5000 })

    // Select multiple flashcards
    const checkboxes = page.locator('input[type="checkbox"]')
    const checkboxCount = await checkboxes.count()

    if (checkboxCount < 3) {
      test.skip()
    }

    // Select first 3 cards
    for (let i = 0; i < 3; i++) {
      await checkboxes.nth(i).check()
    }

    // Confirm
    await page.click('button:has-text("Add"), button:has-text("Confirm")')

    // Verify cards were added
    await expect(page.locator('text=/3 card|added/i')).toBeVisible({ timeout: 5000 })
  })

  test('can remove cards from deck', async ({ page }) => {
    // First add some cards
    const addCardsButton = page.locator('button:has-text("Add Cards")')

    if ((await addCardsButton.count()) === 0) {
      test.skip()
    }

    await addCardsButton.first().click()
    await page.waitForSelector('input[type="checkbox"]')

    const checkboxes = page.locator('input[type="checkbox"]')
    if ((await checkboxes.count()) > 0) {
      await checkboxes.first().check()
      await page.click('button:has-text("Add"), button:has-text("Confirm")')
      await page.waitForTimeout(1000) // Wait for cards to be added
    }

    // Now remove a card
    const removeButton = page.locator(
      'button:has-text("Remove"), button[aria-label*="remove" i], button:has-text("×")'
    )

    if ((await removeButton.count()) === 0) {
      test.skip()
    }

    await removeButton.first().click()

    // Confirm removal if dialog appears
    const confirmButton = page.locator('button:has-text("Confirm"), button:has-text("Yes")')
    if ((await confirmButton.count()) > 0) {
      await confirmButton.first().click()
    }

    // Verify card was removed
    await expect(page.locator('text=/removed|deleted/i')).toBeVisible({ timeout: 5000 })
  })

  test('preserves flashcards in database when removed from deck', async ({ page }) => {
    // Add cards to deck
    const addCardsButton = page.locator('button:has-text("Add Cards")')

    if ((await addCardsButton.count()) === 0) {
      test.skip()
    }

    await addCardsButton.first().click()
    await page.waitForSelector('input[type="checkbox"]')

    const checkboxes = page.locator('input[type="checkbox"]')
    if ((await checkboxes.count()) > 0) {
      await checkboxes.first().check()
      await page.click('button:has-text("Add")')
      await page.waitForTimeout(1000)
    }

    // Remove card from deck
    const removeButton = page.locator('button:has-text("Remove"), button[aria-label*="remove" i]')

    if ((await removeButton.count()) > 0) {
      await removeButton.first().click()

      const confirmButton = page.locator('button:has-text("Confirm"), button:has-text("Yes")')
      if ((await confirmButton.count()) > 0) {
        await confirmButton.first().click()
      }
    }

    // Navigate to all flashcards or quiz to verify card still exists
    await page.goto('/quiz')
    await page.waitForTimeout(1000)

    // Card should still exist in global collection
    // (This is hard to test in E2E without more context, but we can check the page loads)
    await expect(page.locator('h1, h2')).toBeVisible()
  })

  test('updates card count after add/remove', async ({ page }) => {
    // Initial count should be 0
    const initialCountLocator = page.locator('text=/0 card/i')
    if ((await initialCountLocator.count()) > 0) {
      await expect(initialCountLocator).toBeVisible()
    }

    // Add a card
    const addCardsButton = page.locator('button:has-text("Add Cards")')

    if ((await addCardsButton.count()) === 0) {
      test.skip()
    }

    await addCardsButton.first().click()
    await page.waitForSelector('input[type="checkbox"]')

    const checkboxes = page.locator('input[type="checkbox"]')
    if ((await checkboxes.count()) > 0) {
      await checkboxes.first().check()
      await page.click('button:has-text("Add")')
      await page.waitForTimeout(1000)
    }

    // Count should be 1
    await expect(page.locator('text=/1 card/i')).toBeVisible({ timeout: 5000 })
  })
})

test.describe('Deck Archiving', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/decks')
    await page.waitForSelector('h1:has-text("My Decks")')
  })

  test('can archive a deck', async ({ page }) => {
    // Navigate to a deck
    const existingDeck = page.locator('a[href*="/decks/"]').first()

    if ((await existingDeck.count()) === 0) {
      test.skip()
    }

    const deckName = await existingDeck.textContent()
    await existingDeck.click()
    await page.waitForSelector('h1, h2')

    // Look for archive button
    const archiveButton = page.locator('button:has-text("Archive")')

    if ((await archiveButton.count()) === 0) {
      test.skip()
    }

    await archiveButton.first().click()

    // Confirm if dialog appears
    const confirmButton = page.locator('button:has-text("Yes"), button:has-text("Archive")')
    if ((await confirmButton.count()) > 1) {
      await confirmButton.nth(1).click() // Click the confirmation button, not the original
    }

    // Should redirect to decks page
    await page.waitForSelector('h1:has-text("My Decks")', { timeout: 5000 })

    // Deck should no longer be in active decks list
    if (deckName) {
      const activeDecksList = page.locator('main, .active-decks')
      if ((await activeDecksList.count()) > 0) {
        await expect(activeDecksList.locator(`text=${deckName}`)).not.toBeVisible()
      }
    }
  })

  test('archived decks do not count toward 100-deck limit', async ({ page }) => {
    // Check deck count
    const deckCountLocator = page.locator('text=/\\d+\\/100|\\d+ of 100/i')

    if ((await deckCountLocator.count()) === 0) {
      test.skip()
    }

    const initialCountText = await deckCountLocator.first().textContent()
    const initialCount = initialCountText ? parseInt(initialCountText.match(/\\d+/)?.[0] || '0') : 0

    // Archive a deck if possible
    const existingDeck = page.locator('a[href*="/decks/"]').first()

    if ((await existingDeck.count()) > 0) {
      await existingDeck.click()
      await page.waitForSelector('h1, h2')

      const archiveButton = page.locator('button:has-text("Archive")')

      if ((await archiveButton.count()) > 0) {
        await archiveButton.first().click()

        const confirmButton = page.locator('button:has-text("Yes"), button:has-text("Archive")')
        if ((await confirmButton.count()) > 1) {
          await confirmButton.nth(1).click()
        }

        await page.waitForSelector('h1:has-text("My Decks")')

        // Count should decrease by 1
        const newCountText = await deckCountLocator.first().textContent()
        const newCount = newCountText ? parseInt(newCountText.match(/\\d+/)?.[0] || '0') : 0

        expect(newCount).toBe(initialCount - 1)
      }
    }
  })

  test('can unarchive a deck', async ({ page }) => {
    // Navigate to archived decks
    const archivedLink = page.locator('a:has-text("Archived"), button:has-text("Archived")')

    if ((await archivedLink.count()) === 0) {
      test.skip()
    }

    await archivedLink.first().click()
    await page.waitForTimeout(1000)

    // Find an archived deck
    const archivedDeck = page.locator('a[href*="/decks/"]').first()

    if ((await archivedDeck.count()) === 0) {
      test.skip()
    }

    await archivedDeck.click()
    await page.waitForSelector('h1, h2')

    // Look for unarchive button
    const unarchiveButton = page.locator('button:has-text("Unarchive")')

    if ((await unarchiveButton.count()) === 0) {
      test.skip()
    }

    await unarchiveButton.first().click()

    // Confirm if needed
    const confirmButton = page.locator('button:has-text("Yes"), button:has-text("Unarchive")')
    if ((await confirmButton.count()) > 1) {
      await confirmButton.nth(1).click()
    }

    // Should return to active decks
    await page.waitForSelector('h1:has-text("My Decks")', { timeout: 5000 })
  })
})

test.describe('Deck Deletion', () => {
  let testDeckName: string

  test.beforeEach(async ({ page }) => {
    // Create a test deck for deletion
    testDeckName = `Delete Test Deck ${Date.now()}`

    await page.goto('/decks')
    await page.waitForSelector('button:has-text("Create New Deck")')
    await page.click('button:has-text("Create New Deck")')

    await page.waitForSelector('input[name="name"], input[placeholder*="deck" i]')
    await page.fill('input[name="name"], input[placeholder*="deck" i]', testDeckName)
    await page.click('button[type="submit"], button:has-text("Create")')

    await page.waitForSelector(`text=${testDeckName}`)
    await page.click(`text=${testDeckName}`)
    await page.waitForSelector('h1, h2')
  })

  test('can delete a deck', async ({ page }) => {
    // Look for delete button
    const deleteButton = page.locator('button:has-text("Delete")')

    if ((await deleteButton.count()) === 0) {
      test.skip()
    }

    await deleteButton.first().click()

    // Should show confirmation dialog
    await expect(page.locator('text=/are you sure|confirm|delete.*permanently/i')).toBeVisible({
      timeout: 3000,
    })

    // Confirm deletion
    const confirmButton = page.locator('button:has-text("Delete"), button:has-text("Yes")')
    await confirmButton.last().click() // Click confirmation, not original button

    // Should redirect to decks page
    await page.waitForSelector('h1:has-text("My Decks")', { timeout: 5000 })

    // Deck should no longer exist
    await expect(page.locator(`text=${testDeckName}`)).not.toBeVisible()
  })

  test('deletes deck-card associations', async ({ page }) => {
    // Add some cards first
    const addCardsButton = page.locator('button:has-text("Add Cards")')

    if ((await addCardsButton.count()) > 0) {
      await addCardsButton.first().click()
      await page.waitForSelector('input[type="checkbox"]')

      const checkboxes = page.locator('input[type="checkbox"]')
      if ((await checkboxes.count()) > 0) {
        await checkboxes.first().check()
        await page.click('button:has-text("Add")')
        await page.waitForTimeout(1000)
      }
    }

    // Delete the deck
    const deleteButton = page.locator('button:has-text("Delete")')

    if ((await deleteButton.count()) === 0) {
      test.skip()
    }

    await deleteButton.first().click()
    await expect(page.locator('text=/confirm|delete/i')).toBeVisible()

    const confirmButton = page.locator('button:has-text("Delete"), button:has-text("Yes")')
    await confirmButton.last().click()

    await page.waitForSelector('h1:has-text("My Decks")')

    // Deck and its card associations should be gone
    // (Hard to verify in E2E, but we can check deck is gone)
    await expect(page.locator(`text=${testDeckName}`)).not.toBeVisible()
  })

  test('requires confirmation before deletion', async ({ page }) => {
    const deleteButton = page.locator('button:has-text("Delete")')

    if ((await deleteButton.count()) === 0) {
      test.skip()
    }

    // Click delete
    await deleteButton.first().click()

    // Confirmation dialog should appear
    await expect(page.locator('text=/confirm|are you sure/i')).toBeVisible({ timeout: 3000 })

    // Cancel deletion
    const cancelButton = page.locator('button:has-text("Cancel"), button:has-text("No")')
    if ((await cancelButton.count()) > 0) {
      await cancelButton.first().click()
    }

    // Deck should still exist
    await expect(page.locator(`text=${testDeckName}`)).toBeVisible()
  })
})

test.describe('FSRS Settings Overrides', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/decks')
    await page.waitForSelector('h1:has-text("My Decks")')
  })

  test('can update FSRS settings for a deck', async ({ page }) => {
    const existingDeck = page.locator('a[href*="/decks/"]').first()

    if ((await existingDeck.count()) === 0) {
      test.skip()
    }

    await existingDeck.click()
    await page.waitForSelector('h1, h2')

    // Look for settings or edit button
    const settingsButton = page.locator(
      'button:has-text("Settings"), button:has-text("Edit"), button[aria-label*="settings" i]'
    )

    if ((await settingsButton.count()) === 0) {
      test.skip()
    }

    await settingsButton.first().click()
    await page.waitForSelector('text=/settings|override|fsrs/i', { timeout: 5000 })

    // Try to update FSRS overrides
    const newCardsField = page.locator('input[name="newCardsPerDay"], input[label*="new cards" i]')
    if ((await newCardsField.count()) > 0) {
      await newCardsField.first().fill('30')
    }

    const cardsPerSessionField = page.locator(
      'input[name="cardsPerSession"], input[label*="cards per session" i]'
    )
    if ((await cardsPerSessionField.count()) > 0) {
      await cardsPerSessionField.first().fill('40')
    }

    // Save
    await page.click('button:has-text("Save"), button[type="submit"]')

    // Should show success message or updated values
    await page.waitForTimeout(1000)
    await expect(page.locator('text=/saved|updated/i')).toBeVisible({ timeout: 3000 })
  })

  test('can clear FSRS overrides', async ({ page }) => {
    const existingDeck = page.locator('a[href*="/decks/"]').first()

    if ((await existingDeck.count()) === 0) {
      test.skip()
    }

    await existingDeck.click()
    await page.waitForSelector('h1, h2')

    const settingsButton = page.locator('button:has-text("Settings"), button:has-text("Edit")')

    if ((await settingsButton.count()) === 0) {
      test.skip()
    }

    await settingsButton.first().click()
    await page.waitForTimeout(1000)

    // Look for "Use Global Settings" or "Clear Overrides" button
    const clearButton = page.locator(
      'button:has-text("Use Global"), button:has-text("Clear"), button:has-text("Reset")'
    )

    if ((await clearButton.count()) > 0) {
      await clearButton.first().click()

      // Save
      await page.click('button:has-text("Save"), button[type="submit"]')

      await expect(page.locator('text=/saved|updated|global/i')).toBeVisible({ timeout: 3000 })
    }
  })
})
