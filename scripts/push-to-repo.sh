#!/usr/bin/env bash
set -euo pipefail

if [ $# -lt 1 ]; then
  echo "Usage: $0 <git-remote-url> [branch]"
  exit 1
fi

REMOTE_URL="$1"
BRANCH="${2:-main}"

if [ ! -d .git ]; then
  git init
fi

git add -A
git commit -m "chore: initial import" || true
git branch -M "$BRANCH"

if git remote get-url target >/dev/null 2>&1; then
  git remote set-url target "$REMOTE_URL"
else
  git remote add target "$REMOTE_URL"
fi

git push -u target "$BRANCH"

echo "Pushed to $REMOTE_URL on branch $BRANCH"

