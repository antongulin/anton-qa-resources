# Parallel Playwright tests and account data

Two tests pass alone. Run them in parallel against one server account, and the reader sees the
writer's saved change. Give them separate accounts, and both pass with the same test bodies.

Planned canonical article: [Parallel Playwright account data](https://www.anton.qa/blog/posts/parallel-playwright-account-data).
The article may not be published yet.

## Run it

Use **Node 26.13.0** and npm. This project pins **Playwright 1.64.1** and uses Chromium.
From this directory:

```sh
npm ci
npx playwright install chromium
npm run test:guards
```

On Linux, use `npx playwright install --with-deps chromium` to install the required system libraries.
The installer needs network access and may need permission to install system packages.
The demonstration itself uses localhost only.

Run these commands separately so you can inspect each exit status:

```sh
npm run demo -- writer-alone
npm run demo -- reader-alone
npm run demo -- shared
npm run demo -- separate
```

| Scenario | Writer account | Reader account | Result | Exit |
| --- | --- | --- | --- | --- |
| `writer-alone` | `demo-shared` | absent | Writer saves `Off` and reads it after reload | 0 |
| `reader-alone` | absent | `demo-shared` | Reader reloads and still reads `On` | 0 |
| `shared` | `demo-shared` | `demo-shared` | Writer passes; reader expects `On`, receives `Off` | 1 |
| `separate` | `demo-writer` | `demo-reader` | Writer reads `Off`; reader reads `On`; both pass | 0 |

The shared command's exit 1 is intentional. The reader makes a normal equality assertion against
the actual value after reload. There is no `test.fail()` annotation or forced demonstration error.
An invalid result or setup problem makes the runner exit 2 and retain its diagnostic evidence.

Then run the aggregate check:

```sh
npm run verify
```

It runs the classifier/lifecycle guards, both single-test controls, the shared pair, the separate
pair, and one additional shared/separate pair. It exits 0 only after checking eight passing tests
and two reader failures with the specific `On`/`Off` reason. The repeat checks fresh-state cleanup
and reproducibility; it does not estimate a natural failure rate.

## What the tests share

Each test gets Playwright's managed `page` and browser context. A synthetic `demo-account` cookie
selects a server account. Matching cookie values do not combine those contexts. Each test writes
its role to the same localStorage key, `context-probe`, and checks its own value after the save.

The Node server owns the **Email alerts** setting. Save sends a real same-origin HTTP request.
Reload renders the value from the server map with caching disabled. The setting survives requests
and page reloads within that server instance. It does not persist to disk or survive a new scenario.
The cookie is a fixture selector, not production authentication, and no email is sent.

The paired runs use `fullyParallel: true`, two workers, one Chromium project, and zero retries.
Only account assignment changes between `shared` and `separate`. Both run these steps:

1. The reader loads `On`, marks its own storage, and announces readiness.
2. The writer waits for that boundary, saves `Off` through the UI, reloads, and verifies `Off`.
3. The writer releases the saved boundary. The reader reloads and asserts that its account still
   has `On`.

Fixture-only `/__demo/*` latches arrange that possible interleaving without sleeps. They release
requests and record sequence numbers; they do not change settings. A single-test run releases the
absent peer's boundary immediately. Both contexts stay open across the writer's save and reload.

## Evidence and cleanup

Each command prints a unique ignored `artifacts/<scenario>-…/` directory. It contains the raw
Playwright `report.json`, `events.json`, `process.json`, `observations.json` on a classified run,
`cleanup.json`, child output, and retained failure traces under `test-results/`. A failed
classification also retains `verification-error.txt`. Aggregate runs save a separate summary.

The classifier checks exact test identities, one attempt per test, two distinct worker slots for
pairs, zero skips/retries/global errors, actual account values, separate storage probes, and the
readiness → save → writer reload → reader reload event order. A timeout, missing browser, unrelated
failure, malformed report, or unexpected shared pass cannot count as the demonstrated failure.

The runner starts its own server on `127.0.0.1` with a dynamic port and invokes the installed local
Playwright CLI asynchronously. It closes the child, pending latches, server, and sockets before
starting the next scenario. Reports remain available. Coordination waits have a 10-second bound;
tests have 30 seconds; scenario termination starts at 87 seconds with three seconds for child
shutdown. These bounds detect stalls and do not arrange test ordering. SIGINT/SIGTERM use the
cleanup path; SIGKILL or a machine failure cannot guarantee cleanup. Context-reuse and remote
browser environment overrides are rejected.

## Apply the lesson

[Playwright's authentication guide](https://playwright.dev/docs/auth) describes shared accounts for
tests that do not interfere with each other's server state. Tests that change shared state need
suitable account/data isolation and reset. An account per parallel worker is one pattern. This
two-role fixture demonstrates the conflict and the account boundary; it is not a production
worker-account allocator or a claim that shared login always fails.
