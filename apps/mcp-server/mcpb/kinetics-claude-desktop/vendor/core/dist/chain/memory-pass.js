import { getContract } from "./common.js";
import { ensureHex32 } from "../utils/hex.js";
async function waitForReceipt(tx) {
    const receipt = (await tx.wait());
    return receipt?.hash ?? tx.hash;
}
export class MemoryPassClient {
    config;
    constructor(config) {
        this.config = config;
    }
    contract() {
        return getContract("MemoryPass", this.config);
    }
    async getPlan(planId) {
        const plan = await this.contract().passPlans(planId);
        return {
            durationSeconds: plan[0],
            storageQuotaBytes: plan[1],
            writeQuotaPerPeriod: plan[2],
            periodSeconds: plan[3],
            priceWei: plan[4],
            active: plan[5]
        };
    }
    async getNextPlanId() {
        return this.contract().nextPlanId();
    }
    async getPass(vaultId) {
        const state = await this.contract().getPass(vaultId);
        return {
            vaultId: state[0],
            owner: state[1],
            planId: state[2],
            expiresAt: state[3],
            storageQuotaBytes: state[4],
            writeQuotaPerPeriod: state[5],
            latestIndexVersion: state[6],
            latestIndexRoot: ensureHex32(state[7]),
            latestIndexBlobRoot: ensureHex32(state[8])
        };
    }
    async getPassByOwner(owner) {
        const state = await this.contract().getPassByOwner(owner);
        return {
            vaultId: state[0],
            owner: state[1],
            planId: state[2],
            expiresAt: state[3],
            storageQuotaBytes: state[4],
            writeQuotaPerPeriod: state[5],
            latestIndexVersion: state[6],
            latestIndexRoot: ensureHex32(state[7]),
            latestIndexBlobRoot: ensureHex32(state[8])
        };
    }
    async buyPass(planId, priceWei) {
        const tx = await this.contract().buyPass(planId, { value: priceWei });
        const transactionHash = await waitForReceipt(tx);
        return {
            vaultId: BigInt(0),
            transactionHash
        };
    }
    async renewPass(vaultId, planId, priceWei) {
        const tx = await this.contract().renewPass(vaultId, planId, { value: priceWei });
        return waitForReceipt(tx);
    }
    async isPassActive(vaultId) {
        return this.contract().isPassActive(vaultId);
    }
    async setLatestIndex(vaultId, version, indexRoot, indexBlobRoot) {
        const tx = await this.contract().setLatestIndex(vaultId, version, ensureHex32(indexRoot), ensureHex32(indexBlobRoot));
        return {
            vaultId: BigInt(vaultId),
            version: BigInt(version),
            indexRoot: ensureHex32(indexRoot),
            indexBlobRoot: ensureHex32(indexBlobRoot),
            transactionHash: await waitForReceipt(tx)
        };
    }
}
//# sourceMappingURL=memory-pass.js.map