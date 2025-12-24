# Data Model: Spec-Kit Workflow Improvements

**Branch**: `001-speckit-workflow-improvements` | **Date**: 2025-12-23
**Feature**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

## Overview

This document defines the core entities, their attributes, relationships, and state transitions for the spec-kit workflow improvements feature. The data model supports three independent phases:

- **Phase 1 (P1)**: Package version synchronization
- **Phase 2 (P2)**: Script quality enhancements
- **Phase 3 (P3)**: Workflow UX improvements

## Core Entities

### 1. Package Version Entry

Represents a dependency package whose version is tracked and synchronized between package.json and CLAUDE.md.

**Attributes**:

- `displayName` (string): Human-readable name shown in CLAUDE.md (e.g., "TypeScript", "Next.js")
- `packageName` (string): npm package name from package.json (e.g., "typescript", "next")
- `version` (string): Semantic version string (major.minor or major.minor.patch)
- `sourceType` (enum): `dependencies` | `devDependencies`
- `isParenthetical` (boolean): Whether version appears in parentheses (e.g., PostgreSQL via postgres 3.4)

**Validation Rules**:

- `displayName` must exist in CLAUDE.md Technology Stack section
- `packageName` must exist in package.json
- `version` must match pattern: `[0-9]+\.[0-9]+(\.[0-9]+)?(-[a-z0-9.]+)?` (Phase 2)
- `version` stripped of npm range prefixes (^, ~, >=, etc.)

**Storage**:

- **Source of Truth**: package.json (dependencies/devDependencies)
- **Synchronized To**: CLAUDE.md Technology Stack section
- **Format in CLAUDE.md**:
  ```markdown
  - TypeScript 5.7 (strict mode) + Next.js 16.0.10 App Router
  - PostgreSQL (via postgres 3.4, drizzle-orm 0.45)
  ```

**State Transitions**:

1. **Drift Detection** (Phase 2): package.json version ≠ CLAUDE.md version
   - Trigger: `--validate` flag on update-agent-context.sh
   - Action: Display diff, prompt for sync confirmation
2. **Synchronization**: Write package.json version to CLAUDE.md
   - Trigger: Script execution without `--validate` flag
   - Action: Update CLAUDE.md with current package.json versions

**Examples**:

```json
{
  "displayName": "TypeScript",
  "packageName": "typescript",
  "version": "5.7",
  "sourceType": "devDependencies",
  "isParenthetical": false
}

{
  "displayName": "postgres",
  "packageName": "postgres",
  "version": "3.4",
  "sourceType": "dependencies",
  "isParenthetical": true
}
```

---

### 2. Feature Branch

Represents a git branch with a matching specification directory for a feature in development.

**Attributes**:

- `branchName` (string): Git branch name (format: `NNN-short-name`)
- `featureNumber` (number): Sequential feature identifier (e.g., 001, 002)
- `shortName` (string): Kebab-case feature identifier (e.g., "speckit-workflow-improvements")
- `specsDir` (string): Absolute path to specs directory
- `currentPhase` (enum): `specify` | `clarify` | `plan` | `tasks` | `implement` | `complete`
- `workflowMode` (enum | null): `automatic` | `user-guided` (Phase 3, session-scoped)

**Validation Rules**:

- `branchName` must match pattern: `[0-9]{3}-[a-z0-9-]+`
- `specsDir` must exist at `specs/{branchName}/`
- `spec.md` must exist in `specsDir`
- `branchName` must be unique (checked against remote branches, local branches, specs dirs)

**Storage**:

- **Branch**: `.git/refs/heads/{branchName}` or remote tracking branch
- **Specs Directory**: `specs/{branchName}/` with artifacts:
  - `spec.md` (mandatory)
  - `plan.md` (after `/speckit.plan`)
  - `tasks.md` (after `/speckit.tasks`)
  - `research.md`, `data-model.md`, `contracts/`, etc. (Phase 1 artifacts)

**Relationships**:

