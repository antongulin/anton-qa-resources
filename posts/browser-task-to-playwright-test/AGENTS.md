# Browser task to Playwright test

## Purpose

Companion practice app showing why recorded actions need an outcome assertion.

## Ownership

Owns the localhost profile app, persistence test, and expected-failure verification.

## Local Contracts

The default app saves Alex's edited name as Sam in browser localStorage.
The `?broken=1` variant shows Saved but discards the change.
Keep this intentional defect and verify the reload assertion catches it.
Use synthetic data only. The server must bind to 127.0.0.1.

## Work Guidance

Keep README commands and article behavior aligned. Do not add unrelated examples.
Dependency pins preserve this tutorial; review them when maintaining the example.

## Verification

Run `npm ci`, `npx playwright install chromium`, and `npm run verify`.
Verification requires one corrected pass and the precise expected persistence failure.

## Child DOX Index

No child AGENTS.md. This file owns tests and verification scripts.

