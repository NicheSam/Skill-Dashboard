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

## Non-goals For Now

- Static HTML export as the primary app model.
- Docker-first distribution.
- Replacing Codex Desktop pane behavior.
