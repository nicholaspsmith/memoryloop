'use client'

import { useState, useEffect } from 'react'
import QuizCard from './QuizCard'
import QuizProgress from './QuizProgress'

/**
 * QuizInterface Component
 *
 * Orchestrates the quiz flow for reviewing flashcards with FSRS scheduling.
 *
 * Implements:
 * - FR-011: Quiz interface in second tab
 * - FR-012: Present flashcards one at a time
 * - FR-015: Navigate to next flashcard
 * - FR-020: Display progress through deck
 * - FR-021: Completion notification
 *
 * Maps to T118 in Phase 6 (User Story 4)
 */

interface FSRSState {
  due: Date
  stability: number
  difficulty: number
  state: number
  reps: number
  lapses: number
  elapsed_days: number
  scheduled_days: number
  last_review: Date
}

interface Flashcard {
  id: string
  question: string
  answer: string
  fsrsState: FSRSState
}

interface QuizInterfaceProps {
  initialFlashcards?: Flashcard[]
}

interface FailedRating {
  flashcardId: string
  flashcardQuestion: string
  rating: number
  retrying: boolean
}

export default function QuizInterface({ initialFlashcards = [] }: QuizInterfaceProps) {
  const [flashcards, setFlashcards] = useState<Flashcard[]>(initialFlashcards)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isLoading, setIsLoading] = useState(!initialFlashcards.length)
  const [error, setError] = useState<string | null>(null)
  const [isCompleted, setIsCompleted] = useState(false)
  const [failedRating, setFailedRating] = useState<FailedRating | null>(null)
  const [mode, setMode] = useState<'due' | 'all'>('due')
  const [totalCards, setTotalCards] = useState(0)

  // Fetch due flashcards on mount if not provided
  useEffect(() => {
    if (initialFlashcards.length === 0) {
      fetchFlashcards('due')
    }
  }, [])

  const fetchFlashcards = async (fetchMode: 'due' | 'all' = 'due') => {
    try {
      setIsLoading(true)
      setError(null)
      setMode(fetchMode)

      const response = await fetch(`/api/quiz/due?mode=${fetchMode}`)

      if (!response.ok) {
        throw new Error('Failed to fetch flashcards')
      }

      const data = await response.json()

      if (data.success && data.flashcards) {
        setFlashcards(data.flashcards)
        setTotalCards(data.totalCards || 0)

        if (data.flashcards.length === 0) {
          // No cards - show empty state
          setIsCompleted(false)
        }
      } else {
        throw new Error('Invalid response from server')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  const handleRate = async (flashcardId: string, rating: number) => {
    // Get the flashcard question before moving to next card
    const ratedFlashcard = flashcards.find((f) => f.id === flashcardId)
    const flashcardQuestion = ratedFlashcard?.question || 'Unknown flashcard'

    // Optimistic update: move to next card immediately for instant feedback
    if (currentIndex < flashcards.length - 1) {
      setCurrentIndex(currentIndex + 1)
    } else {
      // Completed all cards
      setIsCompleted(true)
    }

    // Send rating to server in background
    await sendRating(flashcardId, flashcardQuestion, rating)
  }

  const sendRating = async (flashcardId: string, flashcardQuestion: string, rating: number) => {
    try {
      const response = await fetch('/api/quiz/rate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ flashcardId, rating }),
      })

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        console.error('[Quiz] Rating failed:', data.error || response.statusText)
        // Show error with retry option
        setFailedRating({ flashcardId, flashcardQuestion, rating, retrying: false })
      }
    } catch (err) {
      console.error('[Quiz] Rating error:', err)
      // Show error with retry option
      setFailedRating({ flashcardId, flashcardQuestion, rating, retrying: false })
    }
  }

  const handleRetryRating = async () => {
    if (!failedRating) return

    setFailedRating({ ...failedRating, retrying: true })

    try {
      const response = await fetch('/api/quiz/rate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          flashcardId: failedRating.flashcardId,
          rating: failedRating.rating,
        }),
      })

      if (response.ok) {
        // Success - clear the error
        setFailedRating(null)
      } else {
        // Still failing
        setFailedRating({ ...failedRating, retrying: false })
      }
    } catch {
      // Still failing
      setFailedRating({ ...failedRating, retrying: false })
    }
  }

  const handleCancelRetry = () => {
    setFailedRating(null)
  }

  const handleRestart = () => {
    setCurrentIndex(0)
    setIsCompleted(false)
    fetchFlashcards(mode)
  }

  const handlePracticeAll = () => {
    setCurrentIndex(0)
    setIsCompleted(false)
    fetchFlashcards('all')
  }

  const handleDelete = async (flashcardId: string) => {
    try {
      setError(null)

      const response = await fetch(`/api/flashcards/${flashcardId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete flashcard')
      }

      const data = await response.json()

      if (data.success) {
        // Remove flashcard from state
        const updatedFlashcards = flashcards.filter((f) => f.id !== flashcardId)
        setFlashcards(updatedFlashcards)

        // Update current index if needed
        if (updatedFlashcards.length === 0) {
          // No more flashcards
          setIsCompleted(true)
        } else if (currentIndex >= updatedFlashcards.length) {
          // Current index is out of bounds, go to last card
          setCurrentIndex(updatedFlashcards.length - 1)
        }
        // If currentIndex < updatedFlashcards.length, it will automatically show the next card
      } else {
        throw new Error(data.error || 'Failed to delete flashcard')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    }
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading flashcards...</p>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center max-w-md">
          <div className="text-red-600 dark:text-red-400 mb-4">
            <svg
              className="w-16 h-16 mx-auto"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
            Error Loading Quiz
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
          <button
            onClick={() => fetchFlashcards(mode)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors duration-200"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  // Empty state - no flashcards due
  if (flashcards.length === 0 && !isCompleted) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center max-w-md">
          <div className="text-green-600 dark:text-green-400 mb-4">
            <svg
              className="w-16 h-16 mx-auto"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
            All Caught Up!
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            {mode === 'due'
              ? 'You have no flashcards due for review right now. Great job keeping up with your studies!'
              : 'You have no flashcards yet. Start chatting to generate some!'}
          </p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => fetchFlashcards('due')}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors duration-200"
            >
              Refresh
            </button>
            {mode === 'due' && totalCards > 0 && (
              <button
                onClick={handlePracticeAll}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors duration-200"
              >
                Practice All ({totalCards})
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  // Completion state
  if (isCompleted) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center max-w-md">
          <div className="text-green-600 dark:text-green-400 mb-4">
            <svg
              className="w-16 h-16 mx-auto"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
            {mode === 'due' ? 'Quiz Complete!' : 'Practice Session Complete!'}
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            You&apos;ve reviewed all {flashcards.length} flashcard
            {flashcards.length !== 1 ? 's' : ''}. Great work!
          </p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={handleRestart}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors duration-200"
            >
              Review Again
            </button>
            {mode === 'all' && (
              <button
                onClick={() => fetchFlashcards('due')}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white font-medium rounded-lg transition-colors duration-200"
              >
                Back to Due Cards
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  // Quiz interface - show current flashcard
  const currentFlashcard = flashcards[currentIndex]

  return (
    <div className="max-w-4xl mx-auto">
      {/* Practice mode indicator */}
      {mode === 'all' && (
        <div className="mb-4 text-center">
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200">
            Practice Mode - All Cards
          </span>
        </div>
      )}

      {/* Progress indicator */}
      <div className="mb-8">
        <QuizProgress current={currentIndex + 1} total={flashcards.length} showPercentage />
      </div>

      {/* Current flashcard */}
      <div className="mb-8">
        <QuizCard flashcard={currentFlashcard} onRate={handleRate} onDelete={handleDelete} />
      </div>

      {/* Failed rating error modal */}
      {failedRating && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-start gap-3 mb-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-100 dark:bg-red-900 flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-red-600 dark:text-red-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  Failed to Save Rating
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Your rating for this flashcard could not be saved:
                </p>
              </div>
            </div>

            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 mb-4">
              <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-2">
                &ldquo;{failedRating.flashcardQuestion}&rdquo;
              </p>
            </div>

            <div className="flex gap-3 justify-end">
              <button
                onClick={handleCancelRetry}
                disabled={failedRating.retrying}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors duration-200 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleRetryRating}
                disabled={failedRating.retrying}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors duration-200 disabled:opacity-50 flex items-center gap-2"
              >
                {failedRating.retrying ? (
                  <>
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                        fill="none"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    Retrying...
                  </>
                ) : (
                  'Retry'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
