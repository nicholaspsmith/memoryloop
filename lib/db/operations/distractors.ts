import { getDb } from '@/lib/db/pg-client'
import { distractors, type Distractor } from '@/lib/db/drizzle-schema'
import { eq, asc } from 'drizzle-orm'

/**
 * Distractor Database Operations
 *
 * CRUD operations for multiple-choice distractors in PostgreSQL.
 * Distractors are AI-generated wrong answers for flashcards.
 * Each flashcard can have up to 3 distractors (positions 0, 1, 2).
 */

/**
 * Get all distractors for a flashcard, ordered by position
 */
export async function getDistractorsForFlashcard(flashcardId: string): Promise<Distractor[]> {
  const db = getDb()
  return db
    .select()
    .from(distractors)
    .where(eq(distractors.flashcardId, flashcardId))
    .orderBy(asc(distractors.position))
}

/**
 * Create distractors for a flashcard
 * @param flashcardId - The flashcard to add distractors to
 * @param contents - Array of distractor texts (should be exactly 3)
 * @returns Array of created Distractor records
 */
export async function createDistractors(
  flashcardId: string,
  contents: string[]
): Promise<Distractor[]> {
  const db = getDb()

  const rows = contents.map((content, position) => ({
    flashcardId,
    content,
    position,
  }))

  return db.insert(distractors).values(rows).returning()
}

/**
 * Delete all distractors for a flashcard
 * Useful when regenerating distractors or deleting a flashcard
 */
export async function deleteDistractorsForFlashcard(flashcardId: string): Promise<void> {
  const db = getDb()
  await db.delete(distractors).where(eq(distractors.flashcardId, flashcardId))
}
