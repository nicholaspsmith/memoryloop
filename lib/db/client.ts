import { connect, Connection } from '@lancedb/lancedb'
import path from 'path'

let dbConnection: Connection | null = null
let schemaInitialized = false

/**
 * Get LanceDB connection singleton
 * Creates a new connection if one doesn't exist, otherwise returns cached connection
 * Automatically initializes schema on first connection
 */
export async function getDbConnection(): Promise<Connection> {
  if (dbConnection) {
    return dbConnection
  }

  const dbPath = process.env.LANCEDB_PATH || path.join(process.cwd(), 'data', 'lancedb')

  dbConnection = await connect(dbPath)

  console.log(`✅ LanceDB connected at: ${dbPath}`)

  // Initialize schema on first connection
  if (!schemaInitialized) {
    await ensureSchemaInitialized(dbConnection)
    schemaInitialized = true
  }

  return dbConnection
}

/**
 * Ensure LanceDB schema is initialized
 * Creates messages and flashcards tables if they don't exist
 */
async function ensureSchemaInitialized(db: Connection): Promise<void> {
  try {
    const existingTables = await db.tableNames()

    // Create messages table if it doesn't exist
    if (!existingTables.includes('messages')) {
      console.log('🔨 Creating LanceDB messages table...')
      await db.createTable(
        'messages',
        [
          {
            id: '00000000-0000-0000-0000-000000000000',
            userId: '00000000-0000-0000-0000-000000000000',
            embedding: new Array(768).fill(0),
          },
        ],
        { mode: 'create' }
      )
      // Clean up init row
      const table = await db.openTable('messages')
      await table.delete("id = '00000000-0000-0000-0000-000000000000'")
      console.log('✅ Created messages table')
    }

    // Create flashcards table if it doesn't exist
    if (!existingTables.includes('flashcards')) {
      console.log('🔨 Creating LanceDB flashcards table...')
      await db.createTable(
        'flashcards',
        [
          {
            id: '00000000-0000-0000-0000-000000000000',
            userId: '00000000-0000-0000-0000-000000000000',
            embedding: new Array(768).fill(0),
          },
        ],
        { mode: 'create' }
      )
      // Clean up init row
      const table = await db.openTable('flashcards')
      await table.delete("id = '00000000-0000-0000-0000-000000000000'")
      console.log('✅ Created flashcards table')
    }

    console.log('✅ LanceDB schema initialized')
  } catch (error) {
    console.error('❌ Failed to initialize LanceDB schema:', error)
    // Don't throw - allow app to continue even if schema init fails
    // Operations will fail gracefully with error logging
  }
}

/**
 * Close database connection (for cleanup in tests or shutdown)
 */
export async function closeDbConnection(): Promise<void> {
  if (dbConnection) {
    // LanceDB doesn't have explicit close, just set to null
    dbConnection = null
    console.log('✅ LanceDB connection closed')
  }
}

/**
 * Reset database connection (for test isolation)
 * Forces a new connection on next getDbConnection call
 */
export function resetDbConnection(): void {
  dbConnection = null
  schemaInitialized = false
}
