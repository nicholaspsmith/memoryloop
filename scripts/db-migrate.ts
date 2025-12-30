#!/usr/bin/env tsx

/**
 * Database Migration Script
 *
 * Runs SQL migrations without requiring psql to be installed
 * Usage: npm run db:migrate
 */

import { config } from 'dotenv'
import { resolve } from 'path'
import postgres from 'postgres'
import { readFileSync, readdirSync } from 'fs'
import { join } from 'path'

// Load .env.local file
config({ path: resolve(process.cwd(), '.env.local') })

async function runMigration() {
  const connectionString = process.env.DATABASE_URL

  if (!connectionString) {
    console.error('❌ Error: DATABASE_URL environment variable is not set')
    console.error('Please add DATABASE_URL to your .env.local file')
    process.exit(1)
  }

  console.log('🔗 Connecting to database...')
  const sql = postgres(connectionString, {
    max: 1, // Only need one connection for migration
  })

  try {
    // Acquire advisory lock to prevent concurrent migrations
    await sql`SELECT pg_advisory_lock(8675309)`

    try {
      // Create migrations tracking table if it doesn't exist
      await sql`
        CREATE TABLE IF NOT EXISTS _migrations (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) NOT NULL UNIQUE,
          applied_at TIMESTAMP DEFAULT NOW()
        )
      `

      // Get list of all migration files with strict validation
      const migrationsDir = join(process.cwd(), 'drizzle')
      const files = readdirSync(migrationsDir)
        .filter((f) => /^\d{4}[_a-zA-Z0-9-]*\.sql$/.test(f)) // Strict filename validation
        .sort()

      // Get already applied migrations
      const applied = await sql`SELECT name FROM _migrations`
      const appliedNames = new Set(applied.map((r) => r.name))

      // Run pending migrations
      let migrationsRun = 0
      for (const file of files) {
        if (appliedNames.has(file)) {
          console.log(`⏭️  Skipping ${file} (already applied)`)
          continue
        }

        const migrationPath = join(migrationsDir, file)
        const migrationSQL = readFileSync(migrationPath, 'utf-8')

        // Skip empty migrations
        if (!migrationSQL.trim()) {
          console.warn(`⚠️  Skipping empty migration: ${file}`)
          continue
        }

        console.log(`📄 Running migration: ${file}`)

        try {
          // Execute migration and record it in a transaction
          await sql.begin(async (tx) => {
            await tx.unsafe(migrationSQL)
            await tx`INSERT INTO _migrations (name) VALUES (${file})`
          })
          console.log(`✅ Applied ${file}`)
          migrationsRun++
        } catch (migrationError) {
          console.error(`❌ Failed to apply ${file}`)
          throw migrationError
        }
      }

      if (migrationsRun === 0) {
        console.log('✅ Database is up to date!')
      } else {
        console.log(`✅ ${migrationsRun} migration(s) applied successfully!`)
      }
      console.log('')
      console.log('Your database schema is now ready.')
      console.log('You can start the dev server with: npm run dev')
      console.log('Or explore your database with: npm run db:studio')
    } finally {
      // Release advisory lock
      await sql`SELECT pg_advisory_unlock(8675309)`
    }
  } catch (error) {
    console.error('❌ Migration failed:', error)
    process.exit(1)
  } finally {
    await sql.end()
  }
}

// Run the migration
runMigration()
