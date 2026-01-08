/**
 * Sentry Server Configuration
 *
 * This file configures the Sentry SDK for the Node.js server runtime.
 * Imported by instrumentation.ts when NEXT_RUNTIME === 'nodejs'.
 */

import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.SENTRY_DSN,

  // Disable Sentry in development unless explicitly enabled
  enabled: process.env.NODE_ENV === 'production' || process.env.SENTRY_ENABLED === 'true',

  // Performance monitoring - sample 10% in production
  tracesSampleRate: process.env.NODE_ENV === 'development' ? 1.0 : 0.1,

  // Enable profiling for performance analysis (sample 10% of traces)
  profilesSampleRate: 0.1,

  // Set environment
  environment: process.env.NODE_ENV || 'development',

  // Scrub sensitive data from server-side events
  beforeSend(event) {
    // Scrub sensitive headers
    if (event.request?.headers) {
      const sensitiveHeaders = ['authorization', 'cookie', 'x-api-key']
      sensitiveHeaders.forEach((header) => {
        if (event.request?.headers?.[header]) {
          event.request.headers[header] = '[REDACTED]'
        }
      })
    }

    // Scrub request/response bodies (may contain user flashcards, goals, messages)
    if (event.request?.data) {
      event.request.data = '[REDACTED]'
    }

    // Scrub any extra context that might contain PII
    if (event.contexts?.data) {
      delete event.contexts.data
    }

    // Anonymize user context to prevent IP address and user ID tracking
    if (event.user) {
      event.user = {
        id: event.user.id ? '[ANONYMIZED]' : undefined,
        ip_address: undefined,
      }
    }

    // Scrub sensitive data from error messages
    if (event.message) {
      event.message = event.message
        .replace(/password[=:]\s*\S+/gi, 'password=[REDACTED]')
        .replace(/api[_-]?key[=:]\s*\S+/gi, 'api_key=[REDACTED]')
        .replace(/token[=:]\s*\S+/gi, 'token=[REDACTED]')
    }

    return event
  },
})
