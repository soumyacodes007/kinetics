import { ReadableStorage } from "../storage/download.js";
import { MemoryQueryResult, VaultSnapshot } from "../types/memory.js";
export declare function queryMemory(args: {
    query: string;
    snapshot: VaultSnapshot;
    storage: ReadableStorage;
    vaultMasterKey: Uint8Array;
    topK?: number;
}): Promise<MemoryQueryResult[]>;
//# sourceMappingURL=query-memory.d.ts.map