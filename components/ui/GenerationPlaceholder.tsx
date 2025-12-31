'use client'

import { useState, useEffect } from 'react'

/**
 * GenerationPlaceholder Component
 *
 * Shows loading/error states during background job generation.
 * Displays type-specific labels and handles retry functionality.
 */

interface GenerationPlaceholderProps {
  jobType: 'flashcard' | 'distractor' | 'skill_tree'
  status: 'pending' | 'processing' | 'failed' | 'rate_limited'
  error?: string
  onRetry?: () => void
  retryAfter?: number // seconds until rate limit resets
}

const typeLabels = {
  flashcard: 'flashcards',
  distractor: 'answer options',
  skill_tree: 'skill tree',
}

export function GenerationPlaceholder({
  jobType,
  status,
  error,
  onRetry,
  retryAfter,
}: GenerationPlaceholderProps) {
  const label = typeLabels[jobType]
  // Initialize countdown from prop, will be reset by parent component via key
  const [countdown, setCountdown] = useState(retryAfter ?? 0)

  // Countdown timer for rate limit
  useEffect(() => {
    if (status === 'rate_limited' && countdown > 0) {
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer)
            if (onRetry) {
              onRetry()
            }
            return 0
          }
          return prev - 1
        })
      }, 1000)

      return () => clearInterval(timer)
    }
  }, [status, countdown, onRetry])

  if (status === 'rate_limited') {
    const minutes = Math.floor(countdown / 60)
    const seconds = countdown % 60

    return (
      <div
        className="rounded-lg border border-amber-200 bg-amber-50 p-4"
        role="alert"
        aria-live="polite"
      >
        <div className="flex items-center gap-2 text-amber-700">
          <svg
            className="h-5 w-5 flex-shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          <span className="font-medium">Rate limit exceeded</span>
        </div>
        {countdown > 0 ? (
          <p className="mt-2 text-sm text-amber-600" aria-live="polite">
            Try again in {minutes > 0 && `${minutes} minute${minutes !== 1 ? 's' : ''} `}
            {seconds} second{seconds !== 1 ? 's' : ''}
          </p>
        ) : (
          <p className="mt-2 text-sm text-amber-600">Ready to retry</p>
        )}
      </div>
    )
  }

  if (status === 'failed') {
    return (
      <div
        className="rounded-lg border border-red-200 bg-red-50 p-4"
        role="alert"
        aria-live="assertive"
      >
        <div className="flex items-center gap-2 text-red-700">
          <svg
            className="h-5 w-5 flex-shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span className="font-medium">Failed to generate {label}</span>
        </div>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        {onRetry && (
          <button
            onClick={onRetry}
            className="mt-3 rounded-md bg-red-100 px-3 py-1.5 text-sm font-medium text-red-700 transition-colors hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
            aria-label={`Retry generating ${label}`}
          >
            Try again
          </button>
        )}
      </div>
    )
  }

  // pending or processing
  return (
    <div
      className="rounded-lg border border-gray-200 bg-gray-50 p-4"
      role="status"
      aria-live="polite"
    >
      <div className="flex items-center gap-3">
        <div
          className="h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600"
          aria-hidden="true"
          data-testid="loading-spinner"
        />
        <span className="text-gray-700">
          {status === 'processing' ? 'Generating' : 'Preparing to generate'} {label}...
        </span>
      </div>
    </div>
  )
}
