/**
 * Database query retry utility for handling transient connection failures.
 *
 * Transient failures can occur when:
 * - Connection pool connections become stale during long operations
 * - Network interruptions occur
 * - Database restarts or failovers happen
 */

export interface RetryOptions {
  maxAttempts?: number
  delayMs?: number
  backoffMultiplier?: number
  maxDelayMs?: number
  onRetry?: (attempt: number, error: Error) => void
}

const DEFAULT_OPTIONS: Required<Omit<RetryOptions, 'onRetry'>> = {
  maxAttempts: 3,
  delayMs: 100,
  backoffMultiplier: 2,
  maxDelayMs: 2000,
}

/**
 * Check if an error is a transient database error that should be retried.
 *
 * Transient errors include:
 * - Connection closed/reset errors
 * - "Failed query" errors from postgres.js (connection issues)
 * - Timeout errors
 * - Connection pool exhaustion
 */
export function isTransientDbError(error: unknown): boolean {
  if (!(error instanceof Error)) return false

  const message = error.message.toLowerCase()
  const transientPatterns = [
    'failed query',
    'connection closed',
    'connection reset',
    'connection terminated',
    'connection refused',
    'econnreset',
    'econnrefused',
    'etimedout',
    'socket hang up',
    'pool exhausted',
    'too many connections',
    'cannot acquire connection',
    'connection timeout',
  ]

  return transientPatterns.some((pattern) => message.includes(pattern))
}

/**
 * Execute a database operation with automatic retry on transient failures.
 *
 * @example
 * ```ts
 * const result = await withRetry(
 *   () => db.select().from(users).where(eq(users.id, userId)),
 *   { maxAttempts: 3, onRetry: (attempt, error) => console.warn(`Retry ${attempt}`, error) }
 * )
 * ```
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const { maxAttempts, delayMs, backoffMultiplier, maxDelayMs } = {
    ...DEFAULT_OPTIONS,
    ...options,
  }

  let lastError: Error | undefined
  let currentDelay = delayMs

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation()
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))

      // Only retry transient errors
      if (!isTransientDbError(error) || attempt === maxAttempts) {
        throw lastError
      }

      // Call onRetry callback if provided
      options.onRetry?.(attempt, lastError)

      // Wait before retrying with exponential backoff
      await sleep(currentDelay)
      currentDelay = Math.min(currentDelay * backoffMultiplier, maxDelayMs)
    }
  }

  // This should never be reached, but TypeScript needs it
  throw lastError ?? new Error('Retry failed with unknown error')
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