- **1:1 with Spec Directory**: Each branch has exactly one matching specs directory
- **0..1 with GitHub Issue**: Branch may have an auto-created GitHub issue (Phase 3)
- **0..1 with Pull Request**: Branch may have an associated PR (Phase 3)

**State Transitions**:

1. **Creation**: User invokes `/speckit.specify`
   - Script finds next available number (N+1 from highest existing)
   - Creates branch `NNN-short-name`
   - Creates matching `specs/NNN-short-name/` directory
   - Initializes `spec.md` from template
2. **Workflow Progression**: User invokes sequential commands
   - `/speckit.clarify` → `currentPhase = clarify`
   - `/speckit.plan` → `currentPhase = plan`
   - `/speckit.tasks` → `currentPhase = tasks`, creates GitHub issue (Phase 3)
   - `/speckit.implement` → `currentPhase = implement`
3. **Completion**: Feature merged to main
   - `currentPhase = complete`
   - Branch may be deleted
   - Specs directory persists as historical record

**Examples**:

```json
{
  "branchName": "001-speckit-workflow-improvements",
  "featureNumber": 1,
  "shortName": "speckit-workflow-improvements",
  "specsDir": "/Users/nick/Code/memoryloop/specs/001-speckit-workflow-improvements",
  "currentPhase": "plan",
  "workflowMode": "automatic"
}
```

---

### 3. Spec-Kit Command

Represents a workflow command with an optional numbered alias for easier invocation.

**Attributes**:

- `originalName` (string): Original command name (e.g., "speckit.specify")
- `numberedAlias` (string | null): Numbered alias (e.g., "2.specify") (Phase 3)
- `workflowSequence` (number | null): Position in workflow (1-10) (Phase 3)
- `description` (string): Human-readable description
- `requiresPrompt` (boolean): Whether command prompts for Automatic vs User-Guided mode (Phase 3)
- `handoffs` (array): Available next commands after completion

**Validation Rules**:

- `originalName` must match pattern: `speckit\.[a-z]+(\.[a-z]+)?`
- `numberedAlias` must match pattern: `[0-9]+(\.[0-9]+)?\.[a-z]+` if not null
- `workflowSequence` must be unique across all commands
- Numbered alias file must be a symlink to original command file (Phase 3)

**Storage**:

- **Original Command**: `.claude/commands/{originalName}.md`
- **Numbered Alias**: `.claude/commands/{numberedAlias}.md` → symlink to original (Phase 3)
- **Command Metadata**: Frontmatter in markdown file

**Relationships**:

- **1:1 Alias Bijection**: Each numbered alias points to exactly one original command
- **1:N Handoffs**: Each command can have multiple suggested next commands

**State Transitions** (Phase 3):

1. **Mode Selection**: If `requiresPrompt = true`
   - Detect terminal interactivity (`-t 0`)
   - If interactive: Prompt "Run in (A)utomatic or (U)ser-Guided mode?"
   - If non-interactive: Default to Automatic
   - Store mode in session memory
2. **Execution**:
   - Automatic Mode: Execute command without intermediate prompts
   - User-Guided Mode: Show available next steps after completion, wait for user choice
3. **Handoff**: Display available next commands from `handoffs` array

**Examples**:

```json
{
  "originalName": "speckit.specify",
  "numberedAlias": "2.specify",
  "workflowSequence": 2,
  "description": "Create or update feature specification",
  "requiresPrompt": true,
  "handoffs": [
    {"label": "Clarify Spec", "agent": "speckit.clarify"},
    {"label": "Create Plan", "agent": "speckit.plan"}
  ]
}

{
  "originalName": "speckit.clarify",
  "numberedAlias": "2.1.clarify",
  "workflowSequence": null,
  "description": "Resolve specification ambiguities",
  "requiresPrompt": false,
  "handoffs": [
    {"label": "Create Plan", "agent": "speckit.plan"}
  ]
}
```

