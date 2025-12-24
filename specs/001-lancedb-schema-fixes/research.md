# Research Findings: LanceDB Schema Initialization Fixes

**Date**: 2025-12-23
**Feature**: 001-lancedb-schema-fixes

## Decision 1: Dynamic Import Pattern for Circular Dependency Resolution

### Decision

Use TypeScript's native `import()` dynamic import to call `initializeSchema()` from `lib/db/client.ts`, breaking the circular dependency with `lib/db/schema.ts`.

### Rationale

- **Native TypeScript support**: `import()` is a standard ECMAScript feature with first-class TypeScript support
- **Type-safe**: TypeScript automatically infers types from dynamically imported modules
- **Next.js compatible**: Works perfectly in Next.js 16 server environment (server components, API routes)
- **Runtime resolution**: Import happens at runtime, not module load time, breaking the circular dependency
- **No build changes**: Doesn't require webpack/Next.js configuration changes

### Pattern/Syntax

```typescript
// In lib/db/client.ts
if (!schemaInitialized) {
  try {
    const { initializeSchema } = await import('./schema')
    await initializeSchema()
    schemaInitialized = true
  } catch (error) {
    // Error handling
  }
}
```

### Type Safety

- TypeScript infers the type of `initializeSchema` from the module export
- No manual type annotations needed
- Full IntelliSense and type checking support
- Maintains compile-time safety despite runtime import

### Error Handling Best Practices

1. **Always wrap in try-catch**: Dynamic imports can fail (module not found, syntax errors)
2. **Provide context**: Log which module failed and why
3. **Decide failure strategy**: Throw (fail fast) or continue gracefully
4. **Separate import and execution errors**: If needed, use nested try-catch

###Alternatives Considered

- **Dependency injection**: Rejected - adds unnecessary complexity for this use case
- **Separate initialization module**: Rejected - creates a third module when dynamic import solves it cleanly
- **Refactor to remove circular dependency**: Rejected - current architecture is sound; only initialization needs the circular call

---

## Decision 2: LanceDB Rollback Pattern for Atomic Initialization

### Decision

Track tables created during initialization in an array, and use `db.dropTable(tableName)` in a catch block to roll back partial creations.

### Rationale

- **Atomic behavior**: Ensures either all tables are created or none remain
- **Clean state for retry**: Next initialization attempt starts fresh
- **Simple tracking**: Build `createdTables[]` array incrementally during creation
- **Idempotent cleanup**: Wrap `dropTable()` in try-catch to handle "not found" errors

### Rollback Implementation Pattern

```typescript
async function initializeSchema() {
  const db = await getDbConnection()
  const existingTables = await db.tableNames()
  const createdTables: string[] = []

  try {
    // Create tables, tracking each success
    if (!existingTables.includes('messages')) {
      await db.createTable('messages', [...])
      createdTables.push('messages')
    }

    if (!existingTables.includes('flashcards')) {
      await db.createTable('flashcards', [...])
      createdTables.push('flashcards')
    }

    // Cleanup init rows...

  } catch (error) {
    // ATOMIC ROLLBACK: Delete all tables created during this session
    console.error(`🔄 Rolling back ${createdTables.length} tables...`)

    for (const tableName of createdTables) {
      try {
        await db.dropTable(tableName)
        console.log(`[LanceDB] Dropped table ${tableName} during rollback`)
      } catch (dropError) {
        // Best-effort cleanup - log but don't fail the rollback
        console.error(`[LanceDB] Failed to drop ${tableName}:`, dropError)
      }
    }

    throw new Error(
      `Schema initialization failed after creating ${createdTables.length} tables. ` +
      `Rollback completed. Original error: ${error instanceof Error ? error.message : String(error)}`
    )
  }
}
```

### LanceDB API Details

- **Method**: `Connection.dropTable(tableName: string): Promise<void>`
- **No `ignore_missing` parameter** in TypeScript SDK (unlike Python/Rust)
- **Solution**: Wrap each `dropTable()` call in try-catch for idempotency
- **Best-effort cleanup**: If rollback itself fails (permissions, I/O), log the error but continue - database is already in bad state

