/**
 * Custom timeout error class for schema initialization operations
 */
export class TimeoutError extends Error {
  constructor(
    message: string,
    public readonly operation: string
  ) {
    super(message)
    this.name = 'TimeoutError'
    // Maintains proper stack trace for where error was thrown (V8 only)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, TimeoutError)
    }
  }

  /**
   * Type guard to check if an error is a TimeoutError
   */
  static isTimeoutError(error: unknown): error is TimeoutError {
    return error instanceof TimeoutError
  }
}

/**
 * Wraps a promise with a timeout
 *
 * @param promise - The promise to wrap
 * @param timeoutMs - Timeout in milliseconds
 * @param operationName - Name of the operation for error messaging
 * @returns Promise that rejects with TimeoutError if timeout is exceeded
 *
 * @example
 * const result = await withTimeout(
 *   slowOperation(),
 *   30000,
 *   'slow_operation'
 * )
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  operationName: string
): Promise<T> {
  let timeoutId: NodeJS.Timeout | null = null

  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => {
          reject(
            new TimeoutError(
              `Operation '${operationName}' timed out after ${timeoutMs}ms`,
              operationName
            )
          )
        }, timeoutMs)
      }),
    ])
  } finally {
    // Always clear the timeout to prevent memory leaks
    if (timeoutId) {
      clearTimeout(timeoutId)
    }
  }
}
