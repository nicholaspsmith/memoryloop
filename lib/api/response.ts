import { NextResponse } from 'next/server'
import { formatError } from '../errors'

/**
 * Success response helper
 */
export function success<T>(data: T, status: number = 200): NextResponse {
  return NextResponse.json({ success: true, data }, { status })
}

/**
 * Error response helper
 */
export function error(err: unknown): NextResponse {
  const formatted = formatError(err)

  return NextResponse.json(
    {
      success: false,
      error: formatted.error,
      ...(formatted.code ? { code: formatted.code } : {}),
      ...(formatted.details ? { details: formatted.details } : {}),
    },
    { status: formatted.statusCode }
  )
}

/**
 * Created response helper (201)
 */
export function created<T>(data: T): NextResponse {
  return success(data, 201)
}

/**
 * No content response helper (204)
 */
export function noContent(): NextResponse {
  return new NextResponse(null, { status: 204 })
}

/**
 * Paginated response helper
 */
export function paginated<T>(
  data: T[],
  pagination: {
    page: number
    pageSize: number
    total: number
  }
): NextResponse {
  return NextResponse.json({
    success: true,
    data,
    pagination: {
      page: pagination.page,
      pageSize: pagination.pageSize,
      total: pagination.total,
      totalPages: Math.ceil(pagination.total / pagination.pageSize),
      hasNext: pagination.page < Math.ceil(pagination.total / pagination.pageSize),
      hasPrev: pagination.page > 1,
    },
  })
}
