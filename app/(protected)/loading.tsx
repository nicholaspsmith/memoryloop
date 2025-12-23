/**
 * Protected Routes Loading State
 *
 * Displays while protected routes are loading.
 * Used as a Suspense fallback by Next.js.
 */

import { LoadingSpinner } from '@/components/ui/LoadingSpinner'

export default function ProtectedLoading() {
  return <LoadingSpinner />
}
