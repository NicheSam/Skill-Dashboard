import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Copy,
  FolderOpen,
  Github,
  Languages,
  Layers3,
  RefreshCw,
  Search,
  Server,
  ShieldAlert,
  Star,
  Sparkles
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { Capability, CapabilityType, InventoryResponse, RiskBadge, ScanMeta, TranslationProvider, TranslationSettingsResponse } from "../shared/schema";

type Locale = "zh" | "en";
type TabKey = "overview" | "skill" | "mcp";
type TranslationForm = { provider: TranslationProvider; model: string; apiKey: string };
type TranslationEstimate = {
  apiEnabled: boolean;
  provider: TranslationProvider;
  model: string;
  pendingCount: number;
  cachedCount: number;
  skillCount: number;
  estimatedInputTokens: number;
  estimatedOutputTokens: number;
  estimatedCostUsd: number | null;
  rateNote: string;
};

const copyLabels = {
  zh: "複製呼叫",
  en: "Copy command"
};

const text = {
  zh: {
    brandMeta: "本機能力管理台",
    overview: "總覽",
    skills: "技能",
    mcp: "MCP",
    plugins: "插件",
    kicker: "本機能力索引",
    title: "為這次任務選擇 Codex 能力",
    subtitle: "掃描本機已載入的技能、MCP 與外掛。選取能力後複製呼叫指令，直接貼回 Codex 對話欄。",
    indexed: "已索引",
    visible: "本次可見",
    risks: "需確認",
    search: "搜尋名稱、描述或標籤",
    refresh: "重新掃描",
    refreshing: "掃描中",
    language: "English",
    results: "筆結果",
    copied: "已複製",
    copyFailed: "複製失敗，請手動複製呼叫指令。",
    detailEmpty: "選取一項能力後查看詳細資訊。",
    tagFilter: "標籤篩選",
    allTags: "全部",
    noTags: "尚未建立可篩選標籤",
    githubPriority: "GitHub 優先",
    defaultSort: "預設排序",
    starsUnknown: "星數未知",
    official: "官方",
    showOfficial: "顯示官方",
    hideOfficial: "隱藏官方",
    openFolder: "開啟本機資料夾",
    githubPage: "GitHub 專案頁",
    githubUnavailable: "未偵測到 GitHub 連結",
    linkGithub: "\u9023\u7d50 GitHub",
    changeGithub: "\u8b8a\u66f4 GitHub",
    removeGithub: "\u79fb\u9664 GitHub",
    githubUrlPlaceholder: "\u8cbc\u4e0a GitHub repo URL",
    githubSource: "\u4f86\u6e90",
    githubSaved: "\u5df2\u5132\u5b58 GitHub \u9023\u7d50\u3002",
    githubRemoved: "\u5df2\u79fb\u9664 GitHub \u9023\u7d50\u3002",
    githubInvalid: "GitHub URL \u683c\u5f0f\u4e0d\u6b63\u78ba\u3002",
    githubCandidates: "\u53ef\u80fd\u7684 GitHub",
    openFailed: "無法開啟本機資料夾。",
    status: "狀態",
    invocation: "呼叫指令",
    sourcePath: "來源路徑",
    tokenEstimate: "估算 token",
    riskTitle: "需確認項目",
    riskHelp: "這是掃描器的提示，不代表漏洞。它只表示能力描述提到命令、環境變數、網路或同名項目，使用前建議看一下來源。",
    noRisk: "目前沒有需確認項目。",
    overviewTitle: "管理台總覽",
    overviewSubtitle: "這裡用來確認掃描範圍、資料狀態與需人工確認的項目，不再作為獨立診斷頁。",
    scannedAt: "最後掃描",
    scanRoots: "掃描路徑",
    scanErrors: "掃描問題",
    noErrors: "目前沒有掃描錯誤。",
    duplicateNames: "同名項目",
    brokenEntries: "異常項目",
    apiError: "API 尚未連線。請在專案根目錄執行 npm run dev。",
    source: "來源",
    type: "類型",
    scenarios: "使用場景"
  },
  en: {
    brandMeta: "Local capability dashboard",
    overview: "Overview",
    skills: "Skills",
    mcp: "MCP",
    plugins: "Plugins",
    kicker: "Local capability index",
    title: "Choose Codex capabilities for this task",
    subtitle: "Scan local skills, MCP servers, and plugins. Select one capability, copy its command, then paste it into Codex.",
    indexed: "Indexed",
    visible: "Visible",
    risks: "Review flags",
    search: "Search name, description, or tag",
    refresh: "Rescan",
    refreshing: "Scanning",
    language: "中文",
    results: "results",
    copied: "Copied",
    copyFailed: "Copy failed. Copy the invocation manually.",
    detailEmpty: "Select a capability to inspect details.",
    tagFilter: "Tag filter",
    allTags: "All",
    noTags: "No filterable tags yet",
    githubPriority: "GitHub priority",
    defaultSort: "Default sort",
    starsUnknown: "Stars unavailable",
    official: "Official",
    showOfficial: "Show official",
    hideOfficial: "Hide official",
    openFolder: "Open local folder",
    githubPage: "GitHub project",
    githubUnavailable: "No GitHub link detected",
    linkGithub: "Link GitHub",
    changeGithub: "Change GitHub",
    removeGithub: "Remove GitHub",
    githubUrlPlaceholder: "Paste GitHub repo URL",
    githubSource: "Source",
    githubSaved: "GitHub link saved.",
    githubRemoved: "GitHub link removed.",
    githubInvalid: "Invalid GitHub URL.",
    githubCandidates: "Possible GitHub links",
    openFailed: "Unable to open local folder.",
    status: "Status",
    invocation: "Invocation",
    sourcePath: "Source path",
    tokenEstimate: "Token estimate",
    riskTitle: "Review flags",
    riskHelp: "These are scanner hints, not confirmed vulnerabilities. They mean the capability text mentions commands, environment variables, network access, or duplicate names.",
    noRisk: "No review flags found.",
    overviewTitle: "Dashboard overview",
    overviewSubtitle: "Use this view to check scan scope, inventory health, and items that may need manual review.",
    scannedAt: "Last scan",
    scanRoots: "Scan roots",
    scanErrors: "Scan issues",
    noErrors: "No scan errors.",
    duplicateNames: "Duplicate names",
    brokenEntries: "Broken entries",
    apiError: "API unavailable. Run npm run dev from the project root.",
    source: "Source",
    type: "Type",
    scenarios: "Usage scenarios"
  }
};

