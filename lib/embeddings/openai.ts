/**
 * OpenAI Embeddings Client
 *
 * Generates text embeddings using OpenAI's text-embedding-3-small model.
 * Used for semantic search of messages and flashcards.
 *
 * TODO: Implement when adding semantic search functionality (Phase 5+)
 */

import OpenAI from 'openai'

// Model configuration
const EMBEDDING_MODEL = 'text-embedding-3-small'
const EMBEDDING_DIMENSIONS = 1536

/**
 * Initialize OpenAI client
 */
function getOpenAIClient(): OpenAI {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY environment variable is not set')
  }

  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  })
}

/**
 * Generate embedding for text
 *
 * @param text - Text to embed
 * @returns Vector embedding (1536 dimensions)
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const client = getOpenAIClient()

  const response = await client.embeddings.create({
    model: EMBEDDING_MODEL,
    input: text,
  })

  return response.data[0].embedding
}

/**
 * Generate embeddings for multiple texts in batch
 *
 * @param texts - Array of texts to embed
 * @returns Array of vector embeddings
 */
export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  const client = getOpenAIClient()

  const response = await client.embeddings.create({
    model: EMBEDDING_MODEL,
    input: texts,
  })

  return response.data.map((item) => item.embedding)
}

/**
 * Calculate cosine similarity between two embeddings
 *
 * @param a - First embedding vector
 * @param b - Second embedding vector
 * @returns Similarity score between -1 and 1
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error('Vectors must have same length')
  }

  let dotProduct = 0
  let magnitudeA = 0
  let magnitudeB = 0

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i]
    magnitudeA += a[i] * a[i]
    magnitudeB += b[i] * b[i]
  }

  magnitudeA = Math.sqrt(magnitudeA)
  magnitudeB = Math.sqrt(magnitudeB)

  if (magnitudeA === 0 || magnitudeB === 0) {
    return 0
  }

  return dotProduct / (magnitudeA * magnitudeB)
}

/**
 * Note: Embedding generation will be integrated into message creation
 * in a future update. For MVP, messages can be created without embeddings
 * and semantic search can be added later.
 */
