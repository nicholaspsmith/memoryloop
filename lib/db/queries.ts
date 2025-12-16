import { getDbConnection } from './client'
import type { Table } from '@lancedb/lancedb'

/**
 * Get a LanceDB table by name
 */
export async function getTable(tableName: string): Promise<Table> {
  const db = await getDbConnection()
  return await db.openTable(tableName) as Table
}

/**
 * Generic create operation - adds records to a table
 */
export async function create<T extends Record<string, unknown>>(
  tableName: string,
  records: T[]
): Promise<void> {
  const table = await getTable(tableName)
  await table.add(records)
}

/**
 * Generic find by ID operation
 */
export async function findById<T extends { id: string }>(
  tableName: string,
  id: string
): Promise<T | null> {
  const table = await getTable(tableName)
  const results = await table.query().where(`id = '${id}'`).limit(1).toArray()

  return results.length > 0 ? results[0] : null
}

/**
 * Generic find with filter operation
 */
export async function find<T>(
  tableName: string,
  filter: string,
  limit?: number
): Promise<T[]> {
  const table = await getTable(tableName)
  let query = table.query().where(filter)

  if (limit) {
    query = query.limit(limit)
  }

  return await query.toArray()
}

/**
 * Generic update operation (delete + insert pattern for LanceDB)
 */
export async function update<T extends { id: string }>(
  tableName: string,
  id: string,
  updates: Partial<T>
): Promise<void> {
  const table = await getTable(tableName)

  // Find existing record
  const existing = await findById<T>(tableName, id)
  if (!existing) {
    throw new Error(`Record not found: ${id}`)
  }

  // Delete old record
  await table.delete(`id = '${id}'`)

  // Insert updated record
  const updated = { ...existing, ...updates }
  await table.add([updated])
}

/**
 * Generic delete operation
 */
export async function deleteById(tableName: string, id: string): Promise<void> {
  const table = await getTable(tableName)
  await table.delete(`id = '${id}'`)
}

/**
 * Count records matching a filter
 */
export async function count(tableName: string, filter?: string): Promise<number> {
  const table = await getTable(tableName)
  return await table.countRows(filter)
}
