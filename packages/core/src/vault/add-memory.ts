import { deriveDefaultSummary, deriveDefaultTitle, createMemoryId } from "../utils/ids.js";
import { uniqueTokens } from "../utils/text.js";
import { PrivateMemoryBlob, MemoryMetadataInput, MemoryWriteReceipt, MemoryType, VaultSnapshot } from "../types/memory.js";
import { MemoryPassState } from "../types/pass.js";
import { encryptJson } from "../crypto/encrypt.js";
import { WritableStorage } from "../storage/upload.js";
import { pullVaultIndex, MemoryPassReader } from "./pull-index.js";
import { pushVaultIndex, MemoryPassWriter, MemoryRegistryWriter } from "./push-index.js";

function deriveMetadata(text: string, metadata: MemoryMetadataInput): Required<MemoryMetadataInput> {
  const title = metadata.title?.trim() || deriveDefaultTitle(text);
  const summary = metadata.summary?.trim() || deriveDefaultSummary(text);
  const tags = metadata.tags?.length ? [...new Set(metadata.tags)] : uniqueTokens(summary).slice(0, 5);
  const namespaces = metadata.namespaces?.length ? [...new Set(metadata.namespaces)] : ["personal"];

  return {
    title,
    summary,
    tags,
    namespaces
  };
}

function assertWritable(passState: MemoryPassState, snapshot: VaultSnapshot, newBytes: number, now: number): void {
  if (passState.expiresAt !== 0n && Number(passState.expiresAt) < now) {
    throw new Error("Memory pass is not active");
  }

  if (snapshot.writeCountCurrentPeriod >= Number(passState.writeQuotaPerPeriod)) {
    throw new Error("Memory pass write quota exceeded");
  }

  if (snapshot.bytesUsed + newBytes > Number(passState.storageQuotaBytes)) {
    throw new Error("Memory pass storage quota exceeded");
  }
}

export async function addMemory(args: {
  owner: string;
  memoryPass: MemoryPassReader & MemoryPassWriter;
  memoryRegistry: MemoryRegistryWriter;
  storage: WritableStorage & { readBytes(rootHash: string, verified?: boolean): Promise<Uint8Array> };
  vaultMasterKey: Uint8Array;
  text: string;
  sourceClient: string;
  memoryType?: MemoryType;
  metadata?: MemoryMetadataInput;
  now?: number;
}): Promise<MemoryWriteReceipt> {
  const now = args.now ?? Math.floor(Date.now() / 1000);
  const passState = await args.memoryPass.getPassByOwner(args.owner);
  const snapshot = await pullVaultIndex({
    owner: args.owner,
    memoryPass: args.memoryPass,
    storage: args.storage,
    vaultMasterKey: args.vaultMasterKey
  });

  const normalized = deriveMetadata(args.text, args.metadata ?? {});
  const memory: PrivateMemoryBlob = {
    vaultId: Number(passState.vaultId),
    memoryId: createMemoryId(now * 1000),
    memoryType: args.memoryType ?? "episodic",
    sourceClient: args.sourceClient,
    createdAt: now,
    updatedAt: now,
    plaintext: {
      title: normalized.title,
      text: args.text,
      summary: normalized.summary,
      tags: normalized.tags,
      namespaces: normalized.namespaces
    }
  };

  const plaintextBytes = new TextEncoder().encode(JSON.stringify(memory));
  assertWritable(passState, snapshot, plaintextBytes.length, now);

  const encryptedHex = await encryptJson(memory, args.vaultMasterKey);
  const blobUpload = await args.storage.uploadBytes(
    new TextEncoder().encode(encryptedHex),
    `${memory.memoryId}.enc`
  );

  const nextSnapshot: VaultSnapshot = {
    ...snapshot,
    vaultId: Number(passState.vaultId),
    version: snapshot.version + 1,
    bytesUsed: snapshot.bytesUsed + plaintextBytes.length,
    writeCountCurrentPeriod: snapshot.writeCountCurrentPeriod + 1,
    merkleRoot: snapshot.merkleRoot,
    entries: [
      ...snapshot.entries,
      {
        memoryId: memory.memoryId,
        blobRoot: blobUpload.rootHash,
        memoryType: memory.memoryType,
        title: memory.plaintext.title,
        summary: memory.plaintext.summary,
        tags: memory.plaintext.tags,
        namespaces: memory.plaintext.namespaces,
        createdAt: now,
        lastAccessedAt: now,
        strength: 0.5,
        stale: false,
        sourceClient: memory.sourceClient
      }
    ]
  };

  const pushed = await pushVaultIndex({
    snapshot: nextSnapshot,
    storage: args.storage,
    vaultMasterKey: args.vaultMasterKey,
    memoryPass: args.memoryPass,
    memoryRegistry: args.memoryRegistry,
    passState
  });

  return {
    memoryId: memory.memoryId,
    blobRoot: blobUpload.rootHash,
    snapshotBlobRoot: pushed.snapshotBlobRoot,
    merkleRoot: pushed.merkleRoot,
    snapshotVersion: nextSnapshot.version,
    chain: {
      latestIndexTxHash: pushed.latestIndexTxHash,
      registryTxHash: pushed.registryTxHash,
      daCommitment: pushed.daCommitment
    }
  };
}
