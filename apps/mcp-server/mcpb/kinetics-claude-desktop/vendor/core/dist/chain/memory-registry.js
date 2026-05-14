import { getContract } from "./common.js";
import { ensureHex32 } from "../utils/hex.js";
async function waitForReceipt(tx) {
    const receipt = (await tx.wait());
    return receipt?.hash ?? tx.hash;
}
export class MemoryRegistryClient {
    config;
    constructor(config) {
        this.config = config;
    }
    contract() {
        return getContract("MemoryRegistry", this.config);
    }
    async updateRoot(merkleRoot, daTxHash) {
        const tx = await this.contract().updateRoot(ensureHex32(merkleRoot), ensureHex32(daTxHash));
        return waitForReceipt(tx);
    }
    async getLatest(agent) {
        const state = await this.contract().getLatest(agent);
        return {
            merkleRoot: ensureHex32(state[0]),
            blockNumber: state[1],
            daTxHash: ensureHex32(state[2]),
            timestamp: state[3]
        };
    }
    async historyLength(agent) {
        return this.contract().historyLength(agent);
    }
    async verifyInclusion(agent, leaf, proof, root) {
        return this.contract().verifyInclusion(agent, ensureHex32(leaf), proof.map(ensureHex32), ensureHex32(root));
    }
}
//# sourceMappingURL=memory-registry.js.map