const tabs: Array<{ key: TabKey; labelKey: "overview" | "skills" | "mcp"; icon: typeof Sparkles }> = [
  { key: "overview", labelKey: "overview", icon: Activity },
  { key: "skill", labelKey: "skills", icon: Sparkles },
  { key: "mcp", labelKey: "mcp", icon: Server }
];

const typeLabels: Record<Locale, Record<CapabilityType, string>> = {
  zh: { skill: "技能", mcp: "MCP", plugin: "插件", agent: "代理" },
  en: { skill: "Skill", mcp: "MCP", plugin: "Plugin", agent: "Agent" }
};

const statusLabels: Record<Locale, Record<Capability["status"], string>> = {
  zh: { installed: "已安裝", enabled: "已啟用", visible: "本次可見", callable: "可呼叫", broken: "異常" },
  en: { installed: "Installed", enabled: "Enabled", visible: "Visible", callable: "Callable", broken: "Broken" }
};

export function App() {
  const [locale, setLocale] = useState<Locale>("zh");
  const [inventory, setInventory] = useState<InventoryResponse | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>("overview");
  const [query, setQuery] = useState("");
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [githubPriority, setGithubPriority] = useState(true);
  const [showOfficial, setShowOfficial] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [copyState, setCopyState] = useState<Record<string, string>>({});
  const [githubEditId, setGithubEditId] = useState<string | null>(null);
  const [githubInput, setGithubInput] = useState("");
  const [githubState, setGithubState] = useState("");
  const [translationSettings, setTranslationSettings] = useState<TranslationSettingsResponse | null>(null);
  const [translationForm, setTranslationForm] = useState<TranslationForm>({ provider: "gemini", model: "gemini-3.1-flash-lite-preview", apiKey: "" });
  const [apiKeyMode, setApiKeyMode] = useState<"closed" | "editing">("closed");
  const [apiPanelOpen, setApiPanelOpen] = useState(false);
  const [settingsState, setSettingsState] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const t = text[locale];

  async function loadInventory(mode: "load" | "scan" = "load") {
    setIsScanning(mode === "scan");
    setError(null);
    try {
      const response = await fetch(mode === "scan" ? "/api/scan" : "/api/inventory", { method: mode === "scan" ? "POST" : "GET" });
      const next = (await response.json()) as InventoryResponse;
      setInventory(next);
      setSelectedId((current) => current && next.capabilities.some((capability) => capability.id === current) ? current : null);
    } catch {
      setError(t.apiError);
    } finally {
      setIsScanning(false);
    }
  }

  useEffect(() => {
    void loadInventory();
    void loadTranslationSettings();
    // Initial load should run once. Locale changes update visible labels without refetching.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadTranslationSettings() {
    try {
      const response = await fetch("/api/settings/translation");
      const settings = (await response.json()) as TranslationSettingsResponse;
      setTranslationSettings(settings);
      setTranslationForm({
        provider: settings.provider === "none" ? "gemini" : settings.provider,
        model: settings.model || (settings.provider === "openai" ? "gpt-4.1-mini" : "gemini-3.1-flash-lite-preview"),
        apiKey: ""
      });
      setApiKeyMode("closed");
    } catch {
      setSettingsState("settings-load-failed");
    }
  }

  async function saveTranslationSettings() {
    setSettingsState("saving");
    try {
      const response = await fetch("/api/settings/translation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(translationForm)
      });
      if (!response.ok) throw new Error("settings failed");
      const settings = (await response.json()) as TranslationSettingsResponse;
      setTranslationSettings(settings);
      setTranslationForm((current) => ({ ...current, apiKey: "" }));
      setApiKeyMode("closed");
      setSettingsState("saved");
    } catch {
      setSettingsState("save-failed");
    }
  }

  async function removeTranslationKey() {
    setSettingsState("saving");
    try {
      const response = await fetch("/api/settings/translation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: translationForm.provider, model: translationForm.model, removeApiKey: true })
      });
      if (!response.ok) throw new Error("remove failed");
      const settings = (await response.json()) as TranslationSettingsResponse;
      setTranslationSettings(settings);
      setTranslationForm((current) => ({ ...current, apiKey: "" }));
      setApiKeyMode("closed");
      setSettingsState("removed");
    } catch {
      setSettingsState("save-failed");
    }
  }

  const capabilities = inventory?.capabilities ?? [];
  const stats = useMemo(() => {
    const duplicateNames = capabilities.length - new Set(capabilities.map((capability) => `${capability.type}:${capability.name}`)).size;
    return {
      indexed: capabilities.length,
      visible: capabilities.filter((capability) => capability.status === "visible").length,
      risky: capabilities.filter((capability) => capability.risks.length > 0).length,
      broken: capabilities.filter((capability) => capability.status === "broken").length,
      duplicateNames,
      tokens: capabilities.reduce((sum, capability) => sum + capability.tokenEstimate, 0),
      skills: capabilities.filter((capability) => capability.type === "skill").length,
      mcp: capabilities.filter((capability) => capability.type === "mcp").length,
      plugins: capabilities.filter((capability) => capability.type === "plugin").length
    };
  }, [capabilities]);

  const tagOptions = useMemo(() => {
    if (activeTab === "overview") return [];
    const counts = new Map<string, number>();
    for (const capability of capabilities) {
      if (capability.type !== activeTab) continue;
      for (const tag of capability.tags) {
        counts.set(tag, (counts.get(tag) ?? 0) + 1);
      }
    }
    return Array.from(counts.entries())
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
  }, [activeTab, capabilities]);

  useEffect(() => {
    if (activeTag && !tagOptions.some((option) => option.tag === activeTag)) {
      setActiveTag(null);
    }
  }, [activeTag, tagOptions]);

  const visibleCapabilities = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const filtered = capabilities.filter((capability) => {
      const matchesTab = activeTab === "overview" || capability.type === activeTab;
      const matchesTag = !activeTag || capability.tags.includes(activeTag);
      const matchesOfficial = showOfficial || !isOfficialCapability(capability);
      const matchesQuery =
        !needle ||
        capability.name.toLowerCase().includes(needle) ||
        capability.summary.toLowerCase().includes(needle) ||
        localizedSummary(capability, locale).toLowerCase().includes(needle) ||
        capability.path.toLowerCase().includes(needle) ||
        capability.tags.some((tag) => tag.toLowerCase().includes(needle));
      return matchesTab && matchesTag && matchesOfficial && matchesQuery;
    });

    if (!githubPriority || activeTab === "overview") return filtered;
    return [...filtered].sort((a, b) => {
      const aHasGithub = Boolean(githubUrl(a));
      const bHasGithub = Boolean(githubUrl(b));
      if (aHasGithub !== bHasGithub) return aHasGithub ? -1 : 1;
      const starDiff = githubStars(b) - githubStars(a);
      if (starDiff) return starDiff;
      return a.name.localeCompare(b.name);
    });
  }, [activeTab, activeTag, capabilities, githubPriority, locale, query, showOfficial]);

  const translationEstimate = useMemo(
    () => estimateTranslationRun(capabilities, translationSettings, translationForm),
    [capabilities, translationForm, translationSettings]
  );

  useEffect(() => {
    if (activeTab === "overview") return;
    if (!visibleCapabilities.length || !selectedId) {
      setSelectedId(null);
      return;
    }
    if (!visibleCapabilities.some((capability) => capability.id === selectedId)) {
      setSelectedId(null);
    }
  }, [activeTab, selectedId, visibleCapabilities]);

  async function copyInvocation(capability: Capability) {
    const copied = await writeClipboard(capability.invocation);
    if (!copied) {
      setError(t.copyFailed);
      return;
    }
    setError(null);
    setCopyState((current) => ({ ...current, [capability.id]: t.copied }));
    window.setTimeout(() => setCopyState((current) => ({ ...current, [capability.id]: copyLabels[locale] })), 1200);
  }

  async function writeClipboard(value: string) {
    try {
      await navigator.clipboard.writeText(value);
      return true;
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = value;
      textarea.setAttribute("readonly", "true");
      textarea.style.position = "fixed";
      textarea.style.left = "-9999px";
      document.body.appendChild(textarea);
      textarea.select();
      try {
        return document.execCommand("copy");
      } catch {
        return false;
      } finally {
        document.body.removeChild(textarea);
      }
    }
  }

  async function openLocalFolder(capability: Capability) {
    try {
      const response = await fetch("/api/open-path", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ capabilityId: capability.id })
      });
      if (!response.ok) throw new Error("open failed");
    } catch {
      setError(t.openFailed);
    }
  }

  function startGithubEdit(capability: Capability) {
    setSelectedId(capability.id);
    setGithubEditId(capability.id);
    setGithubInput(githubUrl(capability));
    setGithubState("");
  }

  async function saveGithubLink(capability: Capability, url: string) {
    const cleaned = normalizeGithubInput(url);
    if (!cleaned) {
      setGithubState(t.githubInvalid);
      return;
    }
    setGithubState("saving");
    try {
      const response = await fetch("/api/github-links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ capabilityId: capability.id, url: cleaned })
      });
      if (!response.ok) throw new Error("github link failed");
      await loadInventory();
      setSelectedId(capability.id);
      setGithubEditId(null);
      setGithubInput("");
      setGithubState(t.githubSaved);
    } catch {
      setGithubState(t.githubInvalid);
    }
  }

  async function removeGithubLink(capability: Capability) {
    setGithubState("saving");
    try {
      const response = await fetch(`/api/github-links/${encodeURIComponent(capability.id)}`, { method: "DELETE" });
      if (!response.ok) throw new Error("github remove failed");
      await loadInventory();
      setSelectedId(capability.id);
      setGithubEditId(null);
      setGithubInput("");
      setGithubState(t.githubRemoved);
    } catch {
      setGithubState(t.githubInvalid);
    }
  }

  function githubUrl(capability: Capability) {
    const value = capability.metadata?.githubUrl;
    return typeof value === "string" && value.startsWith("https://github.com/") ? value : "";
  }

  function githubStars(capability: Capability) {
    const value = capability.metadata?.githubStars;
    return typeof value === "number" && value >= 0 ? value : -1;
  }

  function githubStarsLabel(capability: Capability) {
    const stars = githubStars(capability);
    return stars >= 0 ? stars.toLocaleString() : t.starsUnknown;
  }

  function githubCandidates(capability: Capability) {
    const value = capability.metadata?.githubCandidates;
    return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string" && item.startsWith("https://github.com/")) : [];
  }

  function githubSource(capability: Capability) {
    const value = capability.metadata?.githubSource;
    return typeof value === "string" && value !== "none" ? value : "";
  }

  function isOfficialCapability(capability: Capability) {
    return capability.metadata?.officialBuiltIn === true;
  }

  function localizedSummary(capability: Capability, targetLocale: Locale) {
    if (targetLocale === "en") return capability.summary;
    const value = capability.metadata?.zhSummary;
    if (typeof value === "string" && value.trim()) return value;
    return capability.summary;
  }

  function localizedScenarios(capability: Capability, targetLocale: Locale) {
    const value = capability.metadata?.zhScenarios;
    if (targetLocale === "zh" && Array.isArray(value)) {
      return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0).slice(0, 2);
    }
    return [];
  }

  function toggleCapability(capability: Capability) {
    setSelectedId((current) => (current === capability.id ? null : capability.id));
  }

  function selectTab(tab: TabKey) {
    setActiveTab(tab);
    setActiveTag(null);
  }

  function toggleTag(tag: string | null) {
    setActiveTag((current) => (current === tag ? null : tag));
  }

  function switchLocale() {
    setLocale((current) => (current === "zh" ? "en" : "zh"));
  }

  function estimateTranslationRun(items: Capability[], settings: TranslationSettingsResponse | null, form: TranslationForm): TranslationEstimate {
    const provider = settings?.provider && settings.provider !== "none" ? settings.provider : form.provider;
    const model = settings?.model || form.model;
    const apiEnabled = provider !== "none" && Boolean(settings?.apiKeyConfigured);
    const skills = items.filter((capability) => capability.type === "skill");
    const cachedCount = skills.filter((capability) => ["cached", "live", "manual"].includes(String(capability.metadata?.translationStatus ?? ""))).length;
    const pending = skills.filter((capability) => !["cached", "live", "manual"].includes(String(capability.metadata?.translationStatus ?? "")));
    const estimatedInputTokens = pending.reduce((sum, capability) => sum + Math.ceil(capability.summary.length / 4) + 120, 0);
    const estimatedOutputTokens = pending.reduce((sum, capability) => sum + Math.ceil(capability.summary.length / 3.2), 0);
    const rate = translationRate(provider, model);
    const estimatedCostUsd = rate ? (estimatedInputTokens / 1_000_000) * rate.inputPerMillion + (estimatedOutputTokens / 1_000_000) * rate.outputPerMillion : null;
    return {
      apiEnabled,
      provider,
      model,
      pendingCount: pending.length,
      cachedCount,
      skillCount: skills.length,
      estimatedInputTokens,
      estimatedOutputTokens,
      estimatedCostUsd,
      rateNote: rate?.note ?? "No built-in price for this provider/model. Configure a known model or treat token estimates only."
    };
  }

  function translationRate(provider: TranslationProvider, model: string) {
    const normalized = model.toLowerCase();
    if (provider === "gemini" && normalized.includes("3.1-flash-lite")) {
      return { inputPerMillion: 0.25, outputPerMillion: 1.5, note: "Uses built-in Gemini 3.1 Flash-Lite estimate: $0.25/1M input, $1.50/1M output." };
    }
    if (provider === "gemini" && normalized.includes("3-flash")) {
      return { inputPerMillion: 0.5, outputPerMillion: 3, note: "Uses built-in Gemini 3 Flash estimate: $0.50/1M input, $3.00/1M output." };
    }
    return null;
  }

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">
            <Layers3 size={20} aria-hidden="true" />
          </div>
          <div>
            <p className="brand-name">Skill-Dashboard</p>
            <p className="brand-meta">{t.brandMeta}</p>
          </div>
        </div>

        <nav className="tab-list" aria-label={t.type}>
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button className={`tab-button ${activeTab === tab.key ? "active" : ""}`} key={tab.key} onClick={() => selectTab(tab.key)} type="button">
                <Icon size={17} aria-hidden="true" />
                <span>{t[tab.labelKey]}</span>
              </button>
            );
          })}
        </nav>

        <div className="sidebar-summary">
          <div>
            <span>{stats.skills}</span>
            <p>{t.skills}</p>
          </div>
          <div>
            <span>{stats.risky}</span>
            <p>{t.risks}</p>
          </div>
        </div>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div>
            <p className="section-kicker">{t.kicker}</p>
            <h1>{t.title}</h1>
          </div>
          <div className="topbar-tools">
            <div className="toolbar-actions">
              <button className="secondary-action" onClick={switchLocale} type="button">
                <Languages size={16} aria-hidden="true" />
                {t.language}
              </button>
              <button className="primary-action" disabled={isScanning} onClick={() => void loadInventory("scan")} type="button">
                <RefreshCw className={isScanning ? "spin" : ""} size={16} aria-hidden="true" />
                {isScanning ? t.refreshing : t.refresh}
              </button>
            </div>
            <div className="metric-strip" aria-label={t.overview}>
              <div>
                <span>{stats.indexed}</span>
                <p>{t.indexed}</p>
              </div>
              <div>
                <span>{stats.visible}</span>
                <p>{t.visible}</p>
              </div>
              <div>
                <span>{stats.risky}</span>
                <p>{t.risks}</p>
              </div>
            </div>
            <div className="search-box">
              <Search size={17} aria-hidden="true" />
              <input aria-label={t.search} onChange={(event) => setQuery(event.target.value)} placeholder={t.search} value={query} />
            </div>
          </div>
        </header>

        {error ? <p className="error-banner">{error}</p> : null}

        <div className="content-grid">
          <section className="list-panel" aria-label={activeTab === "overview" ? t.overview : t.results}>
            {activeTab === "overview" ? (
              <DashboardOverview
                locale={locale}
                apiKeyMode={apiKeyMode}
                onApiKeyModeChange={setApiKeyMode}
                onRemoveTranslationKey={() => void removeTranslationKey()}
                onSaveTranslationSettings={() => void saveTranslationSettings()}
                apiPanelOpen={apiPanelOpen}
                onApiPanelOpenChange={setApiPanelOpen}
                scan={inventory?.scan}
                settingsState={settingsState}
                stats={stats}
                translationEstimate={translationEstimate}
                translationForm={translationForm}
                translationSettings={translationSettings}
                onTranslationFormChange={setTranslationForm}
              />
            ) : (
              <>
                <TagFilter activeTag={activeTag} locale={locale} onToggle={toggleTag} options={tagOptions} />
                <div className="list-header">
                  <span>
                    {visibleCapabilities.length} {t.results}
                  </span>
                  <div className="list-controls">
                    <button className={showOfficial ? "active" : ""} onClick={() => setShowOfficial((current) => !current)} type="button">
                      <Sparkles size={14} aria-hidden="true" />
                      {showOfficial ? t.hideOfficial : t.showOfficial}
                    </button>
                    <button className={githubPriority ? "active" : ""} onClick={() => setGithubPriority((current) => !current)} type="button">
                      <Github size={14} aria-hidden="true" />
                      {githubPriority ? t.githubPriority : t.defaultSort}
                    </button>
                    <span>{inventory?.scan.scannedAt ? `${t.scannedAt}: ${formatDate(inventory.scan.scannedAt, locale)}` : ""}</span>
                  </div>
                </div>
                <div className="capability-list">
                  {visibleCapabilities.map((capability) => {
                    const repoUrl = githubUrl(capability);
                    const isExpanded = capability.id === selectedId;
                    return (
                      <article className={`capability-row ${isExpanded ? "selected" : ""}`} key={capability.id}>
                        <button className="row-select" onClick={() => toggleCapability(capability)} type="button">
                          <div className="row-main">
                            <div className="row-title">
                              <strong>{capability.name}</strong>
                              {isOfficialCapability(capability) ? <span className="official-badge">{t.official}</span> : null}
                              {repoUrl ? (
                                <span className={`star-badge ${githubStars(capability) < 0 ? "unknown" : ""}`} title={githubStars(capability) < 0 ? t.starsUnknown : t.githubPriority}>
                                  <Star size={13} aria-hidden="true" />
                                  {githubStarsLabel(capability)}
                                </span>
                              ) : null}
                            </div>
                            <div className="tag-row">
                              {capability.tags.slice(0, 6).map((tag) => (
                                <span key={tag}>{tag}</span>
                              ))}
                            </div>
                          </div>
                        </button>
                        <div className="row-actions">
                          <button className="icon-action copy-action" onClick={() => void copyInvocation(capability)} title={copyLabels[locale]} type="button">
                            <Copy size={15} aria-hidden="true" />
                          </button>
                          <button className="icon-action" onClick={() => void openLocalFolder(capability)} title={t.openFolder} type="button">
                            <FolderOpen size={15} aria-hidden="true" />
                          </button>
                          {repoUrl ? (
                            <a className="icon-action" href={repoUrl} rel="noreferrer" target="_blank" title={t.githubPage}>
                              <Github size={15} aria-hidden="true" />
                            </a>
                          ) : (
                            <button className="icon-action" onClick={() => startGithubEdit(capability)} title={t.linkGithub} type="button">
                              <Github size={15} aria-hidden="true" />
                            </button>
                          )}
                        </div>
                        {isExpanded ? (
                          <CapabilityDetail
                            capability={capability}
                            copyLabel={copyState[capability.id] ?? copyLabels[locale]}
                            description={localizedSummary(capability, locale)}
                            scenarios={localizedScenarios(capability, locale)}
                            githubCandidates={githubCandidates(capability)}
                            githubEditId={githubEditId}
                            githubInput={githubInput}
                            githubSource={githubSource(capability)}
                            githubState={githubState}
                            githubUrl={repoUrl}
                            locale={locale}
                            onCopy={() => void copyInvocation(capability)}
                            onGithubInputChange={setGithubInput}
                            onRemoveGithub={() => void removeGithubLink(capability)}
                            onSaveGithub={(url) => void saveGithubLink(capability, url)}
                            onStartGithubEdit={() => startGithubEdit(capability)}
                            onOpenFolder={() => void openLocalFolder(capability)}
                          />
                        ) : null}
                      </article>
                    );
                  })}
                </div>
              </>
            )}
          </section>

        </div>
      </section>
    </main>
  );
}

