# Project Rules for Claude Code

## Git Commit Messages

1. **Maximum Length**: 100 characters for commit message subject line
2. **No AI Attribution**: Do not mention "Generated with Claude Code" or similar AI attribution in commit messages
3. **Co-Author Tags Allowed**: You may include "Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>" tags

### Good Examples
```
Add forgot password feature task

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
```

```
Implement embeddings and conversation persistence

Fixed async embedding generation in message creation.
Added comprehensive integration tests.

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
```

### Bad Examples
```
Add forgot password feature task (memoryloop-h2ng) - Created beads task and GitHub issue #154

🤖 Generated with [Claude Code](https://claude.com/claude-code)
```

## General Guidelines

- Keep commits focused and atomic
- Write clear, imperative commit messages ("Add feature" not "Added feature")
- Subject line must be under 100 characters
- Reference issue/task numbers in commit body if needed, not subject line
- Detailed descriptions belong in commit body, not subject
