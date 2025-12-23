import { connect, Connection } from '@lancedb/lancedb'
import path from 'path'
import { withTimeout, TimeoutError } from './utils/timeout'

let dbConnection: Connection | null = null
let connectionPromise: Promise<Connection> | null = null
let schemaInitialized = false

// Schema initialization timeout: 30 seconds
const SCHEMA_INIT_TIMEOUT_MS = 30000

/**
 * Get LanceDB connection singleton
 * Creates a new connection if one doesn't exist, otherwise returns cached connection
 * Automatically initializes schema on first connection
 *
 * Uses dynamic import to delegate schema initialization to lib/db/schema.ts,
 * avoiding code duplication while breaking circular dependency.
 */
export async function getDbConnection(): Promise<Connection> {
  if (dbConnection) {
    return dbConnection
  }

  // If connection is already in progress, wait for it
  if (connectionPromise) {
    return connectionPromise
  }

  // Create new connection promise to prevent race conditions
  connectionPromise = withTimeout(
    (async () => {
      const dbPath = process.env.LANCEDB_PATH || path.join(process.cwd(), 'data', 'lancedb')

      dbConnection = await connect(dbPath)

      console.log(`[LanceDB] Connected at: ${dbPath}`)

      // Auto-initialize schema on first connection using dynamic import
      // Dynamic import breaks the circular dependency:
      // - Pass db connection to schema.ts to avoid it calling getDbConnection()
      // - We dynamically import initializeSchema() from schema.ts at runtime
      if (!schemaInitialized) {
        const { initializeSchema } = await import('./schema')
        await initializeSchema(dbConnection)
        schemaInitialized = true
      }

      return dbConnection
    })(),
    SCHEMA_INIT_TIMEOUT_MS,
    'schema_initialization'
  ).catch((error) => {
    // Reset connection state on timeout or error to allow retry
    connectionPromise = null
    dbConnection = null
    schemaInitialized = false

    // Log error with structured format
    if (TimeoutError.isTimeoutError(error)) {
      console.error(
        JSON.stringify({
          event: 'schema_init_timeout',
          timeout: SCHEMA_INIT_TIMEOUT_MS,
          error: error.message,
          timestamp: new Date().toISOString(),
        })
      )
    } else {
      console.error(
        JSON.stringify({
          event: 'schema_init_failed',
          error: error instanceof Error ? error.message : String(error),
          timestamp: new Date().toISOString(),
        })
      )
    }

    // Fail fast - propagate error instead of swallowing it
    throw error
  })

  return connectionPromise
}

/**
 * Close database connection (for cleanup in tests or shutdown)
 */
export async function closeDbConnection(): Promise<void> {
  if (dbConnection) {
    // LanceDB doesn't have explicit close, just set to null
    dbConnection = null
    console.log('[LanceDB] Connection closed')
  }
}

/**
 * Reset database connection (for test isolation)
 * Forces a new connection on next getDbConnection call
 *
 * Waits for any in-progress connection to complete before resetting
 * to prevent race conditions during concurrent operations.
 */
export async function resetDbConnection(): Promise<void> {
  // Wait for any in-progress connection to complete
  if (connectionPromise) {
    try {
      await connectionPromise
    } catch {
      // Ignore errors from the connection we're about to reset
    }
  }

  dbConnection = null
  connectionPromise = null
  schemaInitialized = false
}
