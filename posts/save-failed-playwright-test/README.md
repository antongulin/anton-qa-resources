# Keep the first failed Playwright attempt

Runnable material for the forthcoming [anton.qa article](https://www.anton.qa/blog/posts/save-failed-playwright-test). It shows why `on-first-retry` and `retain-on-failure` answer different debugging questions.

The same checkout test fails on attempt 0 and passes on retry 1. The failure is deliberately injected from `testInfo.retry`, so it never depends on shared state, a delay, or randomness.

## Setup

Use Node.js 24 LTS and npm. Node.js 22.18 or newer also supports this project. Dependencies are pinned, including `@playwright/test` 1.63.0, to preserve the tutorial behavior.
The test design follows Playwright’s [trace mode documentation](https://playwright.dev/docs/test-use-options#trace) and [Clock API documentation](https://playwright.dev/docs/clock).

```bash
git clone https://github.com/antongulin/anton-qa-resources.git
cd anton-qa-resources/posts/save-failed-playwright-test
npm ci
npx playwright install chromium
```

On Linux, use `npx playwright install --with-deps chromium` when Chromium libraries are missing.

## Run and inspect the traces

```bash
npm test
npm run verify
```

The core test is intentionally reported as **flaky**. Each trace project has a failed attempt 0 and a passing retry 1. The command succeeds only after the verifier checks that relationship and reads the actual trace archive contents.

After `npm run verify`, inspect the generated artifacts:

```bash
npm run show-report
npx playwright show-trace test-results/*on-first-retry-retry1/trace.zip
npx playwright show-trace test-results/*retain-on-failure/trace.zip
```

Open `artifacts/verification-report.json` in an editor for the verifier's exact archive members, response resource names, response bodies, and retry numbers.

`on-first-retry` keeps the retry-1 archive. Its network stream and response resource show the synthetic `200` response, `Saved on retry by synthetic fixture`.

`retain-on-failure` keeps the original attempt-0 archive. Its network stream and response resource show the synthetic `503` response, `Injected first-attempt save failure`; its `test.trace` also contains the original failed expectation.

The verifier finds attachments from Playwright’s JSON report and then reads the archive streams and named response resources. It does not decide the attempt from a filename alone.

## Two companion checks

The same project contains two compact examples for related lessons:

- `route.fulfill` displays a synthetic payment error while the local fixture receives zero payment requests. `route.fetch` first makes one local request, then returns the same synthetic error screen, so the fixture records exactly one request.
- The browser clock is installed before navigation and page time APIs, then paused at a known time. The test explicitly starts the local timeout and advances to 299999ms and 300000ms. The screen remains signed in before the boundary and becomes timed out at it.

## Limits and local side effects

Every page, request, and response is synthetic and served only at `127.0.0.1:4191`. The payment example has no card data, payment provider, account, or charge. Its request count proves only this local fixture’s routing behavior.

The clock check controls browser JavaScript time. It does not prove a server session expires after five minutes, and it does not measure wall-clock time.

`test-results/`, `playwright-report/`, and `artifacts/` are generated locally and ignored by Git. Stop a manually started `npm run serve` with Ctrl+C before running the automated commands. The Playwright web server starts and stops its own localhost fixture; it never reuses an existing server.
