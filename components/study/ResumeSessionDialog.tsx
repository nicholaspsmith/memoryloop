'use client'

import { useEffect } from 'react'

/**
 * ResumeSessionDialog Component
 *
 * Modal dialog shown when a user navigates to the study page with an active session.
 * Offers to resume existing progress or start a new session.
 *
 * Features:
 * - Session progress display with percentage and card count
 * - Relative time formatting (e.g., "Started 2 hours ago")
 * - Timed mode support: shows remaining time and current score
 * - Progress bar visualization
 * - Escape key and backdrop click to close
 * - Warning for starting new session (abandons current progress)
 *
 * Design:
 * - Centered modal with max-width-lg
 * - White background with rounded corners
 * - Primary action: Resume (blue)
 * - Secondary action: Start New (red with warning)
 * - Smooth fade-in animation
 */

interface ResumeSessionDialogProps {
  open: boolean
  session: {
    sessionId: string
    goalTitle: string
    mode: string
    progress: {
      currentIndex: number
      totalCards: number
      responsesCount: number
      percentComplete: number
    }
    startedAt: string
    lastActivityAt: string
    timeRemainingMs?: number
    score?: number
  }
  onResume: () => void
  onStartNew: () => void
  onClose: () => void
}

/**
 * Format date as relative time (e.g., "2 hours ago", "3 days ago")
 */
function formatRelativeTime(isoDate: string): string {
  const date = new Date(isoDate)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffSecs = Math.floor(diffMs / 1000)
  const diffMins = Math.floor(diffSecs / 60)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffSecs < 60) return 'just now'
  if (diffMins < 60) return `${diffMins} ${diffMins === 1 ? 'minute' : 'minutes'} ago`
  if (diffHours < 24) return `${diffHours} ${diffHours === 1 ? 'hour' : 'hours'} ago`
  if (diffDays < 30) return `${diffDays} ${diffDays === 1 ? 'day' : 'days'} ago`

  const diffMonths = Math.floor(diffDays / 30)
  return `${diffMonths} ${diffMonths === 1 ? 'month' : 'months'} ago`
}

/**
 * Format milliseconds as time string (e.g., "5m 30s", "1h 15m")
 */
function formatTimeRemaining(ms: number): string {
  const totalSecs = Math.floor(ms / 1000)
  const hours = Math.floor(totalSecs / 3600)
  const minutes = Math.floor((totalSecs % 3600) / 60)
  const seconds = totalSecs % 60

  if (hours > 0) {
    return `${hours}h ${minutes}m`
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds}s`
  }
  return `${seconds}s`
}

/**
 * Capitalize first letter of mode name
 */
function formatModeName(mode: string): string {
  return mode
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

export default function ResumeSessionDialog({
  open,
  session,
  onResume,
  onStartNew,
  onClose,
}: ResumeSessionDialogProps) {
  // Handle Escape key to close dialog
  useEffect(() => {
    if (!open) return

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [open, onClose])

  // Handle backdrop click
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  if (!open) return null

  const { progress, mode, startedAt, timeRemainingMs, score } = session
  const isTimedMode = mode === 'timed'

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 transition-opacity"
      onClick={handleBackdropClick}
      data-testid="resume-session-dialog-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="resume-session-dialog-title"
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-lg w-full mx-4 shadow-xl"
        data-testid="resume-session-dialog"
      >
        {/* Header with close button */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2
              id="resume-session-dialog-title"
              className="text-xl font-bold text-gray-900 dark:text-gray-100"
              data-testid="resume-session-dialog-title"
            >
              Resume Study Session?
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{session.goalTitle}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            aria-label="Close dialog"
            data-testid="resume-session-dialog-close"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Session Info */}
        <div className="mb-6 space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600 dark:text-gray-400">Mode</span>
            <span className="font-medium text-gray-900 dark:text-gray-100">
              {formatModeName(mode)}
            </span>
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600 dark:text-gray-400">Started</span>
            <span className="font-medium text-gray-900 dark:text-gray-100">
              {formatRelativeTime(startedAt)}
            </span>
          </div>

          {/* Timed Mode Specific Info */}
          {isTimedMode && (
            <>
              {timeRemainingMs !== undefined && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Time Remaining</span>
                  <span className="font-medium text-orange-600 dark:text-orange-400">
                    {formatTimeRemaining(timeRemainingMs)}
                  </span>
                </div>
              )}
              {score !== undefined && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Current Score</span>
                  <span className="font-medium text-blue-600 dark:text-blue-400">
                    {score} points
                  </span>
                </div>
              )}
            </>
          )}
        </div>

        {/* Progress Bar */}
        <div className="mb-6">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-gray-600 dark:text-gray-400">Progress</span>
            <span className="font-medium text-gray-900 dark:text-gray-100">
              {progress.responsesCount} of {progress.totalCards} cards (
              {Math.round(progress.percentComplete)}%)
            </span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
            <div
              className="bg-blue-600 h-full transition-all duration-300 rounded-full"
              style={{ width: `${progress.percentComplete}%` }}
              data-testid="resume-session-progress-bar"
            />
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex flex-col gap-3">
          <button
            onClick={onResume}
            className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium"
            data-testid="resume-session-dialog-resume"
          >
            Resume Session
          </button>
          <button
            onClick={onStartNew}
            className="w-full px-4 py-3 border-2 border-red-600 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors font-medium"
            data-testid="resume-session-dialog-start-new"
          >
            Start New Session
          </button>
          <p className="text-xs text-center text-gray-500 dark:text-gray-400">
            Starting a new session will abandon your current progress
          </p>
        </div>
      </div>
    </div>
  )
}
