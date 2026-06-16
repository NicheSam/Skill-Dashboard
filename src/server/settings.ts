import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import type { TranslationSettings, TranslationSettingsResponse, TranslationSettingsUpdate } from "../shared/schema";

const settingsPath = join(process.cwd(), "data", "local-settings.json");

const defaultSettings: TranslationSettings = {
  provider: "none",
  model: "",
  geminiApiKey: "",
  openaiApiKey: "",
  updatedAt: ""
};

export async function readTranslationSettings(): Promise<TranslationSettings> {
  try {
    const text = await readFile(settingsPath, "utf8");
    const parsed = JSON.parse(text) as Partial<TranslationSettings>;
    return {
      ...defaultSettings,
      ...parsed,
      provider: parsed.provider === "gemini" || parsed.provider === "openai" || parsed.provider === "none" ? parsed.provider : "none"
    };
  } catch {
    return { ...defaultSettings };
  }
}

export async function updateTranslationSettings(update: TranslationSettingsUpdate): Promise<TranslationSettingsResponse> {
  const current = await readTranslationSettings();
  const provider = update.provider === "gemini" || update.provider === "openai" || update.provider === "none" ? update.provider : current.provider;
  const next: TranslationSettings = {
    ...current,
    provider,
    model: typeof update.model === "string" ? update.model.trim() : current.model,
    updatedAt: new Date().toISOString()
  };

  if (typeof update.apiKey === "string" && update.apiKey.trim()) {
    if (provider === "gemini") next.geminiApiKey = update.apiKey.trim();
    if (provider === "openai") next.openaiApiKey = update.apiKey.trim();
  }
  if (update.removeApiKey) {
    if (provider === "gemini") next.geminiApiKey = "";
    if (provider === "openai") next.openaiApiKey = "";
  }

  await mkdir(dirname(settingsPath), { recursive: true });
  await writeFile(settingsPath, JSON.stringify(next, null, 2), "utf8");
  return sanitizeTranslationSettings(next);
}

export function sanitizeTranslationSettings(settings: TranslationSettings): TranslationSettingsResponse {
  const configuredKey = settings.provider === "gemini" ? settings.geminiApiKey : settings.provider === "openai" ? settings.openaiApiKey : "";
  return {
    provider: settings.provider,
    model: settings.model,
    apiKeyConfigured: Boolean(configuredKey),
    updatedAt: settings.updatedAt
  };
}