### Key Insights

1. **Track during creation**: Build `createdTables` array incrementally, not at the end
2. **Rollback in catch only**: Don't use `finally` - rollback should only happen on failure
3. **Idempotent rollback**: The try-catch wrapper around `dropTable()` makes it safe to call multiple times
4. **Best-effort cleanup**: If rollback fails, log and continue - don't throw another error

### Alternatives Considered

- **LanceDB transactions**: Rejected - LanceDB doesn't support ACID transactions
- **Rollback in finally block**: Rejected - cleanup should only happen on failure, not success
- **Keep partial state**: Rejected - violates atomic behavior requirement (FR-011, SC-009)

---

## Decision 3: Timeout Implementation for Schema Initialization

### Decision

Use `Promise.race()` with a timeout promise to enforce 30-second limit on schema initialization.

### Rationale

- **Standard pattern**: `Promise.race()` is the idiomatic JavaScript/TypeScript timeout pattern
- **Clean error messages**: Custom `TimeoutError` class provides clear context
- **Proper cleanup**: `finally` block ensures timeout timer is always cleared
- **Retry-friendly**: Resets connection state on timeout to allow subsequent retries
- **Works with existing patterns**: Integrates cleanly with `connectionPromise` pattern

### Timeout Implementation Pattern

```typescript
class TimeoutError extends Error {
  constructor(
    message: string,
    public readonly operation: string
  ) {
    super(message)
    this.name = 'TimeoutError'
  }

  static isTimeoutError(error: unknown): error is TimeoutError {
    return error instanceof TimeoutError
  }
}

async function withTimeout<T>(
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
    if (timeoutId) clearTimeout(timeoutId)
  }
}

// Usage in getDbConnection()
const SCHEMA_INIT_TIMEOUT_MS = 30000 // 30 seconds

connectionPromise = withTimeout(
  (async () => {
    const dbPath = process.env.LANCEDB_PATH || path.join(process.cwd(), 'data', 'lancedb')
    dbConnection = await connect(dbPath)

    if (!schemaInitialized) {
      const { initializeSchema } = await import('./schema')
      await initializeSchema()
      schemaInitialized = true
    }

    return dbConnection
  })(),
  SCHEMA_INIT_TIMEOUT_MS,
  'schema_initialization'
).catch((error) => {
  // Reset connection state on timeout to allow retry
  connectionPromise = null
  dbConnection = null
  throw error
})
```

### Key Features

1. **Generic and reusable**: Can be extracted to a utility module
2. **Preserves connectionPromise pattern**: Only one initialization happens at a time
3. **Proper cleanup**: Timer is always cleared in `finally` block
4. **Clear error messages**: `TimeoutError` includes operation context
5. **Type-safe error handling**: `TimeoutError.isTimeoutError()` provides type guard
6. **Retry-friendly**: Resets `connectionPromise` on timeout

### Error Message Example

```
Operation 'schema_initialization' timed out after 30000ms
```

### Alternatives Considered

- **AbortController pattern**: Rejected - LanceDB API doesn't support AbortSignal; adds complexity without benefit
- **Global timeout**: Rejected - timeout should be specific to schema initialization, not entire connection
- **No timeout**: Rejected - violates FR-012 and SC-010 requirements

---

## Decision 4: Testing Rollback Logic with Vitest

### Decision

Use Vitest's `vi.spyOn()` with `mockImplementation()` to simulate partial failures and verify rollback behavior.

### Rationale

- **Granular control**: `mockImplementation()` allows simulating success for first N calls, then failure
- **Verification**: `vi.spyOn()` tracks all calls and arguments for assertions
- **Existing patterns**: Codebase already uses this pattern in `tests/unit/lib/claude/client.test.ts`
- **No external dependencies**: Uses built-in Vitest mocking capabilities