**Command Catalog** (Phase 3):
| Original Name | Alias | Sequence | Description |
| ------------------------- | --------------- | -------- | ----------------------------------------- |
| `speckit.constitution` | `1.constitution`| 1 | Update project constitution |
| `speckit.specify` | `2.specify` | 2 | Create/update feature specification |
| `speckit.clarify` | `2.1.clarify` | - | Resolve specification ambiguities |
| `speckit.plan` | `3.plan` | 3 | Create implementation plan |
| `speckit.plan.validate` | `3.1.validate` | - | Validate plan completeness |
| `speckit.tasks` | `4.tasks` | 4 | Generate task breakdown |
| `speckit.implement` | `5.implement` | 5 | Execute implementation tasks |
| `speckit.analyze` | `6.analyze` | 6 | Cross-artifact consistency check |
| `speckit.checklist` | `7.checklist` | 7 | Generate custom checklist |
| `speckit.taskstoissues` | `8.taskstoissues`| 8 | Convert tasks to GitHub issues |

---

### 4. GitHub Issue

Represents an auto-created tracking issue for a feature (Phase 3).

**Attributes**:

- `issueNumber` (number): GitHub issue number
- `title` (string): Issue title (derived from feature name)
- `body` (string): Issue body (derived from tasks.md)
- `featureBranch` (string): Associated feature branch name
- `status` (enum): `open` | `closed`
- `url` (string): GitHub issue URL

**Validation Rules**:

- `title` must start with feature number (e.g., "[001]")
- `body` must contain task checklist from tasks.md
- `featureBranch` must exist
- Issue creation only attempted if tasks.md exists

**Storage**:

- **GitHub**: Issue stored in repository's issue tracker
- **Link Reference**: Issue number may be referenced in tasks.md header

**Relationships**:

- **N:1 with Feature Branch**: Multiple issues may reference same feature (re-opened, etc.)
- **1:1 with Pull Request**: Issue may be linked to PR via "Fixes #N" syntax

**State Transitions**:

1. **Auto-Creation**: Triggered after `/speckit.tasks` completes successfully
   - Read tasks.md content
   - Extract feature number from branch name
   - Generate title: `[NNN] Feature Short Name`
   - Generate body: tasks.md checklist + link to spec
   - Execute: `gh issue create --title "..." --body "..."`
   - Retry with exponential backoff (1s, 2s, 4s) on rate limit (403)
2. **Failure Handling**: If creation fails after retries
   - Display error with manual creation instructions
   - Log failure details for debugging
   - Continue workflow (non-blocking)
3. **Closure**: Issue closed when PR is merged
   - Manual or automatic via "Fixes #N" in PR description

**Error Classification** (Phase 3):

- **401 Unauthorized**: Fatal - user needs to authenticate with `gh auth login`
- **403 Rate Limit**: Retryable with exponential backoff
- **404 Not Found**: Fatal - repository configuration error
- **Network Failure**: Retryable (max 3 attempts)

**Examples**:

```json
{
  "issueNumber": 187,
  "title": "[001] Spec-Kit Workflow Improvements",
  "body": "## Tasks\n\n- [ ] Task 1\n- [ ] Task 2\n\nSee spec: [spec.md](specs/001-speckit-workflow-improvements/spec.md)",
  "featureBranch": "001-speckit-workflow-improvements",
  "status": "open",
  "url": "https://github.com/nicholaspsmith/memoryloop/issues/187"
}
```

---

### 5. Workflow Mode

Represents the execution mode for a spec-kit workflow session (Phase 3).

**Attributes**:

- `mode` (enum): `automatic` | `user-guided`
- `sessionId` (string): Unique session identifier (ephemeral)
- `selectedAt` (timestamp): When mode was selected
- `isInteractive` (boolean): Whether running in interactive terminal

**Validation Rules**:

- `mode` must be selected before command execution (if prompt enabled)
- `sessionId` must be unique per Claude Code session
- Non-interactive terminals always use `automatic` mode

**Storage**:

- **Session Memory**: In-memory storage (not persisted to disk)
- **Scope**: Single feature branch workflow session
- **Lifetime**: Until Claude Code session ends or user switches branches

