import { VaultSnapshot } from "../types/memory.js";
import { ReadableStorage } from "./download.js";
import { WritableStorage } from "./upload.js";
export declare function uploadEncryptedSnapshot(storage: WritableStorage, snapshot: VaultSnapshot, vaultMasterKey: Uint8Array): Promise<{
    rootHash: string;
    transactionHash: string;
}>;
export declare function readEncryptedSnapshot(storage: ReadableStorage, rootHash: string, vaultMasterKey: Uint8Array): Promise<VaultSnapshot>;
//# sourceMappingURL=snapshots.d.ts.map