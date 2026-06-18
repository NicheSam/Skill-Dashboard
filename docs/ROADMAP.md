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

## v0.4 Launcher Stability Plan

Goal: make `$skill-dashboard-launcher` more reliable without changing it during v0.2/v0.3 work.

Planned, not implemented yet:

- Replace ad hoc background process behavior with explicit process ownership.
- Detect stale or half-running frontend/API processes before launch.
- Handle occupied ports with clear remediation or fallback.
- Improve health checks so `ready` is printed only after both services remain reachable.
- Make installed launcher config repairable when the project folder moves.
- Document Codex Desktop pane limitations without implying the launcher controls layout.

## Non-goals For Now

- Static HTML export as the primary app model.
- Docker-first distribution.
- Replacing Codex Desktop pane behavior.