**Relationships**:

- **1:N with Command Invocations**: Mode applies to all commands in session
- **N:1 with Feature Branch**: Multiple sessions may work on same branch over time

**State Transitions**:

1. **Initial Prompt**: First spec-kit command in session
   - Check terminal interactivity: `[ -t 0 ]`
   - If interactive: Display AskUserQuestion with options
   - If non-interactive: Auto-select `automatic`, skip prompt
2. **Mode Storage**: User selects mode
   - Store in session memory with `sessionId`
   - Apply to all subsequent commands in session
3. **Automatic Mode Execution**:
   - Execute command immediately
   - Proceed to next logical step without prompting
   - Display completion message with available handoffs
4. **User-Guided Mode Execution**:
   - Execute current command
   - Display available next steps with descriptions
   - Wait for user to select next command (or exit)
5. **Session End**:
   - Mode cleared from memory
   - Next session prompts again (no persistence)

**Prompt Format** (Phase 3):

```text
Run in (A)utomatic or (U)ser-Guided mode?

Options:
  A - Automatic: Proceed through all steps without prompting
  U - User-Guided: Show available next steps after each phase

Default: Automatic (press Enter to accept)
```

**Examples**:

```json
{
  "mode": "automatic",
  "sessionId": "session-20251223-143022",
  "selectedAt": "2025-12-23T14:30:22Z",
  "isInteractive": true
}

{
  "mode": "user-guided",
  "sessionId": "session-20251223-150145",
  "selectedAt": "2025-12-23T15:01:45Z",
  "isInteractive": true
}
```

---

## Entity Relationships

### Relationship Diagram

```text
┌─────────────────────┐
│ Package Version     │
│ Entry               │
└──────────┬──────────┘
           │ 1
           │ synced to
           │ N
           ▼
┌─────────────────────┐
│ CLAUDE.md           │
│ Technology Stack    │
└─────────────────────┘

┌─────────────────────┐       ┌─────────────────────┐
│ Feature Branch      │ 1   1 │ Spec Directory      │
│                     ├───────┤ (specs/NNN-name/)   │
└──────────┬──────────┘       └─────────────────────┘
           │ 1                         │
           │ has                       │ contains
           │ 0..1                      │ 1
           ▼                           ▼
┌─────────────────────┐       ┌─────────────────────┐
│ GitHub Issue        │       │ tasks.md            │
│                     ├───────┤ (task checklist)    │
└──────────┬──────────┘  1  1 └─────────────────────┘
           │ 0..1
           │ linked to
           │ 0..1
           ▼
┌─────────────────────┐
│ Pull Request        │
│                     │
└─────────────────────┘

┌─────────────────────┐       ┌─────────────────────┐
│ Spec-Kit Command    │ 1   1 │ Numbered Alias      │
│ (original)          ├───────┤ (symlink)           │
└──────────┬──────────┘       └─────────────────────┘
           │ 1
           │ executed in
           │ N
           ▼
┌─────────────────────┐
│ Workflow Mode       │
│ (session-scoped)    │
└─────────────────────┘
```

### Cardinality Summary

| Entity A              | Relationship   | Entity B           | Cardinality |
| --------------------- | -------------- | ------------------ | ----------- |
| Package Version Entry | synced to      | CLAUDE.md section  | N:1         |
| Feature Branch        | has            | Spec Directory     | 1:1         |
| Feature Branch        | has            | GitHub Issue       | 1:0..1      |
| GitHub Issue          | linked to      | Pull Request       | 0..1:0..1   |
| Spec Directory        | contains       | tasks.md           | 1:1         |
| GitHub Issue          | generated from | tasks.md           | 1:1         |
| Spec-Kit Command      | has alias      | Numbered Alias     | 1:1         |
| Workflow Mode         | applies to     | Command Invocation | 1:N         |
| Feature Branch        | uses           | Workflow Mode      | N:1         |

---

## Data Flow

### Phase 1: Package Version Synchronization