function TagFilter({
  activeTag,
  locale,
  onToggle,
  options
}: {
  activeTag: string | null;
  locale: Locale;
  onToggle: (tag: string | null) => void;
  options: Array<{ tag: string; count: number }>;
}) {
  const t = text[locale];
  return (
    <section className="tag-filter" aria-label={t.tagFilter}>
      <div className="tag-filter-head">
        <span>{t.tagFilter}</span>
        <button className={activeTag === null ? "active" : ""} onClick={() => onToggle(null)} type="button">
          {t.allTags}
        </button>
      </div>
      {options.length ? (
        <div className="tag-filter-list">
          {options.map((option) => (
            <button className={activeTag === option.tag ? "active" : ""} key={option.tag} onClick={() => onToggle(option.tag)} type="button">
              {option.tag}
              <span>{option.count}</span>
            </button>
          ))}
        </div>
      ) : (
        <p className="empty-note">{t.noTags}</p>
      )}
    </section>
  );
}

function CapabilityDetail({
  capability,
  copyLabel,
  description,
  githubCandidates,
  githubEditId,
  githubInput,
  githubSource,
  githubState,
  githubUrl,
  locale,
  onCopy,
  onGithubInputChange,
  onRemoveGithub,
  onSaveGithub,
  onStartGithubEdit,
  onOpenFolder,
  scenarios
}: {
  capability: Capability;
  copyLabel: string;
  description: string;
  githubCandidates: string[];
  githubEditId: string | null;
  githubInput: string;
  githubSource: string;
  githubState: string;
  githubUrl: string;
  locale: Locale;
  onCopy: () => void;
  onGithubInputChange: (value: string) => void;
  onRemoveGithub: () => void;
  onSaveGithub: (url: string) => void;
  onStartGithubEdit: () => void;
  onOpenFolder: () => void;
  scenarios: string[];
}) {
  const t = text[locale];
  const isEditingGithub = githubEditId === capability.id;
  return (
    <div className="expanded-detail">
      <div className="detail-heading">
        <span className="type-badge">{typeLabels[locale][capability.type]}</span>
        <h2>{capability.name}</h2>
        <p>{description}</p>
      </div>

      {scenarios.length ? (
        <section className="scenario-section">
          <h3>{t.scenarios}</h3>
          <ul>
            {scenarios.map((scenario) => (
              <li key={scenario}>{scenario}</li>
            ))}
          </ul>
        </section>
      ) : null}

      <dl className="detail-list">
        <div>
          <dt>{t.status}</dt>
          <dd>
            <StatusBadge locale={locale} status={capability.status} />
          </dd>
        </div>
        <div>
          <dt>{t.invocation}</dt>
          <dd className="mono">{capability.invocation}</dd>
        </div>
        <div>
          <dt>{t.sourcePath}</dt>
          <dd className="path-value">{capability.path}</dd>
        </div>
        <div>
          <dt>{t.tokenEstimate}</dt>
          <dd>{capability.tokenEstimate.toLocaleString()}</dd>
        </div>
      </dl>

      <section className="github-link-section">
        <div className="github-link-head">
          <div>
            <h3>GitHub</h3>
            <p>
              {githubUrl
                ? `${t.githubPage}${githubSource ? ` · ${t.githubSource}: ${githubSource}` : ""}`
                : t.githubUnavailable}
            </p>
          </div>
          {githubUrl ? (
            <a className="secondary-action compact" href={githubUrl} rel="noreferrer" target="_blank">
              <Github size={15} aria-hidden="true" />
              {t.githubPage}
            </a>
          ) : null}
        </div>
        {isEditingGithub || !githubUrl ? (
          <div className="github-link-editor">
            <input
              onChange={(event) => onGithubInputChange(event.target.value)}
              placeholder={t.githubUrlPlaceholder}
              type="url"
              value={githubInput}
            />
            <button className="secondary-action compact primary" disabled={githubState === "saving"} onClick={() => onSaveGithub(githubInput)} type="button">
              {t.linkGithub}
            </button>
          </div>
        ) : (
          <div className="github-link-actions">
            <button className="secondary-action compact" onClick={onStartGithubEdit} type="button">
              {t.changeGithub}
            </button>
            {githubSource === "manual" ? (
              <button className="secondary-action compact danger" onClick={onRemoveGithub} type="button">
                {t.removeGithub}
              </button>
            ) : null}
          </div>
        )}
        {githubCandidates.length && !githubUrl ? (
          <div className="github-candidates">
            <span>{t.githubCandidates}</span>
            {githubCandidates.slice(0, 3).map((candidate) => (
              <button key={candidate} onClick={() => onGithubInputChange(candidate)} type="button">
                {candidate.replace("https://github.com/", "")}
              </button>
            ))}
          </div>
        ) : null}
        {githubState && githubState !== "saving" ? <p className="form-note">{githubState}</p> : null}
      </section>

      <section className="risk-section">
        <h3>{t.riskTitle}</h3>
        <p className="risk-help">{t.riskHelp}</p>
        {capability.risks.length ? (
          capability.risks.map((risk) => <RiskItem key={risk.id} locale={locale} risk={risk} />)
        ) : (
          <p className="empty-note">{t.noRisk}</p>
        )}
      </section>

      <div className="action-row">
        <button className="secondary-action" onClick={onCopy} type="button">
          <Copy size={16} aria-hidden="true" />
          {copyLabel}
        </button>
        <button className="secondary-action" onClick={onOpenFolder} type="button">
          <FolderOpen size={16} aria-hidden="true" />
          {t.openFolder}
        </button>
        {githubUrl ? (
          <a className="secondary-action" href={githubUrl} rel="noreferrer" target="_blank">
            <Github size={16} aria-hidden="true" />
            {t.githubPage}
          </a>
        ) : null}
      </div>
    </div>
  );
}

