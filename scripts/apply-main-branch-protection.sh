#!/usr/bin/env bash
set -euo pipefail

repository="${REPOSITORY:-joj0hq/maintainer-kit}"
branch="${BRANCH:-main}"
api_url="${GITHUB_API_URL:-https://api.github.com}"
token="${GITHUB_TOKEN:-${GH_TOKEN:-}}"
enforce_admins="${ENFORCE_ADMINS:-false}"

case "$enforce_admins" in
  true | false) ;;
  *)
    echo "ENFORCE_ADMINS must be true or false." >&2
    exit 1
    ;;
esac

body_file="$(mktemp)"
trap 'rm -f "$body_file"' EXIT

cat >"$body_file" <<JSON
{
  "required_status_checks": {
    "strict": true,
    "contexts": [],
    "checks": [
      {
        "context": "test",
        "app_id": 15368
      }
    ]
  },
  "enforce_admins": $enforce_admins,
  "required_pull_request_reviews": {
    "dismiss_stale_reviews": true,
    "require_code_owner_reviews": false,
    "required_approving_review_count": 1
  },
  "restrictions": null
}
JSON

if [[ "${DRY_RUN:-false}" == "true" ]]; then
  echo "Would apply branch protection to ${repository}:${branch}"
  cat "$body_file"
  exit 0
fi

if [[ -z "$token" ]]; then
  echo "Set GITHUB_TOKEN or GH_TOKEN with repository administration write permission." >&2
  exit 1
fi

curl --fail -L -sS \
  -X PUT \
  -H "Accept: application/vnd.github+json" \
  -H "Authorization: Bearer ${token}" \
  -H "X-GitHub-Api-Version: 2022-11-28" \
  --data @"$body_file" \
  "${api_url}/repos/${repository}/branches/${branch}/protection"

echo
echo "Applied branch protection to ${repository}:${branch}"
