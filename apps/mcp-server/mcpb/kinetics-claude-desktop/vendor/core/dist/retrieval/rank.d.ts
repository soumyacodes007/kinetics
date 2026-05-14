import { VaultIndexEntry } from "../types/memory.js";
export interface RankedEntry<T extends VaultIndexEntry = VaultIndexEntry> {
    entry: T;
    lexicalScore: number;
    keywordScore: number;
    recencyBoost: number;
    strengthBoost: number;
    finalScore: number;
}
export declare function recencyBoost(createdAt: number, now?: number): number;
export declare function rankVaultEntries<T extends VaultIndexEntry>(query: string, entries: T[], now?: number): RankedEntry<T>[];
//# sourceMappingURL=rank.d.ts.map