# Contract: update-agent-context.sh

**Script**: `.specify/scripts/bash/update-agent-context.sh`
**Version**: 2.0.0 (Phase 2 enhancements)
**Purpose**: Synchronize package versions from package.json to CLAUDE.md Technology Stack section

## Interface

### Command Line

```bash
./update-agent-context.sh [OPTIONS]
```

### Options

| Option       | Type | Required | Default | Description                                  |
| ------------ | ---- | -------- | ------- | -------------------------------------------- |
| `--validate` | flag | No       | false   | Validate versions without updating (Phase 2) |
| `--help`     | flag | No       | false   | Display usage information (Phase 2)          |

### Exit Codes

| Code | Meaning                             | Example Scenario                       |
| ---- | ----------------------------------- | -------------------------------------- |
| 0    | Success - updates completed         | All versions synchronized successfully |
| 1    | Missing dependencies (jq or perl)   | `jq` not found in PATH                 |
| 2    | Invalid JSON in package.json        | Malformed package.json syntax          |
| 3    | CLAUDE.md not found                 | File missing from repository root      |
| 4    | Validation failed (--validate only) | Version mismatch detected (Phase 2)    |

## Input Contracts

### Input Files

#### 1. package.json

**Location**: `$REPO_ROOT/package.json`

**Format**: Valid JSON with npm package.json schema

**Required Fields**:

```json
{
  "dependencies": {
    "<package-name>": "<version-string>"
  },
  "devDependencies": {
    "<package-name>": "<version-string>"
  }
}
```

**Version String Format**:

- npm range prefix (optional): `^`, `~`, `>=`, `>`, `<`, `<=`
- Semantic version: `major.minor.patch` or `major.minor`
- Pre-release tag (optional): `-alpha.1`, `-beta.2`, `-rc.3`

**Examples**:

```json
{
  "dependencies": {
    "next": "^16.0.10",
    "react": "~19.2.3",
    "postgres": "3.4.4"
  },
  "devDependencies": {
    "typescript": "5.7.2",
    "@lancedb/lancedb": "0.22.1-beta.2"
  }
}
```

**Validation Rules**:

- Must be valid JSON (parseable by `jq`)
- Each dependency must have a version string
- Version string must match pattern: `^[\^~>=<]*[0-9]+\.[0-9]+(\.[0-9]+)?(-[a-z0-9.]+)?$`

---

#### 2. CLAUDE.md

**Location**: `$REPO_ROOT/CLAUDE.md`

**Format**: Markdown with Technology Stack section

**Required Structure**:

```markdown
## Active Technologies

- Display Name Version (optional context) + Additional info
- Display Name (via package-name version, another-package version)
```

**Version Pattern**:

- Inline version: `Display Name 5.7` or `Display Name 5.7.2`
- Parenthetical version: `(via package-name 3.4)` or `(drizzle-orm 0.45)`

**Examples**:

```markdown
## Active Technologies

- TypeScript 5.7 (strict mode) + Next.js 16.0.10 App Router, React 19.2.3
- PostgreSQL (via postgres 3.4, drizzle-orm 0.45)
- LanceDB 0.22.1-beta.2 (file-based vector database)
```

**Validation Rules**:

- Technology Stack section must exist
- Each tracked package must appear with a version number
- Display names must match those in tracked packages list (see Implementation Contract)

---

### Dependency Requirements

| Dependency | Minimum Version | Detection Method                    | Error if Missing |
| ---------- | --------------- | ----------------------------------- | ---------------- |
| `jq`       | 1.6             | `command -v jq && jq --version`     | Yes (exit 1)     |
| `perl`     | 5.10            | `command -v perl && perl --version` | Yes (exit 1)     |
| `bash`     | 4.0             | `echo $BASH_VERSION`                | Yes (implicit)   |

**Dependency Check Contract** (Phase 2):

```bash
check_dependency() {
    local cmd="$1"
    local min_version="$2"

    # Presence check (mandatory)
    if ! command -v "$cmd" &> /dev/null; then
        log_error "$cmd is required but not found."
        log_error "Install with: brew install $cmd (macOS) or apt install $cmd (Ubuntu)"
        exit 1
    fi

    # Version check (best-effort warning)
    local version=$(get_version "$cmd")
    if [ -n "$version" ] && version_less_than "$version" "$min_version"; then
        log_warning "$cmd version $version detected, recommend $min_version+"
    fi
}
```

**Error Messages**:

```text
ERROR: jq is required but not found.
Install with: brew install jq (macOS) or apt install jq (Ubuntu)

WARNING: jq version 1.5 detected, recommend 1.6+
```

