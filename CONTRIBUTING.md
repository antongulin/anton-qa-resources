# Contributing

Use `posts/<canonical-blog-slug>/` for resources supporting an anton.qa article.
Posts without downloadable materials need no project folder.

Each project needs its own README, AGENTS.md, dependency lockfile, and runnable checks.
The README must link to the canonical article and explain prerequisites, setup, commands, expected results, and limits.
Use synthetic data. Review every file for credentials, local paths, private references, and generated artifacts.
Keep internal plans, analytics, raw receipts, and publication records outside this public repository.

Add the project to the root README, the posts AGENTS.md index, and the validation matrix.
Use a branch and pull request for executable changes. Review the changes and pass checks before merging.
After merge, clone the public repository without authentication and run the documented verification.
Only then share the direct project folder URL in articles and syndications.
Record the tested commit in the private publication record. Public links may follow main for fixes.

Keep project rules in the closest AGENTS.md. Update parent indexes when adding or moving projects.
DOX comes from [Agent Zero](https://github.com/agent0ai/dox/tree/765ae4ac02cc884eefcd41a3d0f71941721adb89).
Its separate license is in [docs/dox-LICENSE.txt](docs/dox-LICENSE.txt).

