export type CapabilityType = "skill" | "mcp" | "plugin" | "agent";

export type CapabilityStatus = "installed" | "enabled" | "visible" | "callable" | "broken";

export type RiskLevel = "low" | "medium" | "high";

export interface RiskBadge {
  id: string;
  label: string;
  level: RiskLevel;
  reason: string;
}

export interface Capability {
  id: string;
  type: CapabilityType;
  name: string;
  summary: string;
  description: string;
  source: "codex" | "claude" | "cursor" | "generic";
  status: CapabilityStatus;
  path: string;
  invocation: string;
  tags: string[];
  risks: RiskBadge[];
  lastSeenAt: string;
  tokenEstimate: number;
  metadata?: Record<string, string | number | boolean | string[]>;
}

export interface Profile {
  id: string;
  name: string;
  description: string;
  preferredCapabilityIds: string[];
}

export interface OpenPathRequest {
  capabilityId: string;
}

export interface OpenPathResponse {
  ok: boolean;
  path: string;
}

export type TranslationProvider = "none" | "openai" | "gemini";

export interface TranslationSettings {
  provider: TranslationProvider;
  model: string;
  geminiApiKey: string;
  openaiApiKey: string;
  updatedAt: string;
}

export interface TranslationSettingsResponse {
  provider: TranslationProvider;
  model: string;
  apiKeyConfigured: boolean;
  updatedAt: string;
}

export interface TranslationSettingsUpdate {
  provider: TranslationProvider;
  model?: string;
  apiKey?: string;
  removeApiKey?: boolean;
}

export interface ScanMeta {
  scannedAt: string;
  roots: string[];
  errors: string[];
}

export interface InventoryResponse {
  capabilities: Capability[];
  scan: ScanMeta;
}
