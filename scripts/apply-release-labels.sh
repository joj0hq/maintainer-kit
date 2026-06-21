#!/usr/bin/env bash
set -euo pipefail

repository="${REPOSITORY:-joj0hq/maintainer-kit}"
token="${GITHUB_TOKEN:-${GH_TOKEN:-}}"

if [[ -z "$token" ]]; then
  echo "Set GITHUB_TOKEN or GH_TOKEN with Issues write permission." >&2
  exit 1
fi

export GH_TOKEN="$token"

gh label create "release:patch" \
  --repo "$repository" \
  --color "0E8A16" \
  --description "Backward-compatible bug fix or maintenance release" \
  --force
gh label create "release:minor" \
  --repo "$repository" \
  --color "1D76DB" \
  --description "Backward-compatible feature release" \
  --force
gh label create "release:major" \
  --repo "$repository" \
  --color "B60205" \
  --description "Breaking release or explicit 1.0 release" \
  --force
gh label create "release:none" \
  --repo "$repository" \
  --color "D4C5F9" \
  --description "No versioned release required" \
  --force
gh label create "autorelease: pending" \
  --repo "$repository" \
  --color "FBCA04" \
  --description "Open rolling Release PR awaiting maintainer approval" \
  --force

echo "Applied release labels to ${repository}"
