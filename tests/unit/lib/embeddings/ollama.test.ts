import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  generateEmbedding,
  generateEmbeddings,
  EMBEDDING_MODEL,
  EMBEDDING_DIMENSIONS,
} from '@/lib/embeddings/ollama'

/**
 * Unit Tests for Ollama Embeddings Client
 *
 * Tests embedding generation with Ollama API, error handling,
 * and graceful degradation.
 */

describe('Ollama Embeddings Client', () => {
  const originalOllamaUrl = process.env.OLLAMA_BASE_URL

  beforeEach(() => {
    vi.resetAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    // Restore original URL
    if (originalOllamaUrl) {
      process.env.OLLAMA_BASE_URL = originalOllamaUrl
    } else {
      delete process.env.OLLAMA_BASE_URL
    }
  })

  describe('generateEmbedding', () => {
    it('should generate embedding for text', async () => {
      // Mock Ollama API response
      const mockEmbedding = new Array(768).fill(0).map((_, i) => i / 768)

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          embedding: mockEmbedding,
        }),
      })

      const result = await generateEmbedding('Test message content')

      expect(result).toEqual(mockEmbedding)
      expect(result).toHaveLength(EMBEDDING_DIMENSIONS)
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:11434/api/embeddings',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
          body: JSON.stringify({
            model: EMBEDDING_MODEL,
            prompt: 'Test message content',
          }),
        })
      )
    })

    it('should handle empty text gracefully', async () => {
      const result = await generateEmbedding('')

      expect(result).toBeNull()
      expect(global.fetch).not.toHaveBeenCalled()
    })

    it('should handle whitespace-only text gracefully', async () => {
      const result = await generateEmbedding('   \n  \t  ')

      expect(result).toBeNull()
      expect(global.fetch).not.toHaveBeenCalled()
    })

    it('should return null on API error', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      })

      const result = await generateEmbedding('Test content')

      expect(result).toBeNull()
    })

    it('should return null on network error', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'))

      const result = await generateEmbedding('Test content')

      expect(result).toBeNull()
    })

    it('should return null on invalid response format', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          // Missing 'embedding' field
          invalid: 'response',
        }),
      })

      const result = await generateEmbedding('Test content')

      expect(result).toBeNull()
    })

    it('should handle very long text', async () => {
      const longText = 'a'.repeat(10000)
      const mockEmbedding = new Array(768).fill(0.5)

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          embedding: mockEmbedding,
        }),
      })

      const result = await generateEmbedding(longText)

      expect(result).toEqual(mockEmbedding)
    })

    it('should use correct model', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          embedding: new Array(768).fill(0),
        }),
      })

      await generateEmbedding('Test')

      const callArgs = (global.fetch as any).mock.calls[0]
      const body = JSON.parse(callArgs[1].body)

      expect(body.model).toBe('nomic-embed-text')
    })

    it('should use custom OLLAMA_BASE_URL if set', async () => {
      process.env.OLLAMA_BASE_URL = 'http://custom:8080'

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          embedding: new Array(768).fill(0),
        }),
      })

      await generateEmbedding('Test')

      expect(global.fetch).toHaveBeenCalledWith(
        'http://custom:8080/api/embeddings',
        expect.any(Object)
      )
    })
  })

  describe('generateEmbeddings', () => {
    it('should generate embeddings for multiple texts', async () => {
      const mockEmbeddings = [
        new Array(768).fill(0.1),
        new Array(768).fill(0.2),
        new Array(768).fill(0.3),
      ]

      // Mock sequential calls
      global.fetch = vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ embedding: mockEmbeddings[0] }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ embedding: mockEmbeddings[1] }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ embedding: mockEmbeddings[2] }),
        })

      const texts = ['First text', 'Second text', 'Third text']
      const result = await generateEmbeddings(texts)

      expect(result).toEqual(mockEmbeddings)
      expect(result).toHaveLength(3)
      expect(global.fetch).toHaveBeenCalledTimes(3)
    })

    it('should handle empty array', async () => {
      const result = await generateEmbeddings([])

      expect(result).toEqual([])
      expect(global.fetch).not.toHaveBeenCalled()
    })

    it('should filter out empty texts', async () => {
      const mockEmbedding1 = new Array(768).fill(0.5)
      const mockEmbedding2 = new Array(768).fill(0.6)

      global.fetch = vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ embedding: mockEmbedding1 }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ embedding: mockEmbedding2 }),
        })

      const texts = ['Valid text', '', '   ', 'Another valid']
      const result = await generateEmbeddings(texts)

      // Should only call for non-empty texts
      expect(global.fetch).toHaveBeenCalledTimes(2)
      expect(result).toEqual([mockEmbedding1, mockEmbedding2])
    })

    it('should return empty array if any embedding fails', async () => {
      global.fetch = vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ embedding: new Array(768).fill(0.1) }),
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          statusText: 'Internal Server Error',
        })

      const result = await generateEmbeddings(['Text 1', 'Text 2'])

      expect(result).toEqual([])
    })

    it('should return empty array on network error', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'))

      const result = await generateEmbeddings(['Text 1', 'Text 2'])

      expect(result).toEqual([])
    })

    it('should handle single text', async () => {
      const mockEmbedding = new Array(768).fill(0.7)

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          embedding: mockEmbedding,
        }),
      })

      const result = await generateEmbeddings(['Single text'])

      expect(result).toEqual([mockEmbedding])
    })
  })

  describe('Constants', () => {
    it('should export correct model name', () => {
      expect(EMBEDDING_MODEL).toBe('nomic-embed-text')
    })

    it('should export correct dimensions', () => {
      expect(EMBEDDING_DIMENSIONS).toBe(768)
    })
  })
})
