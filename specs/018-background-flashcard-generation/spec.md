# Feature Specification: Background Flashcard Generation

**Feature Branch**: `018-background-flashcard-generation`
**Created**: 2025-12-30
**Status**: Draft
**Input**: User description: "Card generation, skill tree creation and distractor generation (all operations that require awaiting a response from an LLM API call) should be completed in a non-blocking background task. UI should indicate to user which data is being generated with a non-selectable greyed out placeholder with an animated loading spinner as well as some basic text 'Generating...' or something like that. This addresses Issue 233."

## Clarifications

### Session 2025-12-30

- Q: What is the stale job timeout threshold for resetting stuck jobs? → A: 5 minutes
- Q: How frequently should the frontend poll for job status updates? → A: 3 seconds
- Q: What is the rate limit for background jobs per user per type? → A: 20 jobs per hour per type
- Q: What is the maximum number of retry attempts for failed jobs? → A: 3 attempts

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Background Flashcard Generation (Priority: P1)

As a user, I want flashcard generation to happen in the background so that I can continue using the application while cards are being created.

**Why this priority**: This is the core problem - users currently wait for minutes while flashcards generate, blocking their entire session. Solving this enables continued productivity and prevents data loss from navigation.

**Independent Test**: Can be fully tested by triggering flashcard generation and verifying the user can navigate to other parts of the app while generation continues.

**Acceptance Scenarios**:

1. **Given** a user has content to convert to flashcards, **When** they initiate flashcard generation, **Then** they see a placeholder indicating generation is in progress and can continue using other parts of the app.
2. **Given** flashcard generation is in progress, **When** the generation completes, **Then** the placeholder is replaced with the actual flashcard(s) without requiring a page refresh.
3. **Given** flashcard generation is in progress, **When** the user navigates away from the page, **Then** generation continues and cards appear when the user returns.

---

### User Story 2 - Background Distractor Generation (Priority: P1)

As a user, I want distractor (wrong answer choices) generation to happen in the background so that multi-choice study mode is usable even with LLM latency.

**Why this priority**: Distractor generation is tightly coupled with flashcard generation for multi-choice mode. Without background processing, users cannot use the recently-implemented multi-choice feature effectively.

**Independent Test**: Can be tested by initiating a study session in multi-choice mode with cards that need distractors, verifying placeholders show during generation.

**Acceptance Scenarios**:

1. **Given** a flashcard needs distractors for multi-choice mode, **When** the system generates distractors, **Then** a loading indicator shows until distractors are ready.
2. **Given** distractor generation is in progress, **When** generation completes, **Then** the multi-choice options appear and are interactive.
3. **Given** a card's distractors fail to generate, **When** the user views that card, **Then** they see an appropriate fallback (e.g., show as standard Q&A card with retry option).

---

### User Story 3 - Background Skill Tree Generation (Priority: P2)

As a user, I want skill tree generation to happen in the background so that I can start exploring content while the tree structure is being built.

**Why this priority**: Skill trees provide organizational structure but are less time-critical than flashcards. Users can view a partial tree or placeholder while full generation completes.

**Independent Test**: Can be tested by creating a new goal and verifying the skill tree shows a loading state while nodes are being generated.

**Acceptance Scenarios**:

1. **Given** a user creates a new learning goal, **When** skill tree generation starts, **Then** they see a tree skeleton/placeholder with loading indicators for pending nodes.
2. **Given** skill tree generation is in progress, **When** new nodes are created, **Then** they appear progressively without full page reload.
3. **Given** skill tree generation fails partially, **When** the user views the tree, **Then** they see completed nodes plus an indicator for failed sections with retry option.

---

### User Story 4 - Generation Status Visibility (Priority: P1)

As a user, I want clear visual feedback about what content is being generated so I understand the system is working.

**Why this priority**: Without clear status indication, users may think the app is frozen or broken when operations are actually running.

**Independent Test**: Can be tested by triggering generation and verifying loading states, progress indicators, and completion notifications appear correctly.

**Acceptance Scenarios**:

1. **Given** any background generation is in progress, **When** the user views the relevant content area, **Then** they see a greyed-out placeholder with animated spinner and "Generating..." text.
2. **Given** generation succeeds, **When** the user is on the page, **Then** the placeholder transitions to the actual content within 2 seconds of completion.
3. **Given** generation fails after retries, **When** the user views the area, **Then** they see an error state with retry option.

---

### Edge Cases

- What happens when the user initiates multiple generation operations simultaneously?
  - Each operation runs independently with its own placeholder/progress indicator
  - Rate limiting prevents abuse (configurable limits per job type)
- What happens if the LLM API is unavailable or times out?
  - Jobs retry with exponential backoff (configurable max attempts)
  - After max retries, job marked as failed with user-visible error and manual retry option
- What happens if the user closes the browser during generation?
  - Jobs persist in database and continue/complete on next request
  - On return, user sees either completed content or resumable job status
- What happens if a job has been stuck in "processing" state?
  - Jobs in "processing" state for more than 5 minutes are automatically reset to "pending" for reprocessing
  - Stale job detection prevents zombie jobs

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: System MUST queue LLM-dependent operations (flashcard, distractor, skill tree generation) as background jobs instead of blocking the request.
- **FR-002**: System MUST display a non-interactive greyed-out placeholder with animated loading spinner for content that is being generated.
- **FR-003**: System MUST show descriptive text (e.g., "Generating flashcards...") to indicate what operation is in progress.
- **FR-004**: System MUST automatically update the UI when background generation completes (without full page refresh).
- **FR-005**: System MUST persist job state so generation survives navigation and session interruption.
- **FR-006**: System MUST retry failed jobs with exponential backoff up to 3 maximum attempts (1 initial + 2 retries).
- **FR-007**: System MUST provide a user-facing retry option when generation fails after exhausting retries.
- **FR-008**: System MUST enforce rate limits of 20 jobs per hour per user per job type to prevent abuse.
- **FR-009**: System MUST display appropriate error messages when generation fails.
- **FR-010**: System MUST support polling for job status updates at 3-second intervals (frontend).
- **FR-011**: System MUST handle concurrent generation requests for different content independently.
- **FR-012**: System MUST provide fallback behavior when distractors are unavailable (show standard Q&A mode).

### Key Entities

- **BackgroundJob**: Represents a queued generation task with type, status, payload, result, retry metadata, and timestamps.
- **JobRateLimit**: Tracks generation request counts per user per job type within time windows for abuse prevention.
- **GenerationPlaceholder**: UI component representing pending content with loading state.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Users can navigate to other pages within 2 seconds of initiating any generation operation (no blocking wait).
- **SC-002**: Generated content appears within 5 seconds of job completion when user is viewing the relevant page.
- **SC-003**: Jobs that fail transiently succeed on retry at least 90% of the time.
- **SC-004**: Users who navigate away and return see their generated content without data loss.
- **SC-005**: System displays clear loading indicators for 100% of in-progress generation operations.
- **SC-006**: Failed generations show actionable retry option within 1 second of failure state rendering.

## Assumptions

- The existing database schema changes (background_jobs, job_rate_limits tables) in progress are appropriate for this feature.
- PostgreSQL's JSONB type is sufficient for storing job payloads and results.
- Polling-based status updates are acceptable for MVP; WebSocket/SSE can be added later if needed.
- Job processing will initially use Next.js API routes or serverless functions; dedicated worker processes are out of scope for initial implementation.
- Rate limits will be simple (20 jobs per hour per type) without complex tiered quotas.
