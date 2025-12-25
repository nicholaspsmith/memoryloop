/**
 * Route Test Helper for Next.js App Router
 *
 * Provides utilities to test Next.js route handlers without a running server.
 * Works with Next.js 13+ App Router route handlers.
 */

import { NextRequest, NextResponse } from 'next/server'
import type { RequestInit as NextRequestInit } from 'next/dist/server/web/spec-extension/request'

/**
 * Mock session for testing
 */
export interface MockSession {
  user: {
    id: string
    email: string
    name?: string
  }
}

/**
 * Test request options
 */
export interface RouteTestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE' | 'PUT'
  body?: unknown
  headers?: Record<string, string>
  params?: Record<string, string>
  searchParams?: Record<string, string>
  session?: MockSession | null
}

/**
 * Create a mock NextRequest for testing
 */
function createMockRequest(url: string, options: RouteTestOptions = {}): NextRequest {
  const { method = 'GET', body, headers = {}, searchParams = {} } = options

  // Build full URL with search params
  const fullUrl = new URL(url, 'http://localhost:3000')
  Object.entries(searchParams).forEach(([key, value]) => {
    fullUrl.searchParams.set(key, value)
  })

  const requestInit: NextRequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  }

  if (
    body &&
    (method === 'POST' || method === 'PATCH' || method === 'PUT' || method === 'DELETE')
  ) {
    requestInit.body = JSON.stringify(body)
  }

  return new NextRequest(fullUrl.toString(), requestInit)
}

/**
 * Extract response data from NextResponse
 */
async function extractResponseData(response: NextResponse | Response) {
  const status = response.status
  const headers: Record<string, string> = {}

  response.headers.forEach((value, key) => {
    headers[key] = value
  })

  let data: unknown = null
  const contentType = response.headers.get('content-type')

  if (contentType?.includes('application/json')) {
    const text = await response.text()
    if (text) {
      data = JSON.parse(text)
    }
  }

  return {
    status,
    headers,
    data,
    json: async () => data,
    text: async () => response.text(),
  }
}

/**
 * Route handler context type
 */
type RouteContext = { params: Promise<Record<string, string>> } | undefined

/**
 * Test a GET route handler
 */
export async function testGET(
  handler: (request: NextRequest, context?: RouteContext) => Promise<NextResponse | Response>,
  url: string,
  options: RouteTestOptions = {}
) {
  const request = createMockRequest(url, { ...options, method: 'GET' })
  const context = options.params ? { params: Promise.resolve(options.params) } : undefined

  const response = await handler(request, context)
  return extractResponseData(response)
}

/**
 * Test a POST route handler
 */
export async function testPOST(
  handler: (request: NextRequest, context?: RouteContext) => Promise<NextResponse | Response>,
  url: string,
  options: RouteTestOptions = {}
) {
  const request = createMockRequest(url, { ...options, method: 'POST' })
  const context = options.params ? { params: Promise.resolve(options.params) } : undefined

  const response = await handler(request, context)
  return extractResponseData(response)
}

/**
 * Test a PATCH route handler
 */
export async function testPATCH(
  handler: (request: NextRequest, context?: RouteContext) => Promise<NextResponse | Response>,
  url: string,
  options: RouteTestOptions = {}
) {
  const request = createMockRequest(url, { ...options, method: 'PATCH' })
  const context = options.params ? { params: Promise.resolve(options.params) } : undefined

  const response = await handler(request, context)
  return extractResponseData(response)
}

/**
 * Test a DELETE route handler
 */
export async function testDELETE(
  handler: (request: NextRequest, context?: RouteContext) => Promise<NextResponse | Response>,
  url: string,
  options: RouteTestOptions = {}
) {
  const request = createMockRequest(url, { ...options, method: 'DELETE' })
  const context = options.params ? { params: Promise.resolve(options.params) } : undefined

  const response = await handler(request, context)
  return extractResponseData(response)
}
