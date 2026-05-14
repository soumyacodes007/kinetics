import { randomBytes } from "node:crypto";
export function createMemoryId(now = Date.now()) {
    return `mem_${now.toString(36)}_${randomBytes(4).toString("hex")}`;
}
export function createPackVersionKey() {
    return `0x${randomBytes(32).toString("hex")}`;
}
export function deriveDefaultTitle(text) {
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
export function deriveDefaultSummary(text, maxLength = 120) {
    const normalized = text.trim().replace(/\s+/g, " ");
    return normalized.length <= maxLength ? normalized : `${normalized.slice(0, maxLength - 1)}…`;
}
//# sourceMappingURL=ids.js.map