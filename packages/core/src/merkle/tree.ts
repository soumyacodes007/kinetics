import { MerkleTree } from "merkletreejs";
import { keccak256, ZeroHash } from "ethers";
import { ensureHex32, hexToBytes } from "../utils/hex.js";

export interface MerkleProofMaterial {
  root: string;
  proof: string[];
  leaf: string;
}

export function buildSortedMerkleTree(leaves: string[]): MerkleTree {
  return new MerkleTree(leaves.map((leaf) => Buffer.from(hexToBytes(ensureHex32(leaf)))), keccak256, {
    sortPairs: true
  });
}

export function getMerkleRoot(leaves: string[]): string {
  if (leaves.length === 0) {
    return ZeroHash;
  }

  return ensureHex32(buildSortedMerkleTree(leaves).getHexRoot());
}

export function getMerkleProof(leaves: string[], leaf: string): MerkleProofMaterial {
  const normalizedLeaf = ensureHex32(leaf);
  const tree = buildSortedMerkleTree(leaves);
  return {
    root: ensureHex32(tree.getHexRoot()),
    proof: tree.getHexProof(Buffer.from(hexToBytes(normalizedLeaf))).map(ensureHex32),
    leaf: normalizedLeaf
  };
}

export function verifySortedMerkleProof(leaf: string, proof: string[], root: string): boolean {
  let computed = ensureHex32(leaf);

  for (const sibling of proof.map(ensureHex32)) {
    const pair =
      computed.toLowerCase() <= sibling.toLowerCase()
        ? `${computed}${sibling.slice(2)}`
        : `${sibling}${computed.slice(2)}`;
    computed = ensureHex32(keccak256(pair));
  }

  return computed.toLowerCase() === ensureHex32(root).toLowerCase();
}
