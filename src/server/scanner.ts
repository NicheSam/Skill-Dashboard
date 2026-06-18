import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { GoogleGenAI } from "@google/genai";
import { homedir } from "node:os";
import { basename, dirname, join, normalize, parse as parsePath, relative, sep } from "node:path";
import type { Capability, InventoryResponse, RiskBadge } from "../shared/schema";
import { parseMcpServerSections, parseSkillFrontmatter } from "./parsers";
import { readTranslationSettings } from "./settings";

const codexHome = normalize(process.env.CODEX_HOME || join(homedir(), ".codex"));
const pluginCacheRoot = join(codexHome, "plugins", "cache");
const defaultRoots = [join(codexHome, "skills"), pluginCacheRoot, join(process.cwd(), ".codex", "skills")];
const configuredRoots = (process.env.SKILL_DASHBOARD_SCAN_ROOTS ?? "")
  .split(/[;\n]/)
  .map((root) => root.trim())
  .filter(Boolean)
  .map((root) => normalize(root));
const roots = configuredRoots.length ? configuredRoots : defaultRoots;
const configPath = normalize(process.env.CODEX_CONFIG_PATH || join(codexHome, "config.toml"));
const githubStarsCachePath = join(process.cwd(), "data", "github-stars-cache.json");
const translationCachePath = join(process.cwd(), "data", "translation-cache.json");
let githubStarsCache: Record<string, { stars: number; updatedAt: string }> | null = null;
let translationCache: Record<string, TranslationCacheEntry> | null = null;

interface TranslationCacheEntry {
  source: string;
  zhSummary: string;
  zhScenarios: string[];
  provider: string;
  updatedAt: string;
}

export async function scanInventory(): Promise<InventoryResponse> {
  const errors: string[] = [];
  const capabilities: Capability[] = [];

  for (const root of roots) {
    try {
      const skillFiles = await findFiles(root, "SKILL.md");
      capabilities.push(...(await Promise.all(skillFiles.map((file) => skillCapability(file)))));
    } catch (error) {
      errors.push(`${root}: ${messageFrom(error)}`);
    }
  }

  try {
    capabilities.push(...(await pluginCapabilities(pluginCacheRoot)));
  } catch (error) {
    errors.push(`plugins: ${messageFrom(error)}`);
  }

  try {
    capabilities.push(...(await mcpCapabilities(configPath)));
  } catch (error) {
    errors.push(`mcp: ${messageFrom(error)}`);
  }

  const unique = dedupeCapabilities(capabilities);
  const duplicateNames = duplicates(unique.map((capability) => `${capability.type}:${capability.name}`));
  const withDuplicateRisks = unique.map((capability) =>
    duplicateNames.has(`${capability.type}:${capability.name}`)
      ? { ...capability, risks: [...capability.risks, duplicateRisk()] }
      : capability
  );
  const withTranslations = await enrichTranslations(withDuplicateRisks);
  const withGithubStars = await enrichGithubStars(withTranslations);

  return {
    capabilities: withGithubStars.sort((a, b) => typeRank(a.type) - typeRank(b.type) || a.name.localeCompare(b.name)),
    scan: {
      scannedAt: new Date().toISOString(),
      roots,
      errors
    }
  };
}

async function findFiles(root: string, targetName: string): Promise<string[]> {
  const files: string[] = [];
  const stack = [root];

  while (stack.length) {
    const current = stack.pop()!;
    let entries;
    try {
      entries = await readdir(current, { withFileTypes: true });
    } catch {
      continue;
    }

    for (const entry of entries) {
      const fullPath = join(current, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === "node_modules" || entry.name === ".git") continue;
        stack.push(fullPath);
      } else if (entry.isFile() && entry.name === targetName) {
        files.push(fullPath);
      }
    }
  }

  return files;
}

