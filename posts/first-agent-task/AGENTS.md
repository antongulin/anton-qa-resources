# First agent task

## Purpose

Synthetic Node.js exercise for the `first-agent-task` article.

## Ownership

Owns the deliberately flawed filename helper, five comparison tests, and exact-outcome verifier.

## Local Contracts

Keep `pdf-filename.mjs` case-sensitive so `report.PDF` fails in the starting example. Use synthetic filenames only; no credentials, network calls, or external data. The helper checks a filename suffix, not PDF contents.

## Work Guidance

Keep the README's prompt, commands, and expected outcomes aligned with the article. Make a correction only in an isolated temporary copy during verification; leave the teaching example intact.

## Verification

Run `npm ci` and `npm run verify` with Node.js 24. The verifier must confirm exactly four passes and the uppercase-only failure, then five passes in its corrected temporary copy.

## Child DOX Index

No child AGENTS.md. This file owns the example and verification script.
