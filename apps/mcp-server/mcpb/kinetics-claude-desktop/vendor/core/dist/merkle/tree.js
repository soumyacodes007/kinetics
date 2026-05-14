import { MerkleTree } from "merkletreejs";
import { keccak256, ZeroHash } from "ethers";
import { ensureHex32, hexToBytes } from "../utils/hex.js";
export function buildSortedMerkleTree(leaves) {
    return new MerkleTree(leaves.map((leaf) => Buffer.from(hexToBytes(ensureHex32(leaf)))), keccak256, {
        sortPairs: true
    });
}
export function getMerkleRoot(leaves) {
    if (leaves.length === 0) {
        return ZeroHash;
    }
    return ensureHex32(buildSortedMerkleTree(leaves).getHexRoot());
}
export function getMerkleProof(leaves, leaf) {
    const normalizedLeaf = ensureHex32(leaf);
    const tree = buildSortedMerkleTree(leaves);
    return {
        root: ensureHex32(tree.getHexRoot()),
        proof: tree.getHexProof(Buffer.from(hexToBytes(normalizedLeaf))).map(ensureHex32),
        leaf: normalizedLeaf
    };
}
export function verifySortedMerkleProof(leaf, proof, root) {
    let computed = ensureHex32(leaf);
    for (const sibling of proof.map(ensureHex32)) {
        const pair = computed.toLowerCase() <= sibling.toLowerCase()
            ? `${computed}${sibling.slice(2)}`
            : `${sibling}${computed.slice(2)}`;
        computed = ensureHex32(keccak256(pair));
    }
    return computed.toLowerCase() === ensureHex32(root).toLowerCase();
}
//# sourceMappingURL=tree.js.map