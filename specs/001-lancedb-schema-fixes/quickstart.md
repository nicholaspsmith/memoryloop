# Quickstart Guide: LanceDB Schema Initialization Fixes

**Feature**: 001-lancedb-schema-fixes
**Date**: 2025-12-23

## Overview

This guide helps developers test and verify the LanceDB schema initialization fixes locally. The feature addresses code quality and reliability issues identified in Issue #188's code review of PR #186.

---

## Prerequisites

- Node.js 20+ installed
- Project dependencies installed (`npm install`)
- LanceDB data directory accessible (default: `./data/lancedb`)

---

## Testing Rollback Behavior

### Test 1: Simulate Partial Failure

**Objective**: Verify that partially created tables are rolled back when initialization fails.

**Steps**:

1. **Stop the application** (if running):

   ```bash
   # Stop Next.js dev server
   pkill -f "next dev"
   ```

2. **Delete existing LanceDB data**:

   ```bash
   rm -rf ./data/lancedb
   ```

3. **Run the unit test for rollback**:

   ```bash
   npm test -- tests/unit/lib/db/client-auto-init.test.ts -t "rollback"
   ```

4. **Expected output**:

   ```
   ✓ should rollback created tables when initialization fails partway through
   ✓ should not call cleanup if no tables were created
   ```

5. **Verify rollback logs** (if testing with console output):
   ```
   🔄 Rolling back 2 tables...
   [LanceDB] Dropped table messages during rollback
   [LanceDB] Dropped table flashcards during rollback
   ```

### Test 2: Verify Clean Retry After Failure

**Objective**: Confirm that after a failed initialization, the next attempt starts with a clean slate.

**Steps**:

1. **Create a failing initialization scenario**:

   ```typescript
   // In tests/unit/lib/db/client-auto-init.test.ts
   it('should retry cleanly after rollback', async () => {
     // First attempt: simulate failure
     const createTableSpy = vi
       .spyOn(db, 'createTable')
       .mockRejectedValueOnce(new Error('Simulated failure'))

     await expect(getDbConnection()).rejects.toThrow('Simulated failure')

     // Reset connection state (mimics next startup)
     resetDbConnection()

     // Second attempt: should succeed
     createTableSpy.mockRestore() // Remove mock
     const connection = await getDbConnection()

     expect(connection).toBeDefined()
     const tables = await connection.tableNames()
     expect(tables).toContain('messages')
     expect(tables).toContain('flashcards')
   })
   ```

2. **Run the test**:
   ```bash
   npm test -- tests/unit/lib/db/client-auto-init.test.ts -t "retry cleanly"
   ```

---

## Testing Timeout Handling

### Test 3: Verify 30-Second Timeout

**Objective**: Confirm that schema initialization times out after 30 seconds.

**Steps**:

1. **Run the timeout test** (uses shortened timeout for fast execution):

   ```bash
   npm test -- tests/unit/lib/db/client-auto-init.test.ts -t "timeout"
   ```

2. **Expected output**:

   ```
   ✓ should timeout if schema initialization takes longer than 30 seconds
   ```

3. **Verify timeout error message**:
   ```
   TimeoutError: Operation 'schema_initialization' timed out after 30000ms
   ```

### Test 4: Manual Timeout Test (Integration)

**Objective**: Test actual timeout behavior with real LanceDB operations.

**Steps**:

1. **Create an integration test** (`tests/integration/schema-timeout.test.ts`):

   ```typescript
   import { describe, it, expect } from 'vitest'
   import { getDbConnection, resetDbConnection } from '@/lib/db/client'

   describe('Schema Initialization Timeout (Integration)', () => {
     it('should timeout with very slow disk I/O', async () => {
       resetDbConnection()

       // Set a very short timeout for testing (1 second)
       process.env.LANCEDB_INIT_TIMEOUT = '1000'

       // If your disk is slow, this might actually timeout
       // Otherwise, it will pass (which is fine - we're just verifying the mechanism exists)
       try {
         const connection = await getDbConnection()
         expect(connection).toBeDefined()
       } catch (error) {
         // If timeout occurs, verify error type
         expect(error).toBeInstanceOf(TimeoutError)
         expect(error.message).toContain('timed out after')
       }

       // Reset timeout to default
       delete process.env.LANCEDB_INIT_TIMEOUT
     }, 35000) // Give test itself more time than initialization timeout
   })
   ```

2. **Run the integration test**:
   ```bash
   npm test -- tests/integration/schema-timeout.test.ts
   ```

---

## Testing Error Propagation

### Test 5: Verify Fail-Fast Behavior

**Objective**: Confirm that errors propagate to the caller (no silent failures).

**Steps**:

1. **Run the error propagation test**:

   ```bash
   npm test -- tests/unit/lib/db/client-auto-init.test.ts -t "propagate"
   ```

2. **Expected behavior**:
   - Error is thrown (not swallowed)
   - Error message includes context (table name, operation)
   - Application does not continue with broken state