async function skillCapability(file: string): Promise<Capability> {
  const content = await readHead(file);
  const frontmatter = parseSkillFrontmatter(content);
  const title = firstMarkdownTitle(content);
  const inferred = basename(dirname(file));
  const sourceInfo = sourceFromSkillPath(file);
  const name = frontmatter.name || title || inferred;
  const summary = frontmatter.summary || frontmatter.description || firstParagraph(content) || "No summary found.";
  const risks = risksFromText(content);
  const invocation = sourceInfo.pluginName ? `$${sourceInfo.pluginName}:${kebab(name)}` : `$${kebab(name)}`;
  const githubUrl = await resolveGithubUrl(file, content);
  const tags = skillTags({
    name,
    summary,
    frontmatterTags: frontmatter.tags
  });
  const zh = zhCapabilityNarrative("skill", name, summary, sourceInfo.pluginName || sourceInfo.rootLabel);

  return {
    id: stableId("skill", file),
    type: "skill",
    name,
    summary,
    description: summary,
    source: sourceInfo.source,
    status: sourceInfo.pluginName || file.includes(`${sep}.system${sep}`) ? "visible" : "installed",
    path: normalize(file),
    invocation,
    tags,
    risks,
    lastSeenAt: new Date().toISOString(),
    tokenEstimate: estimateTokens(content),
    metadata: {
      plugin: sourceInfo.pluginName ?? "",
      root: sourceInfo.rootLabel,
      officialBuiltIn: isOfficialCodexSource(sourceInfo.rootLabel, file),
      officialSource: officialSourceLabel(sourceInfo.rootLabel, file),
      githubUrl: githubUrl ?? "",
      sourceTags: sourceTagsForSkill(sourceInfo.pluginName, sourceInfo.rootLabel),
      zhSummary: zh.summary,
      zhScenarios: zh.scenarios
    }
  };
}

async function pluginCapabilities(root: string): Promise<Capability[]> {
  const result: Capability[] = [];
  const cacheFamilies = await safeDirs(root);

  for (const family of cacheFamilies) {
    const familyPath = join(root, family);
    const pluginNames = await safeDirs(familyPath);
    for (const pluginName of pluginNames) {
      const pluginPath = join(familyPath, pluginName);
      const versions = await safeDirs(pluginPath);
      const candidateRoots = versions.length ? versions.map((version) => join(pluginPath, version)) : [pluginPath];
      for (const candidateRoot of candidateRoots) {
        const skillCount = (await findFiles(candidateRoot, "SKILL.md")).length;
        if (!skillCount) continue;
        const githubUrl = await resolveGithubUrl(candidateRoot, "");
        const tags = uniqueTags([pluginFunctionTag(pluginName), ...inferFunctionTags(`${prettyPluginName(pluginName)} ${family}`)]).slice(0, 6);
        const pluginSummary = `${skillCount} skills indexed from plugin cache.`;
        const zh = zhCapabilityNarrative("plugin", prettyPluginName(pluginName), pluginSummary, family);
        result.push({
          id: stableId("plugin", candidateRoot),
          type: "plugin",
          name: prettyPluginName(pluginName),
          summary: pluginSummary,
          description: `${prettyPluginName(pluginName)} plugin cache at ${candidateRoot}.`,
          source: "codex",
          status: "installed",
          path: normalize(candidateRoot),
          invocation: `@${prettyPluginName(pluginName)}`,
          tags,
          risks: [],
          lastSeenAt: new Date().toISOString(),
          tokenEstimate: 0,
          metadata: {
            skills: skillCount,
            family,
            officialBuiltIn: isOfficialCodexSource(family, candidateRoot),
            officialSource: officialSourceLabel(family, candidateRoot),
            githubUrl: githubUrl ?? "",
            sourceTags: ["\u5916\u639b", family],
            zhSummary: zh.summary,
            zhScenarios: zh.scenarios
          }
        });
      }
    }
  }

  return result;
}

