# Turn a browser task into a Playwright test

Practice app for [the anton.qa article](https://www.anton.qa/blog/posts/browser-task-to-playwright-test).
Record a Save action, then check that the new name survives a reload.

## Setup

Use Node.js 24 LTS and npm. Node.js 22.18 or newer also supports this example.
Dependencies are pinned to preserve the article's behavior.

```bash
git clone https://github.com/antongulin/anton-qa-resources.git
cd anton-qa-resources/posts/browser-task-to-playwright-test
npm ci
npx playwright install chromium
npm run serve
```

Open http://127.0.0.1:4187. Change Alex to Sam and select Save.
Reload the page. Sam should remain.
Stop the server with Ctrl+C before running automated tests.
On Linux, use `npx playwright install --with-deps chromium` if browser libraries are missing.

## Record actions

Keep the app running. In a second terminal, enter the same project folder:

```bash
npx playwright-cli open http://127.0.0.1:4187 --headed
npx playwright-cli recording-start
```

Edit the name and select Save in the browser. Then run:

```bash
npx playwright-cli recording-stop
npx playwright-cli close
```

The recording supplies actions. Read `tests/save.spec.ts` for the authored reload assertion.

## Run the test

Stop the manually started server first. Playwright starts its own server.

```bash
npm test
npm run verify
```

`npm test` passes against the corrected app.
`npm run verify` checks both variants and exits successfully only when both behave as expected.
The corrected app passes. The broken app fails because it reads Alex instead of Sam.

To see that deliberate failure directly on macOS or Linux:

```bash
APP_BROKEN=1 npm test
```

That command must exit with status 1. It is a teaching example, not a passing test command.
On PowerShell, set `$env:APP_BROKEN="1"` before testing and remove it afterward.

## What the example proves

The broken app at http://127.0.0.1:4187/?broken=1 displays Saved without persisting the change.
A status-message check alone misses that defect. The reload assertion catches it.

All names and data are synthetic. Data stays in browser localStorage on your machine.
The app listens only on localhost and requires no credentials or external services.
It is a small teaching app, not production authentication, storage, or accessibility guidance.
Browser downloads and package installation require internet access.

