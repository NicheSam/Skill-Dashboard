import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";
import { extractGithubUrls, resolveGithubDetection } from "../src/server/scanner";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const root = await mkdtemp(join(tmpdir(), "skill-dashboard-github-"));

async function write(path: string, content: string) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, content, "utf8");
}

const skillDir = join(root, "skill-a");
await mkdir(join(skillDir, ".git"), { recursive: true });
await write(join(skillDir, ".git", "config"), `[remote "upstream"]
  url = https://github.com/example/upstream-repo.git
[remote "origin"]
  url = git@github.com:example/origin-repo.git
`);
let detected = await resolveGithubDetection(join(skillDir, "SKILL.md"), "", undefined);
assert(detected.url === "https://github.com/example/origin-repo", "origin remote should win");
assert(detected.source === "git-remote", "git remote source expected");

const packageDir = join(root, "package-skill");
await mkdir(packageDir, { recursive: true });
await write(
  join(packageDir, "package.json"),
  JSON.stringify({
    repository: {
      type: "git",
      url: "git+https://github.com/example/package-repo.git"
    }
  })
);
detected = await resolveGithubDetection(join(packageDir, "SKILL.md"), "", undefined);
assert(detected.url === "https://github.com/example/package-repo", "package repository should be detected");
assert(detected.source === "package-json", "package-json source expected");

const readmeDir = join(root, "readme-skill");
await mkdir(readmeDir, { recursive: true });
await write(
  join(readmeDir, "README.md"),
  "Links: https://github.com/example/first and https://github.com/example/second"
);
detected = await resolveGithubDetection(join(readmeDir, "SKILL.md"), "", undefined);
assert(detected.url === "", "multiple README links should not auto-bind");
assert(detected.candidates.length === 2, "multiple README links should remain candidates");

detected = await resolveGithubDetection(join(readmeDir, "SKILL.md"), "", "acme/manual-repo");
assert(detected.url === "https://github.com/acme/manual-repo", "manual mapping should win");
assert(detected.source === "manual", "manual source expected");

const urls = extractGithubUrls("https://github.com/acme/repo.git git@github.com:acme/ssh-repo.git https://github.com/acme/repo/issues/1");
assert(urls.includes("https://github.com/acme/repo"), "https GitHub URL should normalize");
assert(urls.includes("https://github.com/acme/ssh-repo"), "ssh GitHub URL should normalize");

console.log(
  JSON.stringify(
    {
      ok: true,
      root
    },
    null,
    2
  )
);
