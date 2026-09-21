# Test dark mode and reduced motion

## Purpose

Owns the standalone synthetic example for the `test-dark-mode-reduced-motion` article.

## Ownership

Owns the localhost fixture, the rendered-style Playwright checks, the light baseline, and the
deliberate-defect verifier.

## Local Contracts

The default page renders light with a `2s` transition. `?variant=css-stuck` drops the dark-scheme
rule and `?variant=motion-stuck` drops the reduced-motion rule, while both keep the emulated
`matchMedia` flag true. Keep both defects and keep them independent.
All colors, text, and motion values are synthetic. The server must bind to `127.0.0.1`.
`npm run verify` must assert computed styles and the failure reason, not only the test exit status.

## Work Guidance

Keep README commands and article behavior aligned. Do not add unrelated examples.
Dependency pins preserve this tutorial; review them when maintaining the example.
Keep artifact paths out of Git.

## Verification

Run `npm ci`, `npx playwright install chromium`, and `npm run verify`. Verification requires the
corrected page to pass all three checks and each broken variant to fail its own check for the
rendered-value reason while the other checks stay green.

## Child DOX Index

No child AGENTS.md. This file owns tests and verification scripts.
