# Skill-Dashboard

Skill-Dashboard is a local dashboard for browsing Codex skills and MCP servers without manually opening every `SKILL.md`.

Skill-Dashboard 是一個本機管理台，用來瀏覽 Codex skills 與 MCP servers，不需要手動打開每個 `SKILL.md`。

## Fastest Codex Workflow

The intended low-friction workflow is to install the launcher skill once, then call Skill-Dashboard from Codex whenever you need it.

```bash
git clone https://github.com/NicheSam/Skill-Dashboard.git
cd Skill-Dashboard
npm install
npm run install:skill
```

After Codex reloads its skills, call:

```text
$skill-dashboard-launcher
```

Expected behavior:

1. Codex finds the local Skill-Dashboard project.
2. Codex runs `npm run launch`.
3. The launcher starts the local server when needed.
4. Codex opens `http://localhost:8765` in the in-app browser or web preview panel.

## 最快的 Codex 使用流程

建議的無阻力流程是先安裝一次啟動器 skill，之後需要管理台時直接在 Codex 呼叫。

```bash
git clone https://github.com/NicheSam/Skill-Dashboard.git
cd Skill-Dashboard
npm install
npm run install:skill
```

Codex 重新載入 skills 後，呼叫：

```text
$skill-dashboard-launcher
```

預期流程：

1. Codex 找到本機 Skill-Dashboard 專案。
2. Codex 執行 `npm run launch`。
3. 啟動器在需要時啟動本機 server。
4. Codex 在 in-app browser 或 web preview 面板打開 `http://localhost:8765`。

## What It Does

- Scans local Codex skills, MCP config, and plugin cache metadata.
- Shows compact skill and MCP lists with tag filtering.
- Copies skill invocation commands for pasting back into Codex.
- Opens the local skill folder or detected GitHub repository.
- Shows GitHub stars when a repository can be detected.
- Supports Traditional Chinese translation of skill summaries through Gemini or OpenAI, with local caching.
- Keeps API keys local under `data/local-settings.json`; keys are never returned to the frontend for display.

## 功能

- 掃描本機 Codex skills、MCP config 與 plugin cache metadata。
- 顯示精簡的 skill 與 MCP 清單，並支援標籤篩選。
- 複製 skill 呼叫指令，方便直接貼回 Codex 對話欄。
- 開啟本機 skill 資料夾或偵測到的 GitHub repo。
- 偵測到 GitHub repo 時顯示星數。
- 支援透過 Gemini 或 OpenAI 將 skill summary 翻譯成繁體中文，並寫入本機快取。
- API key 只存放在本機 `data/local-settings.json`，不會回傳到前端顯示。

## Install From GitHub

```bash
git clone https://github.com/<owner>/Skill-Dashboard.git
cd Skill-Dashboard
npm install
npm run dev
```

Open:

```text
http://localhost:8765
```

One-shot launcher:

```bash
npm run launch
```

`npm run launch` installs dependencies when needed, starts the dev server in the background if it is not already running, waits for the API and frontend, and prints the dashboard URL.

Install the Codex launcher skill:

```bash
npm run install:skill
```

## 從 GitHub 安裝

```bash
git clone https://github.com/<owner>/Skill-Dashboard.git
cd Skill-Dashboard
npm install
npm run dev
```

開啟：

```text
http://localhost:8765
```

一次性啟動：

```bash
npm run launch
```

`npm run launch` 會在需要時安裝 dependencies、在背景啟動 dev server、等待 API 與前端可連線，最後印出管理台網址。

安裝 Codex 啟動器 skill：

```bash
npm run install:skill
```

## Use With Codex Desktop

Skill-Dashboard cannot force Codex Desktop to open a three-pane layout. That layout is controlled by Codex Desktop itself. This project provides the local web app; the user opens it inside Codex Desktop's browser or preview pane.

Start the dashboard:

1. Open Codex Desktop.
2. Open or clone this repository as a workspace.
3. Run `npm install` once.
4. Run `npm run dev`.
5. Wait for the app URL: `http://localhost:8765`.

Open it as the right-side pane:

1. In Codex Desktop, open the in-app browser, web preview, or website preview panel.
2. Navigate to `http://localhost:8765`.
3. Keep the conversation in the center pane and the dashboard in the right pane.
4. If Codex only shows a website preview card in the chat, open that preview from the card, then keep it docked on the right.
5. The left sidebar remains Codex's thread list; Skill-Dashboard does not create or control that sidebar.

