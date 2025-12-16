#!/usr/bin/env tsx

/**
 * Database initialization script
 * Run with: npm run db:init
 */

import { initializeSchema, isSchemaInitialized } from '../lib/db/schema'
import { closeDbConnection } from '../lib/db/client'

async function main() {
  console.log('🚀 Initializing MemoryLoop database...\n')

  try {
    // Check if already initialized
    const initialized = await isSchemaInitialized()

    if (initialized) {
      console.log('⚠️  Database schema already exists')
      console.log('   To recreate, delete the data/lancedb directory first\n')
      process.exit(0)
    }

    // Initialize schema
    await initializeSchema()

    console.log('\n🎉 Database initialized successfully!')
    console.log('   Tables created: users, conversations, messages, flashcards, review_logs\n')

    process.exit(0)
  } catch (error) {
    console.error('\n❌ Database initialization failed:')
    console.error(error)
    process.exit(1)
  } finally {
    await closeDbConnection()
  }
}

main()
