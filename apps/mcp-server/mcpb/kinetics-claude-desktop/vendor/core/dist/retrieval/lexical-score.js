import { uniqueTokens } from "../utils/text.js";
function overlapScore(queryTokens, targetTokens) {
    if (queryTokens.length === 0 || targetTokens.length === 0) {
        return 0;
    }
    const targetSet = new Set(targetTokens);
    const matches = queryTokens.filter((token) => targetSet.has(token)).length;
    return Math.min(1, matches / Math.max(1, queryTokens.length));
}
export function lexicalTitleTagNamespaceScore(query, entry) {
    const queryTokens = uniqueTokens(query);
    const title = overlapScore(queryTokens, uniqueTokens(entry.title)) * 0.5;
    const tags = overlapScore(queryTokens, uniqueTokens(entry.tags)) * 0.3;
    const namespaces = overlapScore(queryTokens, uniqueTokens(entry.namespaces)) * 0.2;
    return Math.min(1, title + tags + namespaces);
}
export function summaryTextKeywordScore(query, entry, text) {
    const queryTokens = uniqueTokens(query);
    const targetTokens = uniqueTokens([entry.summary, entry.title, text ?? ""]);
    return overlapScore(queryTokens, targetTokens);
}
//# sourceMappingURL=lexical-score.js.map