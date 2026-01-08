import { NextRequest, NextResponse } from 'next/server'

/**
 * Sentry Tunnel Route
 *
 * Acts as a proxy between the client and Sentry to bypass ad-blockers.
 * Ad-blockers typically block requests to *.sentry.io domains, but they
 * won't block same-origin requests to our own /api/monitoring endpoint.
 *
 * This route:
 * 1. Receives Sentry envelope data from the client
 * 2. Extracts and validates the DSN from the envelope header
 * 3. Forwards the request to Sentry's envelope endpoint
 *
 * @see https://docs.sentry.io/platforms/javascript/troubleshooting/#using-the-tunnel-option
 */

// Sentry ingest host extracted from our DSN
const SENTRY_HOST = 'o4510672318955520.ingest.us.sentry.io'

// Our project ID from the DSN
const SENTRY_PROJECT_ID = '4510672320200704'

export async function POST(request: NextRequest) {
  try {
    const envelope = await request.text()

    // Parse the envelope header (first line contains DSN info)
    const headerEndIndex = envelope.indexOf('\n')
    if (headerEndIndex === -1) {
      return NextResponse.json({ error: 'Invalid envelope format' }, { status: 400 })
    }

    const header = envelope.substring(0, headerEndIndex)
    let headerData: { dsn?: string }

    try {
      headerData = JSON.parse(header)
    } catch {
      return NextResponse.json({ error: 'Invalid envelope header' }, { status: 400 })
    }

    // Extract and validate DSN
    const dsn = headerData.dsn
    if (!dsn) {
      return NextResponse.json({ error: 'Missing DSN in envelope' }, { status: 400 })
    }

    let dsnUrl: URL
    try {
      dsnUrl = new URL(dsn)
    } catch {
      return NextResponse.json({ error: 'Invalid DSN format' }, { status: 400 })
    }

    // Validate the DSN matches our Sentry project
    const projectId = dsnUrl.pathname.replace(/\//g, '')
    if (projectId !== SENTRY_PROJECT_ID) {
      return NextResponse.json({ error: 'Invalid project ID' }, { status: 403 })
    }

    // Forward to Sentry
    const sentryUrl = `https://${SENTRY_HOST}/api/${projectId}/envelope/`

    const response = await fetch(sentryUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-sentry-envelope',
      },
      body: envelope,
    })

    // Return Sentry's response status
    return new NextResponse(null, { status: response.status })
  } catch (error) {
    console.error('Sentry tunnel error:', error)
    return NextResponse.json({ error: 'Tunnel error' }, { status: 500 })
  }
}

// Handle preflight requests
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}
