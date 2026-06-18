---
name: skill-dashboard-launcher
description: Launch and open the local Skill-Dashboard app from Codex. Use when the user asks to open Skill-Dashboard, bring back the dashboard window, start the local skill dashboard, open localhost:8765, or use Skill-Dashboard inside Codex Desktop.
---

# Skill-Dashboard Launcher

Use this skill to start the Skill-Dashboard dev server and open the dashboard URL inside Codex Desktop.

## Workflow

1. Locate the Skill-Dashboard project root.
   - First inspect `config.json` next to this `SKILL.md` if it exists. If `projectRoot` points to a folder whose `package.json` has `"name": "skill-dashboard"`, use that path.
   - Prefer the current workspace if its `package.json` has `"name": "skill-dashboard"`.
   - Otherwise use `SKILL_DASHBOARD_HOME` if the environment variable is set.
   - If neither works, search likely user workspaces for a folder named `Skill-Dashboard` that contains `package.json`.
   - Ask the user for the project path only if the root cannot be found safely.
2. From the project root, run:

```bash
npm run launch
```

3. Wait until the command prints:

```text
Skill-Dashboard is ready: http://localhost:8765
```

4. Open `http://localhost:8765` in the Codex in-app browser or web preview panel.
5. Tell the user whether the dashboard was opened, and include the URL.

## Rules

- Use `npm run launch` for normal startup. It checks dependencies, starts the dev server in the background when needed, and waits for both the frontend and API server.
- Treat `Skill-Dashboard is already ready: http://localhost:8765` as a successful launch.
- Do not use interactive `npm run dev` when the goal is to open the dashboard and continue the conversation.
- If `npm run launch` reports stale launcher state, continue after the command completes; it will restart missing services.
- If `npm run launch` reports a port conflict, do not kill unknown processes automatically. Tell the user which port is occupied and inspect `.logs/server.err.log` or `.logs/client.err.log` only if the message suggests it may be from Skill-Dashboard.
- If `npm run launch` times out, inspect `.logs/launcher-state.json`, `.logs/server.err.log`, and `.logs/client.err.log` in the project root before guessing.
- Do not claim the skill controls Codex Desktop's pane layout. It opens the local dashboard URL; docking and pane placement are controlled by Codex Desktop.
