# First agent testing task

Synthetic files for [Let's give an AI agent its first testing task](https://www.anton.qa/blog/posts/first-agent-task).

Use Node.js 24 (`node --version`). This project has no third-party dependencies, credentials, network requests, or external data. The helper checks filenames only. It does not inspect PDF contents or write files.

Run the intentionally broken starting example:

```sh
node --test pdf-filename.test.mjs
```

Expect five tests: four pass and only `accepts an uppercase PDF extension` fails. The command exits 1. The intended rule accepts `.pdf` regardless of letter case, but the unchanged helper rejects `report.PDF`.

To give an agent the exercise, copy `pdf-filename.mjs` into an empty scratch folder and ask:

> Read `pdf-filename.mjs`. Accept filenames whose final extension is `.pdf`, regardless of letter case. Reject other endings. Write `pdf-filename.test.mjs` with Node's built-in `node:test` runner. Test `invoice.pdf`, `report.PDF`, `notes.txt`, `report.pdf.exe`, and an empty name. Do not change `pdf-filename.mjs` or install packages. Run `node --test pdf-filename.test.mjs`. Report the command, pass and fail counts, and failing case. Stop after reporting the result.

Review the agent's test before accepting it. The included `pdf-filename.test.mjs` is a comparison file, not evidence of a live agent session. Inspect the failure before fixing the helper.

For a repeatable local verification of both stages:

```sh
npm ci
npm run verify
```

`npm ci` installs no packages. The verifier confirms the exact four-pass, one-fail result, then makes a temporary corrected copy and confirms all five pass. It removes that copy and leaves the published helper unchanged. The only intended file side effect is that temporary copy during verification. These checks prove the example's local behavior; they do not prove how an AI agent will perform the task.
