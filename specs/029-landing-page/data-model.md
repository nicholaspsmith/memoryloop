# Data Model: Landing Page

**Feature Branch**: `029-landing-page`
**Date**: 2026-01-11

## Overview

The landing page feature has **no data model requirements**. This is a static marketing page that:

1. Does not persist any data
2. Does not read from the database
3. Only checks authentication state (existing functionality)

## Authentication Check

The only "data" interaction is reading the session to determine redirect behavior:

```typescript
// Existing auth module - no changes needed
import { auth } from '@/auth'

const session = await auth()
// session?.user?.id exists if authenticated
```

### Session Shape (for reference)

```typescript
// From existing auth.ts - read-only access
interface Session {
  user?: {
    id: string
    email: string
    name?: string
    emailVerified?: Date
  }
}
```

## Content Storage

All landing page content is **hardcoded in components**. This is intentional per the simplicity principle:

- No CMS integration required
- No database queries on page load
- Maximizes performance
- Content changes require code deploy (acceptable for initial implementation)

## Future Considerations

If content management becomes needed later, consider:

1. **Static content files** (JSON/MDX) - simple, versionable
2. **CMS integration** - if marketing team needs control
3. **A/B testing database** - if conversion optimization needed

These are explicitly out of scope for initial implementation per spec assumptions.

## Database Schema Changes

**None required.**

## API Changes

**None required.**

## Migration

**None required.**
