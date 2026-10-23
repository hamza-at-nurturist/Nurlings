#!/usr/bin/env bash
# Reads changed file paths, one per line, on stdin and the pull request's labels (comma separated)
# in PR_LABELS. Exits 1 with a message when the pull request changes code (apps/, packages/,
# infra/ or deploy/) without adding or modifying a folder under openspec/changes/ (archive
# included), unless it carries the no-spec label.
set -euo pipefail

code=false
spec=false
while IFS= read -r file || [ -n "$file" ]; do
  case "$file" in
    apps/* | packages/* | infra/* | deploy/*) code=true ;;
    openspec/changes/*) spec=true ;;
  esac
done

if [ "$code" = false ] || [ "$spec" = true ]; then
  echo "OpenSpec check passed."
  exit 0
fi

case ",${PR_LABELS:-}," in
  *,no-spec,*)
    echo "OpenSpec check skipped: the no-spec label is set."
    exit 0
    ;;
esac

echo "::error::This pull request changes code (apps/, packages/, infra/ or deploy/) but has no OpenSpec change."
echo "Add a folder under openspec/changes/ (proposal + tasks, see AGENTS.md), or ask the maintainer to apply the no-spec label if the change is exempt."
exit 1
