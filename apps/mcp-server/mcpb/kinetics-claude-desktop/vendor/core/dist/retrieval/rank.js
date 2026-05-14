import { lexicalTitleTagNamespaceScore, summaryTextKeywordScore } from "./lexical-score.js";
export function recencyBoost(createdAt, now = Date.now() / 1000) {
    const ageSeconds = Math.max(0, now - createdAt);
    const thirtyDays = 30 * 24 * 60 * 60;
    return Math.max(0, 1 - ageSeconds / thirtyDays);
}
export function rankVaultEntries(query, entries, now = Date.now() / 1000) {
    return entries
        .map((entry) => {
        const lexicalScore = lexicalTitleTagNamespaceScore(query, entry);
        const keywordScore = summaryTextKeywordScore(query, entry);
        const entryRecencyBoost = recencyBoost(entry.createdAt, now);
        const entryStrengthBoost = Math.min(1, Math.max(0, entry.strength));
        const finalScore = 0.55 * lexicalScore +
            0.25 * keywordScore +
            0.1 * entryRecencyBoost +
            0.1 * entryStrengthBoost;
        return {
            entry,
            lexicalScore,
            keywordScore,
            recencyBoost: entryRecencyBoost,
            strengthBoost: entryStrengthBoost,
            finalScore
        };
    })
        .sort((left, right) => right.finalScore - left.finalScore);
}
//# sourceMappingURL=rank.js.map