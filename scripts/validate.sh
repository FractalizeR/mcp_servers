#!/usr/bin/env bash

# =============================================================================
# validate.sh — Single source of truth for the validation pipeline
# =============================================================================
#
# Usage:
#   ./scripts/validate.sh          # Full output (for developers)
#   ./scripts/validate.sh --quiet  # Minimal output (for AI agents)
#
# This script defines ALL validation steps in one place.
# Root package.json `validate` and `validate:quiet` both delegate here,
# eliminating drift between the two modes.
#
# To add a new validation step:
#   1. Add the turbo task to TURBO_TASKS_COMMON (or _QUIET/_NORMAL)
#   2. Add the task definition to turbo.json if needed
#   3. That's it — both modes are updated automatically
# =============================================================================

set -euo pipefail

cd "$(dirname "$0")/.."

QUIET=false
[[ "${1:-}" == "--quiet" ]] && QUIET=true

# ---------------------------------------------------------------------------
# Turbo tasks — run across all workspaces
# ---------------------------------------------------------------------------
# Tasks that are the same in both modes:
TURBO_TASKS_COMMON="build typecheck test:smoke test:smoke:server depcruise validate:docs validate:tools"

if $QUIET; then
  TURBO_TASKS="$TURBO_TASKS_COMMON lint:quiet test:quiet cpd:quiet"
  TURBO_FLAGS="--output-logs=errors-only"
else
  TURBO_TASKS="$TURBO_TASKS_COMMON lint test cpd"
  TURBO_FLAGS=""
fi

# shellcheck disable=SC2086
turbo run $TURBO_TASKS $TURBO_FLAGS

# ---------------------------------------------------------------------------
# Root-only tasks (not managed by turbo)
# ---------------------------------------------------------------------------
if $QUIET; then
  npm run knip:root --silent 2>&1 | tail -1
else
  npm run knip:root
fi
