import { VaultIndexEntry } from "../types/memory.js";
export declare function lexicalTitleTagNamespaceScore(query: string, entry: VaultIndexEntry): number;
export declare function summaryTextKeywordScore(query: string, entry: Pick<VaultIndexEntry, "summary" | "title">, text?: string): number;
//# sourceMappingURL=lexical-score.d.ts.map