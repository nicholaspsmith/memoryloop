import * as Sentry from '@sentry/nextjs'
import { NextResponse } from 'next/server'

/**
 * Test endpoint to verify Sentry is capturing errors
 * GET /api/sentry-test - Captures a test error and returns success
 * DELETE after confirming Sentry works
 */
export async function GET() {
  try {
    // Intentionally throw an error
    throw new Error('Sentry test error from memoryloop API')
  } catch (error) {
    Sentry.captureException(error)
    return NextResponse.json({
      message: 'Test error captured and sent to Sentry',
      error: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}
