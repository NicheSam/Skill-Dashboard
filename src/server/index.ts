import cors from "@fastify/cors";
import Fastify from "fastify";
import { execFile } from "node:child_process";
import { stat } from "node:fs/promises";
import { platform } from "node:os";
import { dirname } from "node:path";
import type {
  GithubLinkCandidatesResponse,
  GithubLinkResponse,
  GithubLinkUpdate,
  InventoryResponse,
  OpenPathRequest,
  OpenPathResponse,
  TranslationSettingsResponse,
  TranslationSettingsUpdate
} from "../shared/schema";
import { deleteGithubLink, setGithubLink } from "./github-links";
import { scanInventory } from "./scanner";
import { readTranslationSettings, sanitizeTranslationSettings, updateTranslationSettings } from "./settings";

const app = Fastify({ logger: true });
const port = Number(process.env.SKILL_DASHBOARD_API_PORT ?? 8766);

let inventory: InventoryResponse = await scanInventory();

await app.register(cors, {
  origin: ["http://127.0.0.1:8765", "http://localhost:8765"]
});

app.get("/api/health", async () => ({
  ok: true,
  service: "skill-dashboard-api",
  port,
  scannedAt: inventory.scan.scannedAt
}));

app.get("/api/inventory", async () => inventory);

app.get("/api/capabilities", async () => inventory.capabilities);

app.get<{ Reply: TranslationSettingsResponse }>("/api/settings/translation", async () => sanitizeTranslationSettings(await readTranslationSettings()));

app.post<{ Body: TranslationSettingsUpdate; Reply: TranslationSettingsResponse }>("/api/settings/translation", async (request) => {
  return updateTranslationSettings(request.body);
});

app.post("/api/scan", async () => {
  inventory = await scanInventory();
  return inventory;
});

app.get<{ Querystring: { capabilityId?: string }; Reply: GithubLinkCandidatesResponse }>("/api/github-link-candidates", async (request, reply) => {
  const capabilityId = request.query.capabilityId ?? "";
  const selected = inventory.capabilities.find((capability) => capability.id === capabilityId);
  if (!selected) {
    return reply.code(404).send({ capabilityId, candidates: [] });
  }
  const candidates = selected.metadata?.githubCandidates;
  return {
    capabilityId,
    candidates: Array.isArray(candidates) ? candidates.filter((item): item is string => typeof item === "string") : []
  };
});

app.post<{ Body: GithubLinkUpdate; Reply: GithubLinkResponse }>("/api/github-links", async (request, reply) => {
  const capabilityId = request.body.capabilityId;
  const url = cleanGithubUrl(request.body.url);
  if (!inventory.capabilities.some((capability) => capability.id === capabilityId)) {
    return reply.code(404).send({ ok: false, capabilityId, url: "" });
  }
  if (!url) {
    return reply.code(400).send({ ok: false, capabilityId, url: "" });
  }
  await setGithubLink(capabilityId, url);
  inventory = await scanInventory();
  return { ok: true, capabilityId, url };
});

app.delete<{ Params: { capabilityId: string }; Reply: GithubLinkResponse }>("/api/github-links/:capabilityId", async (request, reply) => {
  const capabilityId = request.params.capabilityId;
  if (!inventory.capabilities.some((capability) => capability.id === capabilityId)) {
    return reply.code(404).send({ ok: false, capabilityId, url: "" });
  }
  await deleteGithubLink(capabilityId);
  inventory = await scanInventory();
  return { ok: true, capabilityId, url: "" };
});

app.post<{ Body: OpenPathRequest; Reply: OpenPathResponse }>("/api/open-path", async (request, reply) => {
  const selected = inventory.capabilities.find((capability) => capability.id === request.body.capabilityId);
  if (!selected) {
    return reply.code(404).send({ ok: false, path: "" });
  }

  const targetPath = await folderPathFor(selected.path);
  openFolder(targetPath);
  return { ok: true, path: targetPath };
});

async function folderPathFor(path: string) {
  try {
    const info = await stat(path);
    return info.isDirectory() ? path : dirname(path);
  } catch {
    return dirname(path);
  }
}

function openFolder(path: string) {
  const currentPlatform = platform();
  if (currentPlatform === "win32") {
    execFile("explorer.exe", [path]);
    return;
  }
  if (currentPlatform === "darwin") {
    execFile("open", [path]);
    return;
  }
  execFile("xdg-open", [path]);
}

function cleanGithubUrl(value: string) {
  const normalized = value.trim().replace(/^git\+/, "").replace(/^github:/, "https://github.com/");
  const ssh = normalized.match(/^git@github\.com:([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)(?:\.git)?$/);
  if (ssh) return `https://github.com/${ssh[1]}/${ssh[2].replace(/\.git$/, "")}`;
  const sshUrl = normalized.match(/^ssh:\/\/git@github\.com\/([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)(?:\.git)?$/);
  if (sshUrl) return `https://github.com/${sshUrl[1]}/${sshUrl[2].replace(/\.git$/, "")}`;
  const shortcut = normalized.match(/^([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)(?:#.+)?$/);
  if (shortcut) return `https://github.com/${shortcut[1]}/${shortcut[2].replace(/\.git$/, "")}`;
  const match = normalized.match(/^https?:\/\/github\.com\/([^/\s]+)\/([^/\s#?]+)/);
  if (!match) return "";
  const url = `https://github.com/${match[1]}/${match[2].replace(/\.git$/, "")}`;
  return ["org/repo", "owner/repo", "user/repo", "octocat/hello-world"].includes(`${match[1]}/${match[2]}`.toLowerCase()) ? "" : url;
}

await app.listen({ host: "127.0.0.1", port });
