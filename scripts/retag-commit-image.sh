#!/usr/bin/env bash
# Usage: retag-commit-image.sh <image> <commit> <tag>...
# Points each full image reference <tag> at the existing <image>:sha-<commit> without building.
# Exits 10 when that image does not exist (or cannot be read), so the caller can build instead.
set -euo pipefail

if [ "$#" -lt 3 ]; then
  echo "usage: $0 <image> <commit> <tag>..." >&2
  exit 2
fi

image=$1
commit=$2
shift 2
source="$image:sha-$commit"

if ! docker buildx imagetools inspect "$source" > /dev/null 2>&1; then
  echo "No $source to retag; it has to be built."
  exit 10
fi

args=()
for tag in "$@"; do
  args+=(--tag "$tag")
done
docker buildx imagetools create "${args[@]}" "$source"
echo "Retagged $source as: $*"
