import { decryptJson } from "../crypto/decrypt.js";
import { encryptJson } from "../crypto/encrypt.js";
export async function uploadEncryptedSnapshot(storage, snapshot, vaultMasterKey) {
    const ciphertextHex = await encryptJson(snapshot, vaultMasterKey);
    return storage.uploadBytes(new TextEncoder().encode(ciphertextHex), `vault-${snapshot.vaultId}-index-v${snapshot.version}.enc`);
}
export async function readEncryptedSnapshot(storage, rootHash, vaultMasterKey) {
    const bytes = await storage.readBytes(rootHash);
    const ciphertextHex = new TextDecoder().decode(bytes);
    return decryptJson(ciphertextHex, vaultMasterKey);
}
//# sourceMappingURL=snapshots.js.map