async function mcpCapabilities(file: string): Promise<Capability[]> {
  const text = await readFile(file, "utf8");
  const sections = parseMcpServerSections(text);
  return sections.map((section) => {
    const command = section.values.command;
    const url = section.values.url;
    const envKeys = section.envKeys;
    const risks: RiskBadge[] = [];
    if (command) {
      risks.push({
        id: "local-command",
        label: "local-command",
        level: "medium",
        reason: "MCP server starts a local command. This is expected for local MCP servers but should be reviewed."
      });
    }
    if (url) {
      risks.push({
        id: "network",
        label: "network-endpoint",
        level: "medium",
        reason: "MCP server connects to a remote endpoint."
      });
    }
    if (envKeys.length) {
      risks.push({
        id: "env-keys",
        label: "env-keys",
        level: "low",
        reason: `Configured env keys: ${envKeys.join(", ")}. Values are not read.`
      });
    }

    const tags = inferFunctionTags(`${section.name} ${command ?? ""} ${url ?? ""} ${section.values.args ?? ""}`).slice(0, 6);
    const mcpSummary = command ? `Local command: ${command}` : url ? `Remote endpoint: ${url}` : "Configured MCP server.";
    const zh = zhCapabilityNarrative("mcp", section.name, mcpSummary, command ? "\u672c\u6a5f\u547d\u4ee4" : url ? "\u9060\u7aef\u7aef\u9ede" : "\u8a2d\u5b9a\u6a94");

    return {
      id: stableId("mcp", `${file}:${section.name}`),
      type: "mcp",
      name: section.name,
      summary: mcpSummary,
      description: command
        ? `Configured in config.toml. Command: ${command}.`
        : url
          ? `Configured in config.toml. URL: ${url}.`
          : "Configured in config.toml.",
      source: "codex",
      status: "enabled",
      path: normalize(file),
      invocation: `mcp:${section.name}`,
      tags,
      risks,
      lastSeenAt: new Date().toISOString(),
      tokenEstimate: 0,
      metadata: {
        command: command ?? "",
        url: url ?? "",
        args: section.values.args ?? "",
        envKeys,
        sourceTags: ["MCP", command ? "\u672c\u6a5f" : "\u9060\u7aef"],
        zhSummary: zh.summary,
        zhScenarios: zh.scenarios
      }
    } satisfies Capability;
  });
}

