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
# test:coverage replaces plain `test` here: it runs the same test suite plus
# coverage collection and enforces the thresholds declared per-package in
# vitest.config.ts (extending vitest.shared.ts: lines/functions 80%,
# branches 75%, statements 80%). Before this line was added, those
# thresholds were declared but never checked by anything in the validation
# pipeline — the gate looked enforced only because nothing measured it.
TURBO_TASKS_COMMON="build typecheck typecheck:scripts test:coverage test:smoke test:smoke:server test:raw-wire depcruise validate:docs validate:tools"

if $QUIET; then
  TURBO_TASKS="$TURBO_TASKS_COMMON lint:quiet cpd:quiet"
  TURBO_FLAGS="--output-logs=errors-only"
else
  TURBO_TASKS="$TURBO_TASKS_COMMON lint cpd"
  TURBO_FLAGS=""
fi

# shellcheck disable=SC2086
turbo run $TURBO_TASKS $TURBO_FLAGS

# ---------------------------------------------------------------------------
# Root-only tasks (not managed by turbo)
# ---------------------------------------------------------------------------
# validate:docs:root: turbo run validate:docs (above) runs per-package with
# cwd = package dir, so it can never check root-level docs (CLAUDE.md,
# ARCHITECTURE.md, tracker README.md, tests/README.md) — validate-docs-size.ts
# only checks those when cwd === monorepoRoot. Must run once, from here.
#
# format:check: no turbo task exists for it (root `format`/`format:check`
# run prettier directly over the whole monorepo glob, not per-workspace —
# see root package.json), so it belongs here alongside knip:root /
# validate:docs:root rather than in TURBO_TASKS above. Was missing entirely
# before this fix, so `prettier --check` could fail while CI stayed green.
# lint:servers-scripts: packages/servers/scripts (общие скрипты сборки mcpb)
# не является npm-workspace — у него нет package.json, поэтому turbo run lint
# его не видит. Без этого шага каталог остаётся вне линта, как и весь
# scripts/** до этого изменения.
if $QUIET; then
  npm run lint:servers-scripts --silent
  npm run knip:root --silent 2>&1 | tail -1
  npm run validate:docs:root --silent 2>/dev/null | grep -v '^$' | tail -1
  npm run format:check --silent
else
  npm run lint:servers-scripts
  npm run knip:root
  npm run validate:docs:root
  npm run format:check
fi
