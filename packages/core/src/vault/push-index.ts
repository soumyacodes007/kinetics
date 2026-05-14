import { keccak256, toUtf8Bytes } from "ethers";
import { getMerkleRoot } from "../merkle/tree.js";
import { VaultSnapshot } from "../types/memory.js";
import { MemoryPassState } from "../types/pass.js";
import { uploadEncryptedSnapshot } from "../storage/snapshots.js";
import { WritableStorage } from "../storage/upload.js";

export interface MemoryPassWriter {
  setLatestIndex(vaultId: number | bigint, version: number | bigint, indexRoot: string, indexBlobRoot: string): Promise<{
    transactionHash?: string;
  }>;
}

export interface MemoryRegistryWriter {
  updateRoot(merkleRoot: string, daTxHash: string): Promise<string>;
}

export function computeVaultMerkleRoot(snapshot: VaultSnapshot): string {
  return getMerkleRoot(snapshot.entries.map((entry) => entry.blobRoot));
}

export function computeLocalDaCommitment(snapshotBlobRoot: string, snapshotVersion: number): string {
  return keccak256(toUtf8Bytes(`local:${snapshotBlobRoot}:v${snapshotVersion}`));
}

export async function pushVaultIndex(args: {
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
}> {
  const merkleRoot = computeVaultMerkleRoot(args.snapshot);
  const uploaded = await uploadEncryptedSnapshot(args.storage, { ...args.snapshot, merkleRoot }, args.vaultMasterKey);
  const daCommitment = args.daCommitment ?? computeLocalDaCommitment(uploaded.rootHash, args.snapshot.version);
  const latestIndex = await args.memoryPass.setLatestIndex(args.passState.vaultId, args.snapshot.version, merkleRoot, uploaded.rootHash);
  const registryTxHash = await args.memoryRegistry.updateRoot(merkleRoot, daCommitment);

  return {
    snapshotBlobRoot: uploaded.rootHash,
    latestIndexTxHash: latestIndex.transactionHash,
    registryTxHash,
    daCommitment,
    merkleRoot
  };
}
