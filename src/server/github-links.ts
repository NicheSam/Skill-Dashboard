import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

const githubLinksPath = join(process.cwd(), "data", "github-links.json");

export interface GithubLinkEntry {
  url: string;
  source: "manual";
  updatedAt: string;
}

export type GithubLinkMap = Record<string, GithubLinkEntry>;

let githubLinksCache: GithubLinkMap | null = null;

export async function readGithubLinks() {
  if (githubLinksCache) return githubLinksCache;
  try {
    const text = await readFile(githubLinksPath, "utf8");
    const parsed = JSON.parse(text) as GithubLinkMap;
    githubLinksCache = parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    githubLinksCache = {};
  }
  return githubLinksCache;
}

export async function setGithubLink(capabilityId: string, url: string) {
  const links = await readGithubLinks();
  links[capabilityId] = {
    url,
    source: "manual",
    updatedAt: new Date().toISOString()
  };
  await saveGithubLinks(links);
  return links[capabilityId];
}

export async function deleteGithubLink(capabilityId: string) {
  const links = await readGithubLinks();
  delete links[capabilityId];
  await saveGithubLinks(links);
}

async function saveGithubLinks(links: GithubLinkMap) {
  await mkdir(dirname(githubLinksPath), { recursive: true });
  await writeFile(githubLinksPath, `${JSON.stringify(links, null, 2)}\n`, "utf8");
  githubLinksCache = links;
}
