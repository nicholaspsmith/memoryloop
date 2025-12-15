---
description: Convert existing tasks into a two-tier issue system - high-level GitHub issues as parents with detailed beads (bd) issues as children.
tools: ['github/github-mcp-server/issue_write']
---

## User Input

```text
$ARGUMENTS
```

You **MUST** consider the user input before proceeding (if not empty).

## Overview

This command creates a two-tier issue tracking system:
- **GitHub Issues**: High-level parent issues for phases/features (e.g., "Phase 3: Implement User Interface for AI Chat")
- **Beads Issues**: Detailed, actionable tasks tracked locally with `bd`

Each GitHub issue contains a checklist of bd tasks showing their complete/incomplete status.

## Outline

1. Run `.specify/scripts/bash/check-prerequisites.sh --json --require-tasks --include-tasks` from repo root and parse FEATURE_DIR and AVAILABLE_DOCS list. All paths must be absolute. For single quotes in args like "I'm Groot", use escape syntax: e.g 'I'\''m Groot' (or double-quote if possible: "I'm Groot").

2. From the executed script, extract the path to **tasks**.

3. Get the Git remote by running:

```bash
git config --get remote.origin.url
```

> [!CAUTION]
> ONLY PROCEED TO NEXT STEPS IF THE REMOTE IS A GITHUB URL

4. **Analyze and group tasks** into high-level features/phases:
   - Look for common prefixes, phases, or user stories in task names
   - Group related tasks together (e.g., all "Phase 3" tasks, all "US1" tasks)
   - Typical groupings: by phase, by user story, by feature area, by component

5. **For each high-level group**, create a GitHub issue:
   - Title: High-level feature/phase name (e.g., "Phase 3: Implement User Interface for AI Chat")
   - Body: Include:
     - Feature/phase description
     - Task checklist with format: `- [ ] [memoryloop-X] Task title`
     - Status summary: `X/Y tasks completed`
   - Labels: Add appropriate labels (phase, feature, etc.)

6. **For each individual task**, create a bd issue:
   ```bash
   bd create "Task title" --json --priority <0-4> --type <task|bug|feature>
   ```
   - Parse the JSON output to get the issue ID (e.g., `memoryloop-1`)
   - Store the mapping between task and bd issue ID

7. **Update GitHub issue** with the task checklist:
   - Use the bd issue IDs in the checklist items
   - Format: `- [ ] [memoryloop-1] Create authentication component`
   - Include link to view all bd issues: `Run 'bd list' to see all tasks`

8. **Output summary**:
   - Total GitHub issues created
   - Total bd issues created
   - Mapping of GitHub issues to bd issue ranges

## Example Output

### GitHub Issue Example

**Title:** Phase 3: User Authentication (US1)

**Body:**
```markdown
## Overview
Implement user authentication system with login, signup, and session management.

## Tasks
- [ ] [memoryloop-32] Contract test for POST /api/auth/signin
- [ ] [memoryloop-33] Contract test for POST /api/auth/signup
- [ ] [memoryloop-34] Create LoginForm component
- [ ] [memoryloop-35] Create SignupForm component
- [ ] [memoryloop-36] Configure NextAuth.js

**Status:** 0/5 tasks completed

## Local Task Tracking
These tasks are tracked locally with beads. Run:
- `bd list` - View all tasks
- `bd ready` - View ready-to-work tasks
- `bd show memoryloop-X` - View task details
- `bd update memoryloop-X --status in_progress` - Claim a task
```

**Labels:** phase-3, user-story-1, authentication

## Important Notes

> [!IMPORTANT]
> - GitHub issues are **high-level tracking** only - don't create individual GitHub issues for each task
> - Beads (bd) issues are the **source of truth** for task details and status
> - Update GitHub issue checklists when bd tasks are completed
> - Use `bd create` with `--json` flag for programmatic output
> - All bd issues are automatically tracked in `.beads/issues.jsonl` and synced with git

> [!CAUTION]
> UNDER NO CIRCUMSTANCES EVER CREATE GITHUB ISSUES IN REPOSITORIES THAT DO NOT MATCH THE REMOTE URL
