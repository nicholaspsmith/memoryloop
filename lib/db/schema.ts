import { getDbConnection } from './client'
import { createEmptyCard } from 'ts-fsrs'

// Prevent concurrent initialization
let initializationPromise: Promise<void> | null = null

/**
 * Initialize all database tables for MemoryLoop
 * Creates tables with initial schema rows (LanceDB requires at least one row)
 * Thread-safe: prevents concurrent initialization attempts
 */
export async function initializeSchema() {
  // If already initializing, wait for that to complete
  if (initializationPromise) {
    return initializationPromise
  }

  initializationPromise = performInitialization()

  try {
    await initializationPromise
  } finally {
    initializationPromise = null
  }
}

async function performInitialization() {
  const db = await getDbConnection()
  const existingTables = await db.tableNames()

  console.log('🔨 Creating LanceDB schema...')

  // 1. Messages table (with vector column for embeddings)
  if (!existingTables.includes('messages')) {
    await db.createTable(
      'messages',
      [
        {
          id: '00000000-0000-0000-0000-000000000000',
          conversationId: '00000000-0000-0000-0000-000000000000',
          userId: '00000000-0000-0000-0000-000000000000',
          role: 'user',
          content: 'Init message for schema creation',
          embedding: new Array(768).fill(0), // Use actual vector for type inference
          createdAt: Date.now(),
          hasFlashcards: false,
        },
      ],
      { mode: 'create' }
    )
    console.log('✅ Created messages table')
  }

  // 2. Flashcards table (with vector column and FSRS state)
  if (!existingTables.includes('flashcards')) {
    const emptyFSRSCard = createEmptyCard()

    // Convert FSRS Card dates to timestamps for LanceDB
    // Use 0 for null values so LanceDB can infer the type as number
    const fsrsStateForSchema = {
      ...emptyFSRSCard,
      due: emptyFSRSCard.due.getTime(),
      last_review: emptyFSRSCard.last_review?.getTime() || 0,
    }

    await db.createTable(
      'flashcards',
      [
        {
          id: '00000000-0000-0000-0000-000000000000',
          userId: '00000000-0000-0000-0000-000000000000',
          conversationId: '00000000-0000-0000-0000-000000000000',
          messageId: '00000000-0000-0000-0000-000000000000',
          question: 'Init question',
          answer: 'Init answer',
          questionEmbedding: new Array(768).fill(0),
          createdAt: Date.now(),
          fsrsState: fsrsStateForSchema, // FSRS Card object with timestamps
        },
      ],
      { mode: 'create' }
    )
    console.log('✅ Created flashcards table')
  }

  // 3. ReviewLogs table
  if (!existingTables.includes('review_logs')) {
    await db.createTable(
      'review_logs',
      [
        {
          id: '00000000-0000-0000-0000-000000000000',
          flashcardId: '00000000-0000-0000-0000-000000000000',
          userId: '00000000-0000-0000-0000-000000000000',
          rating: 3, // Rating.Good
          state: 0, // State.New
          due: Date.now(), // Use timestamp instead of Date object
          stability: 0,
          difficulty: 0,
          elapsed_days: 0,
          last_elapsed_days: 0,
          scheduled_days: 0,
          review: Date.now(), // Use timestamp instead of Date object
        },
      ],
      { mode: 'create' }
    )
    console.log('✅ Created review_logs table')
  }

  // Cleanup init rows from newly created tables
  const tablesCreated = (await db.tableNames()).filter((t) => !existingTables.includes(t))

  if (tablesCreated.length > 0) {
    console.log('🧹 Cleaning up init rows...')

    for (const tableName of tablesCreated) {
      const table = await db.openTable(tableName)
      await table.delete("id = '00000000-0000-0000-0000-000000000000'")
    }
  }

  console.log('✅ Database schema initialized successfully')
}

/**
 * Check if database schema is already initialized
 */
export async function isSchemaInitialized(): Promise<boolean> {
  try {
    const db = await getDbConnection()
    const tableNames = await db.tableNames()
    const requiredTables = ['messages', 'flashcards', 'review_logs']

    return requiredTables.every((table) => tableNames.includes(table))
  } catch (error) {
    return false
  }
}