function DashboardOverview({
  locale,
  apiKeyMode,
  apiPanelOpen,
  onApiKeyModeChange,
  onApiPanelOpenChange,
  onRemoveTranslationKey,
  onSaveTranslationSettings,
  onTranslationFormChange,
  scan,
  settingsState,
  stats,
  translationEstimate,
  translationForm,
  translationSettings
}: {
  locale: Locale;
  apiKeyMode: "closed" | "editing";
  apiPanelOpen: boolean;
  onApiKeyModeChange: (mode: "closed" | "editing") => void;
  onApiPanelOpenChange: (open: boolean) => void;
  onRemoveTranslationKey: () => void;
  onSaveTranslationSettings: () => void;
  onTranslationFormChange: (form: TranslationForm) => void;
  scan?: ScanMeta;
  settingsState: string;
  stats: { indexed: number; skills: number; mcp: number; plugins: number; risky: number; broken: number; duplicateNames: number; tokens: number };
  translationEstimate: TranslationEstimate;
  translationForm: TranslationForm;
  translationSettings: TranslationSettingsResponse | null;
}) {
  const t = text[locale];
  const zh = locale === "zh";
  const providerLabel = translationSettings?.provider ?? "none";
  const keyStatus = translationSettings?.apiKeyConfigured ? (zh ? "\u5df2\u8a2d\u5b9a" : "Configured") : zh ? "\u672a\u8a2d\u5b9a" : "Not configured";
  const stateText =
    settingsState === "saving"
      ? zh
        ? "\u5132\u5b58\u4e2d"
        : "Saving"
      : settingsState === "saved"
        ? zh
          ? "\u5df2\u5132\u5b58\uff0c\u9810\u4f30\u5df2\u66f4\u65b0"
          : "Saved. Estimate updated."
        : settingsState === "removed"
          ? zh
            ? "API key \u5df2\u79fb\u9664\uff0c\u9810\u4f30\u5df2\u66f4\u65b0"
            : "API key removed. Estimate updated."
        : settingsState === "save-failed"
          ? zh
            ? "\u5132\u5b58\u5931\u6557"
            : "Save failed"
          : "";
  return (
    <div className="overview-panel">
      <div className="overview-heading">
        <h2>{t.overviewTitle}</h2>
      </div>
      <div className="diagnostic-grid">
        <DiagnosticCard label={t.skills} value={stats.skills.toString()} icon={Sparkles} />
        <DiagnosticCard label={t.mcp} value={stats.mcp.toString()} icon={Server} />
        <DiagnosticCard label={t.risks} value={stats.risky.toString()} icon={ShieldAlert} />
        <DiagnosticCard label={t.duplicateNames} value={stats.duplicateNames.toString()} icon={AlertTriangle} />
        <DiagnosticCard label={t.brokenEntries} value={stats.broken.toString()} icon={Activity} />
      </div>
      <section className="scan-section">
        <h3>{t.scannedAt}</h3>
        <p>{scan?.scannedAt ? formatDate(scan.scannedAt, locale) : "-"}</p>
      </section>
      <section className={`scan-section api-settings-section ${apiPanelOpen ? "open" : ""}`}>
        <button className="api-summary-button" onClick={() => onApiPanelOpenChange(!apiPanelOpen)} type="button">
          <div>
            <h3>{zh ? "\u7ffb\u8b6f API\uff08\u9078\u7528\uff09" : "Translation API (optional)"}</h3>
            <p>
              {translationEstimate.pendingCount} / {translationEstimate.skillCount} {zh ? "\u5f85\u7ffb\u8b6f" : "pending"} ·{" "}
              {translationEstimate.estimatedCostUsd === null ? "-" : `$${translationEstimate.estimatedCostUsd.toFixed(4)}`}
            </p>
          </div>
          <span className={`api-status ${translationSettings?.apiKeyConfigured ? "ready" : ""}`}>{keyStatus}</span>
        </button>
        {apiPanelOpen ? (
          <div className="api-settings-body">
            <div className="api-settings-grid">
              <label>
                <span>{zh ? "\u63d0\u4f9b\u8005" : "Provider"}</span>
                <select
                  value={translationForm.provider}
                  onChange={(event) =>
                    onTranslationFormChange({
                      ...translationForm,
                      provider: event.target.value as TranslationProvider,
                      model: event.target.value === "openai" ? "gpt-4.1-mini" : event.target.value === "gemini" ? "gemini-3.1-flash-lite-preview" : ""
                    })
                  }
                >
                  <option value="gemini">Gemini</option>
                  <option value="openai">OpenAI</option>
                  <option value="none">{zh ? "\u4e0d\u555f\u7528" : "Disabled"}</option>
                </select>
              </label>
              <label>
                <span>{zh ? "\u6a21\u578b" : "Model"}</span>
                <input
                  value={translationForm.model}
                  onChange={(event) => onTranslationFormChange({ ...translationForm, model: event.target.value })}
                  placeholder={translationForm.provider === "gemini" ? "gemini-3.1-flash-lite-preview" : "gpt-4.1-mini"}
                />
              </label>
              <div className="api-key-field">
                <span>{zh ? "API key" : "API key"}</span>
                {translationSettings?.apiKeyConfigured && apiKeyMode === "closed" ? (
                  <div className="api-key-actions">
                    <span className="key-pill">{zh ? "\u5df2\u5132\u5b58" : "Saved"}</span>
                    <button className="secondary-action compact" onClick={() => onApiKeyModeChange("editing")} type="button">
                      {zh ? "\u8b8a\u66f4 key" : "Change key"}
                    </button>
                    <button className="secondary-action compact danger" onClick={onRemoveTranslationKey} type="button">
                      {zh ? "\u79fb\u9664 key" : "Remove key"}
                    </button>
                  </div>
                ) : (
                  <input
                    value={translationForm.apiKey}
                    onChange={(event) => onTranslationFormChange({ ...translationForm, apiKey: event.target.value })}
                    placeholder={translationSettings?.apiKeyConfigured ? (zh ? "\u8f38\u5165\u65b0 key \u4ee5\u53d6\u4ee3\u820a key" : "Enter a new key to replace the old one") : "AIza..."}
                    type="password"
                  />
                )}
              </div>
              <button className="primary-action" onClick={onSaveTranslationSettings} type="button">
                {zh ? "\u5132\u5b58 API \u8a2d\u5b9a" : "Save API settings"}
              </button>
            </div>
            <div className="translation-estimate-grid">
              <div>
                <span>{zh ? "\u76ee\u524d\u53ef\u57f7\u884c\u7ffb\u8b6f" : "Translation available now"}</span>
                <strong>{translationEstimate.apiEnabled && translationEstimate.pendingCount > 0 ? (zh ? "\u53ef\u57f7\u884c" : "Ready") : zh ? "\u4e0d\u9700\u8981 / \u672a\u555f\u7528" : "Not needed / disabled"}</strong>
              </div>
              <div>
                <span>{zh ? "\u5f85\u7ffb\u8b6f / skill" : "Pending / skills"}</span>
                <strong>
                  {translationEstimate.pendingCount} / {translationEstimate.skillCount}
                </strong>
              </div>
              <div>
                <span>{zh ? "\u9810\u4f30 token" : "Estimated tokens"}</span>
                <strong>{(translationEstimate.estimatedInputTokens + translationEstimate.estimatedOutputTokens).toLocaleString()}</strong>
              </div>
              <div>
                <span>{zh ? "\u9810\u4f30\u8cbb\u7528" : "Estimated cost"}</span>
                <strong>{translationEstimate.estimatedCostUsd === null ? "-" : `$${translationEstimate.estimatedCostUsd.toFixed(4)}`}</strong>
              </div>
            </div>
            <p>
              {zh
                ? "\u82f1\u6587\u539f\u6587\u63cf\u8ff0\u4e0d\u9700\u8981 API\uff1bAPI \u53ea\u7528\u65bc\u7e41\u9ad4\u4e2d\u6587\u7ffb\u8b6f\u8207\u5feb\u53d6\u3002"
                : "Original English descriptions do not require an API. API access is only used for Traditional Chinese translation and caching."}
            </p>
            <p>
              {zh ? "\u76ee\u524d provider" : "Current provider"}: {providerLabel}
              {translationSettings?.model ? ` / ${translationSettings.model}` : ""}
            </p>
            <p>
              {zh ? "\u8f38\u5165" : "Input"} {translationEstimate.estimatedInputTokens.toLocaleString()} tokens / {zh ? "\u8f38\u51fa" : "Output"}{" "}
              {translationEstimate.estimatedOutputTokens.toLocaleString()} tokens. {translationEstimate.rateNote}
            </p>
            {stateText ? <p className="settings-state">{stateText}</p> : null}
          </div>
        ) : null}
      </section>
      <section className="scan-section">
        <h3>{t.scanRoots}</h3>
        <div className="scan-paths">
          {(scan?.roots ?? []).map((root) => (
            <span key={root}>{root}</span>
          ))}
        </div>
      </section>
      <section className="scan-section">
        <h3>{t.scanErrors}</h3>
        {scan?.errors.length ? scan.errors.map((item) => <p key={item}>{item}</p>) : <p>{t.noErrors}</p>}
      </section>
    </div>
  );
}

