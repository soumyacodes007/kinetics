import { MemoryPassState, PackKind, PackPreviewManifest, VaultSnapshot } from "@kinetics/core";
export interface SearchablePack {
    packId: number;
    active: boolean;
    manifest: PackPreviewManifest;
    priceWei: string;
    licenseDurationSeconds: number;
}
export interface NormalizedProofEntry {
    leaf: string;
    proof: string[];
    merkleRoot: string;
}
export declare function toJsonValue(value: unknown): unknown;
export declare function toJsonText(value: unknown): string;
export declare function packKindFromContract(value: number): PackKind;
export declare function buildMemoryStats(passState: MemoryPassState, active: boolean, snapshot: VaultSnapshot): {
    vaultId: number;
    planId: number;
    active: boolean;
    expiresAt: number;
    latestIndexVersion: number;
    latestIndexRoot: string;
    latestIndexBlobRoot: string;
    storageQuotaBytes: number;
    writeQuotaPerPeriod: number;
    snapshotVersion: number;
    bytesUsed: number;
    writeCountCurrentPeriod: number;
    totalEntries: number;
    staleEntries: number;
    byType: {
        episodic: number;
        semantic: number;
        procedural: number;
        working: number;
    };
    recent: {
        memoryId: string;
        title: string;
        summary: string;
        memoryType: import("@kinetics/core").MemoryType;
        tags: string[];
        namespaces: string[];
        createdAt: number;
    }[];
};
export declare function buildMemorySummaryText(snapshot: VaultSnapshot): string;
export declare function filterSearchablePacks(packs: SearchablePack[], keyword: string, tags: string[], packKind: PackKind | ""): SearchablePack[];
export declare function normalizeProofInput(value: unknown): NormalizedProofEntry[];
//# sourceMappingURL=logic.d.ts.map