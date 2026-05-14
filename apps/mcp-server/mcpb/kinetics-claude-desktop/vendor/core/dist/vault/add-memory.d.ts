import { MemoryMetadataInput, MemoryWriteReceipt, MemoryType, VaultSnapshot } from "../types/memory.js";
import { MemoryPassState } from "../types/pass.js";
import { WritableStorage } from "../storage/upload.js";
import { MemoryPassReader } from "./pull-index.js";
import { MemoryPassWriter, MemoryRegistryWriter } from "./push-index.js";
export declare function addMemory(args: {
    owner: string;
    memoryPass: MemoryPassReader & MemoryPassWriter;
    memoryRegistry: MemoryRegistryWriter;
    storage: WritableStorage & {
        readBytes(rootHash: string, verified?: boolean): Promise<Uint8Array>;
    };
    vaultMasterKey: Uint8Array;
    text: string;
    sourceClient: string;
    memoryType?: MemoryType;
    metadata?: MemoryMetadataInput;
    now?: number;
}): Promise<MemoryWriteReceipt>;
export declare function addMemoryFast(args: {
    passState: MemoryPassState;
    snapshot: VaultSnapshot;
    memoryRegistry: MemoryRegistryWriter;
    storage: WritableStorage;
    vaultMasterKey: Uint8Array;
    text: string;
    sourceClient: string;
    memoryType?: MemoryType;
    metadata?: MemoryMetadataInput;
    now?: number;
}): Promise<MemoryWriteReceipt & {
    snapshot: VaultSnapshot;
    pendingSnapshotSync: boolean;
}>;
//# sourceMappingURL=add-memory.d.ts.map