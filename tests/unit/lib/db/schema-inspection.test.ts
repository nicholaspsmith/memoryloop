import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { initializeSchema, isSchemaInitialized } from '@/lib/db/schema'
import { closeDbConnection, getDbConnection } from '@/lib/db/client'
import fs from 'fs'
import path from 'path'

/**
 * Schema Inspection Test
 *
 * Inspects the actual LanceDB schema to see what column names exist
 */

describe('LanceDB Schema Inspection', () => {
  beforeAll(async () => {
    // Ensure test database directory exists
    const dbPath = path.join(process.cwd(), 'data', 'lancedb')
    if (!fs.existsSync(dbPath)) {
      fs.mkdirSync(dbPath, { recursive: true })
    }

    // Initialize database schema if not already initialized
    const initialized = await isSchemaInitialized()
    if (!initialized) {
      console.log('Initializing test database schema...')
      await initializeSchema()
    }
  })

  afterAll(async () => {
    await closeDbConnection()
  })

  it('should show messages table schema', async () => {
    const db = await getDbConnection()
    const table = await db.openTable('messages')

    console.log('\n========== MESSAGES TABLE OBJECT ==========')
    console.log('Table type:', typeof table)
    console.log('Table properties:', Object.keys(table))
    console.log('===========================================\n')

    // Try to query all records to see what's actually in there
    const allRecords = await table.query().toArray()
    console.log('\n========== ALL RECORDS ==========')
    console.log('Record count:', allRecords.length)
    if (allRecords.length > 0) {
      console.log('First record keys:', Object.keys(allRecords[0]))
      console.log('First record:', allRecords[0])
    }
    console.log('===========================================\n')

    expect(table).toBeDefined()
  })
})
