# Contract: Command Aliases & Workflow Automation (Phase 3)

**Feature**: Spec-Kit Workflow UX Improvements
**Version**: 1.0.0 (Phase 3)
**Purpose**: Define interfaces for numbered command aliases, workflow modes, GitHub automation, and branch visibility

## Command Alias Interface

### Alias Structure

**Original Command**: `.claude/commands/speckit.{name}.md`
**Numbered Alias**: `.claude/commands/{N}.{name}.md` (symlink to original)

**Symlink Creation**:

```bash
cd .claude/commands
ln -s speckit.specify.md 2.specify.md
ln -s speckit.plan.md 3.plan.md
ln -s speckit.tasks.md 4.tasks.md
# ... etc
```

### Alias Catalog

| Workflow Step | Original Command        | Numbered Alias    | Sequence | Description                         |
| ------------- | ----------------------- | ----------------- | -------- | ----------------------------------- |
| 1             | `speckit.constitution`  | `1.constitution`  | 1        | Update project constitution         |
| 2             | `speckit.specify`       | `2.specify`       | 2        | Create/update feature specification |
| 2.1           | `speckit.clarify`       | `2.1.clarify`     | -        | Resolve specification ambiguities   |
| 3             | `speckit.plan`          | `3.plan`          | 3        | Create implementation plan          |
| 3.1           | `speckit.plan.validate` | `3.1.validate`    | -        | Validate plan completeness          |
| 4             | `speckit.tasks`         | `4.tasks`         | 4        | Generate task breakdown             |
| 5             | `speckit.implement`     | `5.implement`     | 5        | Execute implementation tasks        |
| 6             | `speckit.analyze`       | `6.analyze`       | 6        | Cross-artifact consistency check    |
| 7             | `speckit.checklist`     | `7.checklist`     | 7        | Generate custom checklist           |
| 8             | `speckit.taskstoissues` | `8.taskstoissues` | 8        | Convert tasks to GitHub issues      |

### User Invocation

**Both forms are equivalent**:

```bash
# Original form (still supported)
/speckit.specify "Add user authentication"

# Numbered alias form (new in Phase 3)
/2.specify "Add user authentication"
```

**Invocation Contract**:

- Both forms accept identical arguments
- Both forms trigger identical command execution
- Both forms support same flags and options
- Response format identical regardless of invocation method

---

## Workflow Mode Interface

### Mode Selection

**Trigger**: First spec-kit command invocation in session (if `requiresPrompt = true`)

**Interactive Mode Detection**:

```bash
if [ -t 0 ]; then
    # Interactive terminal - show prompt
    show_mode_prompt
else
    # Non-interactive (CI, pipe, etc.) - default to Automatic
    WORKFLOW_MODE="automatic"
fi
```

**Prompt Format** (via AskUserQuestion):

```text
Run in (A)utomatic or (U)ser-Guided mode?

Options:
  A - Automatic: Proceed through all steps without prompting
  U - User-Guided: Show available next steps after each phase

Default: Automatic (press Enter to accept)
```

**Response Handling**:
| User Input | Stored Mode | Behavior |
| -------------- | --------------- | ----------------------------------------------- |
| `A`, `a`, `""` | `automatic` | Execute commands without intermediate prompts |
| `U`, `u` | `user-guided` | Pause after each command to show next steps |
| Other | `automatic` | Default to automatic, log unexpected input |

### Mode Storage

**Scope**: Session-scoped (in-memory, not persisted)

**Storage Mechanism**:

```bash
# Session-scoped environment variable
export SPECKIT_WORKFLOW_MODE="automatic"  # or "user-guided"

# Session ID for tracking
export SPECKIT_SESSION_ID="session-$(date +%Y%m%d-%H%M%S)"
```

**Lifetime**:

- **Start**: First spec-kit command in Claude Code session
- **Duration**: Until Claude Code session ends or user switches feature branches
- **End**: Session termination clears mode (next session prompts again)

**No Persistence**: Mode is never written to disk (no config files, no git tracking)

