#!/usr/bin/env bash

# Test script for get-current-branch.sh
# Tests various edge cases and branch detection scenarios

set -euo pipefail

SCRIPT_DIR="$(CDPATH="" cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
BRANCH_SCRIPT="$REPO_ROOT/.specify/scripts/bash/get-current-branch.sh"

# Test counters
TESTS_PASSED=0
TESTS_FAILED=0

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color

#==============================================================================
# Test Helper Functions
#==============================================================================

run_test() {
    local test_name="$1"
    local expected="$2"
    local actual="$3"

    if [[ "$expected" == "$actual" ]]; then
        echo -e "${GREEN}✓${NC} $test_name"
        ((TESTS_PASSED++))
        return 0
    else
        echo -e "${RED}✗${NC} $test_name"
        echo "  Expected: $expected"
        echo "  Actual:   $actual"
        ((TESTS_FAILED++))
        return 1
    fi
}

contains() {
    local haystack="$1"
    local needle="$2"

    if [[ "$haystack" == *"$needle"* ]]; then
        return 0
    else
        return 1
    fi
}

#==============================================================================
# Tests
#==============================================================================

echo "Testing get-current-branch.sh"
echo "=============================="
echo

# Test 1: Normal branch detection (should return current branch name)
echo "Test 1: Normal branch detection"
actual=$("$BRANCH_SCRIPT")
if [[ -n "$actual" ]] && [[ "$actual" != "N/A" ]]; then
    echo -e "${GREEN}✓${NC} Returns branch name: $actual"
    ((TESTS_PASSED++))
else
    echo -e "${RED}✗${NC} Failed to detect branch"
    echo "  Got: $actual"
    ((TESTS_FAILED++))
fi
echo

# Test 2: Footer format
echo "Test 2: Footer format"
actual=$("$BRANCH_SCRIPT" --format footer)
if contains "$actual" "Current branch:" && contains "$actual" "---"; then
    echo -e "${GREEN}✓${NC} Footer format includes separator and label"
    ((TESTS_PASSED++))
else
    echo -e "${RED}✗${NC} Footer format incorrect"
    echo "  Got: $actual"
    ((TESTS_FAILED++))
fi
echo

# Test 3: Plain format (default)
echo "Test 3: Plain format (default)"
actual=$("$BRANCH_SCRIPT" --format plain)
if [[ -n "$actual" ]] && ! contains "$actual" "---"; then
    echo -e "${GREEN}✓${NC} Plain format returns branch name without separator"
    ((TESTS_PASSED++))
else
    echo -e "${RED}✗${NC} Plain format incorrect"
    echo "  Got: $actual"
    ((TESTS_FAILED++))
fi
echo

# Test 4: Performance (should complete in < 50ms)
echo "Test 4: Performance (< 50ms requirement)"
start_time=$(date +%s%N)
"$BRANCH_SCRIPT" >/dev/null
end_time=$(date +%s%N)
elapsed_ms=$(( (end_time - start_time) / 1000000 ))

if [[ $elapsed_ms -lt 50 ]]; then
    echo -e "${GREEN}✓${NC} Execution time: ${elapsed_ms}ms (< 50ms)"
    ((TESTS_PASSED++))
else
    echo -e "${RED}✗${NC} Execution too slow: ${elapsed_ms}ms (>= 50ms)"
    ((TESTS_FAILED++))
fi
echo

# Test 5: Detached HEAD state (simulate by checking out a commit)
echo "Test 5: Detached HEAD state"
current_branch=$(git rev-parse --abbrev-ref HEAD)
latest_commit=$(git rev-parse HEAD)

# Checkout the current commit (creates detached HEAD)
git checkout --quiet "$latest_commit" 2>/dev/null || true

actual=$("$BRANCH_SCRIPT")

# Return to original branch
git checkout --quiet "$current_branch" 2>/dev/null || true

if contains "$actual" "(detached)"; then
    echo -e "${GREEN}✓${NC} Detached HEAD detected: $actual"
    ((TESTS_PASSED++))
else
    echo -e "${RED}✗${NC} Failed to detect detached HEAD"
    echo "  Got: $actual"
    ((TESTS_FAILED++))
fi
echo

# Test 6: Script exists outside git repository
echo "Test 6: Non-git directory"
temp_dir=$(mktemp -d)
cp "$BRANCH_SCRIPT" "$temp_dir/"
cd "$temp_dir"
actual=$(./$(basename "$BRANCH_SCRIPT") 2>/dev/null || echo "N/A")
cd "$REPO_ROOT"
rm -rf "$temp_dir"

if [[ "$actual" == "N/A" ]]; then
    echo -e "${GREEN}✓${NC} Returns 'N/A' outside git repository"
    ((TESTS_PASSED++))
else
    echo -e "${RED}✗${NC} Should return 'N/A' outside git"
    echo "  Got: $actual"
    ((TESTS_FAILED++))
fi
echo

#==============================================================================
# Summary
#==============================================================================

echo "=============================="
echo "Tests passed: $TESTS_PASSED"
echo "Tests failed: $TESTS_FAILED"
echo

if [[ $TESTS_FAILED -eq 0 ]]; then
    echo -e "${GREEN}All tests passed!${NC}"
    exit 0
else
    echo -e "${RED}Some tests failed.${NC}"
    exit 1
fi