function firstMarkdownTitle(content: string) {
  return content.match(/^#\s+(.+)$/m)?.[1]?.trim() ?? "";
}

function firstParagraph(content: string) {
  return (
    content
      .replace(/^---[\s\S]*?---/, "")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .find((line) => line && !line.startsWith("#") && !line.startsWith("-") && !line.startsWith("```")) ?? ""
  );
}

async function enrichGithubStars(capabilities: Capability[]) {
  const cache = await loadGithubStarsCache();
  const urls = uniqueTags(
    capabilities
      .map((capability) => metadataString(capability, "githubUrl"))
      .filter((url) => url.startsWith("https://github.com/"))
  );
  const entries = await Promise.all(urls.map(async (url) => [url, await fetchGithubStars(url)] as const));
  const starsByUrl = new Map(entries);
  const now = new Date().toISOString();
  let cacheChanged = false;

  const enriched = capabilities.map((capability) => {
    const githubUrl = metadataString(capability, "githubUrl");
    const result = starsByUrl.get(githubUrl);
    if (!result) return capability;
    const cached = cache[githubUrl];
    const stars = result.ok ? result.stars : cached?.stars ?? -1;
    const updatedAt = result.ok ? now : cached?.updatedAt ?? now;
    const status = result.ok ? "live" : cached ? "cached" : "unavailable";
    if (result.ok) {
      cache[githubUrl] = { stars: result.stars, updatedAt: now };
      cacheChanged = true;
    }
    return {
      ...capability,
      metadata: {
        ...capability.metadata,
        githubStars: stars,
        githubStarsUpdatedAt: updatedAt,
        githubStarsStatus: status
      }
    };
  });

  if (cacheChanged) await saveGithubStarsCache(cache);
  return enriched;
}

async function enrichTranslations(capabilities: Capability[]) {
  const cache = await loadTranslationCache();
  const provider = await translationProvider();
  const now = new Date().toISOString();
  const pending: Array<{ capability: Capability; key: string; source: string }> = [];
  let cacheChanged = false;

  const enriched = capabilities.map((capability) => {
    if (capability.type !== "skill") return capability;
    const source = capability.summary.trim().replace(/\s+/g, " ");
    const key = translationCacheKey(capability);
    const cached = cache[key];
    if (cached?.source === source && cached.zhSummary) {
      return {
        ...capability,
        metadata: {
          ...capability.metadata,
          zhSummary: cached.zhSummary,
          zhScenarios: cached.zhScenarios,
          translationStatus: "cached",
          translationProvider: cached.provider
        }
      };
    }

    if (provider.enabled) {
      pending.push({ capability, key, source });
    }

    return {
      ...capability,
      metadata: {
        ...capability.metadata,
        translationStatus: provider.enabled ? "pending" : capability.metadata?.zhSummary === capability.summary ? "original" : "manual",
        translationProvider: provider.name
      }
    };
  });

  if (!provider.enabled || pending.length === 0) return enriched;

  const translations = new Map<string, { zhSummary: string; zhScenarios: string[] }>();
  for (const batch of chunks(pending, 8)) {
    const payload = batch.map((item) => ({
      id: item.key,
      name: item.capability.name,
      summary: item.source
    }));
    const translated =
      provider.name === "gemini"
        ? await translateBatchWithGemini(payload, provider.model, provider.apiKey)
        : await translateBatchWithOpenAI(payload, provider.model, provider.apiKey);
    for (const item of translated) {
      if (!item.zhSummary) continue;
      translations.set(item.id, {
        zhSummary: item.zhSummary,
        zhScenarios: item.zhScenarios.slice(0, 2)
      });
    }
  }

  const translatedCapabilities = enriched.map((capability) => {
    if (capability.type !== "skill") return capability;
    const key = translationCacheKey(capability);
    const translated = translations.get(key);
    if (!translated) {
      return {
        ...capability,
        metadata: {
          ...capability.metadata,
          translationStatus: capability.metadata?.translationStatus === "cached" ? "cached" : "unavailable",
          translationProvider: provider.name
        }
      };
    }

    cache[key] = {
      source: capability.summary.trim().replace(/\s+/g, " "),
      zhSummary: translated.zhSummary,
      zhScenarios: translated.zhScenarios,
      provider: provider.name,
      updatedAt: now
    };
    cacheChanged = true;

    return {
      ...capability,
      metadata: {
        ...capability.metadata,
        zhSummary: translated.zhSummary,
        zhScenarios: translated.zhScenarios,
        translationStatus: "live",
        translationProvider: provider.name,
        translationUpdatedAt: now
      }
    };
  });

  if (cacheChanged) await saveTranslationCache(cache);
  return translatedCapabilities;
}

async function translationProvider() {
  const settings = await readTranslationSettings();
  const configured = (settings.provider || process.env.SKILL_DASHBOARD_TRANSLATION_PROVIDER || "").trim().toLowerCase();
  const geminiApiKey = settings.geminiApiKey || process.env.GEMINI_API_KEY?.trim() || process.env.GOOGLE_API_KEY?.trim() || "";
  const openaiApiKey = settings.openaiApiKey || process.env.OPENAI_API_KEY?.trim() || "";
  const providerName = configured === "gemini" ? "gemini" : configured === "openai" ? "openai" : openaiApiKey ? "openai" : geminiApiKey ? "gemini" : "none";
  const apiKey = providerName === "gemini" ? geminiApiKey : providerName === "openai" ? openaiApiKey : "";
  return {
    enabled: Boolean(apiKey) && providerName !== "none",
    name: providerName,
    apiKey,
    model:
      settings.model ||
      process.env.SKILL_DASHBOARD_TRANSLATION_MODEL?.trim() ||
      (providerName === "gemini" ? "gemini-3.1-flash-lite-preview" : process.env.OPENAI_MODEL?.trim() || "gpt-4.1-mini")
  };
}

async function loadTranslationCache() {
  if (translationCache) return translationCache;
  try {
    const text = await readFile(translationCachePath, "utf8");
    const parsed = JSON.parse(text) as Record<string, TranslationCacheEntry>;
    translationCache = parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    translationCache = {};
  }
  return translationCache;
}

async function saveTranslationCache(cache: Record<string, TranslationCacheEntry>) {
  await mkdir(dirname(translationCachePath), { recursive: true });
  await writeFile(translationCachePath, JSON.stringify(cache, null, 2), "utf8");
}

function translationCacheKey(capability: Capability) {
  return stableId("zh", `${capability.type}:${capability.name}:${capability.summary.trim().replace(/\s+/g, " ")}`);
}

async function translateBatchWithOpenAI(
  items: Array<{ id: string; name: string; summary: string }>,
  model: string,
  apiKey: string
): Promise<Array<{ id: string; zhSummary: string; zhScenarios: string[] }>> {
  if (!apiKey) return [];

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60000);
  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model,
        input: [
          {
            role: "system",
            content:
              "Translate Codex skill summaries from English to Traditional Chinese. Preserve product names, code identifiers, quoted phrases, model names, and technical acronyms. Do not add claims, remove meaning, summarize, or invent content. Return JSON only."
          },
          {
            role: "user",
            content: JSON.stringify({
              output_shape: {
                items: [
                  {
                    id: "same id as input",
                    zhSummary: "faithful Traditional Chinese translation of summary",
                    zhScenarios: ["1-2 short Traditional Chinese usage scenarios translated from the source summary only"]
                  }
                ]
              },
              items
            })
          }
        ],
        max_output_tokens: 6000
      }),
      signal: controller.signal
    });
    if (!response.ok) return [];
    const payload = (await response.json()) as { output_text?: string; output?: Array<{ content?: Array<{ text?: string }> }> };
    const text =
      payload.output_text ??
      payload.output
        ?.flatMap((item) => item.content ?? [])
        .map((content) => content.text ?? "")
        .join("")
        .trim() ??
      "";
    const parsed = JSON.parse(stripJsonFence(text)) as { items?: Array<{ id?: string; zhSummary?: string; zhScenarios?: string[] }> };
    return normalizeTranslationItems(parsed.items ?? []);
  } catch {
    return [];
  } finally {
    clearTimeout(timeout);
  }
}

