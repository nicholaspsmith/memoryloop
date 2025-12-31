/**
 * Job Handler Registry
 *
 * Import all handlers to register them with the processor.
 * Handlers self-register via registerHandler() calls at module load time.
 */

// Import handlers to trigger registration
import './flashcard-job'
import './distractor-job'
import './skill-tree-job'

// Export handler functions for testing
export { handleFlashcardGeneration } from './flashcard-job'
export { handleDistractorGeneration } from './distractor-job'
export { handleSkillTreeGeneration } from './skill-tree-job'