function DiagnosticCard({ label, value, icon: Icon }: { label: string; value: string; icon: typeof Activity }) {
  return (
    <article className="diagnostic-card">
      <Icon size={18} aria-hidden="true" />
      <span>{value}</span>
      <p>{label}</p>
    </article>
  );
}

function StatusBadge({ status, locale }: { status: Capability["status"]; locale: Locale }) {
  return (
    <span className={`status-badge status-${status}`}>
      <CheckCircle2 size={14} aria-hidden="true" />
      {statusLabels[locale][status]}
    </span>
  );
}

function RiskItem({ risk, locale }: { risk: RiskBadge; locale: Locale }) {
  const label = riskText[locale][risk.id]?.label ?? risk.label;
  const reason = riskText[locale][risk.id]?.reason ?? risk.reason;
  return (
    <article className={`risk-item risk-${risk.level}`}>
      <ShieldAlert size={16} aria-hidden="true" />
      <div>
        <strong>{label}</strong>
        <p>{reason}</p>
      </div>
    </article>
  );
}

const riskText: Record<Locale, Record<string, { label: string; reason: string }>> = {
  zh: {
    "mentions-command": {
      label: "描述提到命令執行",
      reason: "這份能力的說明文字提到 shell、command、exec 等詞。這不代表有問題，只代表它可能會指示 Codex 執行本機命令。"
    },
    "mentions-secrets": {
      label: "描述提到密鑰或環境變數",
      reason: "這份能力的說明文字提到 env、token、API key 或 credential。掃描器只讀 key 名稱與文字，不讀密鑰值。"
    },
    "mentions-network": {
      label: "描述提到網路存取",
      reason: "這份能力的說明文字提到 http、network、download、upload 或 fetch，使用前確認是否需要連外。"
    },
    "local-command": {
      label: "MCP 會啟動本機命令",
      reason: "這是本機 MCP server 的常見行為。確認 command 與 args 指向你信任的路徑即可。"
    },
    "network": {
      label: "MCP 使用遠端端點",
      reason: "這個 MCP server 設定了 URL，代表它會連到遠端服務。"
    },
    "env-keys": {
      label: "MCP 使用環境變數 key",
      reason: "設定檔中有環境變數 key 名稱。掃描器不讀取環境變數的實際值。"
    },
    "duplicate-name": {
      label: "能力名稱重複",
      reason: "有另一個同類型能力使用相同名稱。複製呼叫前要確認來源路徑。"
    }
  },
  en: {
    "mentions-command": {
      label: "Mentions command execution",
      reason: "The capability text mentions shell, command, exec, or similar terms. This is a review flag, not a confirmed issue."
    },
    "mentions-secrets": {
      label: "Mentions secrets or env vars",
      reason: "The capability text mentions env, token, API key, or credentials. The scanner does not read secret values."
    },
    "mentions-network": {
      label: "Mentions network access",
      reason: "The capability text mentions http, network, download, upload, or fetch."
    },
    "local-command": {
      label: "MCP starts a local command",
      reason: "Common for local MCP servers. Review command and args before trusting it."
    },
    network: {
      label: "MCP uses a remote endpoint",
      reason: "This MCP server is configured with a URL and may connect to a remote service."
    },
    "env-keys": {
      label: "MCP uses env key names",
      reason: "The config references environment variable keys. The scanner does not read their values."
    },
    "duplicate-name": {
      label: "Duplicate capability name",
      reason: "Another capability has the same type and name. Check the source path before copying the invocation."
    }
  }
};

