# Feature Specification: Landing Page

**Feature Branch**: `029-landing-page`
**Created**: 2026-01-11
**Status**: Draft
**Input**: User description: "We need to add a landing page that shows a basic description and tutorial of loopi. A user who is not logged in should see this page. The page should have a link so that users can log in or create an account."

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Discover Loopi Value Proposition (Priority: P1)

A first-time visitor arrives at the Loopi homepage and immediately understands what the product does and why it's valuable. They see a clear description of the AI-powered skill tree learning system and how spaced repetition helps them master any skill.

**Why this priority**: This is the primary purpose of the landing page - converting visitors into users by clearly communicating value.

**Independent Test**: Can be fully tested by visiting the homepage as a non-logged-in user and verifying the value proposition is immediately visible and understandable.

**Acceptance Scenarios**:

1. **Given** I am a non-logged-in visitor, **When** I visit the homepage, **Then** I see a clear headline explaining what Loopi does
2. **Given** I am a non-logged-in visitor, **When** I view the landing page, **Then** I understand the key benefits (AI skill trees, spaced repetition, learn anything) within 10 seconds of reading
3. **Given** I am viewing the landing page, **When** I scroll down, **Then** I see supporting content that reinforces the value proposition

---

### User Story 2 - Learn How Loopi Works (Priority: P2)

A visitor wants to understand how the product works before signing up. They can view a tutorial or walkthrough that explains the learning process: setting goals, studying with AI, reviewing with spaced repetition.

**Why this priority**: Reduces friction by educating users before asking for commitment, increasing conversion quality.

**Independent Test**: Can be fully tested by navigating to the tutorial section and verifying each step of the learning process is clearly explained.

**Acceptance Scenarios**:

1. **Given** I am on the landing page, **When** I look for a tutorial, **Then** I find a clear "How It Works" section
2. **Given** I am viewing the tutorial, **When** I read through it, **Then** I understand the 3-step process: set goals, study with AI, review with spaced repetition
3. **Given** I am viewing the tutorial, **When** I complete reading it, **Then** I have enough information to decide whether to sign up

---

### User Story 3 - Navigate to Authentication (Priority: P1)

A visitor decides they want to try Loopi and can easily find prominent links to create an account or log in if they already have one.

**Why this priority**: Critical path to conversion - without clear CTAs, visitors cannot become users.

**Independent Test**: Can be fully tested by verifying login and signup links are visible and functional from the landing page.

**Acceptance Scenarios**:

1. **Given** I am on the landing page, **When** I want to sign up, **Then** I see a prominent "Get Started" or "Sign Up" button
2. **Given** I am on the landing page, **When** I already have an account, **Then** I can find a "Log In" link
3. **Given** I click on a signup or login link, **When** the page loads, **Then** I am taken to the appropriate authentication page

---

### User Story 4 - Logged-in User Redirect (Priority: P2)

A user who is already logged in and visits the homepage is redirected to their dashboard rather than seeing the marketing landing page.

**Why this priority**: Improves user experience for returning users by not showing them marketing content they don't need.

**Independent Test**: Can be fully tested by logging in and visiting the root URL, verifying redirect to dashboard.

**Acceptance Scenarios**:

1. **Given** I am logged in, **When** I visit the homepage URL, **Then** I am redirected to my goals dashboard
2. **Given** I am logged in and on another page, **When** I click the logo/home link, **Then** I am taken to my dashboard, not the landing page

---

### Edge Cases

- What happens when a user's session expires while on the landing page? (They remain on landing page, no action needed)
- How does the page handle slow connections? (Page should load progressively, showing content before images)
- What if a logged-in user directly navigates to the landing page URL with a query parameter? (Still redirect to dashboard)

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: System MUST display the landing page to non-authenticated visitors at the root URL
- **FR-002**: System MUST redirect authenticated users from the root URL to their dashboard
- **FR-003**: Landing page MUST include a clear headline describing Loopi's purpose
- **FR-004**: Landing page MUST include a "How It Works" tutorial section with text and static illustrations explaining the learning process
- **FR-005**: Landing page MUST include prominent call-to-action buttons for signup
- **FR-006**: Landing page MUST include a link to the login page for existing users
- **FR-007**: Landing page MUST be fully viewable without requiring authentication
- **FR-008**: All navigation links on the landing page MUST function correctly
- **FR-009**: Landing page MUST load and display content within acceptable performance thresholds

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Landing page loads completely within 3 seconds on standard connections
- **SC-002**: Users can identify what Loopi does within 10 seconds of viewing the page
- **SC-003**: Signup and login links are clickable and navigate to correct pages 100% of the time
- **SC-004**: 80% of first-time visitors scroll past the initial viewport (engagement metric)
- **SC-005**: Logged-in users are redirected to dashboard within 1 second of page request

## Clarifications

### Session 2026-01-11

- Q: What format should the "How It Works" tutorial use? → A: Text with static images/illustrations (simple, fast to load)

## Assumptions

- The landing page will use the existing visual design language and branding from the auth pages
- Tutorial content will be static text with illustrations (not animated or video) for initial implementation
- The page will be responsive and work on mobile devices
- SEO optimization is desired but not a blocking requirement for initial launch
- No A/B testing infrastructure is required for initial implementation
