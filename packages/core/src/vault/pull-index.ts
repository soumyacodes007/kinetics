import { MemoryPassState } from "../types/pass.js";
import { VaultSnapshot } from "../types/memory.js";
import { ReadableStorage } from "../storage/download.js";
import { readEncryptedSnapshot } from "../storage/snapshots.js";
import { ensureHex32 } from "../utils/hex.js";

export interface MemoryPassReader {
  getPassByOwner(owner: string): Promise<MemoryPassState>;
}

export async function pullVaultIndex(args: {
  owner: string;
  memoryPass: MemoryPassReader;
  storage: ReadableStorage;
  vaultMasterKey: Uint8Array;
  indexBlobRoot?: string;
}): Promise<VaultSnapshot> {
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
