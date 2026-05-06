#!/usr/bin/env bash
set -euo pipefail

# Usage:
#   ./scripts/push-to-github.sh YOUR_GITHUB_USERNAME ai-video-forge

USER_NAME="${1:-}"
REPO_NAME="${2:-ai-video-forge}"

if [ -z "$USER_NAME" ]; then
  echo "Usage: ./scripts/push-to-github.sh YOUR_GITHUB_USERNAME ai-video-forge"
  exit 1
fi

git init
git add .
git commit -m "Initial AI Video Forge website"
git branch -M main
git remote add origin "https://github.com/${USER_NAME}/${REPO_NAME}.git"
git push -u origin main
