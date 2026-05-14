import { getContract } from "./common.js";
import { ensureHex32 } from "../utils/hex.js";
async function waitForReceipt(tx) {
    const receipt = (await tx.wait());
    return receipt?.hash ?? tx.hash;
}
export class KnowledgePackClient {
    config;
    constructor(config) {
        this.config = config;
    }
    contract() {
        return getContract("KnowledgePackNFT", this.config);
    }
    async getPack(packId) {
        const state = await this.contract().getPack(packId);
        return {
            packId: state[0],
            creator: state[1],
            slug: state[2],
            packKind: Number(state[3]),
            currentVersion: state[4],
            currentPreviewRoot: ensureHex32(state[5]),
            currentBundleRoot: ensureHex32(state[6]),
            priceWei: state[7],
            licenseDurationSeconds: state[8],
            active: state[9]
        };
    }
    async getTotalSupply() {
        return this.contract().totalSupply();
    }
    async getCreatorPackIds(creator) {
        return this.contract().getCreatorPackIds(creator);
    }
    async mintPack(slug, packKind, previewRoot, bundleRoot) {
        const tx = await this.contract().mintPack(slug, packKind, ensureHex32(previewRoot), ensureHex32(bundleRoot));
        return waitForReceipt(tx);
    }
    async publishVersion(packId, version, previewRoot, bundleRoot) {
        const tx = await this.contract().publishVersion(packId, version, ensureHex32(previewRoot), ensureHex32(bundleRoot));
        return waitForReceipt(tx);
    }
    async setSaleTerms(packId, priceWei, licenseDurationSeconds, active) {
        const tx = await this.contract().setSaleTerms(packId, priceWei, licenseDurationSeconds, active);
        return waitForReceipt(tx);
    }
}
//# sourceMappingURL=knowledge-pack.js.map