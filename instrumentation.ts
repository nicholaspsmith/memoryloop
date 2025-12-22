/**
 * Next.js Instrumentation
 *
 * This file runs once when the Next.js server starts.
 * Used to initialize LanceDB tables on startup.
 */

export async function register() {
  // Only run on the server
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { initializeSchema, isSchemaInitialized } = await import('@/lib/db/schema')

    try {
      const initialized = await isSchemaInitialized()
      if (!initialized) {
        console.log('[Instrumentation] Initializing LanceDB schema...')
        await initializeSchema()
        console.log('[Instrumentation] LanceDB schema initialized')
      } else {
        console.log('[Instrumentation] LanceDB schema already initialized')
      }
    } catch (error) {
      console.error('[Instrumentation] Failed to initialize LanceDB schema:', error)
      // Don't throw - let the app start anyway, tables can be created on first use
    }
  }
}
