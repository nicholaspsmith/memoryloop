/**
 * Skill Tree Generation Job Handler
 *
 * Wraps the existing generateSkillTree function and:
 * - Generates skill tree nodes using Claude AI
 * - Creates skill tree record in database
 * - Persists all nodes with parent relationships
 * - Updates tree statistics
 *
 * Maps to spec: 018-background-flashcard-generation (User Story 3)
 */

import { generateSkillTree, flattenGeneratedNodes } from '@/lib/ai/skill-tree-generator'
import {
  createSkillTree,
  updateSkillTreeStats,
  getSkillTreeByGoalId,
} from '@/lib/db/operations/skill-trees'
import { createSkillNodes, getNodesByTreeId } from '@/lib/db/operations/skill-nodes'
import { getGoalByIdForUser } from '@/lib/db/operations/goals'
import { createJob } from '@/lib/db/operations/background-jobs'
import { registerHandler } from '@/lib/jobs/processor'
import { JobType } from '@/lib/db/drizzle-schema'
import type {
  SkillTreeGenerationPayload,
  SkillTreeGenerationResult,
  FlashcardGenerationPayload,
  JobHandler,
} from '@/lib/jobs/types'
import * as logger from '@/lib/logger'

/**
 * Handle skill tree generation for a goal
 *
 * @param payload - Job payload with goalId and topic
 * @param userId - User ID from job record
 * @returns Result with tree ID, node count, and depth
 * @throws Error if goal not found, unauthorized, or tree already exists
 */
export async function handleSkillTreeGeneration(
  payload: SkillTreeGenerationPayload,
  userId: string
): Promise<SkillTreeGenerationResult> {
  logger.info('[SkillTreeJob] Starting skill tree generation', {
    goalId: payload.goalId,
    topic: payload.topic,
    userId,
  })

  // Validate goal exists and belongs to user
  const goal = await getGoalByIdForUser(payload.goalId, userId)
  if (!goal) {
    throw new Error('Goal not found or unauthorized')
  }

  // Check if skill tree already exists
  const existingTree = await getSkillTreeByGoalId(payload.goalId)
  if (existingTree) {
    throw new Error('Skill tree already exists')
  }

  logger.info('[SkillTreeJob] Goal validated, generating skill tree', {
    goalId: payload.goalId,
    goalTitle: goal.title,
  })

  // Generate skill tree using AI
  const generated = await generateSkillTree(payload.topic)

  logger.info('[SkillTreeJob] Skill tree generated', {
    nodeCount: generated.metadata.nodeCount,
    maxDepth: generated.metadata.maxDepth,
    generationTimeMs: generated.metadata.generationTimeMs,
  })

  // Create skill tree record
  const tree = await createSkillTree({
    goalId: payload.goalId,
    generatedBy: 'ai',
  })

  // Flatten and insert nodes with parent relationships
  const flatNodes = flattenGeneratedNodes(generated.nodes)

  // Create nodes in hierarchical order
  for (const node of flatNodes) {
    const createdNode = await createSkillNodes([
      {
        treeId: tree.id,
        parentId: null,
        title: node.title,
        description: node.description,
        depth: node.depth,
        path: node.path,
        sortOrder: node.sortOrder,
      },
    ])

    // Recursively create children (depth 1)
    if (node.children && node.children.length > 0) {
      const childFlat = flattenGeneratedNodes(node.children, createdNode[0].id, node.path)
      for (const child of childFlat) {
        const createdChild = await createSkillNodes([
          {
            treeId: tree.id,
            parentId: createdNode[0].id,
            title: child.title,
            description: child.description,
            depth: child.depth,
            path: child.path,
            sortOrder: child.sortOrder,
          },
        ])

        // Handle third level - subtopics (depth 2)
        if (child.children && child.children.length > 0) {
          const subtopicFlat = flattenGeneratedNodes(child.children, createdChild[0].id, child.path)
          for (const subtopic of subtopicFlat) {
            await createSkillNodes([
              {
                treeId: tree.id,
                parentId: createdChild[0].id,
                title: subtopic.title,
                description: subtopic.description,
                depth: subtopic.depth,
                path: subtopic.path,
                sortOrder: subtopic.sortOrder,
              },
            ])
          }
        }
      }
    }
  }

  // Update tree statistics
  await updateSkillTreeStats(tree.id)

  // Queue flashcard generation jobs for each node (019-auto-gen-guided-study)
  const allNodes = await getNodesByTreeId(tree.id)
  const FREE_TIER_MAX_CARDS = 5

  logger.info('[SkillTreeJob] Queuing flashcard generation for nodes', {
    treeId: tree.id,
    nodeCount: allNodes.length,
    maxCardsPerNode: FREE_TIER_MAX_CARDS,
  })

  for (const node of allNodes) {
    const flashcardPayload: FlashcardGenerationPayload = {
      nodeId: node.id,
      nodeTitle: node.title,
      nodeDescription: node.description ?? undefined,
      maxCards: FREE_TIER_MAX_CARDS,
    }

    await createJob({
      type: JobType.FLASHCARD_GENERATION,
      payload: flashcardPayload,
      userId,
      priority: 0, // Lower priority than tree generation
    })

    logger.info('[SkillTreeJob] Queued flashcard job for node', {
      nodeId: node.id,
      nodeTitle: node.title,
    })
  }

  logger.info('[SkillTreeJob] Skill tree creation completed', {
    goalId: payload.goalId,
    treeId: tree.id,
    nodeCount: generated.metadata.nodeCount,
    maxDepth: generated.metadata.maxDepth,
    flashcardJobsQueued: allNodes.length,
  })

  return {
    treeId: tree.id,
    nodeCount: generated.metadata.nodeCount,
    depth: generated.metadata.maxDepth,
  }
}

// Register handler with job processor
const wrappedHandler: JobHandler<SkillTreeGenerationPayload, SkillTreeGenerationResult> = async (
  payload,
  job
) => {
  if (!job.userId) {
    throw new Error('Job requires userId')
  }
  return handleSkillTreeGeneration(payload, job.userId)
}

registerHandler(JobType.SKILL_TREE_GENERATION, wrappedHandler)
