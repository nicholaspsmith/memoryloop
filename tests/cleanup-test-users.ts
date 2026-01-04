/**
 * Test Cleanup Utility
 *
 * Deletes all test users (email ending with @example.com) and their cascaded data.
 * Should be run after integration tests to prevent data accumulation.
 */

import { getDb } from '@/lib/db/pg-client'
import { users } from '@/lib/db/drizzle-schema'
import { like } from 'drizzle-orm'

export async function cleanupTestUsers(): Promise<number> {
  try {
    const db = getDb()
    const result = await db
      .delete(users)
      .where(like(users.email, '%@example.com'))
      .returning({ id: users.id })

    console.log(`[Test Cleanup] Deleted ${result.length} test users`)
    return result.length
  } catch (error) {
    console.error('[Test Cleanup] Failed to cleanup test users:', error)
    return 0
  }
}
