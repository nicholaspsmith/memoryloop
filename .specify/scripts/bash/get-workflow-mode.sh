#!/usr/bin/env bash

#==============================================================================
# get-workflow-mode.sh
#==============================================================================
# Detects or prompts for workflow mode (Automatic vs User-Guided)
#
# Behavior:
#   1. Checks environment variable SPECKIT_WORKFLOW_MODE
#   2. Checks session file .specify/tmp/workflow-mode.txt
#   3. If neither exists and terminal is interactive, prompts user
#   4. If non-interactive terminal (CI/batch), defaults to "automatic"
#
# Returns:
#   - "automatic" or "user-guided"
#
# Usage:
#   MODE=$(./get-workflow-mode.sh)
#   echo "Selected mode: $MODE"
#
#   # With explicit set:
#   ./get-workflow-mode.sh --set automatic
#   ./get-workflow-mode.sh --set user-guided
#
#   # Clear stored preference:
#   ./get-workflow-mode.sh --clear
#==============================================================================

set -euo pipefail

SCRIPT_DIR="$(CDPATH="" cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
MODE_FILE="$REPO_ROOT/.specify/tmp/workflow-mode.txt"

#==============================================================================
# Functions
#==============================================================================

# Ensure tmp directory exists
ensure_tmp_dir() {
    mkdir -p "$(dirname "$MODE_FILE")"
}

# Check if terminal is interactive
is_interactive() {
    # Check if stdin is a terminal
    [[ -t 0 ]]
}

# Get stored mode from file
get_stored_mode() {
    if [[ -f "$MODE_FILE" ]]; then
        cat "$MODE_FILE"
    fi
}

# Save mode to file
save_mode() {
    local mode="$1"
    ensure_tmp_dir
    echo "$mode" > "$MODE_FILE"
}

# Clear stored mode
clear_mode() {
    if [[ -f "$MODE_FILE" ]]; then
        rm "$MODE_FILE"
    fi
}

# Get mode from environment variable or file
get_cached_mode() {
    # Check environment variable first
    if [[ -n "${SPECKIT_WORKFLOW_MODE:-}" ]]; then
        echo "${SPECKIT_WORKFLOW_MODE}"
        return
    fi

    # Check file
    local stored_mode
    stored_mode=$(get_stored_mode)
    if [[ -n "$stored_mode" ]]; then
        echo "$stored_mode"
        return
    fi
}

# Prompt user for workflow mode (only if interactive)
prompt_for_mode() {
    # Non-interactive terminal: default to automatic
    if ! is_interactive; then
        echo "automatic"
        return
    fi

    # Interactive: prompt user
    # Note: This outputs instructions that Claude should use AskUserQuestion for
    echo "PROMPT_NEEDED"
}

# Validate mode value
validate_mode() {
    local mode="$1"
    if [[ "$mode" == "automatic" || "$mode" == "user-guided" ]]; then
        return 0
    else
        return 1
    fi
}

#==============================================================================
# Main
#==============================================================================

main() {
    local command="${1:-get}"

    case "$command" in
        --set)
            if [[ -z "${2:-}" ]]; then
                echo "Error: --set requires a mode (automatic or user-guided)" >&2
                exit 1
            fi
            if ! validate_mode "$2"; then
                echo "Error: Invalid mode '$2'. Must be 'automatic' or 'user-guided'" >&2
                exit 1
            fi
            save_mode "$2"
            echo "$2"
            ;;

        --clear)
            clear_mode
            echo "Workflow mode cleared"
            ;;

        --get|get|*)
            # Try to get cached mode first
            local cached_mode
            cached_mode=$(get_cached_mode)

            if [[ -n "$cached_mode" ]]; then
                echo "$cached_mode"
            else
                # No cached mode, prompt or default
                prompt_for_mode
            fi
            ;;
    esac
}

main "$@"
