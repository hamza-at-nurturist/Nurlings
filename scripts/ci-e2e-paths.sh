#!/usr/bin/env bash
# Reads changed file paths, one per line, on stdin and prints "e2e=true" when any of them can
# change what the Web E2E job runs, otherwise "e2e=false". CI uses it to skip Web E2E on pull
# requests that cannot affect it. An empty list counts as true, so a failed diff never skips it.
#
# The job starts the web app, the API and the worker over every shared package, and also runs the
# marketing site's end-to-end tests, so those apps, all of packages/, the root build files and the
# workflows that run it count.
set -euo pipefail

e2e=false
seen=false
while IFS= read -r file || [ -n "$file" ]; do
  [ -n "$file" ] || continue
  seen=true
  case "$file" in
    apps/web/* | apps/api/* | apps/worker/* | apps/www/* | packages/*) e2e=true ;;
    package.json | pnpm-lock.yaml | pnpm-workspace.yaml | turbo.json | tsconfig.base.json | .npmrc | patches/*) e2e=true ;;
    .github/workflows/ci.yml | .github/workflows/playwright.yml | scripts/*playwright*) e2e=true ;;
  esac
done
[ "$seen" = true ] || e2e=true
echo "e2e=$e2e"
