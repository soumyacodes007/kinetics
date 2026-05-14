import { readEncryptedSnapshot } from "../storage/snapshots.js";
import { ensureHex32 } from "../utils/hex.js";
export async function pullVaultIndex(args) {
    const passState = await args.memoryPass.getPassByOwner(args.owner);
    const root = ensureHex32(args.indexBlobRoot ?? passState.latestIndexBlobRoot);
    if (root === ensureHex32("0x0")) {
        return {
            vaultId: Number(passState.vaultId),
            version: 0,
            bytesUsed: 0,
            writeCountCurrentPeriod: 0,
            merkleRoot: ensureHex32("0x0"),
            entries: []
        };
    }
    return readEncryptedSnapshot(args.storage, root, args.vaultMasterKey);
}
//# sourceMappingURL=pull-index.js.map