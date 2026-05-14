export type MemoryType = "episodic" | "semantic" | "procedural" | "working";
export interface MemoryPlaintextRecord {
    title: string;
    text: string;
    summary: string;
    tags: string[];
    namespaces: string[];
}
export interface PrivateMemoryBlob {
    vaultId: number;
    memoryId: string;
    memoryType: MemoryType;
    sourceClient: string;
    createdAt: number;
    updatedAt: number;
    plaintext: MemoryPlaintextRecord;
}
export interface VaultIndexEntry {
    memoryId: string;
    blobRoot: string;
    memoryType: MemoryType;
    title: string;
    summary: string;
    tags: string[];
    namespaces: string[];
    createdAt: number;
    lastAccessedAt: number;
    strength: number;
    stale: boolean;
    sourceClient: string;
}
export interface VaultSnapshot {
    vaultId: number;
    version: number;
    bytesUsed: number;
    writeCountCurrentPeriod: number;
    merkleRoot: string;
    entries: VaultIndexEntry[];
}
export interface MemoryQueryResult extends VaultIndexEntry {
    text: string;
    score: number;
    proof: {
        merkleRoot: string;
        proof: string[];
        leaf: string;
    };
}
export interface MemoryMetadataInput {
    title?: string;
    summary?: string;
    tags?: string[];
    namespaces?: string[];
}
export interface MemoryWriteReceipt {
    memoryId: string;
    blobRoot: string;
    snapshotBlobRoot?: string;
    merkleRoot: string;
    snapshotVersion: number;
    chain?: {
        latestIndexTxHash?: string;
        registryTxHash?: string;
        daCommitment: string;
    };
}
//# sourceMappingURL=memory.d.ts.map