```text
1. package.json (Source of Truth)
   │
   ├─ Dependencies array
   ├─ DevDependencies array
   │
   ▼
2. update-agent-context.sh
   │
   ├─ Extract version with jq
   ├─ Strip npm prefixes (^, ~, >=)
   ├─ Get major.minor (or major.minor.patch in Phase 2)
   │
   ▼
3. CLAUDE.md Technology Stack
   │
   ├─ Find display name pattern
   ├─ Replace version with perl regex
   ├─ Preserve surrounding context
   │
   ▼
4. Output: Synchronized CLAUDE.md
```

### Phase 3: GitHub Issue Auto-Creation

```text
1. /speckit.tasks command completes
   │
   ├─ tasks.md written to specs directory
   │
   ▼
2. Post-hook trigger
   │
   ├─ Read tasks.md content
   ├─ Extract feature number from branch
   ├─ Generate issue title/body
   │
   ▼
3. GitHub CLI (gh issue create)
   │
   ├─ Retry logic (exponential backoff)
   ├─ Error classification (401, 403, 404, network)
   │
   ▼
4. Success: Issue URL returned
   │  Failure: Manual instructions displayed
   │
   ▼
5. Continue workflow (non-blocking)
```

### Phase 3: Workflow Mode Selection

```text
1. User invokes spec-kit command
   │
   ├─ Check terminal interactivity [ -t 0 ]
   │
   ▼
2a. Interactive Terminal          2b. Non-Interactive Terminal
    │                                  │
    ├─ Display mode prompt            ├─ Auto-select Automatic
    ├─ Wait for input (A/U)            │
    │                                  │
    ▼                                  ▼
3. Store mode in session memory
   │
   ├─ Generate sessionId
   ├─ Record timestamp
   │
   ▼
4a. Automatic Mode                4b. User-Guided Mode
    │                                  │
    ├─ Execute command                ├─ Execute command
    ├─ Show completion                ├─ Show next steps
    ├─ Continue automatically          ├─ Wait for user choice
    │                                  │
    ▼                                  ▼
5. Next command inherits mode (same session)
```

---

## Validation & Constraints

### Cross-Entity Validation Rules

1. **Package Version Consistency** (Phase 2):
   - If `--validate` flag set: package.json version must match CLAUDE.md version
   - If mismatch detected: Display diff, prompt for sync confirmation

2. **Feature Branch Uniqueness**:
   - Branch name must not exist in: remote branches, local branches, specs directories
   - Feature number must be sequential (N+1 from highest existing)

3. **GitHub Issue Prerequisites** (Phase 3):
   - tasks.md must exist before issue creation
   - GitHub CLI must be authenticated (`gh auth status`)
   - Repository must be configured (`gh repo view` succeeds)

4. **Command Alias Integrity** (Phase 3):
   - Numbered alias file must be a symlink (not a copy)
   - Symlink target must exist and be readable
   - No circular symlinks allowed

### Data Integrity Constraints

1. **No Partial Updates**:
   - CLAUDE.md updates are atomic (all-or-nothing)
   - Use temporary file, validate, then move to destination
   - Rollback on any error during sync

2. **Version Format Preservation**:
   - Phase 1: Strip patch version (5.7.3 → 5.7)
   - Phase 2: Preserve full semver (5.7.3 → 5.7.3, 0.45.1-beta.2 → 0.45.1-beta.2)

3. **Session Isolation**:
   - Workflow mode scoped to session (not persisted)
   - Different Claude Code sessions start with fresh mode prompt
   - No cross-session state leakage

---

## Phase-Specific Entities

### Phase 1 (P1): Core Entities

- ✅ Package Version Entry
- ✅ Feature Branch (existing functionality)
- ✅ Spec Directory (existing functionality)

### Phase 2 (P2): Enhanced Entities

- ✅ Package Version Entry (with full semver support)
- ✅ Validation state (drift detection)

### Phase 3 (P3): New Entities

- ✅ Spec-Kit Command (with numbered aliases)
- ✅ GitHub Issue (auto-creation)
- ✅ Workflow Mode (session-scoped)

