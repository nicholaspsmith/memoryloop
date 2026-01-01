'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'

/**
 * Card Generation Page (Simplified)
 *
 * Flow:
 * 1. User lands with nodeId in URL params
 * 2. Select card count
 * 3. Generate cards (cards are created directly as active)
 * 4. Redirect to goal page
 */

interface NodeInfo {
  id: string
  title: string
  description: string | null
  children?: NodeInfo[]
}

export default function GeneratePage({ params }: { params: Promise<{ goalId: string }> }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const nodeId = searchParams.get('nodeId')

  const [goalId, setGoalId] = useState<string | null>(null)
  const [node, setNode] = useState<NodeInfo | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Form state
  const [count, setCount] = useState(5)

  // Unwrap params
  useEffect(() => {
    params.then((p) => setGoalId(p.goalId))
  }, [params])

  // Fetch node info
  useEffect(() => {
    if (!goalId || !nodeId) return

    const fetchNode = async () => {
      try {
        const response = await fetch(`/api/goals/${goalId}/skill-tree`)
        if (!response.ok) throw new Error('Failed to load skill tree')
        const data = await response.json()

        // Find the node in the tree
        const findNode = (nodes: NodeInfo[]): NodeInfo | null => {
          for (const n of nodes) {
            if (n.id === nodeId) return n
            if (n.children) {
              const found = findNode(n.children)
              if (found) return found
            }
          }
          return null
        }

        const foundNode = findNode(data.nodes || [])
        if (foundNode) {
          setNode(foundNode)
        } else {
          setError('Node not found')
        }
      } catch {
        setError('Failed to load node information')
      }
    }

    fetchNode()
  }, [goalId, nodeId])

  // Generate cards
  const handleGenerate = async () => {
    if (!goalId || !nodeId) return

    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const response = await fetch(`/api/goals/${goalId}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nodeId, count, cardType: 'mixed' }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to generate cards')
      }

      const result = await response.json()
      setSuccess(
        `Created ${result.created} cards in ${(result.metadata.generationTimeMs / 1000).toFixed(1)}s! Redirecting...`
      )

      // Redirect to goal page after short delay
      setTimeout(() => {
        router.push(`/goals/${goalId}`)
        router.refresh()
      }, 1500)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate cards')
    } finally {
      setLoading(false)
    }
  }

  if (!nodeId) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6">
        <h1 className="text-2xl font-bold text-red-600 mb-4">No node selected</h1>
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          Please select a node from the skill tree to generate cards.
        </p>
        {goalId && (
          <Link href={`/goals/${goalId}`} className="text-blue-600 hover:underline">
            Back to Goal
          </Link>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen p-6 max-w-md mx-auto">
      {/* Header */}
      <div className="mb-6">
        {goalId && (
          <Link
            href={`/goals/${goalId}`}
            className="text-sm text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 flex items-center gap-1 mb-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Back to Goal
          </Link>
        )}
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Generate More Cards</h1>
        {node && (
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Adding cards to: <span className="font-medium">{node.title}</span>
          </p>
        )}
      </div>

      {/* Messages */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-green-700 dark:text-green-300">
          {success}
        </div>
      )}

      {/* Generation Form */}
      {!success && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Number of Cards
            </label>
            <select
              value={count}
              onChange={(e) => setCount(parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value={5}>5 cards</option>
              <option value={10}>10 cards</option>
              <option value={15}>15 cards</option>
              <option value={20}>20 cards</option>
            </select>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              Cards will be created immediately and available for study.
            </p>
          </div>

          <button
            onClick={handleGenerate}
            disabled={loading}
            className="w-full py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                Generating...
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                  />
                </svg>
                Generate {count} Cards
              </>
            )}
          </button>
        </div>
      )}
    </div>
  )
}
