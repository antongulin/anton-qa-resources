# Parallel Playwright account data

## Purpose

Runnable synthetic example for the planned `parallel-playwright-account-data` article.

## Ownership

This project owns its Node HTTP fixture, managed-context Playwright tests, scenario runner,
report classifier, lifecycle guards, dependency lockfile, and reader instructions.

## Local Contracts

- Bind an owned server to `127.0.0.1` on an ephemeral port. Each scenario starts with all account
  settings `On`. Store settings in the server's ephemeral map; localStorage holds only a probe.
- Keep both test bodies unchanged across scenarios. Paired modes change only account assignment.
  Keep two workers, full parallelism, zero retries, and fresh managed browser contexts.
- Fixture-only readiness/save latches arrange one possible interleaving. They must not mutate
  settings or fabricate assertion outcomes. Use no sleeps or expected-failure annotations.
- Raw shared execution exits 1 for the reader's immediate `On` versus `Off` equality failure.
  The verifier accepts only that failure, real save/read evidence, and isolated storage probes.
- Keep server/child cleanup in `finally`, preserve unique ignored reports, and reject unrelated
  failures. SIGKILL and machine-failure recovery are outside the cleanup claim.
- Pin Playwright 1.64.1 and use Node 26.13.0. Do not change other projects' dependencies.

## Work Guidance

Keep the canonical article link labeled planned until publication. Explain that this fixture
demonstrates a chosen interleaving, not a measured flake rate or a production account allocator.
Use synthetic localhost data only. No real authentication, email delivery, or external services.

## Verification

Run `npm ci`, `npx playwright install chromium`, `npm run test:guards`, and the four documented
`npm run demo -- <scenario>` commands separately. The shared command must exit 1; others exit 0.
Run `npm run verify` for guards and six fixed fresh scenarios, including a repeated shared/separate
pair. Linux CI installs Chromium with `--with-deps`. Preserve raw reports on failure.

## Child DOX Index

None. This file owns the whole project, including `tests/`.
