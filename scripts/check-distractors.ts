import { config } from 'dotenv'
import { resolve } from 'path'
config({ path: resolve(process.cwd(), '.env.local') })

async function check() {
  const { getDb } = await import('../lib/db')
  const { distractors, flashcards } = await import('../lib/db/drizzle-schema')
  const { count, eq } = await import('drizzle-orm')

  const db = getDb()

  // Count cards with distractors
  const [distCount] = await db.select({ count: count() }).from(distractors)

  // Get unique flashcard IDs with distractors
  const uniqueFlashcardIds = await db
    .selectDistinct({ flashcardId: distractors.flashcardId })
    .from(distractors)

  // Count active flashcards
  const [activeCount] = await db
    .select({ count: count() })
    .from(flashcards)
    .where(eq(flashcards.status, 'active'))

  console.log('Total distractors:', distCount.count)
  console.log('Unique flashcards with distractors:', uniqueFlashcardIds.length)
  console.log('Active flashcards:', activeCount.count)

  // Check a card without distractors
  const cardsWithoutDistractors = await db
    .select({
      id: flashcards.id,
      question: flashcards.question,
      answer: flashcards.answer,
    })
    .from(flashcards)
    .where(eq(flashcards.status, 'active'))
    .limit(5)

  console.log('\nSample cards (check if they have distractors):')
  for (const card of cardsWithoutDistractors) {
    const cardDistractors = await db
      .select()
      .from(distractors)
      .where(eq(distractors.flashcardId, card.id))
    console.log('Card ' + card.id + ': ' + cardDistractors.length + ' distractors')
    console.log('  Q: ' + card.question.substring(0, 50) + '...')
    console.log('  A: ' + card.answer.substring(0, 50) + '...')
  }

  process.exit(0)
}

check().catch((e) => {
  console.error(e)
  process.exit(1)
})
