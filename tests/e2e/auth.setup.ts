import { test as setup, expect } from '@playwright/test'

const authFile = 'tests/e2e/.auth/user.json'

/**
 * Authentication Setup for E2E Tests
 *
 * This runs once before all e2e tests to create and authenticate a test user.
 * The session is saved to a file and reused across all tests.
 */
setup('authenticate', async ({ page }) => {
  const testEmail = `e2e-test-${Date.now()}@example.com`
  const testPassword = 'SecureTestPass123!'
  const testName = 'E2E Test User'

  // Step 1: Sign up a new test user
  await page.goto('/signup')
  await page.waitForLoadState('networkidle')

  // Fill signup form
  const nameInput = page.locator('input[name="name"], input#name')
  const emailInput = page.locator('input[name="email"], input#email, input[type="email"]')
  const passwordInput = page.locator(
    'input[name="password"], input#password, input[type="password"]'
  )

  await nameInput.fill(testName)
  await emailInput.fill(testEmail)
  await passwordInput.fill(testPassword)

  // Submit signup form
  const submitButton = page.locator('button[type="submit"]')
  await submitButton.click()

  // Wait for redirect to authenticated area (chat or dashboard)
  await page.waitForURL(/\/(chat|dashboard|settings)/, { timeout: 10000 })

  // Verify we're logged in by checking for authenticated UI elements
  await expect(page).not.toHaveURL(/\/(login|signup)/)

  // Save authentication state
  await page.context().storageState({ path: authFile })
})
