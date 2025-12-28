#!/bin/bash
# Test File Guardian Hook
# Intercepts Write/Edit calls to test files and reminds to use test-agent

# Read JSON input from stdin
input=$(cat)

# Extract tool name and file path using grep/sed (portable)
tool_name=$(echo "$input" | grep -o '"tool_name"[[:space:]]*:[[:space:]]*"[^"]*"' | sed 's/.*"tool_name"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/')
file_path=$(echo "$input" | grep -o '"file_path"[[:space:]]*:[[:space:]]*"[^"]*"' | sed 's/.*"file_path"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/')

# Check if this is a Write or Edit operation
if [[ "$tool_name" != "Write" && "$tool_name" != "Edit" ]]; then
  exit 0
fi

# Check if the file path matches test patterns
is_test=false

# Match test file patterns
if [[ "$file_path" =~ ^tests/.*\.ts$ ]] || \
   [[ "$file_path" =~ ^tests/.*\.tsx$ ]] || \
   [[ "$file_path" =~ \.test\.ts$ ]] || \
   [[ "$file_path" =~ \.test\.tsx$ ]] || \
   [[ "$file_path" =~ \.spec\.ts$ ]] || \
   [[ "$file_path" =~ \.spec\.tsx$ ]] || \
   [[ "$file_path" =~ __tests__/ ]]; then
  is_test=true
fi

if [[ "$is_test" == "true" ]]; then
  # Output JSON to deny the operation with guidance
  cat << EOF
{
  "hookSpecificOutput": {
    "hookEventName": "PreToolUse",
    "permissionDecision": "deny",
    "permissionDecisionReason": "Test file detected: $file_path\n\nUse test-agent for writing tests. Spawn it with:\n\nTask tool with subagent_type='test-agent'\n\nThe test-agent is optimized for:\n  - Writing unit tests (Vitest)\n  - Writing E2E tests (Playwright)\n  - Running and fixing tests\n  - Following project test patterns\n\nIf you have a specific reason to write this test directly, explain to the user why test-agent is not suitable."
  }
}
EOF
  exit 0
fi

# Allow non-test files to proceed
exit 0
