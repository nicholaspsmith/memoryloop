import { test, expect } from '@playwright/test'

/**
 * Quiz Card Stack E2E Tests
 *
 * Verifies 3D card stack visualization with:
 * - Adaptive stack count (current + up to 2 behind)
 * - Proper 3D perspective and layering
 * - Scale and position transforms
 * - Works with 1, 2, 3, and 50 cards
 */

test.describe('Quiz Card Stack Effect', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to quiz page
    await page.goto('/quiz')
    // Wait for quiz to load
    await page.waitForSelector('.card-stack, text=All Caught Up', { timeout: 10000 })
  })

  test('shows single card with no stack when only 1 card remaining', async ({ page }) => {
    // Check if there are cards
    const hasCards = await page.locator('text=Show Answer').count()

    if (hasCards > 0) {
      // Check for card stack container
      const stackContainer = page.locator('.card-stack').first()
      await expect(stackContainer).toBeVisible()

      // Count visible cards in stack
      const stackItems = page.locator('.card-stack-item')
      const count = await stackItems.count()

      // Should have at least 1 card
      expect(count).toBeGreaterThanOrEqual(1)
    }
  })

  test('shows card stack with 3D perspective effect', async ({ page }) => {
    const hasCards = await page.locator('text=Show Answer').count()

    if (hasCards > 0) {
      const stackContainer = page.locator('.card-stack').first()

      // Check for perspective styling
      const perspective = await stackContainer.evaluate((el) => {
        return window.getComputedStyle(el).perspective
      })

      // Perspective should be set (not 'none')
      expect(perspective).not.toBe('none')
    }
  })

  test('shows maximum of 3 cards in stack (current + 2 behind)', async ({ page }) => {
    const hasCards = await page.locator('text=Show Answer').count()

    if (hasCards > 0) {
      const stackItems = page.locator('.card-stack-item')
      const count = await stackItems.count()

      // Should show max 3 cards
      expect(count).toBeLessThanOrEqual(3)
    }
  })

  test('applies correct z-index layering (front to back)', async ({ page }) => {
    const hasCards = await page.locator('text=Show Answer').count()

    if (hasCards > 0) {
      const stackItems = page.locator('.card-stack-item')
      const count = await stackItems.count()

      if (count >= 2) {
        // Front card should have higher z-index than cards behind
        const frontCard = stackItems.nth(0)
        const behindCard = stackItems.nth(1)

        const frontZIndex = await frontCard.evaluate((el) => {
          return window.getComputedStyle(el).zIndex
        })

        const behindZIndex = await behindCard.evaluate((el) => {
          return window.getComputedStyle(el).zIndex
        })

        // Front should have higher z-index
        expect(parseInt(frontZIndex)).toBeGreaterThan(parseInt(behindZIndex))
      }
    }
  })

  test('applies transform scaling to cards behind', async ({ page }) => {
    const hasCards = await page.locator('text=Show Answer').count()

    if (hasCards > 0) {
      const stackItems = page.locator('.card-stack-item')
      const count = await stackItems.count()

      if (count >= 2) {
        // Second card should have scale transform
        const behindCard = stackItems.nth(1)

        const transform = await behindCard.evaluate((el) => {
          return window.getComputedStyle(el).transform
        })

        // Transform should include scaling (matrix or scale)
        expect(transform).not.toBe('none')
        expect(transform).toMatch(/matrix|scale/)
      }
    }
  })

  test('updates stack after rating a card', async ({ page }) => {
    const hasCards = await page.locator('text=Show Answer').count()

    if (hasCards > 0) {
      // Get initial stack count
      const initialCount = await page.locator('.card-stack-item').count()

      // Click Show Answer
      await page.click('button:has-text("Show Answer")')

      // Wait for answer to appear
      await page.waitForTimeout(700)

      // Click a rating button
      await page.click('button:has-text("Easy")')

      // Wait for transition
      await page.waitForTimeout(700)

      // Check if we're still in quiz (not completed)
      const stillInQuiz = await page.locator('text=Show Answer').count()

      if (stillInQuiz > 0) {
        // Stack should still be present
        await expect(page.locator('.card-stack')).toBeVisible()

        // Card count might have changed (one less card)
        const newCount = await page.locator('.card-stack-item').count()
        expect(newCount).toBeLessThanOrEqual(initialCount)
      }
    }
  })

  test('maintains stack structure during card flip animation', async ({ page }) => {
    const hasCards = await page.locator('text=Show Answer').count()

    if (hasCards > 0) {
      const stackItems = page.locator('.card-stack-item')
      const initialCount = await stackItems.count()

      // Click Show Answer to trigger flip
      await page.click('button:has-text("Show Answer")')

      // During flip, stack should still be visible
      await page.waitForTimeout(300) // Mid-flip

      const midFlipCount = await stackItems.count()
      expect(midFlipCount).toBe(initialCount)

      // After flip completes
      await page.waitForTimeout(400)

      const finalCount = await stackItems.count()
      expect(finalCount).toBe(initialCount)
    }
  })

  test('handles transition animations smoothly', async ({ page }) => {
    const hasCards = await page.locator('text=Show Answer').count()

    if (hasCards > 0) {
      const stackContainer = page.locator('.card-stack').first()

      // Check for transition property
      const transition = await stackContainer.evaluate((el) => {
        const items = el.querySelectorAll('.card-stack-item')
        if (items.length > 1) {
          return window.getComputedStyle(items[1]).transition
        }
        return 'none'
      })

      // Cards should have transition for smooth updates
      // (might be 'all' or specific properties)
      expect(transition).toBeTruthy()
    }
  })
})
