import cors from "@fastify/cors";
import Fastify from "fastify";
import { execFile } from "node:child_process";
import { stat } from "node:fs/promises";
import { platform } from "node:os";
import { dirname } from "node:path";
import type { InventoryResponse, OpenPathRequest, OpenPathResponse, TranslationSettingsResponse, TranslationSettingsUpdate } from "../shared/schema";
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

await app.listen({ host: "127.0.0.1", port });
