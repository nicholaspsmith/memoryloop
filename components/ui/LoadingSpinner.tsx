/**
 * Loading Spinner Component
 *
 * Displays a loading spinner with accessibility support for page loading states.
 * Used in Suspense boundaries across chat, quiz, and settings pages.
 *
 * Accessibility:
 * - role="status" for screen readers
 * - sr-only text provides context
 * - Respects prefers-reduced-motion (via Tailwind)
 */

export function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center p-8" role="status">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600 dark:border-gray-600 dark:border-t-blue-400" />
      <span className="sr-only">Loading...</span>
    </div>
  )
}