---

## Examples: Real-World Scenarios

### Scenario 1: Package Version Drift Detection (Phase 2)

**Initial State**:

```json
// package.json
{"dependencies": {"next": "^16.0.10"}}

// CLAUDE.md
"Next.js 15.2 App Router"
```

**Script Execution**: `./update-agent-context.sh --validate`

**Detected Drift**:

```text
Package version mismatch detected:
  Package: Next.js
  package.json: 16.0.10
  CLAUDE.md: 15.2

Sync to CLAUDE.md? (y/n):
```

**After Sync**:

```markdown
// CLAUDE.md
"Next.js 16.0 App Router"
```

---

### Scenario 2: Feature Branch Creation with Number Collision

**Existing Branches**:

- Remote: `001-lancedb-schema-fixes`
- Local: `002-ci-cd-deployment`
- Specs: `specs/003-flashcard-rating-labels/`

**User Command**: `/speckit.specify "Add user authentication"`

**Script Logic**:

1. Generate short name: "user-auth"
2. Search for existing `*-user-auth` branches:
   - Remote: None found
   - Local: None found
   - Specs: None found
3. Determine next number: 1 (no existing user-auth branches)
4. Create branch: `001-user-auth`
5. Create directory: `specs/001-user-auth/`

**Conflict Detected**: `001-user-auth` would conflict with `001-lancedb-schema-fixes`

**Resolution**: Script increments globally:

1. Find highest existing number: 003 (from flashcard-rating-labels)
2. Next available: 004
3. Create branch: `004-user-auth`
4. Create directory: `specs/004-user-auth/`

---

### Scenario 3: Automatic Workflow Mode (Phase 3)

**Session Start**: User invokes `/speckit.specify`

**Mode Prompt**:

```text
Run in (A)utomatic or (U)ser-Guided mode?
[User selects: A]
```

**Stored State**:

```json
{
  "mode": "automatic",
  "sessionId": "session-20251223-150000",
  "selectedAt": "2025-12-23T15:00:00Z",
  "isInteractive": true
}
```

**Execution Flow**:

1. `/speckit.specify` completes → spec.md created
2. Automatically suggests: `/speckit.plan` (no additional prompt)
3. User invokes `/speckit.plan` → inherits `automatic` mode
4. `/speckit.plan` completes → plan.md created
5. Automatically suggests: `/speckit.tasks`
6. `/speckit.tasks` completes → tasks.md created
7. **Auto-creates GitHub issue** (no user intervention)
8. Displays issue URL and continues

---

### Scenario 4: User-Guided Workflow Mode (Phase 3)

**Session Start**: User invokes `/speckit.specify`

**Mode Prompt**:

```text
Run in (A)utomatic or (U)ser-Guided mode?
[User selects: U]
```

**Execution Flow**:

1. `/speckit.specify` completes → spec.md created
2. **Pause for user guidance**:

   ```text
   Specification created. Available next steps:

   A. /speckit.clarify - Resolve ambiguities in the spec
   B. /speckit.plan - Create implementation plan
   C. Exit - Review spec manually first

   Your choice: _
   ```

3. User selects: B (`/speckit.plan`)
4. `/speckit.plan` completes → plan.md created
5. **Pause for user guidance**:

   ```text
   Plan created. Available next steps:

   A. /speckit.tasks - Generate task breakdown
   B. /speckit.plan.validate - Validate plan completeness
   C. Exit - Review plan manually first

   Your choice: _
   ```

6. User reviews plan, then returns to invoke `/speckit.tasks` manually

---

## Data Model Versioning

**Current Version**: 1.0.0

**Change History**:

- 2025-12-23: Initial version for spec-kit workflow improvements (3 phases)

**Future Considerations**:

- Phase 4+: Potential entities for workflow analytics, performance metrics
- Integration with external task trackers (Jira, Linear) - would add `ExternalIssue` entity
- Multi-repository support - would add `RepositoryConfig` entity
