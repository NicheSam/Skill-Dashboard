import { scanInventory } from "../src/server/scanner";
import { parseMcpServerSections, parseSkillFrontmatter } from "../src/server/parsers";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const foldedSkill = `---
name: bigquery-basics
description: >-
  Manages datasets, tables, and jobs in BigQuery, and integrates with BigQuery
  ML and Gemini for advanced data analytics and AI-driven insights.
tags:
  - data
  - cloud
---

# BigQuery Basics
`;

const frontmatter = parseSkillFrontmatter(foldedSkill);
assert(frontmatter.name === "bigquery-basics", "frontmatter name was not parsed");
assert(frontmatter.description.includes("BigQuery ML and Gemini"), "folded description was not parsed");
assert(frontmatter.tags.length === 2, "frontmatter tags were not parsed");

const mcpConfig = `[mcp_servers."revit-mcp"]
command = "node"
args = ["E:\\\\Desktop\\\\Codex\\\\REVIT MCP\\\\MCP-Server\\\\build\\\\index.js"]
env = { REVIT_VERSION = "2024" }

[mcp_servers.node_repl]
command = 'C:\\Users\\User\\AppData\\Local\\OpenAI\\Codex\\runtimes\\node_repl.exe'
bearer_token_env_var = "NODE_REPL_TOKEN"

[mcp_servers.node_repl.env]
NODE_REPL_NODE_PATH = 'C:\\Users\\User\\node.exe'
`;

const mcpSections = parseMcpServerSections(mcpConfig);
assert(mcpSections.length === 2, "MCP sections were not parsed");
assert(mcpSections[0]?.values.command === "node", "MCP command was not parsed");
assert(mcpSections[0]?.values.args.includes("REVIT MCP"), "MCP args array was not normalized");
assert(mcpSections[0]?.envKeys.includes("REVIT_VERSION"), "inline env keys were not parsed");
assert(mcpSections[1]?.envKeys.includes("NODE_REPL_TOKEN"), "bearer_token_env_var was not exposed as an env key");
assert(mcpSections[1]?.envKeys.includes("NODE_REPL_NODE_PATH"), "nested env table keys were not parsed");

const inventory = await scanInventory();
assert(inventory.capabilities.length > 0, "inventory scan returned no capabilities");
const bigquery = inventory.capabilities.find((capability) => capability.name === "bigquery-basics");
if (bigquery) {
  assert(bigquery.summary !== "-" && bigquery.summary.length > 40, "bigquery-basics summary regressed");
}

console.log(
  JSON.stringify(
    {
      ok: true,
      capabilities: inventory.capabilities.length,
      mcp: inventory.capabilities.filter((capability) => capability.type === "mcp").length,
      errors: inventory.scan.errors
    },
    null,
    2
  )
);