---

### Automatic Mode Execution

**Behavior**:

1. Execute current command
2. Display completion message with success criteria
3. Suggest next logical command from handoffs
4. **Do NOT wait** for user confirmation
5. User may invoke next command manually when ready

**Example Flow**:

```text
User: /2.specify "Add user authentication"

[Command executes]

✓ Specification created: specs/004-user-auth/spec.md
✓ All quality checks passed

Next step: /3.plan - Create implementation plan
```

**Contract**:

- No blocking prompts between commands
- User controls workflow pace by invoking next command
- Handoffs are suggestions, not automatic invocations

---

### User-Guided Mode Execution

**Behavior**:

1. Execute current command
2. Display completion message with success criteria
3. Show available next steps with descriptions
4. **Wait for user to select** next command
5. User invokes selected command manually

**Example Flow**:

```text
User: /2.specify "Add user authentication"

[Command executes]

✓ Specification created: specs/004-user-auth/spec.md
✓ All quality checks passed

Available next steps:

  A. /2.1.clarify - Resolve ambiguities in the specification
     Use if: Spec has [NEEDS CLARIFICATION] markers or vague requirements

  B. /3.plan - Create implementation plan
     Use if: Spec is clear and ready for design phase

  C. Exit - Review specification manually first

What would you like to do next?
```

**Contract**:

- Always present at least 2 options (next step + exit)
- Include "Use if" guidance for each option
- User must invoke next command explicitly (no automatic progression)

---

## GitHub Automation Interface

### Automatic Issue Creation

**Trigger**: `/speckit.tasks` command completes successfully

**Prerequisites**:

1. `tasks.md` file exists in specs directory
2. GitHub CLI (`gh`) is installed and authenticated
3. Repository is configured (`.git/config` has remote origin)

**Issue Creation Flow**:

```bash
# After tasks.md write completes

# 1. Extract feature metadata
FEATURE_NUMBER=$(git rev-parse --abbrev-ref HEAD | grep -oE '^[0-9]+')
FEATURE_NAME=$(git rev-parse --abbrev-ref HEAD | sed 's/^[0-9]*-//')
SPEC_FILE="specs/$(git rev-parse --abbrev-ref HEAD)/spec.md"

# 2. Generate issue title
ISSUE_TITLE="[$FEATURE_NUMBER] $FEATURE_NAME"

# 3. Generate issue body from tasks.md
ISSUE_BODY=$(cat <<EOF
## Tasks

$(cat tasks.md | grep -E '^\- \[')

## Specification

[View spec.md]($SPEC_FILE)

## Implementation Plan

[View plan.md](specs/$(git rev-parse --abbrev-ref HEAD)/plan.md)

---
*Auto-generated from /speckit.tasks command*
EOF
)

# 4. Create issue with retry logic
create_github_issue_with_retry "$ISSUE_TITLE" "$ISSUE_BODY"
```

**Issue Title Format**: `[NNN] Feature Short Name`

- Example: `[004] User Authentication`

**Issue Body Format**:

```markdown
## Tasks

- [ ] Task 1: Description
- [ ] Task 2: Description
- [ ] Task 3: Description

## Specification

[View spec.md](specs/004-user-auth/spec.md)

## Implementation Plan

[View plan.md](specs/004-user-auth/plan.md)

---

_Auto-generated from /speckit.tasks command_
```

---

### Retry Logic

**Function Signature**:

```bash
create_github_issue_with_retry() {
    local title="$1"
    local body="$2"
    local max_attempts=3
    local backoff=1

    for attempt in $(seq 1 $max_attempts); do
        if gh issue create --title "$title" --body "$body"; then
            return 0
        fi

        # Classify error by exit code
        local exit_code=$?
        case $exit_code in
            401)
                # Authentication failure - fatal
                log_error "GitHub authentication failed. Run: gh auth login"
                return 1
                ;;
            403)
                # Rate limit - retryable with backoff
                log_warning "Rate limit hit, retrying in ${backoff}s..."
                sleep $backoff
                backoff=$((backoff * 2))  # Exponential backoff
                ;;
            404)
                # Repository not found - fatal
                log_error "Repository not found. Check remote configuration."
                return 1
                ;;
            *)
                # Unknown error - retryable
                log_warning "Issue creation failed (attempt $attempt/$max_attempts)"
                sleep $backoff
                backoff=$((backoff * 2))
                ;;
        esac
    done

    # All retries exhausted
    log_error "Failed to create GitHub issue after $max_attempts attempts"
    display_manual_instructions "$title" "$body"
    return 1
}
```

