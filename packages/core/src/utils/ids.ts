import { randomBytes } from "node:crypto";

export function createMemoryId(now = Date.now()): string {
  return `mem_${now.toString(36)}_${randomBytes(4).toString("hex")}`;
}

export function createPackVersionKey(): string {
  return `0x${randomBytes(32).toString("hex")}`;
}

export function deriveDefaultTitle(text: string): string {
  const words = text
    .trim()
    .replace(/\s+/g, " ")
    .split(" ")
    .slice(0, 4);

  if (words.length === 0) {
    return "Untitled memory";
  }

  return words
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

export function deriveDefaultSummary(text: string, maxLength = 120): string {
  const normalized = text.trim().replace(/\s+/g, " ");
  return normalized.length <= maxLength ? normalized : `${normalized.slice(0, maxLength - 1)}…`;
}
