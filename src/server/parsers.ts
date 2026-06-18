import matter from "gray-matter";
import { parse as parseToml } from "smol-toml";

export interface SkillFrontmatter {
  name: string;
  summary: string;
  description: string;
  tags: string[];
}

export interface McpServerSection {
  name: string;
  values: Record<string, string>;
  envKeys: string[];
}

export function parseSkillFrontmatter(content: string): SkillFrontmatter {
  const parsed = matter(content);
  const data = isRecord(parsed.data) ? parsed.data : {};

  return {
    name: frontmatterString(data.name),
    summary: frontmatterString(data.summary),
    description: frontmatterString(data.description),
    tags: frontmatterStringArray(data.tags)
  };
}

export function parseMcpServerSections(text: string): McpServerSection[] {
  const sections: McpServerSection[] = [];
  const parsed = parseToml(text) as Record<string, unknown>;
  const servers = isRecord(parsed.mcp_servers) ? parsed.mcp_servers : {};

  for (const [name, rawConfig] of Object.entries(servers)) {
    if (!isRecord(rawConfig)) continue;
    const values: Record<string, string> = {};
    const envKeys = new Set<string>();

    for (const key of ["command", "url", "bearer_token_env_var"] as const) {
      const value = rawConfig[key];
      if (typeof value === "string") values[key] = value;
    }

    if (Array.isArray(rawConfig.args)) {
      values.args = rawConfig.args.map((item) => String(item)).join(" ");
    } else if (typeof rawConfig.args === "string") {
      values.args = rawConfig.args;
    }

    const env = rawConfig.env;
    if (isRecord(env)) {
      for (const key of Object.keys(env)) envKeys.add(key);
    }
    if (typeof rawConfig.bearer_token_env_var === "string") {
      envKeys.add(rawConfig.bearer_token_env_var);
    }

    sections.push({ name, values, envKeys: Array.from(envKeys).sort() });
  }

  return sections;
}

function frontmatterString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function frontmatterStringArray(value: unknown) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }
  if (typeof value === "string") {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}
