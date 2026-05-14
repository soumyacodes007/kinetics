import { MerkleTree } from "merkletreejs";
export interface MerkleProofMaterial {
    root: string;
    proof: string[];
    leaf: string;
}
export declare function buildSortedMerkleTree(leaves: string[]): MerkleTree;
export declare function getMerkleRoot(leaves: string[]): string;
export declare function getMerkleProof(leaves: string[], leaf: string): MerkleProofMaterial;
export declare function verifySortedMerkleProof(leaf: string, proof: string[], root: string): boolean;
//# sourceMappingURL=tree.d.ts.map