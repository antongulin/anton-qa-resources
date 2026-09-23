# Anton QA resources

Public reader materials for anton.qa articles. Read [CONTRIBUTING.md](CONTRIBUTING.md) before adding a project.

- Keep each project independently runnable under `posts/<canonical-slug>/`.
- Preserve public folder links. Do not rename a published slug without a compatibility path.
- Publish curated synthetic examples only. Never copy private repository history, plans, receipts, credentials, or personal data.
- Executable changes require a `codex/` branch, pull request, review, and successful checks before merge.
- Use GitHub-hosted runners for this public repository. No private infrastructure is required.
- Pin tutorial dependencies for reproducible article behavior; review pins when updating the article or dependency support changes.

## CodeGraph

Local code intelligence for the TypeScript and JavaScript sources under `posts/`. It indexes code
symbols only — Markdown prose, README files, and lockfiles are not indexed as symbols.

- Provenance: `codegraph` is a globally installed user tool, not a repository dependency. Nothing
  in this repo installs, vendors, or builds it. Confirm it is on `PATH` (`codegraph --version`)
  before relying on it; a missing binary is an environment issue, not a repo defect.
- Build or refresh the index from the repository root:
  `CODEGRAPH_TELEMETRY=0 codegraph init`, or `CODEGRAPH_TELEMETRY=0 codegraph sync` after edits.
- Index and daemon state live in `.codegraph/`, which is git-ignored. Never commit it.
- Project-local MCP wiring is committed for Codex (`.codex/config.toml`), Claude-compatible clients
  (`.mcp.json`), Cursor (`.cursor/mcp.json`), VS Code (`.vscode/mcp.json`), and OpenCode
  (`opencode.jsonc`). Each entry runs `codegraph serve --mcp` with `CODEGRAPH_TELEMETRY=0`.
- Prefer CodeGraph queries (`codegraph query`, `codegraph explore`, `codegraph node`) when tracing
  symbols in the `posts/` projects; fall back to ordinary search for Markdown and prose.
- Committing these configs wires the server, but each client still needs a one-time local approval
  of the project MCP server before its tools appear.

<!-- DOX source: agent0ai/dox@765ae4ac02cc884eefcd41a3d0f71941721adb89; MIT license: docs/dox-LICENSE.txt -->
# DOX framework

- DOX is highly performant AGENTS.md hierarchy installed here
- Agent must follow DOX instructions across any edits

## Core Contract

- AGENTS.md files are binding work contracts for their subtrees
- Work products, source materials, instructions, records, assets, and durable docs must stay understandable from the nearest applicable AGENTS.md plus every parent AGENTS.md above it

## Read Before Editing

1. Read the root AGENTS.md
2. Identify every file or folder you expect to touch
3. Walk from the repository root to each target path
4. Read every AGENTS.md found along each route
5. If a parent AGENTS.md lists a child AGENTS.md whose scope contains the path, read that child and continue from there
6. Use the nearest AGENTS.md as the local contract and parent docs for repo-wide rules
7. If docs conflict, the closer doc controls local work details, but no child doc may weaken DOX

Do not rely on memory. Re-read the applicable DOX chain in the current session before editing.

## Update After Editing

Every meaningful change requires a DOX pass before the task is done.

Update the closest owning AGENTS.md when a change affects:

- purpose, scope, ownership, or responsibilities
- durable structure, contracts, workflows, or operating rules
- required inputs, outputs, permissions, constraints, side effects, or artifacts
- user preferences about behavior, communication, process, organization, or quality
- AGENTS.md creation, deletion, move, rename, or index contents

Update parent docs when parent-level structure, ownership, workflow, or child index changes. Update child docs when parent changes alter local rules. Remove stale or contradictory text immediately. Small edits that do not change behavior or contracts may leave docs unchanged, but the DOX pass still must happen.

## Hierarchy

- Root AGENTS.md is the DOX rail: project-wide instructions, global preferences, durable workflow rules, and the top-level Child DOX Index
- Child AGENTS.md files own domain-specific instructions and their own Child DOX Index
- Each parent explains what its direct children cover and what stays owned by the parent
- The closer a doc is to the work, the more specific and practical it must be

## Child Doc Shape

- Create a child AGENTS.md when a folder becomes a durable boundary with its own purpose, rules, responsibilities, workflow, materials, or quality standards
- Work Guidance must reflect the current standards of the project or user instructions; if there are no specific standards or instructions yet, leave it empty
- Verification must reflect an existing check; if no verification framework exists yet, leave it empty and update it when one exists

Default section order:
- Purpose
- Ownership
- Local Contracts
- Work Guidance
- Verification
- Child DOX Index

## Style

- Keep docs concise, current, and operational
- Document stable contracts, not diary entries
- Put broad rules in parent docs and concrete details in child docs
- Prefer direct bullets with explicit names
- Do not duplicate rules across many files unless each scope needs a local version
- Delete stale notes instead of explaining history
- Trim obvious statements, repeated rules, misplaced detail, and warnings for risks that no longer exist

## Closeout

1. Re-check changed paths against the DOX chain
2. Update nearest owning docs and any affected parents or children
3. Refresh every affected Child DOX Index
4. Remove stale or contradictory text
5. Run existing verification when relevant
6. Report any docs intentionally left unchanged and why

## User Preferences

When the user requests a durable behavior change, record it here or in the relevant child AGENTS.md

## Child DOX Index

- [posts/AGENTS.md](posts/AGENTS.md) owns shared project requirements and the post index.
- Root-owned: `.github/workflows/validate.yml` validates all projects;
  `.github/workflows/robin.yml` requests Robin reviews for pull requests and reads its three
  GitHub Actions secrets; `docs/dox-LICENSE.txt` preserves upstream attribution;
  `.codex/config.toml`, `.mcp.json`, `.cursor/mcp.json`, `.vscode/mcp.json`, and `opencode.jsonc`
  declare the project-local CodeGraph MCP server; `.gitignore` excludes local `.codegraph/` state.
