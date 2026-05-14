import { MemoryPassState } from "../types/pass.js";
import { VaultSnapshot } from "../types/memory.js";
import { ReadableStorage } from "../storage/download.js";
export interface MemoryPassReader {
    getPassByOwner(owner: string): Promise<MemoryPassState>;
}
export declare function pullVaultIndex(args: {
    owner: string;
    memoryPass: MemoryPassReader;
    storage: ReadableStorage;
    vaultMasterKey: Uint8Array;
    indexBlobRoot?: string;
}): Promise<VaultSnapshot>;
//# sourceMappingURL=pull-index.d.ts.map