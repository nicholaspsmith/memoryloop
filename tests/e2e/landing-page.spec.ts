import { test, expect } from '@playwright/test'

/**
 * Landing Page E2E Tests
 *
 * Tests landing page behavior for both unauthenticated and authenticated users.
 * Covers headline visibility, How It Works section, CTA navigation, and redirects.
 *
 * Test IDs:
 * - T003 [US1]: Unauthenticated user sees landing page at root URL
 * - T008 [US2]: How It Works section visible with 3 steps
 * - T012 [US3]: CTA buttons navigate correctly
 * - T017 [US4]: Authenticated user redirected from / to /goals
 */

test.describe('Landing Page - Unauthenticated Users', () => {
  // Override storage state to test as unauthenticated user
  test.use({ storageState: { cookies: [], origins: [] } })

  test('T003 [US1] - displays landing page with headline and CTA @smoke', async ({ page }) => {
    // Navigate to root URL
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // Verify we're on the landing page (not redirected)
    await expect(page).toHaveURL('/')

    // Verify headline is visible
    const headline = page.locator('h1:has-text("Your AI-powered skill tree for learning anything")')
    await expect(headline).toBeVisible()

    // Verify primary CTA button is visible
    const getStartedButton = page.locator('a:has-text("Get Started Free")').first()
    await expect(getStartedButton).toBeVisible()

    // Verify the button links to signup
    await expect(getStartedButton).toHaveAttribute('href', '/signup')
  })

  test('T008 [US2] - displays How It Works section with 3 steps @comprehensive', async ({
    page,
  }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // Verify How It Works heading is visible
    const howItWorksHeading = page.locator('h2:has-text("How It Works")')
    await expect(howItWorksHeading).toBeVisible()

    // Verify all 3 steps are visible
    const step1 = page.locator('h3:has-text("Set Your Goal")')
    await expect(step1).toBeVisible()

    const step2 = page.locator('h3:has-text("Study with AI")')
    await expect(step2).toBeVisible()

    const step3 = page.locator('h3:has-text("Review & Remember")')
    await expect(step3).toBeVisible()

    // Verify step numbers are visible (1, 2, 3)
    const stepNumber1 = page.locator('div.rounded-full:has-text("1")').first()
    const stepNumber2 = page.locator('div.rounded-full:has-text("2")').first()
    const stepNumber3 = page.locator('div.rounded-full:has-text("3")').first()

    await expect(stepNumber1).toBeVisible()
    await expect(stepNumber2).toBeVisible()
    await expect(stepNumber3).toBeVisible()
  })

  test('T012 [US3] - CTA buttons navigate correctly @comprehensive', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // Test 1: Verify "Get Started Free" button in hero section
    const heroGetStartedButton = page
      .locator('section')
      .first()
      .locator('a:has-text("Get Started Free")')
    await expect(heroGetStartedButton).toBeVisible()
    await expect(heroGetStartedButton).toHaveAttribute('href', '/signup')

    // Test 2: Verify "Sign In" link in hero section
    const signInLink = page.locator('a:has-text("Sign In")').first()
    await expect(signInLink).toBeVisible()
    await expect(signInLink).toHaveAttribute('href', '/login')

    // Test 3: Verify "Create Free Account" button in CTA section
    const ctaButton = page.locator('a:has-text("Create Free Account")')
    await expect(ctaButton).toBeVisible()
    await expect(ctaButton).toHaveAttribute('href', '/signup')

    // Test 4: Click "Get Started Free" and verify navigation
    await heroGetStartedButton.click()
    await page.waitForURL('**/signup')
    await expect(page).toHaveURL(/\/signup/)

    // Navigate back to landing page
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // Test 5: Click "Sign In" and verify navigation
    await signInLink.click()
    await page.waitForURL('**/login')
    await expect(page).toHaveURL(/\/login/)
  })

  test('verifies landing page structure and content @comprehensive', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // Verify logo is visible
    const logo = page.locator('img[alt="Loopi Logo"]')
    await expect(logo).toBeVisible()

    // Verify subheadline is visible
    const subheadline = page.locator(
      'p:has-text("Set any learning goal, and Loopi builds your personalized path")'
    )
    await expect(subheadline).toBeVisible()

    // Verify CTA section heading is visible
    const ctaHeading = page.locator('h2:has-text("Ready to start learning?")')
    await expect(ctaHeading).toBeVisible()
  })
})

test.describe('Landing Page - Authenticated Users', () => {
  // Use default authenticated storage state from setup

  test('T017 [US4] - redirects authenticated user from / to /goals @smoke', async ({ page }) => {
    // Try to navigate to root URL as authenticated user
    await page.goto('/')

    // Should be redirected to /goals
    await page.waitForURL('**/goals', { timeout: 10000 })
    await expect(page).toHaveURL(/\/goals/)

    // Verify we're NOT on the landing page by checking for goals-specific content
    // The landing page headline should NOT be visible
    const landingHeadline = page.locator(
      'h1:has-text("Your AI-powered skill tree for learning anything")'
    )
    await expect(landingHeadline).not.toBeVisible()
  })

  test('authenticated user cannot access landing page directly @comprehensive', async ({
    page,
  }) => {
    // Navigate to root
    await page.goto('/', { waitUntil: 'networkidle' })

    // Should redirect to goals page
    await expect(page).toHaveURL(/\/goals/)

    // Verify landing page components are not present
    const howItWorksSection = page.locator('h2:has-text("How It Works")')
    await expect(howItWorksSection).not.toBeVisible()

    const ctaSection = page.locator('h2:has-text("Ready to start learning?")')
    await expect(ctaSection).not.toBeVisible()
  })
})
