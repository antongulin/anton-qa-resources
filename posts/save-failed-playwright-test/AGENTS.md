# Save failed Playwright test

## Purpose

Owns the standalone synthetic examples for the forthcoming `save-failed-playwright-test` article.

## Ownership

Owns the localhost fixture, deliberately flaky retry test, trace-evidence verifier, payment-routing checks, and browser-clock boundary check.

## Local Contracts

The first core attempt is deliberately failed by a route fixture selected from `testInfo.retry`; retry 1 succeeds. It must never depend on shared state, timing, or randomness.
All pages and API responses are synthetic and bind only to `127.0.0.1`. No payment provider, card, account, or server-side session expiry is represented.
`npm run verify` must inspect the generated trace archives and JSON report, not simply accept a zero test-process exit status.

## Work Guidance

Keep the two trace projects semantically identical except for trace mode. Keep artifact paths out of Git and document the exact paths a reader can inspect.
Review the pinned Playwright version when updating the article or the example.

## Verification

Run `npm ci`, `npx playwright install chromium`, and `npm run verify`. The verifier requires both trace variants to be flaky with a failed attempt followed by a passing retry, and checks the retained archive evidence.

## Child DOX Index

No child AGENTS.md. This file owns the project.
