# Task Completion Checklist

## Before Committing

1. **Type check**: `npm run typecheck`
2. **Lint**: `npm run lint`
3. **Format**: `npm run format`
4. **Run tests**: `npm test`

## Commit Guidelines

- Follow atomic commit discipline (one logical change per commit)
- Commit messages under 100 characters
- Use imperative mood ("Add feature" not "Added feature")
- No AI attribution in commit messages
- Reference issues in commit body, not subject

## After Implementation

1. Update relevant tests
2. Update documentation if needed
3. Mark tasks complete in `specs/[feature]/tasks.md`
4. Run full test suite before PR

## PR Checklist

1. All tests pass
2. No linting errors
3. TypeScript compiles without errors
4. Feature tested manually
5. Documentation updated
