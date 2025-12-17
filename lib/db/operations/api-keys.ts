import { getDb } from '@/lib/db/pg-client'
import { apiKeys } from '@/lib/db/drizzle-schema'
import { eq } from 'drizzle-orm'
import { encryptApiKey, decryptApiKey, maskApiKey } from '@/lib/encryption/api-key'
import type { ApiKey } from '@/lib/db/drizzle-schema'

/**
 * Database Operations for API Keys
 *
 * CRUD operations for user Claude API keys with encryption
 */

/**
 * Save or update user's API key
 *
 * @param userId - User ID
 * @param apiKey - Plaintext API key
 * @returns Saved API key record
 */
export async function saveUserApiKey(userId: string, apiKey: string): Promise<ApiKey> {
  const db = getDb()

  // Encrypt the API key
  const encryptedKey = await encryptApiKey(apiKey)
  const keyPreview = maskApiKey(apiKey)

  // Check if user already has an API key
  const existing = await getUserApiKeyRecord(userId)

  if (existing) {
    // Update existing key
    const [updated] = await db
      .update(apiKeys)
      .set({
        encryptedKey,
        keyPreview,
        isValid: true,
        lastValidatedAt: null, // Reset validation status on update
        updatedAt: new Date(),
      })
      .where(eq(apiKeys.userId, userId))
      .returning()

    return updated
  } else {
    // Insert new key
    const [created] = await db
      .insert(apiKeys)
      .values({
        userId,
        encryptedKey,
        keyPreview,
        isValid: true,
        lastValidatedAt: null,
      })
      .returning()

    return created
  }
}

/**
 * Get user's decrypted API key
 *
 * @param userId - User ID
 * @returns Plaintext API key or null if not found or decryption fails
 */
export async function getUserApiKey(userId: string): Promise<string | null> {
  const record = await getUserApiKeyRecord(userId)

  if (!record) {
    return null
  }

  return await decryptApiKey(record.encryptedKey)
}

/**
 * Get user's API key record (encrypted)
 *
 * @param userId - User ID
 * @returns API key record or null if not found
 */
export async function getUserApiKeyRecord(userId: string): Promise<ApiKey | null> {
  const db = getDb()

  const [record] = await db
    .select()
    .from(apiKeys)
    .where(eq(apiKeys.userId, userId))
    .limit(1)

  return record || null
}

/**
 * Delete user's API key
 *
 * @param userId - User ID
 * @returns True if deleted, false if not found
 */
export async function deleteUserApiKey(userId: string): Promise<boolean> {
  const db = getDb()

  const result = await db
    .delete(apiKeys)
    .where(eq(apiKeys.userId, userId))
    .returning()

  return result.length > 0
}

/**
 * Update API key validation status
 *
 * @param userId - User ID
 * @param isValid - Validation status
 */
export async function updateApiKeyValidation(
  userId: string,
  isValid: boolean
): Promise<void> {
  const db = getDb()

  await db
    .update(apiKeys)
    .set({
      isValid,
      lastValidatedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(apiKeys.userId, userId))
}