---

## Output Contracts

### Output Files

#### 1. Updated CLAUDE.md

**Location**: Same as input (`$REPO_ROOT/CLAUDE.md`)

**Changes Made**:

- Version numbers updated to match package.json
- All other content preserved (whitespace, formatting, context)
- Atomic update (temporary file → move, no partial writes)

**Preservation Requirements**:

- Display names unchanged
- Section order unchanged
- Additional context text unchanged (e.g., "strict mode", "App Router")
- Line breaks and indentation preserved

**Example Transformation**:

```markdown
Before:

- TypeScript 5.6 (strict mode) + Next.js 15.2 App Router

After (package.json has typescript@5.7.2, next@16.0.10):

- TypeScript 5.7 (strict mode) + Next.js 16.0 App Router
```

---

### Standard Output (stdout)

**Format**: Informational messages with severity prefixes

**Message Types**:
| Prefix | Meaning | Example |
| --------- | ---------------- | -------------------------------------------- |
| `INFO:` | Informational | `INFO: Reading versions from package.json` |
| `✓` | Success | `✓ Updated CLAUDE.md with 14 package versions` |
| `WARNING:`| Non-fatal issue | `WARNING: jq version 1.5 detected` |

**Example Output**:

```text
INFO: === Syncing package versions to CLAUDE.md ===
INFO: Reading versions from package.json
INFO: Updated TypeScript to 5.7
INFO: Updated Next.js to 16.0
INFO: Updated React to 19.2
INFO: Updated postgres to 3.4
INFO: Updated drizzle-orm to 0.45
✓ Updated CLAUDE.md with 14 package version(s)
✓ Package version sync completed
```

---

### Standard Error (stderr)

**Format**: Error messages with severity prefix

**Error Types**:
| Prefix | Meaning | Exit Code | Example |
| -------- | ------------ | --------- | ---------------------------------------- |
| `ERROR:` | Fatal error | 1-4 | `ERROR: package.json not found` |

**Example Error Output**:

```text
ERROR: package.json not found at /Users/nick/Code/memoryloop/package.json
```

---

### Validation Output (--validate flag, Phase 2)

**Format**: Diff-style output showing mismatches

**Example Output**:

```text
INFO: === Validating package versions ===
Package version mismatches detected:

  Package: Next.js
    package.json: 16.0
    CLAUDE.md:    15.2

  Package: TypeScript
    package.json: 5.7
    CLAUDE.md:    5.6

Found 2 mismatches. Run without --validate to sync.
```

**Exit Behavior**:

- Exit 4 if mismatches found
- Exit 0 if all versions match

---

## Implementation Contract

### Tracked Packages

**Package Mapping Table**:
| Display Name | package.json Key | Format | Phase |
| ----------------------- | ------------------------ | --------------------- | ----- |
| TypeScript | `typescript` | Inline | 1 |
| Next.js | `next` | Inline | 1 |
| React | `react` | Inline | 1 |
| Tailwind CSS | `tailwindcss` | Inline | 1 |
| LanceDB | `@lancedb/lancedb` | Inline | 1 |
| pgvector | `pgvector` | Inline | 1 |
| Anthropic Claude SDK | `@anthropic-ai/sdk` | Inline | 1 |
| ts-fsrs | `ts-fsrs` | Inline | 1 |
| NextAuth | `next-auth` | Inline | 1 |
| Vitest | `vitest` | Inline | 1 |
| Playwright | `@playwright/test` | Inline | 1 |
| ESLint | `eslint` | Inline | 1 |
| Prettier | `prettier` | Inline | 1 |
| lint-staged | `lint-staged` | Inline | 1 |
| postgres | `postgres` | Parenthetical | 1 |
| drizzle-orm | `drizzle-orm` | Parenthetical | 1 |

**Adding New Packages** (Phase 2 documentation):
To track a new package, add a call to `update_version` in the script's main function:

```bash
# In update_claude_md() function, add:
update_version "$temp_file" "Display Name" "package-name" && ((updates_made++)) || true
```

**Format Types**:

- **Inline**: `Display Name 5.7 (context)`
- **Parenthetical**: `Display Name (via package-name 3.4, another-package 0.45)`

---

### Version Extraction Logic

**Phase 1 Behavior** (Implemented):

```bash
get_version() {
    local package="$1"
    local version

    # Try dependencies first, then devDependencies
    version=$(jq -r ".dependencies[\"$package\"] // .devDependencies[\"$package\"] // empty" "$PACKAGE_JSON" 2>/dev/null)

    if [[ -n "$version" ]]; then
        # Strip prefixes (^, ~, >=, etc.) and get major.minor
        echo "$version" | sed 's/^[\^~>=<]*//' | sed 's/\.[0-9]*$//' | sed 's/-.*$//'
    fi
}
```

