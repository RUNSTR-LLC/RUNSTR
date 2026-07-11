#!/bin/bash
# RUNSTR Autonomous Contributor — Launcher
# Starts a long-running Claude Code session that continuously audits
# the RUNSTR app repo and submits PRs for safe fixes.
#
# Scope: ~/RUNSTR only (NOT runstr-zapper — that handles real money)
#
# Prerequisites:
#   - Claude Code CLI installed and authenticated
#   - gh CLI authenticated as TheWildHustle
#   - ~/RUNSTR repo cloned and on main
#
# Usage:
#   ./start-contributor.sh                # run in foreground
#   nohup ./start-contributor.sh &        # persist after terminal close
#   nohup ./start-contributor.sh > ~/contributor-output.log 2>&1 &

set -euo pipefail

PROMPT_FILE="$HOME/RUNSTR/docs/autonomous-contributor.md"

if [ ! -f "$PROMPT_FILE" ]; then
  echo "Error: Prompt file not found at $PROMPT_FILE"
  exit 1
fi

if ! command -v claude &> /dev/null; then
  echo "Error: claude CLI not found. Install it first."
  exit 1
fi

if ! command -v gh &> /dev/null; then
  echo "Error: gh CLI not found. Install it first."
  exit 1
fi

# Verify gh is authenticated
if ! gh auth status &> /dev/null; then
  echo "Error: gh CLI not authenticated. Run 'gh auth login' first."
  exit 1
fi

echo "Starting RUNSTR Autonomous Contributor..."
echo "Prompt: $PROMPT_FILE"
echo "Target: ~/RUNSTR (app repo only)"
echo "PID:    $$"
echo "---"
echo "To stop: kill $$"
echo ""

cd ~/RUNSTR
exec claude -p "$(cat "$PROMPT_FILE")"
