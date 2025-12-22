import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock the database module
vi.mock('@/lib/db/pg-client', () => ({
  getDb: vi.fn(() => ({
    execute: vi.fn().mockResolvedValue([{ '1': 1 }]),
  })),
}))

// Store original env
const originalEnv = process.env

describe('Health Check API', () => {
  beforeEach(() => {
    vi.resetModules()
    // Reset environment for each test
    process.env = { ...originalEnv }
    process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test'
    process.env.NEXTAUTH_SECRET = 'test-secret'
    process.env.ENCRYPTION_KEY = 'test-encryption-key'
    process.env.OLLAMA_BASE_URL = 'http://localhost:11434'
  })

  afterEach(() => {
    process.env = originalEnv
    vi.restoreAllMocks()
  })

  describe('Ollama model availability (T006, T007)', () => {
    it('should return model list when Ollama is healthy with models', async () => {
      // Mock fetch to return models
      global.fetch = vi.fn().mockImplementation((url: string) => {
        if (url.includes('/api/tags')) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                models: [{ name: 'nomic-embed-text:latest' }, { name: 'llama3.2:latest' }],
              }),
          })
        }
        return Promise.reject(new Error('Unknown URL'))
      })

      const { GET } = await import('@/app/api/health/route')
      const response = await GET()
      const data = await response.json()

      expect(data.checks.ollama.status).toBe('healthy')
      expect(data.checks.ollama.models).toContain('nomic-embed-text:latest')
      expect(data.checks.ollama.models).toContain('llama3.2:latest')
    })

    it('should return unhealthy when required models are missing', async () => {
      // Mock fetch to return empty models
      global.fetch = vi.fn().mockImplementation((url: string) => {
        if (url.includes('/api/tags')) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                models: [], // No models installed
              }),
          })
        }
        return Promise.reject(new Error('Unknown URL'))
      })

      const { GET } = await import('@/app/api/health/route')
      const response = await GET()
      const data = await response.json()

      expect(data.checks.ollama.status).toBe('unhealthy')
      expect(data.checks.ollama.message).toContain('Missing models')
    })
  })

  describe('Claude API key presence (T008)', () => {
    it('should return healthy when ANTHROPIC_API_KEY is set', async () => {
      process.env.ANTHROPIC_API_KEY = 'sk-ant-test-key'

      // Mock Ollama as healthy
      global.fetch = vi.fn().mockImplementation((url: string) => {
        if (url.includes('/api/tags')) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                models: [{ name: 'nomic-embed-text:latest' }, { name: 'llama3.2:latest' }],
              }),
          })
        }
        return Promise.reject(new Error('Unknown URL'))
      })

      const { GET } = await import('@/app/api/health/route')
      const response = await GET()
      const data = await response.json()

      expect(data.checks.claude.status).toBe('healthy')
    })

    it('should return degraded when ANTHROPIC_API_KEY is missing', async () => {
      delete process.env.ANTHROPIC_API_KEY

      // Mock Ollama as healthy
      global.fetch = vi.fn().mockImplementation((url: string) => {
        if (url.includes('/api/tags')) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                models: [{ name: 'nomic-embed-text:latest' }, { name: 'llama3.2:latest' }],
              }),
          })
        }
        return Promise.reject(new Error('Unknown URL'))
      })

      const { GET } = await import('@/app/api/health/route')
      const response = await GET()
      const data = await response.json()

      expect(data.checks.claude.status).toBe('degraded')
      expect(data.checks.claude.message).toContain('ANTHROPIC_API_KEY')
    })
  })
})
