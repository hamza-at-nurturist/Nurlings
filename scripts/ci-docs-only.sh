#!/usr/bin/env bash
# Reads changed file paths, one per line, on stdin and prints "code=false" when every one is
# documentation, otherwise "code=true". CI uses it to skip the heavy jobs for docs-only pull
# requests. An empty list counts as code, so a failed diff never skips anything.
#
# Documentation is: anything under openspec/ or docs/, deploy/coolify/README.md, and Markdown
# files in the repository root. Markdown elsewhere can be read by the code, so it is not skipped.
set -euo pipefail

code=false
seen=false
while IFS= read -r file || [ -n "$file" ]; do
  [ -n "$file" ] || continue
  seen=true
  case "$file" in
    openspec/* | docs/* | deploy/coolify/README.md) ;;
    */*) code=true ;;
    *.md) ;;
    *) code=true ;;
  esac
done
[ "$seen" = true ] || code=true
echo "code=$code"
