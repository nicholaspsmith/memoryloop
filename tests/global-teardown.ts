/**
 * Global Setup/Teardown for Integration Tests
 *
 * The setup function runs before tests and returns a teardown function
 * that runs after all integration tests complete to clean up test data.
 * This prevents test data from accumulating in the database.
 */

import { config } from 'dotenv'
import path from 'path'

// Load environment variables
config({ path: path.resolve(process.cwd(), '.env.local') })

export default async function globalSetup() {
  // Return teardown function that runs after all tests
  return async () => {
    // Dynamic import to ensure env vars are loaded first
    const { cleanupTestUsers } = await import('./cleanup-test-users')

    console.log('\n[Global Teardown] Starting test cleanup...')
    const deletedCount = await cleanupTestUsers()

    if (deletedCount > 0) {
      console.log(`[Global Teardown] Cleanup complete. Deleted ${deletedCount} test users.`)
    } else {
      console.log('[Global Teardown] No test users to clean up.')
    }

    // Close database connection
    const { closeDb } = await import('@/lib/db/pg-client')
    await closeDb()
  }
}
