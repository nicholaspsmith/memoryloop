/**
 * RAG (Retrieval-Augmented Generation) utilities
 *
 * Builds context from semantically similar past conversations
 * to enhance Claude's responses with user's conversation history.
 */

import { searchSimilarMessages } from '@/lib/db/operations/messages-lancedb'
import type { Message } from '@/types'

export interface RAGContext {
  context: string
  sourceMessages: Message[]
  enabled: boolean
}

/**
 * Build RAG context from user's conversation history
 *
 * Searches for semantically similar messages and formats them
 * as context for Claude API.
 *
 * @param userMessage - The current user message
 * @param userId - User ID to scope search
 * @param options - Configuration options
 * @returns RAG context with source messages
 */
export async function buildRAGContext(
  userMessage: string,
  userId: string,
  options: {
    enabled?: boolean
    maxMessages?: number
    maxTokens?: number
  } = {}
): Promise<RAGContext> {
  const {
    enabled = true,
    maxMessages = 5,
    maxTokens = 2000,
  } = options

  // If RAG is disabled, return empty context
  if (!enabled) {
    return {
      context: '',
      sourceMessages: [],
      enabled: false,
    }
  }

  try {
    // Search for semantically similar messages
    const similarMessages = await searchSimilarMessages(
      userMessage,
      userId,
      maxMessages
    )

    // Filter out messages with null embeddings (not yet processed)
    const validMessages = similarMessages.filter(m => m.embedding !== null)

    if (validMessages.length === 0) {
      console.log('[RAG] No similar messages found with embeddings')
      return {
        context: '',
        sourceMessages: [],
        enabled: true,
      }
    }

    // Build context string from similar messages
    const context = formatMessagesAsContext(validMessages, maxTokens)

    console.log(`[RAG] Found ${validMessages.length} similar messages for context`)

    return {
      context,
      sourceMessages: validMessages,
      enabled: true,
    }
  } catch (error) {
    console.error('[RAG] Failed to build context:', error)
    // Gracefully degrade - return empty context on error
    return {
      context: '',
      sourceMessages: [],
      enabled: false,
    }
  }
}

/**
 * Format messages as context string for Claude
 *
 * Limits total length to maxTokens (rough approximation: 1 token ≈ 4 chars)
 */
function formatMessagesAsContext(
  messages: Message[],
  maxTokens: number
): string {
  const maxChars = maxTokens * 4 // Rough token-to-char conversion

  let context = 'Relevant context from your past conversations:\n\n'
  let currentLength = context.length

  for (const message of messages) {
    const messageText = `[${message.role}]: ${message.content}\n\n`

    // Check if adding this message would exceed limit
    if (currentLength + messageText.length > maxChars) {
      break
    }

    context += messageText
    currentLength += messageText.length
  }

  return context.trim()
}

/**
 * Determine if RAG should be enabled for a given message
 *
 * Heuristics:
 * - Skip very short messages (< 10 chars)
 * - Skip greetings
 * - Enable for questions and substantive messages
 */
export function shouldUseRAG(userMessage: string): boolean {
  const trimmed = userMessage.trim()

  // Too short
  if (trimmed.length < 10) {
    return false
  }

  // Greetings (case-insensitive)
  const lowerMessage = trimmed.toLowerCase()
  const greetings = ['hi', 'hello', 'hey', 'yo', 'sup', 'what\'s up']
  if (greetings.some(greeting => lowerMessage === greeting)) {
    return false
  }

  // Enable for everything else
  return true
}
