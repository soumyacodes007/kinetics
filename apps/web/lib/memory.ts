import { keccak256, toUtf8Bytes, ZeroHash } from "ethers";
import {
  decryptJson,
  deriveVaultMasterKeyFromSignature,
  encryptJson,
  ensureHex32,
  getVaultKeyTypedData,
  rankVaultEntries,
  type MemoryPassState,
  type MemoryQueryResult,
  type MemoryType,
  type PrivateMemoryBlob,
  type VaultIndexEntry,
  type VaultSnapshot
} from "@kinetics/core/browser";
import { readBytes, uploadBytes } from "./storage-bridge";
import { ZERO_HEX_32 } from "./chain";

export interface MemoryComposerInput {
  text: string;
  title?: string;
  summary?: string;
  tags?: string[];
  namespaces?: string[];
  sourceClient: string;
  memoryType: MemoryType;
}

function randomHex(bytes: number): string {
  const array = globalThis.crypto.getRandomValues(new Uint8Array(bytes));
  return Array.from(array, (value) => value.toString(16).padStart(2, "0")).join("");
}

export function createMemoryId(now = Date.now()): string {
  return `mem_${now.toString(36)}_${randomHex(4)}`;
}

export function deriveDefaultTitle(text: string): string {
  const words = text
    .trim()
    .replace(/\s+/g, " ")
    .split(" ")
    .slice(0, 4);

  if (words.length === 0) {
    return "Untitled memory";
  }

  return words.map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1).toLowerCase()}`).join(" ");
}

export function deriveDefaultSummary(text: string, maxLength = 120): string {
  const normalized = text.trim().replace(/\s+/g, " ");
  return normalized.length <= maxLength ? normalized : `${normalized.slice(0, maxLength - 1)}...`;
}

function uniqueTokens(input: string | string[]): string[] {
  const values = Array.isArray(input) ? input : [input];
  return [
    ...new Set(
      values
        .flatMap((value) => value.toLowerCase().split(/[^a-z0-9]+/i))
        .map((token) => token.trim())
        .filter(Boolean)
    )
  ];
}

export function emptySnapshot(vaultId: number): VaultSnapshot {
  return {
    vaultId,
    version: 0,
    bytesUsed: 0,
    writeCountCurrentPeriod: 0,
    merkleRoot: ZERO_HEX_32,
    entries: []
  };
}

export async function unlockVaultKey(args: {
  signer: {
    signTypedData(
      domain: Record<string, unknown>,
      types: Record<string, ReadonlyArray<{ name: string; type: string }>>,
      value: Record<string, unknown>
    ): Promise<string>;
  };
  chainId: number;
  vaultId: bigint;
}): Promise<Uint8Array> {
  const typedData = getVaultKeyTypedData(args.chainId, args.vaultId, BigInt(0));
  const signature = await args.signer.signTypedData(typedData.domain, typedData.types, typedData.message);
  return deriveVaultMasterKeyFromSignature(signature);
}

export async function pullRemoteSnapshot(args: {
  passState: MemoryPassState;
  vaultMasterKey: Uint8Array;
}): Promise<VaultSnapshot> {
  const rootHash = ensureHex32(args.passState.latestIndexBlobRoot);
  if (rootHash === ZERO_HEX_32) {
    return emptySnapshot(Number(args.passState.vaultId));
  }

  const ciphertextBytes = await readBytes(rootHash);
  const ciphertextHex = new TextDecoder().decode(ciphertextBytes);
  return decryptJson<VaultSnapshot>(ciphertextHex, args.vaultMasterKey);
}

function computePairHash(left: string, right: string): string {
  const a = ensureHex32(left).toLowerCase();
  const b = ensureHex32(right).toLowerCase();
  const pair = a <= b ? `${a}${b.slice(2)}` : `${b}${a.slice(2)}`;
  return ensureHex32(keccak256(pair));
}

export function computeMerkleRoot(leaves: string[]): string {
  if (leaves.length === 0) {
    return ZeroHash;
  }

  let level = leaves.map((leaf) => ensureHex32(leaf));
  while (level.length > 1) {
    const nextLevel: string[] = [];
    for (let index = 0; index < level.length; index += 2) {
      const left = level[index];
      const right = level[index + 1] ?? left;
      nextLevel.push(computePairHash(left, right));
    }
    level = nextLevel;
  }

  return ensureHex32(level[0]);
}

export function computeDaCommitment(blobRoot: string, version: number): string {
  return keccak256(toUtf8Bytes(`local:${blobRoot}:v${version}`));
}

function assertWritable(passState: MemoryPassState, snapshot: VaultSnapshot, newBytes: number) {
  const now = Math.floor(Date.now() / 1000);
  if (passState.expiresAt !== BigInt(0) && Number(passState.expiresAt) < now) {
    throw new Error("Memory pass is not active");
  }

  if (snapshot.writeCountCurrentPeriod >= Number(passState.writeQuotaPerPeriod)) {
    throw new Error("Memory pass write quota exceeded");
  }

  if (snapshot.bytesUsed + newBytes > Number(passState.storageQuotaBytes)) {
    throw new Error("Memory pass storage quota exceeded");
  }
}

export async function addMemoryFast(args: {
  passState: MemoryPassState;
  snapshot: VaultSnapshot;
  vaultMasterKey: Uint8Array;
  input: MemoryComposerInput;
}): Promise<{
  memoryId: string;
  blobRoot: string;
  merkleRoot: string;
  daCommitment: string;
  nextSnapshot: VaultSnapshot;
}> {
  const now = Math.floor(Date.now() / 1000);
  const memory: PrivateMemoryBlob = {
    vaultId: Number(args.passState.vaultId),
    memoryId: createMemoryId(),
    memoryType: args.input.memoryType,
    sourceClient: args.input.sourceClient,
    createdAt: now,
    updatedAt: now,
    plaintext: {
      title: args.input.title?.trim() || deriveDefaultTitle(args.input.text),
      text: args.input.text,
      summary: args.input.summary?.trim() || deriveDefaultSummary(args.input.text),
      tags: args.input.tags?.length ? [...new Set(args.input.tags)] : uniqueTokens(args.input.text).slice(0, 5),
      namespaces: args.input.namespaces?.length ? [...new Set(args.input.namespaces)] : ["personal"]
    }
  };

  const plaintextBytes = new TextEncoder().encode(JSON.stringify(memory));
  assertWritable(args.passState, args.snapshot, plaintextBytes.length);

  const ciphertextHex = await encryptJson(memory, args.vaultMasterKey);
  const upload = await uploadBytes(`${memory.memoryId}.enc`, new TextEncoder().encode(ciphertextHex));

  const nextEntries: VaultIndexEntry[] = [
    ...args.snapshot.entries,
    {
      memoryId: memory.memoryId,
      blobRoot: upload.rootHash,
      memoryType: memory.memoryType,
      title: memory.plaintext.title,
      summary: memory.plaintext.summary,
      tags: memory.plaintext.tags,
      namespaces: memory.plaintext.namespaces,
      createdAt: memory.createdAt,
      lastAccessedAt: memory.createdAt,
      strength: 0.5,
      stale: false,
      sourceClient: memory.sourceClient
    }
  ];

  const nextSnapshot: VaultSnapshot = {
    vaultId: Number(args.passState.vaultId),
    version: args.snapshot.version + 1,
    bytesUsed: args.snapshot.bytesUsed + plaintextBytes.length,
    writeCountCurrentPeriod: args.snapshot.writeCountCurrentPeriod + 1,
    merkleRoot: computeMerkleRoot(nextEntries.map((entry) => entry.blobRoot)),
    entries: nextEntries
  };

  return {
    memoryId: memory.memoryId,
    blobRoot: upload.rootHash,
    merkleRoot: nextSnapshot.merkleRoot,
    daCommitment: computeDaCommitment(upload.rootHash, nextSnapshot.version),
    nextSnapshot
  };
}

export async function publishSnapshot(args: {
  snapshot: VaultSnapshot;
  vaultMasterKey: Uint8Array;
}): Promise<{
  snapshotBlobRoot: string;
}> {
  const ciphertextHex = await encryptJson(args.snapshot, args.vaultMasterKey);
  const upload = await uploadBytes(
    `vault-${args.snapshot.vaultId}-index-v${args.snapshot.version}.enc`,
    new TextEncoder().encode(ciphertextHex)
  );

  return {
    snapshotBlobRoot: upload.rootHash
  };
}

export async function querySnapshot(args: {
  snapshot: VaultSnapshot;
  vaultMasterKey: Uint8Array;
  query: string;
  topK?: number;
}): Promise<MemoryQueryResult[]> {
  const ranked = rankVaultEntries(args.query, args.snapshot.entries).slice(0, args.topK ?? 5);
  const results: MemoryQueryResult[] = [];

  for (const rankedEntry of ranked) {
    const bytes = await readBytes(rankedEntry.entry.blobRoot);
    const ciphertextHex = new TextDecoder().decode(bytes);
    const decrypted = await decryptJson<PrivateMemoryBlob>(ciphertextHex, args.vaultMasterKey);

    results.push({
      ...rankedEntry.entry,
      text: decrypted.plaintext.text,
      score: rankedEntry.finalScore,
      proof: {
        merkleRoot: args.snapshot.merkleRoot,
        proof: [],
        leaf: rankedEntry.entry.blobRoot
      }
    });
  }

  return results;
}

export function summarizeSnapshot(snapshot: VaultSnapshot): string {
  if (snapshot.entries.length === 0) {
    return "No memories yet. Add a first memory to initialize the vault.";
  }

  const recent = [...snapshot.entries].slice(-3).reverse();
  return recent
    .map((entry, index) => `${index + 1}. ${entry.title}: ${entry.summary}`)
    .join("\n");
}
