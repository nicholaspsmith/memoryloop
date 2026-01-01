'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import SkillTree from './SkillTree'
import { type SkillNodeData } from './SkillNode'
import NodeStudyModal from '../study/NodeStudyModal'

/**
 * SkillTreeEditor Component (T032)
 *
 * Wrapper for SkillTree with card generation capabilities.
 * Shows skill tree and allows generating more cards for mastered nodes.
 * Supports node highlighting and targeted study.
 */

interface SkillTreeEditorProps {
  goalId: string
  nodes: SkillNodeData[]
}

export default function SkillTreeEditor({ goalId, nodes }: SkillTreeEditorProps) {
  const router = useRouter()
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [highlightedNodeId, setHighlightedNodeId] = useState<string | null>(null)
  const [isStudyModalOpen, setIsStudyModalOpen] = useState(false)

  // Count enabled nodes (all nodes are enabled by default now)
  const countNodes = (nodeList: SkillNodeData[]): { enabled: number; total: number } => {
    return nodeList.reduce(
      (acc, node) => {
        acc.total += 1
        if (node.isEnabled) acc.enabled += 1
        if (node.children) {
          const childCounts = countNodes(node.children)
          acc.enabled += childCounts.enabled
          acc.total += childCounts.total
        }
        return acc
      },
      { enabled: 0, total: 0 }
    )
  }

  const nodeCounts = countNodes(nodes)

  // Find a node by ID in the tree
  const findNode = (nodeList: SkillNodeData[], nodeId: string): SkillNodeData | null => {
    for (const node of nodeList) {
      if (node.id === nodeId) return node
      if (node.children) {
        const found = findNode(node.children, nodeId)
        if (found) return found
      }
    }
    return null
  }

  // Get descendant node IDs using path matching (T025)
  const getDescendantIds = (nodeList: SkillNodeData[], parentPath: string): string[] => {
    return nodeList.reduce((acc, node) => {
      if (node.path.startsWith(parentPath + '.') || node.path === parentPath) {
        acc.push(node.id)
      }
      if (node.children) {
        acc.push(...getDescendantIds(node.children, parentPath))
      }
      return acc
    }, [] as string[])
  }

  // Get selected node data
  const selectedNode = selectedNodeId ? findNode(nodes, selectedNodeId) : null

  // Get highlighted node data and descendants (T026)
  const highlightedNode = highlightedNodeId ? findNode(nodes, highlightedNodeId) : null
  const highlightedNodeIds = highlightedNode ? getDescendantIds(nodes, highlightedNode.path) : []

  // Calculate total card count for highlighted node + descendants (T026)
  const totalCardCount = highlightedNodeIds.reduce((total, nodeId) => {
    const node = findNode(nodes, nodeId)
    return total + (node?.cardCount || 0)
  }, 0)

  // Only show Generate Cards if node is fully mastered (100%) or has no cards
  const canGenerateCards =
    selectedNode && (selectedNode.masteryPercentage === 100 || selectedNode.cardCount === 0)

  // Handle node selection - toggle between select and highlight (T024)
  const handleNodeSelect = (nodeId: string) => {
    // If clicking same node, toggle between selected and highlighted
    if (selectedNodeId === nodeId) {
      setSelectedNodeId(null)
      setHighlightedNodeId(nodeId)
    } else if (highlightedNodeId === nodeId) {
      setHighlightedNodeId(null)
      setSelectedNodeId(null)
    } else {
      // First click selects for generation
      setSelectedNodeId(nodeId)
      setHighlightedNodeId(null)
    }
  }

  // Handle study button click (T028, T038)
  const handleStudyClick = () => {
    if (totalCardCount === 0) return
    setIsStudyModalOpen(true)
  }

  // Handle modal confirm (T039)
  const handleStudyConfirm = (cardLimit: number) => {
    setIsStudyModalOpen(false)

    // Navigate to study page with node parameters
    router.push(
      `/goals/${goalId}/study?nodeId=${highlightedNodeId}&includeChildren=true&cardLimit=${cardLimit}`
    )
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {nodeCounts.total} topics
          </span>
        </div>

        <div className="flex items-center gap-4">
          {/* Study Button (T028, T029) */}
          {highlightedNodeId && (
            <button
              onClick={handleStudyClick}
              disabled={totalCardCount === 0}
              data-testid="study-button"
              className="px-3 py-1.5 text-sm bg-purple-600 text-white hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed rounded-lg transition-colors flex items-center gap-1"
              title={totalCardCount === 0 ? 'No cards available' : `Study ${totalCardCount} cards`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                />
              </svg>
              Study {totalCardCount} cards
            </button>
          )}

          {canGenerateCards && (
            <Link
              href={`/goals/${goalId}/generate?nodeId=${selectedNodeId}`}
              className="px-3 py-1.5 text-sm bg-green-600 text-white hover:bg-green-700 rounded-lg transition-colors flex items-center gap-1"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                />
              </svg>
              Generate More Cards
            </Link>
          )}
        </div>
      </div>

      {/* Skill Tree (T027) */}
      <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-white dark:bg-gray-800">
        <SkillTree
          nodes={nodes}
          onSelectNode={handleNodeSelect}
          selectedNodeId={selectedNodeId}
          highlightedNodeIds={highlightedNodeIds}
        />
      </div>

      {/* Node Study Modal (T038) */}
      <NodeStudyModal
        isOpen={isStudyModalOpen}
        nodeId={highlightedNodeId || ''}
        nodeTitle={highlightedNode?.title || ''}
        totalCardCount={totalCardCount}
        onClose={() => setIsStudyModalOpen(false)}
        onConfirm={handleStudyConfirm}
      />
    </div>
  )
}