async function translateBatchWithGemini(
  items: Array<{ id: string; name: string; summary: string }>,
  model: string,
  apiKey: string
): Promise<Array<{ id: string; zhSummary: string; zhScenarios: string[] }>> {
  if (!apiKey) return [];
  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model,
      contents: [
        {
          role: "user",
          parts: [
            {
              text: [
                "Translate Codex skill summaries from English to Traditional Chinese.",
                "Preserve product names, code identifiers, quoted phrases, model names, and technical acronyms.",
                "Do not add claims, remove meaning, summarize, or invent content.",
                "Return JSON only with shape: {\"items\":[{\"id\":\"...\",\"zhSummary\":\"...\",\"zhScenarios\":[\"...\"]}]}",
                JSON.stringify({ items })
              ].join("\n")
            }
          ]
        }
      ]
    });
    const text = typeof response.text === "string" ? response.text : "";
    const parsed = JSON.parse(stripJsonFence(text)) as { items?: Array<{ id?: string; zhSummary?: string; zhScenarios?: string[] }> };
    return normalizeTranslationItems(parsed.items ?? []);
  } catch {
    return [];
  }
}

function stripJsonFence(text: string) {
  return text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "");
}

function normalizeTranslationItems(items: Array<{ id?: string; zhSummary?: string; zhScenarios?: string[] }>) {
  return items
    .filter((item): item is { id: string; zhSummary: string; zhScenarios: string[] } => Boolean(item.id && item.zhSummary))
    .map((item) => ({
      id: item.id,
      zhSummary: item.zhSummary.trim(),
      zhScenarios: Array.isArray(item.zhScenarios)
        ? item.zhScenarios.filter((scenario) => typeof scenario === "string" && scenario.trim()).map((scenario) => scenario.trim())
        : []
    }));
}

function chunks<T>(items: T[], size: number) {
  const result: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    result.push(items.slice(index, index + size));
  }
  return result;
}

async function loadGithubStarsCache() {
  if (githubStarsCache) return githubStarsCache;
  try {
    const text = await readFile(githubStarsCachePath, "utf8");
    const parsed = JSON.parse(text) as Record<string, { stars: number; updatedAt: string }>;
    githubStarsCache = parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    githubStarsCache = {};
  }
  return githubStarsCache;
}

async function saveGithubStarsCache(cache: Record<string, { stars: number; updatedAt: string }>) {
  await mkdir(dirname(githubStarsCachePath), { recursive: true });
  await writeFile(githubStarsCachePath, JSON.stringify(cache, null, 2), "utf8");
}

async function fetchGithubStars(githubUrl: string): Promise<{ ok: true; stars: number } | { ok: false; error: string }> {
  const repo = githubRepoSlug(githubUrl);
  if (!repo) return { ok: false, error: "unsupported GitHub URL" };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4500);
  const githubToken = process.env.GITHUB_TOKEN?.trim();
  try {
    const response = await fetch(`https://api.github.com/repos/${repo}`, {
      headers: {
        Accept: "application/vnd.github+json",
        ...(githubToken ? { Authorization: `Bearer ${githubToken}` } : {}),
        "User-Agent": "Skill-Dashboard",
        "X-GitHub-Api-Version": "2022-11-28"
      },
      signal: controller.signal
    });
    if (!response.ok) return { ok: false, error: `${response.status} ${response.statusText}` };
    const payload = (await response.json()) as { stargazers_count?: unknown };
    return typeof payload.stargazers_count === "number"
      ? { ok: true, stars: payload.stargazers_count }
      : { ok: false, error: "missing stargazers_count" };
  } catch (error) {
    return { ok: false, error: messageFrom(error) };
  } finally {
    clearTimeout(timeout);
  }
}

