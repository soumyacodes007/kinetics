import { VaultSnapshot } from "../types/memory.js";
import { MemoryPassState } from "../types/pass.js";
import { WritableStorage } from "../storage/upload.js";
export interface MemoryPassWriter {
    setLatestIndex(vaultId: number | bigint, version: number | bigint, indexRoot: string, indexBlobRoot: string): Promise<{
        transactionHash?: string;
    }>;
}
export interface MemoryRegistryWriter {
    updateRoot(merkleRoot: string, daTxHash: string): Promise<string>;
}
export declare function computeVaultMerkleRoot(snapshot: VaultSnapshot): string;
export declare function computeLocalDaCommitment(snapshotBlobRoot: string, snapshotVersion: number): string;
export declare function publishVaultSnapshot(args: {
    snapshot: VaultSnapshot;
    storage: WritableStorage;
    vaultMasterKey: Uint8Array;
    memoryPass: MemoryPassWriter;
    passState: MemoryPassState;
}): Promise<{
    snapshotBlobRoot: string;
    latestIndexTxHash?: string;
    merkleRoot: string;
}>;
export declare function pushVaultIndex(args: {
    snapshot: VaultSnapshot;
    storage: WritableStorage;
    vaultMasterKey: Uint8Array;
    memoryPass: MemoryPassWriter;
    memoryRegistry: MemoryRegistryWriter;
    passState: MemoryPassState;
    daCommitment?: string;
}): Promise<{
    snapshotBlobRoot: string;
    latestIndexTxHash?: string;
    registryTxHash?: string;
    daCommitment: string;
    merkleRoot: string;
}>;
//# sourceMappingURL=push-index.d.ts.map