### Testing Pattern

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { getDbConnection } from '@/lib/db/client'
import type { Connection } from '@lancedb/lancedb'

describe('Schema Initialization Rollback', () => {
  let db: Connection
  let createTableSpy: any
  let dropTableSpy: any

  beforeEach(async () => {
    db = await getDbConnection()
    vi.resetAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should rollback created tables when initialization fails partway through', async () => {
    const createdTables: string[] = []

    // Mock createTable to track successes and fail on 3rd call
    createTableSpy = vi.spyOn(db, 'createTable').mockImplementation(async (name: string) => {
      createdTables.push(name)
      if (createdTables.length <= 2) {
        return { name } // Success
      }
      throw new Error(`Failed to create ${name}`)
    })

    // Spy on dropTable to verify cleanup
    dropTableSpy = vi.spyOn(db, 'dropTable').mockResolvedValue(undefined)

    // Attempt initialization - should fail
    await expect(initializeSchema()).rejects.toThrow('Failed to create')

    // Verify rollback behavior
    expect(createTableSpy).toHaveBeenCalledTimes(3)
    expect(dropTableSpy).toHaveBeenCalledTimes(2)

    // Verify specific tables were cleaned up
    expect(dropTableSpy).toHaveBeenNthCalledWith(1, createdTables[0])
    expect(dropTableSpy).toHaveBeenNthCalledWith(2, createdTables[1])
  })

  it('should not call cleanup if no tables were created', async () => {
    // Mock immediate failure (before any table creation)
    createTableSpy = vi.spyOn(db, 'createTable').mockRejectedValue(new Error('Immediate failure'))

    dropTableSpy = vi.spyOn(db, 'dropTable')

    await expect(initializeSchema()).rejects.toThrow()

    // No cleanup needed since no tables were created
    expect(dropTableSpy).not.toHaveBeenCalled()
  })

  it('should handle timeout during schema initialization', async () => {
    // Mock createTable to hang indefinitely
    createTableSpy = vi.spyOn(db, 'createTable').mockImplementation(() => new Promise(() => {})) // Never resolves

    // Test with shortened timeout for faster test execution
    await expect(withTimeout(initializeSchema(), 100, 'test_init')).rejects.toThrow(
      'timed out after 100ms'
    )
  })
})
```

### Key Vitest Patterns

1. **Sequential mock values**: `.mockResolvedValueOnce(...).mockRejectedValueOnce(...)` for sequential call outcomes
2. **Spy to verify calls**: `vi.spyOn(object, 'method')` tracks all calls without mocking
3. **Custom implementation**: `.mockImplementation((args) => { ... })` for complex behavior simulation
4. **Call verification**: `expect(spy).toHaveBeenNthCalledWith(n, expectedArgs)` to verify specific calls
5. **Promise rejection testing**: `await expect(promise).rejects.toThrow('message')`

### Codebase Examples

- `tests/unit/lib/claude/client.test.ts:385`: Simple rejection for all calls
- `tests/unit/lib/embeddings/ollama.test.ts:172-185`: Chaining multiple mock values
- `tests/integration/message-embeddings.test.ts:140-145`: Spy with timing simulation

### Alternatives Considered

- **Manual mocks in `__mocks__` directory**: Rejected - too heavyweight for unit tests
- **Test database with real failures**: Rejected - flaky and slow; mocking is more reliable
- **Integration tests only**: Rejected - unit tests provide faster feedback

---

## Summary

All four technical decisions have clear patterns and no unknowns remaining:

1. ✅ **Dynamic Import**: Use `await import('./schema')` - type-safe, Next.js compatible
2. ✅ **Rollback**: Track `createdTables[]` array, use `db.dropTable()` in catch block
3. ✅ **Timeout**: Use `Promise.race()` with custom `TimeoutError` class
4. ✅ **Testing**: Use `vi.spyOn()` with `.mockImplementation()` to simulate partial failures

**Ready to proceed to Phase 1: Design & Contracts**