**Backoff Schedule**:
| Attempt | Wait Time | Total Elapsed |
| ------- | --------- | ------------- |
| 1 | 0s | 0s |
| 2 | 1s | 1s |
| 3 | 2s | 3s |

**Error Handling**:
| Error Code | Meaning | Retry? | User Action |
| ---------- | ------------------- | ------ | ---------------------------------- |
| 0 | Success | No | None - issue created |
| 401 | Unauthorized | No | Run `gh auth login` |
| 403 | Rate limit exceeded | Yes | Wait for retry or manual creation |
| 404 | Repository not found| No | Check git remote configuration |
| Other | Network/unknown | Yes | Wait for retry or manual creation |

**Manual Fallback**:

```bash
display_manual_instructions() {
    local title="$1"
    local body="$2"

    echo "ERROR: Automatic issue creation failed."
    echo ""
    echo "Create the issue manually with:"
    echo "  gh issue create --title '$title' --body '...'"
    echo ""
    echo "Or create via GitHub web UI:"
    echo "  Title: $title"
    echo "  Body: [see tasks.md for checklist]"
}
```

---

### Success Response

**Output Format** (when issue creation succeeds):

```text
✓ Generated task breakdown: specs/004-user-auth/tasks.md
✓ GitHub issue created: #42
   https://github.com/nicholaspsmith/memoryloop/issues/42

Next step: /5.implement - Execute implementation tasks
```

**Contract**:

- Issue URL must be displayed
- Issue number must be logged for reference
- Workflow continues regardless of issue creation success (non-blocking)

---

## Branch Visibility Interface

### Display Location

**Where**: Final line of Claude Code response (footer)

**Format**:

```text
[main response content]

---
Current branch: 004-user-auth
```

**Separator**: Horizontal rule (`---`) before branch line

### Implementation Strategy

**Option 1: Response Hook** (preferred if available):

```javascript
// Pseudo-code for Claude Code response pipeline
onResponseComplete((response) => {
  const branchName = execSync('git rev-parse --abbrev-ref HEAD').toString().trim()
  return response + `\n\n---\nCurrent branch: ${branchName}`
})
```

**Option 2: Template Footer** (fallback):

```markdown
<!-- In each command markdown file -->

[... command content ...]

---

After completing this command, verify your current branch:

Current branch: {{{ git rev-parse --abbrev-ref HEAD }}}
```

### Edge Cases

| Git State                      | Display Value               | Example                              |
| ------------------------------ | --------------------------- | ------------------------------------ |
| Normal branch                  | Branch name                 | `Current branch: 004-user-auth`      |
| Detached HEAD                  | Commit SHA (first 7 chars)  | `Current branch: (detached) a3f2b1c` |
| No git repository              | "N/A" or omit line entirely | `Current branch: N/A`                |
| Branch name with special chars | Escaped/quoted properly     | `Current branch: "feature/add-auth"` |

### Performance Contract

**Requirements**:

- Branch detection must complete in < 50ms
- No blocking I/O operations
- Cached within single response (no repeated git calls)

**Implementation**:

```bash
# Efficient branch detection
get_current_branch() {
    local branch
    branch=$(git rev-parse --abbrev-ref HEAD 2>/dev/null)

    if [[ $? -ne 0 ]]; then
        echo "N/A"
    elif [[ "$branch" == "HEAD" ]]; then
        # Detached HEAD - show commit SHA
        local sha=$(git rev-parse --short HEAD 2>/dev/null)
        echo "(detached) $sha"
    else
        echo "$branch"
    fi
}
```