Daily use:

1. Ask Codex to run `npm run dev` in the Skill-Dashboard workspace.
2. Open or refresh `http://localhost:8765` in the right-side browser pane.
3. Use Skill-Dashboard to find a skill, copy its invocation command, and paste it into the Codex chat input.

## Codex Skill Launcher

This repository includes a launcher skill at:

```text
.codex/skills/skill-dashboard-launcher
```

Install it into your Codex skills folder if you want to call the dashboard from any Codex thread:

```bash
npm run install:skill
```

The installer copies the skill into `$CODEX_HOME/skills` or `~/.codex/skills`, and writes a local `config.json` so the skill can find this cloned project later.

After Codex reloads its skills, call:

```text
$skill-dashboard-launcher
```

Expected behavior:

1. Codex locates the Skill-Dashboard project.
2. Codex runs `npm run launch`.
3. The launcher starts the local server when needed.
4. Codex opens `http://localhost:8765` in the in-app browser or web preview panel.

## 在 Codex Desktop 中使用

Skill-Dashboard 不能強制 Codex Desktop 打開三分割畫面。三欄版面是 Codex Desktop 本身的介面能力；這個專案只負責提供本機網頁管理台，使用者需要在 Codex Desktop 的瀏覽器或預覽面板中打開它。

啟動管理台：

1. 打開 Codex Desktop。
2. 開啟或 clone 這個 repository 作為 workspace。
3. 第一次使用先執行 `npm install`。
4. 執行 `npm run dev`。
5. 等待 app URL：`http://localhost:8765`。

把它打開成右側視窗：

1. 在 Codex Desktop 中打開 in-app browser、web preview 或網站預覽面板。
2. 前往 `http://localhost:8765`。
3. 保持 Codex 對話在中間，Skill-Dashboard 在右側。
4. 如果 Codex 只在對話中顯示網站預覽卡片，從那張卡片打開預覽，並把預覽停靠在右側。
5. 左側仍然是 Codex 的 thread 清單；Skill-Dashboard 不會建立或控制左側欄。

日常使用方式：

1. 請 Codex 在 Skill-Dashboard workspace 執行 `npm run dev`。
2. 在右側瀏覽器面板打開或重新整理 `http://localhost:8765`。
3. 用 Skill-Dashboard 找 skill、複製呼叫指令，再貼回 Codex 對話欄。

## Codex Skill 啟動器

這個 repository 內建一個啟動器 skill：

```text
.codex/skills/skill-dashboard-launcher
```

如果要在任何 Codex thread 直接呼叫管理台，把它安裝到自己的 Codex skills 目錄：

```bash
npm run install:skill
```

安裝器會把 skill 複製到 `$CODEX_HOME/skills` 或 `~/.codex/skills`，並寫入本機 `config.json`，讓 skill 之後能找到這份 clone 下來的專案。

Codex 重新載入 skills 後，就可以呼叫：

```text
$skill-dashboard-launcher
```

預期流程：

1. Codex 找到 Skill-Dashboard 專案。
2. Codex 執行 `npm run launch`。
3. 啟動器在需要時啟動本機 server。
4. Codex 在 in-app browser 或 web preview 面板打開 `http://localhost:8765`。

## Requirements

- Node.js 20+
- npm
- Git, if installing from GitHub with `git clone`
- Codex Desktop, if using `$skill-dashboard-launcher` and the in-app browser workflow
- Codex local files under `~/.codex` by default
- Available local ports `8765` and `8766`
- Internet access during first install, because `npm install` downloads dependencies

## 需求

- Node.js 20+
- npm
- 如果透過 GitHub 安裝，需要 Git
- 如果要使用 `$skill-dashboard-launcher` 與 in-app browser 流程，需要 Codex Desktop
- 預設會讀取 `~/.codex` 底下的 Codex 本機資料
- 本機 port `8765` 與 `8766` 需要可用
- 第一次安裝需要網路，因為 `npm install` 會下載 dependencies

## Configuration

Environment variables:

