import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..", "..", "..");

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return {};
  }

  const env = {};
  const text = fs.readFileSync(filePath, "utf8");
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    const value = trimmed.slice(idx + 1).trim();
    env[key] = value;
  }
  return env;
}

const merged = {
  ...loadEnvFile(path.join(repoRoot, ".env")),
  ...loadEnvFile(path.join(repoRoot, "contracts", ".env")),
  ...loadEnvFile(path.join(repoRoot, "apps", "mcp-server", ".env"))
};

process.env.KINETICS_PRIVATE_KEY ??= merged.KINETICS_PRIVATE_KEY ?? merged.PRIVATE_KEY ?? "";
process.env.KINETICS_RPC_URL ??= merged.KINETICS_RPC_URL ?? merged.RPC_URL ?? "https://evmrpc-testnet.0g.ai";
process.env.KINETICS_INDEXER_RPC ??= merged.KINETICS_INDEXER_RPC ?? merged.INDEXER_RPC_URL ?? "https://indexer-storage-testnet-turbo.0g.ai";
process.env.KINETICS_SOURCE_CLIENT ??= "codex";

await import("../dist/index.js");