**Example Transformations** (Phase 1):
| package.json | Extracted Version | Explanation |
| ----------------- | ----------------- | ------------------------------------------ |
| `"^16.0.10"` | `16.0` | Strip `^`, remove patch `.10` |
| `"~5.7.2"` | `5.7` | Strip `~`, remove patch `.2` |
| `">=3.4.4"` | `3.4` | Strip `>=`, remove patch `.4` |
| `"0.22.1-beta.2"` | `0.22` | Strip pre-release tag, remove patch |

---

**Phase 2 Behavior** (Enhanced):

```bash
get_version() {
    local package="$1"
    local version

    # Try dependencies first, then devDependencies
    version=$(jq -r ".dependencies[\"$package\"] // .devDependencies[\"$package\"] // empty" "$PACKAGE_JSON" 2>/dev/null)

    if [[ -n "$version" ]]; then
        # Strip prefixes only, preserve full semver
        echo "$version" | sed 's/^[\^~>=<]*//'
    fi
}
```

**Example Transformations** (Phase 2):
| package.json | Extracted Version | Explanation |
| ----------------- | ----------------- | ------------------------------------------ |
| `"^16.0.10"` | `16.0.10` | Strip `^`, keep patch `.10` |
| `"~5.7.2"` | `5.7.2` | Strip `~`, keep patch `.2` |
| `">=3.4.4"` | `3.4.4` | Strip `>=`, keep patch `.4` |
| `"0.22.1-beta.2"` | `0.22.1-beta.2` | Strip prefix, keep pre-release tag |

---

### Version Substitution Logic

**Regex Pattern** (Phases 1-2):

```bash
# Find display name followed by version, replace version only
perl -i -pe "s/(\Q$display_name\E) [0-9]+\.[0-9]+(\.[0-9]+)?(-[a-z0-9.]+)?/\$1 $version/" "$temp_file"
```

**Pattern Breakdown**:

- `\Q$display_name\E` - Literal display name (escape special chars)
- ` ` - Single space separator
- `[0-9]+\.[0-9]+` - Major.minor (mandatory)
- `(\.[0-9]+)?` - Patch version (optional)
- `(-[a-z0-9.]+)?` - Pre-release tag (optional)
- `\$1 $version` - Replace with display name + new version

**Edge Cases**:

1. **Display name with special characters**: `\Q...\E` escapes regex metacharacters
   - Example: `PostgreSQL (via ...)` → Parentheses are literal
2. **Multiple occurrences**: Only update first match (assumes unique display names)
3. **No match found**: Skip silently (package not tracked in CLAUDE.md)

---

## Error Handling

### Error Classification

| Error Class            | Severity | Recovery Strategy                          | User Action Required          |
| ---------------------- | -------- | ------------------------------------------ | ----------------------------- |
| Missing dependency     | Fatal    | Exit immediately with install instructions | Install jq or perl            |
| Invalid JSON           | Fatal    | Exit with file path and error message      | Fix package.json syntax       |
| File not found         | Fatal    | Exit with file path                        | Ensure files exist            |
| Version mismatch       | Warning  | Continue or exit based on --validate flag  | Review and sync if needed     |
| Old dependency version | Warning  | Continue with warning message              | Upgrade dependency (optional) |

### Error Message Templates

**Missing Dependency**:

```text
ERROR: {dependency} is required but not found.
Install with: brew install {dependency} (macOS) or apt install {dependency} (Ubuntu)
```

**Invalid JSON**:

```text
ERROR: Failed to parse package.json
{jq error message}
```

**File Not Found**:

```text
ERROR: {file} not found at {absolute_path}
```

**Version Mismatch** (--validate):

```text
Package version mismatch detected:
  Package: {display_name}
  package.json: {extracted_version}
  CLAUDE.md: {current_version}

Sync to CLAUDE.md? (y/n):
```

---

## Performance Contract

### Execution Time

| Operation               | Target Time | Measurement Point                 |
| ----------------------- | ----------- | --------------------------------- |
| Script execution        | < 1 second  | Start to completion (16 packages) |
| jq JSON parsing         | < 100ms     | Per package.json read             |
| perl regex substitution | < 50ms      | Per package update                |
| File I/O (CLAUDE.md)    | < 200ms     | Read + write                      |

### Resource Usage

| Resource | Limit  | Notes                             |
| -------- | ------ | --------------------------------- |
| Memory   | < 50MB | jq and perl processes             |
| Disk I/O | < 10KB | CLAUDE.md file size               |
| CPU      | < 10%  | Single-threaded, mostly I/O bound |