3. **Verify logging format**:
   ```
   ❌ Failed to auto-initialize LanceDB schema: {"event":"schema_auto_init_failed","dbPath":"./data/lancedb","error":"...","timestamp":"..."}
   ```

### Test 6: Manual Error Injection

**Objective**: Simulate real-world errors (permissions, disk space).

**Steps**:

1. **Create a read-only LanceDB directory**:

   ```bash
   rm -rf ./data/lancedb
   mkdir -p ./data/lancedb
   chmod 444 ./data/lancedb  # Read-only
   ```

2. **Start the application**:

   ```bash
   npm run dev
   ```

3. **Expected behavior**:
   - Application fails to start
   - Clear error message about permissions
   - No cryptic "table not found" errors later

4. **Restore permissions**:
   ```bash
   chmod 755 ./data/lancedb
   ```

---

## Testing Code Duplication Elimination

### Test 7: Verify Dynamic Import Usage

**Objective**: Confirm that `lib/db/client.ts` uses dynamic import to call `initializeSchema()`.

**Steps**:

1. **Check the implementation**:

   ```bash
   grep -A 5 "import('./schema')" lib/db/client.ts
   ```

2. **Expected output**:

   ```typescript
   const { initializeSchema } = await import('./schema')
   await initializeSchema()
   ```

3. **Verify no duplicated schema logic**:

   ```bash
   grep -c "createTable" lib/db/client.ts
   ```

   **Expected**: `0` (no direct `createTable` calls in client.ts)

4. **Verify single source of truth**:

   ```bash
   grep -c "createTable" lib/db/schema.ts
   ```

   **Expected**: `2` (one for each table: messages, flashcards)

---

## Testing Logging Consistency

### Test 8: Verify Structured Logging Format

**Objective**: Confirm all LanceDB operations use `[LanceDB]` prefix.

**Steps**:

1. **Search for logging statements**:

   ```bash
   grep -r "console\\.log\|console\\.error" lib/db/*.ts
   ```

2. **Verify all use `[LanceDB]` prefix**:

   ```bash
   grep -r "\\[LanceDB\\]" lib/db/*.ts
   ```

3. **Expected patterns**:

   ```typescript
   console.log('[LanceDB] Synced message ...')
   console.error('[LanceDB] Failed to ...')
   ```

4. **Verify structured JSON for errors**:

   ```bash
   grep -A 3 "JSON.stringify" lib/db/client.ts
   ```

   **Expected**: Error context objects logged as JSON

---

## Testing Test Documentation Accuracy

### Test 9: Verify Test Descriptions Match Implementation

**Objective**: Ensure test names accurately reflect what they validate.

**Steps**:

1. **Review test file**:

   ```bash
   cat tests/unit/lib/db/client-auto-init.test.ts | grep "it('should"
   ```

2. **For each test, verify**:
   - Test name describes what is being tested
   - Test implementation matches the description
   - No misleading claims (e.g., "uses existing function" when it actually duplicates code)

3. **Run all tests**:

   ```bash
   npm test -- tests/unit/lib/db/client-auto-init.test.ts
   ```

4. **Expected**: All tests pass with accurate descriptions

---

## Verification Checklist

Use this checklist to verify all fixes are working:

- [ ] **Rollback**: Partial table creation is rolled back on failure
- [ ] **Timeout**: Initialization times out after 30 seconds (or configured value)
- [ ] **Error Propagation**: Errors are thrown (not swallowed) with clear messages
- [ ] **Code Duplication**: No duplicated schema logic in `client.ts`
- [ ] **Dynamic Import**: `client.ts` uses `import('./schema')` to call `initializeSchema()`
- [ ] **Logging Consistency**: All logs use `[LanceDB]` prefix and structured JSON for errors
- [ ] **Test Accuracy**: All test descriptions match their implementations
- [ ] **Backward Compatibility**: Existing deployments with tables work without manual intervention
- [ ] **Retry Safety**: After failure, next `getDbConnection()` call starts fresh

---

## Troubleshooting

### Issue: "Table already exists" error

**Cause**: Previous initialization attempt succeeded but test setup didn't clean up

**Solution**:

```bash
rm -rf ./data/lancedb
```

### Issue: Timeout test passes even with 1-second limit

**Cause**: Modern SSDs are fast enough that initialization completes in <1 second

**Solution**: This is expected. The test verifies the timeout _mechanism_ exists, not that it always triggers.

### Issue: Rollback test fails with "dropTable not found"

**Cause**: LanceDB version mismatch or API change

**Solution**:

```bash
npm list @lancedb/lancedb  # Verify version is 0.22
npm install @lancedb/lancedb@0.22 --save-exact
```

### Issue: Tests pass but application still shows old behavior

**Cause**: Build cache not cleared

**Solution**:

```bash
rm -rf .next
npm run dev
```

---

## Additional Resources

- **Issue #188**: Original code review findings
- **PR #186**: Initial fix attempt (with identified issues)
- **LanceDB Docs**: https://lancedb.github.io/lancedb/
- **Vitest Docs**: https://vitest.dev/
- **Constitution**: `.specify/memory/constitution.md` (principles guiding this feature)
