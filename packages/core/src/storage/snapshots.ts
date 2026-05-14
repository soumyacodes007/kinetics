import { decryptJson } from "../crypto/decrypt.js";
import { encryptJson } from "../crypto/encrypt.js";
import { VaultSnapshot } from "../types/memory.js";
import { ReadableStorage } from "./download.js";
import { WritableStorage } from "./upload.js";

export async function uploadEncryptedSnapshot(
  storage: WritableStorage,
  snapshot: VaultSnapshot,
  vaultMasterKey: Uint8Array
): Promise<{ rootHash: string; transactionHash: string }> {
  const ciphertextHex = await encryptJson(snapshot, vaultMasterKey);
  return storage.uploadBytes(
    new TextEncoder().encode(ciphertextHex),
    `vault-${snapshot.vaultId}-index-v${snapshot.version}.enc`
  );
}

export async function readEncryptedSnapshot(
  storage: ReadableStorage,
  rootHash: string,
  vaultMasterKey: Uint8Array
): Promise<VaultSnapshot> {
  const bytes = await storage.readBytes(rootHash);
  const ciphertextHex = new TextDecoder().decode(bytes);
  return decryptJson<VaultSnapshot>(ciphertextHex, vaultMasterKey);
}
