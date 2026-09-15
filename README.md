# Anton QA resources

Runnable examples and reader resources for [anton.qa](https://www.anton.qa).

- [Turn a browser task into a Playwright test](posts/browser-task-to-playwright-test/): record actions and verify saved state.
- [Keep the first failed Playwright attempt](posts/save-failed-playwright-test/): compare retry and retained-failure traces with local routing and clock examples.

Each project includes its own setup instructions and checks.
See [CONTRIBUTING.md](CONTRIBUTING.md) to add resources for another article.
Example code uses the MIT license. Agent Zero DOX has separate attribution in `docs/dox-LICENSE.txt`.

## Pull-request review

Robin reviews newly opened, reopened, and ready-for-review pull requests. Repository maintainers
can request another review by commenting `/robin` as the first line of a pull-request comment.
The workflow runs on GitHub-hosted runners and reads the `LLM_API_KEY`, `LLM_BASE_URL`, and
`LLM_MODEL` repository secrets. Configure those secrets in GitHub Actions settings; never add their
values to this repository.
