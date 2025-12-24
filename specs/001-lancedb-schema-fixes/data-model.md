# Data Model: LanceDB Schema Initialization Fixes

**Feature**: 001-lancedb-schema-fixes
**Date**: 2025-12-23

## Overview

This feature is a **refactoring effort** that does not introduce new data entities or modify existing LanceDB table schemas. The data model documentation focuses on the **internal state** managed during schema initialization.

---

## Schema Initialization State

### Entity: InitializationState

**Purpose**: Track the state of schema initialization to support atomic rollback and timeout behavior.

#### State Variables

| Variable                  | Type                          | Location                                           | Purpose                                                                            |
| ------------------------- | ----------------------------- | -------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `schemaInitialized`       | `boolean`                     | `lib/db/client.ts`                                 | Tracks whether schema has been successfully initialized for the current connection |
| `connectionPromise`       | `Promise<Connection> \| null` | `lib/db/client.ts`                                 | Prevents concurrent initialization attempts (existing pattern)                     |
| `createdTables`           | `string[]`                    | `lib/db/schema.ts` (local to `initializeSchema()`) | Tracks tables created during current initialization session for rollback           |
| `initializationStartTime` | `number` (timestamp)          | Implicit (captured by timeout wrapper)             | Used by timeout logic to determine if 30-second limit exceeded                     |

#### State Transitions

```
INITIAL STATE: schemaInitialized = false, connectionPromise = null
       ↓
   getDbConnection() called
       ↓
   connectionPromise = <pending Promise>
       ↓
   [Create tables, track in createdTables[]]
       ↓
   ┌─────────────┬─────────────┐
   │             │             │
SUCCESS        FAILURE      TIMEOUT
   │             │             │
   ↓             ↓             ↓
schemaInitialized = true    Rollback:        Rollback:
connectionPromise = null    - dropTable()    - dropTable()
                            for each in      for each in
                            createdTables    createdTables
                                 │                │
                                 ↓                ↓
                            Reset state:     Reset state:
                            schemaInitialized    schemaInitialized
                            = false              = false
                            connectionPromise    connectionPromise
                            = null               = null
                                 │                │
                                 ↓                ↓
                            Throw error      Throw TimeoutError
```

#### Validation Rules

1. **Atomicity**: `schemaInitialized` is set to `true` ONLY if all tables are created successfully
2. **Idempotency**: Repeated calls to `getDbConnection()` after success return cached connection
3. **Retry-Safety**: On failure or timeout, state is reset to allow clean retry on next call
4. **Concurrency**: `connectionPromise` ensures only one initialization runs at a time

---

## Existing LanceDB Table Schemas (Unchanged)

These schemas are **NOT modified** by this feature. Documented here for completeness.

### Table: messages

**Purpose**: Store message embeddings for semantic search

| Field       | Type                         | Description                       | Constraints            |
| ----------- | ---------------------------- | --------------------------------- | ---------------------- |
| `id`        | `string` (UUID)              | Message ID from PostgreSQL        | Primary key            |
| `userId`    | `string` (UUID)              | User ID from PostgreSQL           | Required               |
| `embedding` | `float32[]` (768 dimensions) | Nomic-embed-text embedding vector | Required, length = 768 |

**Relationships**:

- `id` references `messages.id` in PostgreSQL (source of truth for message content)
- `userId` references `users.id` in PostgreSQL

### Table: flashcards

**Purpose**: Store flashcard embeddings for semantic search

| Field       | Type                         | Description                       | Constraints            |
| ----------- | ---------------------------- | --------------------------------- | ---------------------- |
| `id`        | `string` (UUID)              | Flashcard ID from PostgreSQL      | Primary key            |
| `userId`    | `string` (UUID)              | User ID from PostgreSQL           | Required               |
| `embedding` | `float32[]` (768 dimensions) | Nomic-embed-text embedding vector | Required, length = 768 |

**Relationships**:

- `id` references `flashcards.id` in PostgreSQL (source of truth for flashcard content)
- `userId` references `users.id` in PostgreSQL

---

## Error States

### TimeoutError

**Fields**:

- `name`: `"TimeoutError"`
- `message`: `"Operation 'schema_initialization' timed out after 30000ms"`
- `operation`: `"schema_initialization"` (custom field)

**Trigger**: Schema initialization exceeds 30-second limit (FR-012)

**Recovery**: Reset connection state, allow retry on next `getDbConnection()` call

### Schema Initialization Failure

**Fields**:

- Standard `Error` with enhanced message:
  ```
  Schema initialization failed after creating 2 tables.
  Rollback completed. Original error: [original error message]
  ```

**Trigger**: Any table creation fails (e.g., permissions, disk space, LanceDB error)

**Recovery**:

1. Roll back all tables in `createdTables[]` using `dropTable()`
2. Reset `schemaInitialized = false`, `connectionPromise = null`
3. Propagate error to caller (fail fast - FR-003)
4. Next `getDbConnection()` call attempts fresh initialization

---

## Data Lifecycle

### Initialization Session Lifecycle

1. **Start**: `getDbConnection()` called, `createdTables = []`
2. **Table Creation**: For each table not in `existingTables`, call `db.createTable()` and push to `createdTables[]`
3. **Cleanup**: For each table in `createdTables`, delete init row with `id = '00000000-0000-0000-0000-000000000000'`
4. **Success**: Set `schemaInitialized = true`, return connection
5. **Failure/Timeout**: For each table in `createdTables`, call `db.dropTable()`, reset state, throw error

### State Persistence

**Note**: Schema initialization state is **in-memory only** (not persisted to disk).

- On application restart, `schemaInitialized = false` (state is lost)
- This is intentional: allows fresh validation that tables exist on each startup
- LanceDB file system serves as source of truth (checked via `db.tableNames()`)

---

## Assumptions

1. **LanceDB file persistence**: Tables persist on disk across application restarts
2. **Single LanceDB instance**: No distributed/multi-instance scenarios
3. **File system reliability**: `db.tableNames()` accurately reflects disk state
4. **No concurrent external modifications**: No other processes creating/dropping LanceDB tables during initialization
5. **Backward compatibility**: Existing deployments with tables already created continue to work (skip creation, only validate presence)

---

## Out of Scope

- **Schema versioning**: No migration support for schema changes
- **Multi-instance coordination**: No distributed locking for concurrent initializations across processes
- **Partial recovery**: No attempt to resume from partially created state (always rollback to clean slate)
- **Performance optimization**: No caching of `db.tableNames()` results