---

## /next Command Interface (Phase 3)

**Purpose**: Suggest next logical command based on current workflow state

**Command**: `/next`

**Detection Logic**:

```bash
detect_workflow_state() {
    local feature_dir="specs/$(git rev-parse --abbrev-ref HEAD)"

    if [[ ! -d "$feature_dir" ]]; then
        echo "No active feature. Suggested: /2.specify"
        return
    fi

    if [[ ! -f "$feature_dir/spec.md" ]]; then
        echo "Suggested: /2.specify"
    elif [[ ! -f "$feature_dir/plan.md" ]]; then
        echo "Suggested: /3.plan"
    elif [[ ! -f "$feature_dir/tasks.md" ]]; then
        echo "Suggested: /4.tasks"
    else
        # Check for incomplete tasks
        local incomplete_tasks=$(grep -c '^\- \[ \]' "$feature_dir/tasks.md")
        if [[ $incomplete_tasks -gt 0 ]]; then
            echo "Suggested: /5.implement ($incomplete_tasks tasks remaining)"
        else
            echo "All tasks complete. Suggested: Create PR and merge"
        fi
    fi
}
```

**Output Format**:

```text
User: /next

Current branch: 004-user-auth
Current phase: Planning

Suggested next step: /4.tasks - Generate task breakdown

Available commands:
  /4.tasks - Generate task breakdown from implementation plan
  /3.1.validate - Validate plan completeness before generating tasks
  /2.1.clarify - Review and refine specification
```

**Response Contract**:

- Always suggest exactly one "next step"
- Display 2-4 alternative commands as options
- Include current branch and phase context
- Show progress metrics if applicable (e.g., "5 of 12 tasks complete")

---

## Handoff Interface

### Handoff Metadata (in command frontmatter)

**Format**:

```yaml
---
description: Create implementation plan
handoffs:
  - label: Create Tasks
    agent: speckit.tasks
    prompt: Break the plan into tasks
    send: true
  - label: Validate Plan
    agent: speckit.plan.validate
    prompt: Check plan completeness
    send: false
---
```

**Field Definitions**:
| Field | Type | Required | Description |
| -------- | ------- | -------- | ---------------------------------------------- |
| `label` | string | Yes | Display name for handoff button |
| `agent` | string | Yes | Command name to invoke (original or alias) |
| `prompt` | string | No | Pre-filled prompt text for next command |
| `send` | boolean | No | Auto-execute (true) or show as suggestion (false) |

### Handoff Display

**Automatic Mode**:

```text
✓ Plan created: specs/004-user-auth/plan.md

Next step: /4.tasks - Break the plan into tasks
```

**User-Guided Mode**:

```text
✓ Plan created: specs/004-user-auth/plan.md

Available next steps:

  A. /4.tasks - Break the plan into tasks
     Generates actionable checklist from implementation plan

  B. /3.1.validate - Check plan completeness
     Audits plan for missing sections or unclear requirements

  C. Exit - Review plan manually first

Your choice: _
```

**Contract**:

- Handoffs ordered by priority (most common first)
- Each handoff includes description explaining when to use it
- Always include "Exit" option in User-Guided mode

---

## Integration Points

### Claude Code Hook Points

**Pre-Command Hook**:

- Detect workflow mode (if not already set)
- Display mode prompt if interactive terminal
- Store mode in session memory

**Post-Command Hook**:

- Append branch visibility footer
- Trigger GitHub issue creation (if command = `/speckit.tasks`)
- Display handoffs based on workflow mode

**Session Start Hook**:

- Clear workflow mode from previous session
- Initialize new session ID

**Session End Hook**:

- Clear workflow mode from memory
- Log session metrics (commands executed, time elapsed)

---

## Backward Compatibility

### Original Command Support

**Guarantee**: All original command names remain functional

```bash
# These continue to work exactly as before
/speckit.specify "Feature description"
/speckit.plan
/speckit.tasks
/speckit.implement
```