function formatDate(value: string, locale: Locale) {
  return new Intl.DateTimeFormat(locale === "zh" ? "zh-TW" : "en-US", {
    dateStyle: "short",
    timeStyle: "medium"
  }).format(new Date(value));
}

function normalizeGithubInput(value: string) {
  const normalized = value.trim().replace(/^git\+/, "").replace(/^github:/, "https://github.com/");
  const ssh = normalized.match(/^git@github\.com:([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)(?:\.git)?$/);
  if (ssh) return `https://github.com/${ssh[1]}/${ssh[2].replace(/\.git$/, "")}`;
  const sshUrl = normalized.match(/^ssh:\/\/git@github\.com\/([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)(?:\.git)?$/);
  if (sshUrl) return `https://github.com/${sshUrl[1]}/${sshUrl[2].replace(/\.git$/, "")}`;
  const shortcut = normalized.match(/^([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)(?:#.+)?$/);
  if (shortcut) return `https://github.com/${shortcut[1]}/${shortcut[2].replace(/\.git$/, "")}`;
  const match = normalized.match(/^https?:\/\/github\.com\/([^/\s]+)\/([^/\s#?]+)/);
  if (!match) return "";
  const slug = `${match[1]}/${match[2].replace(/\.git$/, "")}`;
  return ["org/repo", "owner/repo", "user/repo", "octocat/hello-world"].includes(slug.toLowerCase()) ? "" : `https://github.com/${slug}`;
}
