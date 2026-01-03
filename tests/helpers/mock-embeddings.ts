/**
 * Mock Embedding Generator for Tests
 *
 * Produces deterministic embeddings where semantically similar texts
 * have high cosine similarity. Used in integration and contract tests
 * to ensure consistent behavior across environments.
 */

// Concept groups - words in the same group contribute to the same dimensions
const CONCEPT_GROUPS: Record<string, string[]> = {
  learning: ['learn', 'master', 'study', 'understand', 'define', 'explain', 'what', 'how'],
  programming: ['programming', 'development', 'coding', 'code', 'software', 'developer'],
  science: ['photosynthesis', 'cellular', 'respiration', 'biology', 'chemistry', 'physics'],
  loop: ['loop', 'loops', 'looping', 'iteration', 'iterate', 'repeated', 'repetition'],
  array: ['array', 'arrays', 'collection', 'list', 'elements', 'data', 'structure'],
  web: ['web', 'frontend', 'backend', 'fullstack', 'html', 'css', 'javascript', 'react'],
  quantum: ['quantum', 'mechanics', 'physics', 'subatomic', 'particles'],
  relativity: ['relativity', 'einstein', 'spacetime', 'theory'],
  thermodynamics: ['thermodynamics', 'heat', 'energy', 'temperature'],
  dna: ['dna', 'deoxyribonucleic', 'genetic', 'gene', 'genome'],
  python: ['python', 'pythonic'],
  typescript: ['typescript', 'ts'],
  rust: ['rust', 'rustlang'],
  go: ['go', 'golang', 'concurrent'],
  math: ['math', 'mathematics', 'calculus', 'algebra', 'advanced'],
  ml: ['machine', 'learning', 'ai', 'artificial', 'intelligence', 'neural', 'deep'],
  blockchain: ['blockchain', 'crypto', 'cryptocurrency', 'distributed', 'ledger'],
  database: ['database', 'sql', 'nosql', 'data', 'query'],
  goal: ['goal', 'objective', 'target', 'aim'],
  mitosis: ['mitosis', 'cell', 'division', 'cells'],
  osmosis: ['osmosis', 'water', 'membrane', 'movement'],
  induction: ['electromagnetic', 'induction', 'current', 'magnetism'],
  entropy: ['entropy', 'disorder', 'measure'],
  wavelength: ['wavelength', 'wave', 'distance', 'peaks'],
  variable: ['variable', 'variables', 'named', 'storage', 'container'],
  function: ['function', 'functions', 'reusable', 'block', 'callable'],
}

// Create reverse lookup: word -> concept
const wordToConcept: Map<string, string> = new Map()
for (const [concept, words] of Object.entries(CONCEPT_GROUPS)) {
  for (const word of words) {
    wordToConcept.set(word, concept)
  }
}

/**
 * Create a mock embedding for the given text.
 * Similar texts will have similar embeddings (high cosine similarity).
 */
export function createMockEmbedding(text: string): number[] {
  const DIMS = 1024
  const embedding = new Array(DIMS).fill(0)

  // Normalize text
  const normalized = text.toLowerCase().replace(/[^a-z0-9\s]/g, '')
  const words = normalized.split(/\s+/).filter((w) => w.length > 2) // Skip very short words

  // Count concept occurrences and word occurrences
  const conceptCounts: Map<string, number> = new Map()
  const wordCounts: Map<string, number> = new Map()

  for (const word of words) {
    const concept = wordToConcept.get(word)
    if (concept) {
      conceptCounts.set(concept, (conceptCounts.get(concept) || 0) + 1)
    }
    wordCounts.set(word, (wordCounts.get(word) || 0) + 1)
  }

  // Map concepts to dimensions (concepts get more weight and spread)
  for (const [concept, count] of conceptCounts) {
    let hash = 0
    for (let i = 0; i < concept.length; i++) {
      hash = (hash * 31 + concept.charCodeAt(i)) % DIMS
    }
    // Concepts spread across 50 dimensions for higher overlap
    const spread = 50
    for (let i = 0; i < spread; i++) {
      const dim = (hash + i * 13) % DIMS
      embedding[dim] += (count * 2.0) / Math.max(words.length, 1) // Concepts get 2x weight
    }
  }

  // Map individual words to dimensions
  for (const [word, count] of wordCounts) {
    let hash = 0
    for (let i = 0; i < word.length; i++) {
      hash = (hash * 31 + word.charCodeAt(i)) % DIMS
    }
    const spread = 20
    for (let i = 0; i < spread; i++) {
      const dim = (hash + i * 7) % DIMS
      embedding[dim] += count / Math.max(words.length, 1)
    }
  }

  // Normalize to unit vector
  let norm = 0
  for (let i = 0; i < DIMS; i++) {
    norm += embedding[i] * embedding[i]
  }
  norm = Math.sqrt(norm)
  if (norm > 0) {
    for (let i = 0; i < DIMS; i++) {
      embedding[i] /= norm
    }
  } else {
    // If no valid words, return a default embedding
    embedding[0] = 1.0
  }

  return embedding
}

/**
 * Create the mock factory for vi.mock('@/lib/embeddings', ...)
 */
export function createEmbeddingsMockFactory() {
  return {
    generateEmbedding: (text: string) => Promise.resolve(createMockEmbedding(text)),
    generateEmbeddings: (texts: string[]) =>
      Promise.resolve(texts.map((t) => createMockEmbedding(t))),
    EMBEDDING_DIMENSIONS: 1024,
  }
}
