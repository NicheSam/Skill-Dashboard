---
name: skill-dashboard
description: Launch and use Skill-Dashboard, a local Codex capability dashboard for browsing installed skills and MCP servers, filtering skills by tags and official status, copying skill invocation commands, and opening the dashboard at localhost:8765 from Codex Desktop.
---

# Skill-Dashboard

Use this skill when the user wants to inspect, filter, or diagnose local Codex capabilities such as Skills and MCP servers.

## Core Rule

Do not load every local capability file into context. Start with dashboard metadata and only read the selected capability files when the current task needs them.

## Startup

From the project root:

```bash
npm install
npm run launch
```

Open:

```text
http://localhost:8765
```

## Workflow

Use the dashboard to:

- rescan local capabilities
- filter by type, tag, official status, and GitHub priority
- expand a capability to review details and Chinese usage scenarios
- copy the invocation command for pasting back into Codex
- open the local capability folder or detected GitHub project page
- install `.codex/skills/skill-dashboard-launcher` with `npm run install:skill` for one-command startup from Codex

Read matching `SKILL.md` files only when the current task actually needs their full instructions.