---

## Testing Contract

### Test Scenarios (Phase 2)

See `tests/bash/test-version-extraction.sh` for implementation.

**Test Cases**:

1. **Valid package.json**: All versions extracted correctly
2. **Missing package**: Gracefully skip (no error)
3. **npm prefix variations**: `^`, `~`, `>=` all stripped correctly
4. **Semver formats**: Patch versions and pre-release tags preserved (Phase 2)
5. **Invalid JSON**: Exit with code 2
6. **Missing jq**: Exit with code 1 and install instructions
7. **Missing CLAUDE.md**: Exit with code 3
8. **No changes needed**: CLAUDE.md already current (exit 0, no write)
9. **Parenthetical versions**: `postgres` and `drizzle-orm` updated correctly
10. **Special characters in display name**: Regex escaping works

### Test Fixtures

**Mock Files**:

- `tests/bash/mocks/package.json` - Sample package.json with known versions
- `tests/bash/mocks/CLAUDE.md` - Sample CLAUDE.md with outdated versions
- `tests/bash/fixtures/expected-output.md` - Expected CLAUDE.md after sync

**Assertion Pattern**:

```bash
run_test "Test case name" "$expected_output" "$(actual_output)"
```

---

## Backward Compatibility

### Phase 1 → Phase 2 Migration

**Breaking Changes**: None

**New Features**:

- `--validate` flag (optional, no impact on existing usage)
- `--help` flag (optional)
- Full semver preservation (enhancement, not breaking)
- Dependency version checks (warnings only, not blocking)

**Migration Steps**: None required - existing scripts continue to work

**Deprecations**: None

---

## Security Considerations

### Input Validation

1. **package.json**: Validated as JSON by `jq` (no shell injection risk)
2. **Display names**: Quoted in perl regex with `\Q...\E` (no regex injection)
3. **Versions**: Validated against semver pattern (no arbitrary code execution)

### File Permissions

- Script requires read access to package.json and CLAUDE.md
- Script requires write access to CLAUDE.md
- Temporary files created in secure temp directory (`mktemp`)

### Dependency Chain

- `jq`: Trusted JSON parser (no known vulnerabilities)
- `perl`: Standard system utility (no external modules)
- `bash`: POSIX shell (set -euo pipefail for safety)

---

## Documentation Contract (Phase 2)

### Inline Comments

**Required Comment Sections**:

1. **File header**: Purpose, usage, and invocation example
2. **Configuration section**: Variable declarations with explanations
3. **Function headers**: Input parameters, return values, side effects
4. **Complex regex**: Explanation of pattern matching logic

**Example**:

```bash
#!/usr/bin/env bash

# Sync package versions from package.json to CLAUDE.md Technology Stack
#
# This script reads package.json and updates the Technology Stack section
# in CLAUDE.md with the current package versions.
#
# Run this script after installing or updating packages to keep CLAUDE.md
# in sync with actual dependency versions.
#
# Usage: ./update-agent-context.sh [--validate] [--help]

#==============================================================================
# Configuration
#==============================================================================

SCRIPT_DIR="$(CDPATH="" cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
PACKAGE_JSON="$REPO_ROOT/package.json"  # Source of truth for versions
CLAUDE_MD="$REPO_ROOT/CLAUDE.md"        # Target file for sync

#==============================================================================
# Utility Functions
#==============================================================================

# Extract version from package.json
# Args:
#   $1 - Package name (e.g., "typescript", "@lancedb/lancedb")
# Returns:
#   Version string (major.minor.patch) or empty if not found
get_version() {
    local package="$1"
    # ...
}
```

### Maintainer Documentation

**Required in FR-012**:

- List of tracked packages with display names
- Instructions for adding new packages
- Explanation of version format choices (inline vs parenthetical)
- Troubleshooting guide for common errors

**Location**: Inline comments in script + this contract document

---

## Contract Version History

| Version | Date       | Changes                                              |
| ------- | ---------- | ---------------------------------------------------- |
| 1.0.0   | 2025-12-21 | Initial Phase 1 implementation (PR 171)              |
| 2.0.0   | 2025-12-23 | Phase 2 enhancements (full semver, validation, docs) |

---

## References

- [jq Manual](https://stedolan.github.io/jq/manual/) - JSON query syntax
- [Semantic Versioning](https://semver.org/) - Version format specification
- [Bash Best Practices](https://tldp.org/LDP/abs/html/) - Shell scripting guide
- [Feature Specification](../spec.md) - User stories and requirements