**No Breaking Changes**:

- Original commands unchanged
- Numbered aliases are additive (new feature)
- Mode prompt skipped if non-interactive (CI/batch workflows unaffected)

### Migration Path

**Phase 3 Rollout**:

1. Create symlinks for numbered aliases (no changes to originals)
2. Add mode prompt to command markdown frontmatter (opt-in)
3. Add GitHub automation hook (runs only if `gh` available)
4. Add branch visibility footer (informational only)

**Rollback Plan**:

- Delete numbered alias symlinks → reverts to original names only
- Remove mode prompt logic → no behavioral change
- Disable GitHub hook → manual issue creation as before

---

## Performance Contract

### Response Time Targets

| Operation                | Target Time | Measurement Point                        |
| ------------------------ | ----------- | ---------------------------------------- |
| Mode prompt display      | < 100ms     | Prompt appears after command invocation  |
| Branch visibility lookup | < 50ms      | Git command execution                    |
| GitHub issue creation    | < 3s        | gh command execution (excluding retries) |
| Handoff display          | < 50ms      | Render handoff list in response          |

### Resource Usage

| Resource | Limit   | Notes                                       |
| -------- | ------- | ------------------------------------------- |
| Memory   | < 10MB  | Session state storage (mode, session ID)    |
| Disk I/O | None    | No persistent storage (memory-only)         |
| Network  | < 1 req | GitHub issue creation (only when triggered) |

---

## Security Considerations

### GitHub Token Access

**Requirement**: `gh` CLI must be authenticated with valid token

**Validation**:

```bash
if ! gh auth status &> /dev/null; then
    log_error "GitHub authentication required. Run: gh auth login"
    exit 1
fi
```

**Token Scopes Required**:

- `repo` - Create issues in repository
- `read:org` - Read organization membership (if private repo)

**Security Properties**:

- Tokens managed by `gh` CLI (not stored by spec-kit)
- No tokens in git history or log files
- Token validation before any API calls

### Input Sanitization

**Branch Name Display**:

```bash
# Escape special characters for shell safety
escape_branch_name() {
    local branch="$1"
    # Quote for display, escape special chars
    printf '%q' "$branch"
}
```

**Issue Title/Body**:

```bash
# GitHub CLI handles escaping, but validate format
validate_issue_title() {
    local title="$1"
    # Ensure title doesn't contain newlines or control chars
    if [[ "$title" =~ $'\n' ]]; then
        log_error "Invalid issue title (contains newlines)"
        return 1
    fi
}
```

---

## Testing Contract

### Test Scenarios (Phase 3)

**Alias Functionality**:

1. Original command invocation works (baseline)
2. Numbered alias invocation produces identical result
3. Symlink points to correct original file
4. Symlink remains valid after original file update

**Workflow Mode**: 5. Interactive terminal prompts for mode selection 6. Non-interactive terminal defaults to Automatic 7. Mode persists across commands in same session 8. Mode cleared when session ends

**GitHub Automation**: 9. Issue created successfully with valid auth 10. Retry logic handles rate limit (403) correctly 11. Auth failure (401) displays manual instructions 12. Issue body contains task checklist from tasks.md

**Branch Visibility**: 13. Normal branch displays correctly 14. Detached HEAD shows commit SHA 15. No git repo shows "N/A"

**Handoffs**: 16. Automatic mode shows single next step 17. User-Guided mode shows multiple options 18. Handoff prompt pre-fills next command arguments

---

## Contract Version History

| Version | Date       | Changes                       |
| ------- | ---------- | ----------------------------- |
| 1.0.0   | 2025-12-23 | Initial Phase 3 specification |

---

## References

- [GitHub CLI Manual](https://cli.github.com/manual/) - `gh issue create` command
- [Git Branch Naming](https://git-scm.com/docs/git-check-ref-format) - Valid branch names
- [Feature Specification](../spec.md) - User stories US8-US12
- [Implementation Plan](../plan.md) - Phase 3 architecture
