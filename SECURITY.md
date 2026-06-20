# Security Policy

## Reporting A Vulnerability

Please do not open a public Issue for security-sensitive reports.

Email the maintainer at the security contact listed in the repository profile, or open a private
security advisory on GitHub if available.

Include:

- a concise description of the issue
- affected versions or commits
- reproduction steps
- potential impact
- any relevant logs with secrets removed

## Handling Sensitive Data

`maintainer-kit` is designed to redact common secrets and truncate diffs before sending context to a
model. Please still avoid placing secrets, private customer data, or sensitive repository contents in
Issues, Pull Requests, examples, or test fixtures.

## Supported Versions

Until the first tagged release, only the latest commit on `main` is considered supported.
