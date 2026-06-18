# Skill-Dashboard Roadmap

## Status

- `main` and `v0.1.0`: stable archive.
- `v0.2-dev`: current development branch.

## v0.2 UI Productization

Goal: make Skill-Dashboard feel like a Codex-side capability index, not a marketing dashboard.

Scope:

- Compact top command area.
- Denser skill and MCP rows.
- Fixed row actions for copy, local folder, and GitHub.
- Detail inspector that avoids large nested cards.
- Translation API settings collapsed by default.
- Clearer wording that translation APIs are optional and only affect Chinese summaries.

## v0.3 Scanner Reliability

Goal: reduce fragile handwritten parsing.

Scope:

- Use `gray-matter` for skill frontmatter.
- Use `smol-toml` for MCP config parsing.
- Preserve support for folded YAML descriptions such as `description: >-`.
- Preserve support for MCP env key detection without reading secret values.
- Keep GitHub link detection heuristic for now, but isolate future improvements.

## v0.4 Launcher Stability

Goal: make `$skill-dashboard-launcher` more reliable without changing Codex Desktop pane behavior.

Implemented:

- Record launcher-owned server and client pids in `.logs/launcher-state.json`.
- Detect stale pid state before launch.
- Detect half-running states and start only the missing server or client.
- Detect occupied ports that do not look like Skill-Dashboard.
- Print `ready` only after both the API health endpoint and frontend title check pass.
- Keep Codex Desktop pane placement documented as a user-controlled UI behavior.

Deferred:

- Automatic project-path repair when the installed skill config points to a moved folder.
- Automatic port fallback.
- Killing or replacing unknown processes on occupied ports.

## v0.5 GitHub Link Detection

Goal: make GitHub links reliable without making users understand scanner internals.

Implemented:

- Prefer user-saved GitHub links when a user manually connects a capability.
- Detect GitHub repositories from git remotes, preferring `origin` before `upstream`.
- Detect GitHub repositories from nearby `package.json` `repository` and `homepage` fields.
- Use explicit `SKILL.md` or nearby README links only when the result is unambiguous.
- Keep ambiguous README links as candidates instead of auto-binding the wrong repository.
- Store local manual mappings in `data/github-links.json`.
- Add API endpoints to save, remove, and inspect GitHub link candidates.

Non-goals:

- Automatic GitHub search binding.
- GitHub OAuth.
- Requiring a GitHub token for repository link detection.

## Non-goals For Now

- Static HTML export as the primary app model.
- Docker-first distribution.
- Replacing Codex Desktop pane behavior.