function githubRepoSlug(githubUrl: string) {
  const match = githubUrl.match(/^https:\/\/github\.com\/([^/\s]+)\/([^/\s#?]+)(?:[/?#]|$)/);
  if (!match) return "";
  return `${match[1]}/${match[2].replace(/\.git$/, "")}`;
}

function metadataString(capability: Capability, key: string) {
  const value = capability.metadata?.[key];
  return typeof value === "string" ? value : "";
}

function skillTags({
  name,
  summary,
  frontmatterTags
}: {
  name: string;
  summary: string;
  frontmatterTags: string[];
}) {
  const declared = uniqueTags(frontmatterTags.map(normalizeTag));
  if (declared.length) return declared.slice(0, 10);

  return inferFunctionTags(`${name} ${summary}`).slice(0, 6);
}

const functionTagRules: Array<{ tag: string; pattern: RegExp }> = [
  { tag: "\u524d\u7aef", pattern: /\b(frontend|react|next\.?js|vite|ui|css|html|component|dashboard|web app)\b/i },
  { tag: "\u6e2c\u8a66", pattern: /\b(test|debug|playwright|browser|screenshot|qa|validation|smoke)\b/i },
  { tag: "\u700f\u89bd\u5668", pattern: /\b(browser|chrome|webpage|localhost|tab|navigate)\b/i },
  { tag: "\u5b89\u5168", pattern: /\b(security|threat|vulnerability|attack|hardening|auth|permission|secret)\b/i },
  { tag: "\u8cc7\u6599\u5206\u6790", pattern: /\b(data|analytics|dashboard|report|metric|kpi|sql|bigquery|spreadsheet|chart|visualize)\b/i },
  { tag: "\u8a2d\u8a08", pattern: /\b(design|prototype|wireframe|mockup|figma|ux|visual|portfolio|landing|brand)\b/i },
  { tag: "\u5f71\u50cf\u751f\u6210", pattern: /\b(image|photo|logo|moodboard|shot|scene|creative|ad|generative|ads?)\b/i },
  { tag: "\u904a\u6232", pattern: /\b(game|phaser|three|webgl|sprite|asset|physics)\b/i },
  { tag: "\u6587\u4ef6", pattern: /\b(document|docs|documentation|adr|pdf|notion|google docs|slides)\b/i },
  { tag: "GitHub", pattern: /\b(github|pull request|pr|issue|commit|branch|ci)\b/i },
  { tag: "\u90f5\u4ef6", pattern: /\b(gmail|email|inbox|mail)\b/i },
  { tag: "\u96f2\u7aef", pattern: /\b(cloud|firebase|supabase|postgres|database|deploy|run|serverless)\b/i },
  { tag: "API", pattern: /\b(api|sdk|openai|gemini|mcp|connector|plugin)\b/i },
  { tag: "\u92b7\u552e", pattern: /\b(sales|crm|account|deal|forecast|customer)\b/i },
  { tag: "\u6295\u8cc7", pattern: /\b(invest|equity|banking|valuation|market|deal|portfolio)\b/i },
  { tag: "\u81ea\u52d5\u5316", pattern: /\b(automation|schedule|monitor|workflow)\b/i }
];

function inferFunctionTags(text: string) {
  return functionTagRules.filter((rule) => rule.pattern.test(text)).map((rule) => rule.tag);
}

function pluginFunctionTag(pluginName: string) {
  const tags = inferFunctionTags(pluginName.replace(/[-_]/g, " "));
  return tags[0] ?? normalizeTag(pluginName);
}

function sourceTagsForSkill(pluginName: string, rootLabel: string) {
  return uniqueTags([
    pluginName ? "\u5916\u639b" : "",
    rootLabel === "user-skills" ? "\u4f7f\u7528\u8005" : "",
    rootLabel === "workspace" ? "\u5de5\u4f5c\u5340" : "",
    !pluginName && rootLabel !== "workspace" ? "\u672c\u6a5f" : "",
    rootLabel
  ]);
}

function zhCapabilityNarrative(type: "skill" | "mcp" | "plugin", name: string, sourceSummary: string, source: string) {
  void type;
  void source;
  const summary = sourceSummary.trim().replace(/\s+/g, " ") || "No summary found.";
  const translated = manualZhTranslation(name, summary);
  return {
    summary: translated?.summary ?? summary,
    scenarios: translated?.scenarios ?? scenariosFromSourceSummary(summary)
  };
}

function manualZhTranslation(name: string, sourceSummary: string) {
  if (name !== "anthropic-startup") return undefined;
  const expected =
    "Use when evaluating, validating, planning, building, launching, or scaling an AI-native startup, product idea, MVP, feature, or go-to-market motion. Applies stage-based startup reasoning across Idea, MVP, Launch, and Scale, with mandatory market, competitor, and community research before recommending build decisions. Use for customer discovery, competitor comparison, differentiation analysis, MVP scope, launch readiness, product-market fit diagnostics, founder bottleneck mapping, and AI-assisted operating systems.";
  if (sourceSummary !== expected) return undefined;
  return {
    summary:
      "適用於評估、驗證、規劃、建置、發布或擴展 AI-native 新創、產品想法、MVP、功能或 go-to-market 行動。它會依 Idea、MVP、Launch、Scale 階段套用新創推理，並要求在提出建置決策建議前，先完成市場、競爭者與社群研究。可用於客戶探索、競爭者比較、差異化分析、MVP 範圍界定、發布準備度、product-market fit 診斷、創辦人瓶頸盤點，以及 AI 輔助營運系統。",
    scenarios: [
      "評估、驗證、規劃、建置、發布或擴展 AI-native 新創、產品想法、MVP、功能或 go-to-market 行動。",
      "用於客戶探索、競爭者比較、差異化分析、MVP 範圍界定、發布準備度、product-market fit 診斷、創辦人瓶頸盤點，以及 AI 輔助營運系統。"
    ]
  };
}

function scenariosFromSourceSummary(sourceSummary: string) {
  const sentences = sourceSummary
    .split(/(?<=\.)\s+/)
    .map((item) => item.trim())
    .filter(Boolean);
  const useSentence = sentences.find((sentence) => /^Use when\b/i.test(sentence) || /^Use for\b/i.test(sentence));
  return [useSentence, sentences[0]].filter((item, index, list): item is string => Boolean(item) && list.indexOf(item) === index).slice(0, 2);
}

function normalizeTag(value: string) {
  return value.trim().replace(/^["']|["']$/g, "");
}

function uniqueTags(values: string[]) {
  const seen = new Set<string>();
  const tags: string[] = [];
  for (const value of values) {
    const tag = normalizeTag(value);
    const key = tag.toLowerCase();
    if (!tag || seen.has(key)) continue;
    seen.add(key);
    tags.push(tag);
  }
  return tags;
}

async function resolveGithubUrl(path: string, primaryContent: string) {
  return (
    extractGithubUrl(primaryContent) ??
    (await githubUrlFromGitRemote(path)) ??
    (await githubUrlFromNearbyReadme(path))
  );
}

function extractGithubUrl(content: string) {
  const urls = [
    ...Array.from(content.matchAll(/https:\/\/github\.com\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+(?:\.git)?/g)).map((match) => match[0]),
    ...Array.from(content.matchAll(/git@github\.com:([A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+)(?:\.git)?/g)).map((match) => `https://github.com/${match[1]}`),
    ...Array.from(content.matchAll(/ssh:\/\/git@github\.com\/([A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+)(?:\.git)?/g)).map((match) => `https://github.com/${match[1]}`)
  ];
  return urls.map(cleanGithubUrl).find((url) => url && !isPlaceholderGithubUrl(url));
}

async function githubUrlFromGitRemote(path: string) {
  for (const dir of ancestorDirs(path)) {
    const config = await safeReadText(join(dir, ".git", "config"));
    if (!config) continue;
    const url = extractGithubUrl(config);
    if (url) return url;
  }
  return undefined;
}

async function githubUrlFromNearbyReadme(path: string) {
  for (const dir of ancestorDirs(path)) {
    for (const name of ["README.md", "README.mdx", "README.txt"]) {
      const text = await safeReadText(join(dir, name), 20000);
      const url = text ? extractGithubUrl(text) : undefined;
      if (url) return url;
    }
  }
  return undefined;
}

function ancestorDirs(path: string) {
  const start = path.endsWith(sep) ? path : path.toLowerCase().endsWith(`${sep}skill.md`) ? dirname(path) : path;
  const dirs: string[] = [];
  const root = parsePath(start).root;
  let current = normalize(start);
  for (let depth = 0; depth < 10 && current && current !== root; depth += 1) {
    dirs.push(current);
    const parent = dirname(current);
    if (parent === current) break;
    current = parent;
  }
  return dirs;
}

async function safeReadText(path: string, maxChars = 12000) {
  try {
    const text = await readFile(path, "utf8");
    return text.slice(0, maxChars);
  } catch {
    return "";
  }
}

function cleanGithubUrl(url: string) {
  const match = url.match(/^https:\/\/github\.com\/([^/\s]+)\/([^/\s#?]+)/);
  if (!match) return "";
  return `https://github.com/${match[1]}/${match[2].replace(/\.git$/, "")}`;
}

function isPlaceholderGithubUrl(githubUrl: string) {
  const slug = githubRepoSlug(githubUrl).toLowerCase();
  return ["org/repo", "owner/repo", "user/repo", "octocat/hello-world"].includes(slug);
}

async function readHead(file: string) {
  const text = await readFile(file, "utf8");
  return text.slice(0, 12000);
}

async function safeDirs(root: string) {
  try {
    const entries = await readdir(root, { withFileTypes: true });
    return entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name);
  } catch {
    return [];
  }
}

function sourceFromSkillPath(file: string) {
  const normalized = normalize(file);
  const relPlugins = relative(join(codexHome, "plugins", "cache"), normalized);
  if (!relPlugins.startsWith("..")) {
    const parts = relPlugins.split(sep);
    return {
      source: "codex" as const,
      pluginName: parts[1] ?? "",
      rootLabel: parts[0] ?? "plugin-cache"
    };
  }

  const relSkills = relative(join(codexHome, "skills"), normalized);
  return {
    source: "codex" as const,
    pluginName: "",
    rootLabel: relSkills.startsWith("..") ? "workspace" : "user-skills"
  };
}

function isOfficialCodexSource(rootLabel: string, path: string) {
  return (
    rootLabel === "openai-bundled" ||
    rootLabel === "openai-curated" ||
    rootLabel === "openai-curated-remote" ||
    normalize(path).includes(`${sep}skills${sep}.system${sep}`)
  );
}

function officialSourceLabel(rootLabel: string, path: string) {
  if (!isOfficialCodexSource(rootLabel, path)) return "";
  if (rootLabel === "openai-bundled") return "OpenAI bundled";
  if (rootLabel === "openai-curated") return "OpenAI curated";
  if (rootLabel === "openai-curated-remote") return "OpenAI curated remote";
  return "OpenAI system";
}

function risksFromText(content: string): RiskBadge[] {
  const risks: RiskBadge[] = [];
  if (/\b(shell|command|exec|spawn|powershell|bash|cmd\.exe)\b/i.test(content)) {
    risks.push({
      id: "mentions-command",
      label: "mentions-command",
      level: "medium",
      reason: "Skill text references command execution. This is a review flag, not a confirmed problem."
    });
  }
  if (/\b(env|secret|token|api[_-]?key|credential)\b/i.test(content)) {
    risks.push({
      id: "mentions-secrets",
      label: "mentions-secrets",
      level: "medium",
      reason: "Skill text references credentials, tokens, or environment variables. Values are not read by the scanner."
    });
  }
  if (/\b(http|network|download|upload|fetch|curl)\b/i.test(content)) {
    risks.push({
      id: "mentions-network",
      label: "mentions-network",
      level: "low",
      reason: "Skill text references network access."
    });
  }
  return risks;
}

function duplicateRisk(): RiskBadge {
  return {
    id: "duplicate-name",
    label: "duplicate-name",
    level: "medium",
    reason: "Another capability has the same type and name."
  };
}

function dedupeCapabilities(items: Capability[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = `${item.type}:${item.path}:${item.name}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function duplicates(values: string[]) {
  const seen = new Set<string>();
  const duplicate = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) duplicate.add(value);
    seen.add(value);
  }
  return duplicate;
}

function stableId(type: string, input: string) {
  let hash = 0;
  for (let index = 0; index < input.length; index += 1) {
    hash = (hash * 31 + input.charCodeAt(index)) >>> 0;
  }
  return `${type}-${hash.toString(16)}`;
}

function estimateTokens(text: string) {
  return Math.max(1, Math.ceil(text.length / 4));
}

function kebab(value: string) {
  return value
    .trim()
    .replace(/([a-z])([A-Z])/g, "$1-$2")
    .replace(/[^A-Za-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
}

function prettyPluginName(value: string) {
  return value
    .split(/[-_]/g)
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase() + part.slice(1))
    .join(" ");
}

function typeRank(type: Capability["type"]) {
  return { skill: 1, mcp: 2, plugin: 3, agent: 4 }[type];
}

function messageFrom(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}