- `CODEX_HOME`: override the default Codex home directory. Default: `~/.codex`
- `CODEX_CONFIG_PATH`: override the MCP config path. Default: `$CODEX_HOME/config.toml`
- `SKILL_DASHBOARD_SCAN_ROOTS`: semicolon-separated scan roots. Default: `$CODEX_HOME/skills`, `$CODEX_HOME/plugins/cache`, and `./.codex/skills`
- `SKILL_DASHBOARD_API_PORT`: API port. Default: `8766`
- `GITHUB_TOKEN`: optional token for GitHub API star lookups
- `GEMINI_API_KEY` or `GOOGLE_API_KEY`: optional Gemini translation key
- `OPENAI_API_KEY`: optional OpenAI translation key
- `SKILL_DASHBOARD_TRANSLATION_PROVIDER`: `gemini`, `openai`, or `none`
- `SKILL_DASHBOARD_TRANSLATION_MODEL`: translation model name

Windows example:

```powershell
$env:CODEX_HOME="C:\Users\you\.codex"
$env:GEMINI_API_KEY="AIza..."
$env:SKILL_DASHBOARD_TRANSLATION_PROVIDER="gemini"
npm run dev
```

macOS/Linux example:

```bash
CODEX_HOME="$HOME/.codex" GEMINI_API_KEY="AIza..." SKILL_DASHBOARD_TRANSLATION_PROVIDER="gemini" npm run dev
```

## 設定

可用環境變數：

- `CODEX_HOME`：覆寫 Codex home 目錄，預設 `~/.codex`
- `CODEX_CONFIG_PATH`：覆寫 MCP config 路徑，預設 `$CODEX_HOME/config.toml`
- `SKILL_DASHBOARD_SCAN_ROOTS`：以分號分隔的掃描根目錄，預設 `$CODEX_HOME/skills`、`$CODEX_HOME/plugins/cache`、`./.codex/skills`
- `SKILL_DASHBOARD_API_PORT`：API port，預設 `8766`
- `GITHUB_TOKEN`：選用，用於 GitHub 星數查詢
- `GEMINI_API_KEY` 或 `GOOGLE_API_KEY`：選用，Gemini 翻譯 key
- `OPENAI_API_KEY`：選用，OpenAI 翻譯 key
- `SKILL_DASHBOARD_TRANSLATION_PROVIDER`：`gemini`、`openai` 或 `none`
- `SKILL_DASHBOARD_TRANSLATION_MODEL`：翻譯模型名稱

Windows 範例：

```powershell
$env:CODEX_HOME="C:\Users\you\.codex"
$env:GEMINI_API_KEY="AIza..."
$env:SKILL_DASHBOARD_TRANSLATION_PROVIDER="gemini"
npm run dev
```

macOS/Linux 範例：

```bash
CODEX_HOME="$HOME/.codex" GEMINI_API_KEY="AIza..." SKILL_DASHBOARD_TRANSLATION_PROVIDER="gemini" npm run dev
```

## Data And Privacy

Skill-Dashboard reads local capability metadata and `SKILL.md` text to build the inventory. MCP secret values are not read; only environment variable names are listed.

Runtime data is stored under `data/` and ignored by git:

- `data/local-settings.json`: local API provider settings and saved API keys
- `data/translation-cache.json`: translated skill summaries
- `data/github-stars-cache.json`: GitHub star cache

## 資料與隱私

Skill-Dashboard 會讀取本機 capability metadata 與 `SKILL.md` 文字來建立清單。MCP secret value 不會被讀取，只會列出環境變數名稱。

執行時資料會存放在 `data/`，且已被 git ignore：

- `data/local-settings.json`：本機 API provider 設定與保存的 API keys
- `data/translation-cache.json`：skill summary 翻譯快取
- `data/github-stars-cache.json`：GitHub 星數快取

## Verification

```bash
npm run build
npm run verify:mvp
```

## 驗證

```bash
npm run build
npm run verify:mvp
```

## Current Limits

- GitHub repository detection is heuristic.
- Local folder opening depends on `explorer.exe`, `open`, or `xdg-open`.
- The app cannot control Codex Desktop pane layout.
- Translation requires a Gemini or OpenAI API key.

## 目前限制

- GitHub repo 偵測是 heuristic。
- 開啟本機資料夾依賴 `explorer.exe`、`open` 或 `xdg-open`。
- 本專案不能控制 Codex Desktop 的分割畫面版面。
- 翻譯需要 Gemini 或 OpenAI API key。
