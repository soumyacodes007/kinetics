import { decryptJson } from "../crypto/decrypt.js";
import { getMerkleProof } from "../merkle/tree.js";
import { rankVaultEntries } from "../retrieval/rank.js";
import { ReadableStorage } from "../storage/download.js";
import { MemoryQueryResult, PrivateMemoryBlob, VaultSnapshot } from "../types/memory.js";

export async function queryMemory(args: {
  query: string;
  snapshot: VaultSnapshot;
  storage: ReadableStorage;
  vaultMasterKey: Uint8Array;
  topK?: number;
}): Promise<MemoryQueryResult[]> {
  const ranked = rankVaultEntries(args.query, args.snapshot.entries).slice(0, args.topK ?? 5);
  const leaves = args.snapshot.entries.map((entry) => entry.blobRoot);
  const results: MemoryQueryResult[] = [];

  for (const rankedEntry of ranked) {
    const bytes = await args.storage.readBytes(rankedEntry.entry.blobRoot);
    const ciphertextHex = new TextDecoder().decode(bytes);
    const decrypted = await decryptJson<PrivateMemoryBlob>(ciphertextHex, args.vaultMasterKey);
    const proof = getMerkleProof(leaves, rankedEntry.entry.blobRoot);

    results.push({
      ...rankedEntry.entry,
      text: decrypted.plaintext.text,
      score: rankedEntry.finalScore,
      proof: {
        merkleRoot: proof.root,
        proof: proof.proof,
        leaf: proof.leaf
      }
    });
  }

  return results;
}
